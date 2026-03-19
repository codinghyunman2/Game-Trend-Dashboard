import { NextRequest, NextResponse } from 'next/server'
import { fetchAdsByKeyword } from '@/lib/metaApi'
import { scoreAllAds } from '@/lib/scorer'
import { detectCountry } from '@/lib/languageDetector'
import { MetaAd } from '@/types/ad'
import { getCache, setCache } from '@/lib/cache'
import {
  extractClientIp,
  createRateLimiter,
  validateKeywords,
  auditLog,
} from '@/lib/security'

const ADS_CACHE_TTL = 1000 * 60 * 60 * 6 // 6시간

// 10 req/min per IP (cache TTL means this is rarely hit legitimately)
const rateLimiter = createRateLimiter(60_000, 10)

interface AdsCachePayload {
  ads: MetaAd[]
  uniqueAds: MetaAd[]
  fetchedAt: string
  cachedAt: string
  keywords: string[]
}

export async function GET(request: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN_NOT_SET' },
      { status: 401 },
    )
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/fetch-ads')
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const searchParams = request.nextUrl.searchParams
  const keywordsParam = searchParams.get('keywords') || '디펜스'
  const validation = validateKeywords(keywordsParam)
  if (!validation.valid) {
    auditLog('VALIDATION_FAILURE', ip, '/api/fetch-ads', validation.error)
    return NextResponse.json(
      { error: validation.error, message: '잘못된 키워드입니다.' },
      { status: 400 },
    )
  }
  const keywords = validation.keywords!

  const forceRefresh = searchParams.get('refresh') === 'true'
  const cacheKey = `ads_data:${[...keywords].sort().join(',')}`

  if (!forceRefresh) {
    const cached = getCache<AdsCachePayload>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  try {
    // Parallel fetch per keyword
    const results = await Promise.all(
      keywords.map((keyword) => fetchAdsByKeyword(keyword, accessToken)),
    )

    // Deduplicate by ad.id
    const seenIds = new Set<string>()
    const allAds: MetaAd[] = []
    for (const adList of results) {
      for (const ad of adList) {
        if (!seenIds.has(ad.id)) {
          seenIds.add(ad.id)
          allAds.push(ad)
        }
      }
    }

    scoreAllAds(allAds)
    for (const ad of allAds) {
      ad.detectedCountry = detectCountry(ad)
    }
    allAds.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    // Deduplicate by creative: keep highest-score ad per (page_name + body) group
    const groupMap = new Map<string, MetaAd>()
    for (const ad of allAds) {
      const key = `${ad.page_name ?? ''}::${ad.ad_creative_bodies?.[0] ?? ''}`
      if (!groupMap.has(key)) {
        groupMap.set(key, ad) // allAds is sorted desc, so first = highest score
      }
    }
    const uniqueAds = Array.from(groupMap.values())

    const now = new Date().toISOString()
    const responseData: AdsCachePayload = { ads: allAds, uniqueAds, fetchedAt: now, cachedAt: now, keywords }
    setCache<AdsCachePayload>(cacheKey, responseData, ADS_CACHE_TTL)

    return NextResponse.json(responseData)
  } catch {
    // Do NOT expose internal error details to the client
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: '광고 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
