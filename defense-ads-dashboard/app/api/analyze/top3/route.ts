import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { MetaAd, AdAnalysis, Top3Response } from '@/types/ad'
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
  result: Top3Response
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
    auditLog('RATE_LIMIT', ip, '/api/analyze/top3')
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

  const cacheKey = `ads_top3:${[...keywords].sort().join(',')}`

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
      title: String(ad.ad_creative_link_titles?.[0] ?? '').slice(0, 500),
      body: String(ad.ad_creative_bodies?.[0] ?? '').slice(0, 1000),
      ad_snapshot_url: String(ad.ad_snapshot_url ?? '').slice(0, 500),
    }))

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'You are a mobile game advertising specialist. Analyze the given ad data and respond with only JSON containing the Top 3 ads. Write all Korean-language output fields (summary, hook, strengths) in Korean.',
      messages: [
        {
          role: 'user',
          content: `Analyze the top 10 defense-genre mobile game ads below and return the Top 3.

Ad data:
${JSON.stringify(adsData, null, 2)}

Respond in the following JSON format only (no markdown code blocks):
{
  "top3": [
    {
      "rank": 1,
      "score": (overall score out of 100),
      "title": "(exact original ad title from the title field)",
      "game_name": "(game name extracted from title or body)",
      "summary": "(2-3 sentence ad strategy summary, in Korean)",
      "hook": "(core hook point of this ad, in Korean)",
      "strengths": ["strength1", "strength2", "strength3"],
      "ad_snapshot_url": "(original URL)"
    }
  ]
}`,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      console.error('[analyze/top3] no text content in response:', message.content)
      return NextResponse.json(
        { error: 'ANALYSIS_ERROR', message: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 },
      )
    }

    let responseText = textContent.text.trim()
    console.log('[analyze/top3] raw response:', responseText.slice(0, 200))
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      responseText = codeBlockMatch[1].trim()
    } else {
      // JSON 객체만 추출 (앞뒤 텍스트 제거)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) responseText = jsonMatch[0]
    }

    let result: Top3Response
    try {
      const parsed = JSON.parse(responseText)
      if (!parsed.top3 || !Array.isArray(parsed.top3)) throw new Error('invalid shape')
      result = { top3: parsed.top3 as AdAnalysis[] }
    } catch (parseErr) {
      console.error('[analyze/top3] JSON parse error:', parseErr, 'raw:', responseText.slice(0, 300))
      return NextResponse.json(
        { error: 'ANALYSIS_ERROR', message: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 },
      )
    }

    setCache<CachePayload>(cacheKey, { result, cachedAt: new Date().toISOString() }, CACHE_TTL)

    return NextResponse.json(result)
  } catch (e) {
    console.error('[analyze/top3] error:', e)
    return NextResponse.json(
      { error: 'ANALYSIS_ERROR', message: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
