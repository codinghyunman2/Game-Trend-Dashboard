import { NextRequest, NextResponse } from 'next/server'
import { fetchAdsByKeyword } from '@/lib/metaApi'
import { scoreAllAds } from '@/lib/scorer'
import { detectCountry } from '@/lib/languageDetector'
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

    // Score and annotate all ads (O(n) via pre-computed copy count map)
    scoreAllAds(allAds)
    for (const ad of allAds) {
      ad.detectedCountry = detectCountry(ad)
    }

    // Sort by score descending
    allAds.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    return NextResponse.json({
      ads: allAds,
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
