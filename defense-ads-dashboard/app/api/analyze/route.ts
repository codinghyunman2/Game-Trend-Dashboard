import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { MetaAd, AdAnalysis } from '@/types/ad'
import { getCache, setCache } from '@/lib/cache'
import {
  extractClientIp,
  createRateLimiter,
  isBodyTooLarge,
  auditLog,
} from '@/lib/security'

const MAX_BODY_SIZE = 100 * 1024 // 100 KB
const MAX_ADS = 10
const ADS_ANALYSIS_CACHE_TTL = 1000 * 60 * 60 * 6 // 6시간

// 5 req/min per IP (AI calls are expensive)
const rateLimiter = createRateLimiter(60_000, 5)

interface AnalysisCachePayload {
  analyses: AdAnalysis[]
  cachedAt: string
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_NOT_SET' },
      { status: 401 },
    )
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Use rightmost non-private IP (prevents x-forwarded-for spoofing)
  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/analyze')
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // ── Body size ──────────────────────────────────────────────────────────────
  if (isBodyTooLarge(request.headers.get('content-length'), MAX_BODY_SIZE)) {
    return NextResponse.json(
      { error: 'PAYLOAD_TOO_LARGE', message: '요청 크기가 너무 큽니다.' },
      { status: 413 },
    )
  }

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

  // ── Parse & validate body ──────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    )
  }

  if (!body || typeof body !== 'object' || !('ads' in body)) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    )
  }

  const { ads, keywords: rawKeywords } = body as { ads: unknown; keywords?: unknown }
  const keywords: string[] = Array.isArray(rawKeywords) ? rawKeywords.map(String) : []

  if (!Array.isArray(ads) || ads.length === 0) {
    return NextResponse.json(
      { error: 'NO_ADS_PROVIDED', message: '분석할 광고가 없습니다.' },
      { status: 400 },
    )
  }

  if (ads.length > MAX_ADS) {
    return NextResponse.json(
      { error: 'TOO_MANY_ADS', message: `최대 ${MAX_ADS}개의 광고만 분석할 수 있습니다.` },
      { status: 400 },
    )
  }

  const cacheKey = `ads_analysis:${[...keywords].sort().join(',')}`

  if (!forceRefresh) {
    const cached = getCache<AnalysisCachePayload>(cacheKey)
    if (cached) {
      return NextResponse.json(cached.analyses)
    }
  }

  try {
    const topAds = (ads as MetaAd[]).slice(0, 5)

    // Sanitise ad fields: truncate to reasonable lengths before sending to AI
    const adsData = topAds.map((ad, i) => ({
      index: i + 1,
      title: String(ad.ad_creative_link_titles?.[0] ?? '').slice(0, 500),
      body: String(ad.ad_creative_bodies?.[0] ?? '').slice(0, 1000),
      ad_snapshot_url: String(ad.ad_snapshot_url ?? '').slice(0, 500),
    }))

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        '당신은 모바일 게임 광고 전문 마케터입니다. 주어진 광고 데이터를 분석하여 가장 효과적인 광고 Top 3를 선정하고 JSON으로만 응답합니다.',
      messages: [
        {
          role: 'user',
          content: `다음 디펜스 장르 모바일 게임 광고 상위 5개를 분석하여 가장 효과적인 Top 3를 선정해주세요.

광고 데이터:
${JSON.stringify(adsData, null, 2)}

다음 JSON 배열 형식으로만 응답해주세요 (마크다운 코드블록 없이):
[
  {
    "rank": 1,
    "score": (100점 만점 종합 점수),
    "title": "(광고 원문 제목 그대로 - title 필드)",
    "game_name": "(게임명 - title 또는 본문에서 추출)",
    "summary": "(광고 전략 요약 2~3문장)",
    "hook": "(이 광고의 핵심 후킹 포인트)",
    "strengths": ["강점1", "강점2", "강점3"],
    "ad_snapshot_url": "(원본 URL)"
  }
]`,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'ANALYSIS_ERROR', message: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 },
      )
    }

    let responseText = textContent.text.trim()
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) responseText = codeBlockMatch[1].trim()

    let analyses: AdAnalysis[]
    try {
      const parsed = JSON.parse(responseText)
      if (!Array.isArray(parsed)) throw new Error('not array')
      analyses = parsed as AdAnalysis[]
    } catch {
      return NextResponse.json(
        { error: 'ANALYSIS_ERROR', message: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 },
      )
    }

    setCache<AnalysisCachePayload>(
      cacheKey,
      { analyses, cachedAt: new Date().toISOString() },
      ADS_ANALYSIS_CACHE_TTL,
    )

    return NextResponse.json(analyses)
  } catch {
    return NextResponse.json(
      { error: 'ANALYSIS_ERROR', message: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
