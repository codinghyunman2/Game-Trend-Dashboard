import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { MetaAd, AdTrends, TrendsResponse } from '@/types/ad'
import { getCache, setCache } from '@/lib/cache'
import {
  extractClientIp,
  createRateLimiter,
  isBodyTooLarge,
  auditLog,
} from '@/lib/security'

const MAX_BODY_SIZE = 100 * 1024 // 100 KB
const MAX_ADS = 10
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6시간

const rateLimiter = createRateLimiter(60_000, 5)

interface CachePayload {
  result: TrendsResponse
  cachedAt: string
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_NOT_SET' },
      { status: 500 },
    )
  }

  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/analyze/trends')
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  if (isBodyTooLarge(request.headers.get('content-length'), MAX_BODY_SIZE)) {
    return NextResponse.json(
      { error: 'PAYLOAD_TOO_LARGE', message: '요청 크기가 너무 큽니다.' },
      { status: 413 },
    )
  }

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

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

  const cacheKey = `ads_trends:${[...keywords].sort().join(',')}`

  if (!forceRefresh) {
    const cached = getCache<CachePayload>(cacheKey)
    if (cached) {
      return NextResponse.json(cached.result)
    }
  }

  try {
    const topAds = (ads as MetaAd[]).slice(0, 10)

    const adsData = topAds.map((ad, i) => ({
      index: i + 1,
      title: String(ad.ad_creative_link_titles?.[0] ?? '').slice(0, 300),
      body: String(ad.ad_creative_bodies?.[0] ?? '').slice(0, 500),
    }))

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:
        'You are a mobile game advertising specialist. Identify common creative trends across ads. Respond with only JSON. All output fields must be in Korean.',
      messages: [
        {
          role: 'user',
          content: `Find common creative trends across these defense-genre mobile game ads.

Ad data:
${JSON.stringify(adsData, null, 2)}

Respond in the following JSON format only (no markdown code blocks):
{
  "trends": {
    "hook_patterns": ["3 common hook patterns seen across all ads, in Korean"],
    "cta_patterns": ["2-3 common CTA patterns, in Korean"],
    "creative_summary": "1-2 sentence summary of the creative trend across all ads, in Korean"
  }
}`,
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

    let result: TrendsResponse
    try {
      const parsed = JSON.parse(responseText)
      if (!parsed.trends || typeof parsed.trends !== 'object') throw new Error('invalid shape')
      result = { trends: parsed.trends as AdTrends }
    } catch {
      return NextResponse.json(
        { error: 'ANALYSIS_ERROR', message: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 },
      )
    }

    setCache<CachePayload>(cacheKey, { result, cachedAt: new Date().toISOString() }, CACHE_TTL)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'ANALYSIS_ERROR', message: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
