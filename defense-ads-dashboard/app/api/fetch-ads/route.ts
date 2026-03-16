import { NextRequest, NextResponse } from 'next/server'
import { fetchAdsByKeyword } from '@/lib/metaApi'
import { scoreAllAds } from '@/lib/scorer'
import { detectCountry } from '@/lib/languageDetector'
import { MetaAd } from '@/types/ad'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function getCacheFilePath(keywords: string[]): string {
  const hash = crypto.createHash('md5').update([...keywords].sort().join(',')).digest('hex').slice(0, 8)
  const cacheDir = path.join(process.cwd(), 'cache')
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
  return path.join(cacheDir, `ads_${hash}.json`)
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

  const cacheFile = getCacheFilePath(keywords)

  if (!forceRefresh) {
    try {
      if (fs.existsSync(cacheFile)) {
        const raw = fs.readFileSync(cacheFile, 'utf-8')
        const cached = JSON.parse(raw)
        if (Date.now() - new Date(cached.cachedAt).getTime() < CACHE_TTL) {
          return NextResponse.json(cached)
        }
      }
    } catch {
      // cache miss, proceed
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
    const responseData = {
      ads: allAds,
      fetchedAt: now,
      cachedAt: now,
      keywords,
    }

    try {
      fs.writeFileSync(cacheFile, JSON.stringify(responseData), 'utf-8')
    } catch {
      // cache write failure is non-critical
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in fetch-ads route:', error)
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: '광고 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
