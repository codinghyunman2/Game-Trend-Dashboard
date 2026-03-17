import { NextRequest, NextResponse } from 'next/server'
import { fetchAdsByKeyword } from '@/lib/metaApi'
import { scoreAllAds } from '@/lib/scorer'
import { detectCountry } from '@/lib/languageDetector'
import { MetaAd } from '@/types/ad'
import { getCache, setCache } from '@/lib/cache'

const ADS_CACHE_TTL = 1000 * 60 * 60 * 6 // 6시간

interface AdsCachePayload {
  ads: MetaAd[]
  fetchedAt: string
  cachedAt: string
  keywords: string[]
}

export async function GET(request: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN_NOT_SET' },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const keywordsParam = searchParams.get('keywords') || '디펜스'
  const keywords = keywordsParam.split(',').map((k) => k.trim()).filter(Boolean)
  const forceRefresh = searchParams.get('refresh') === 'true'
  const cacheKey = `ads_data:${[...keywords].sort().join(',')}`

  if (!forceRefresh) {
    const cached = getCache<AdsCachePayload>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  try {
    // Parallel fetch for each keyword
    const results = await Promise.all(
      keywords.map((keyword) => fetchAdsByKeyword(keyword, accessToken))
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

    // Score and annotate all ads
    scoreAllAds(allAds)
    for (const ad of allAds) {
      ad.detectedCountry = detectCountry(ad)
    }

    // Sort by score descending
    allAds.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    const now = new Date().toISOString()
    const responseData: AdsCachePayload = {
      ads: allAds,
      fetchedAt: now,
      cachedAt: now,
      keywords,
    }

    setCache<AdsCachePayload>(cacheKey, responseData, ADS_CACHE_TTL)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in fetch-ads route:', error)
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: '광고 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
