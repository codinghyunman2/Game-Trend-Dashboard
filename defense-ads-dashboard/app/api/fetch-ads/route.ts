import { NextRequest, NextResponse } from 'next/server'
import { fetchAdsByKeyword } from '@/lib/metaApi'
import { calculateScore } from '@/lib/scorer'
import { MetaAd } from '@/types/ad'

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

    // Separate into scored and unscored
    const scoredAds: MetaAd[] = []
    const unscoredAds: MetaAd[] = []

    for (const ad of allAds) {
      if (ad.hasImpressionData) {
        ad.score = calculateScore(ad)
        scoredAds.push(ad)
      } else {
        ad.score = calculateScore(ad)
        unscoredAds.push(ad)
      }
    }

    // Sort scoredAds by score descending
    scoredAds.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    return NextResponse.json({
      scoredAds,
      unscoredAds,
      fetchedAt: new Date().toISOString(),
      keywords,
    })
  } catch (error) {
    console.error('Error in fetch-ads route:', error)
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: '광고 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
