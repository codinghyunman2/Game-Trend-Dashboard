import { NextRequest, NextResponse } from 'next/server'
import { uploadCardNewsImages } from '@/lib/googleDrive'
import { AnalyzedNews, NewsItem } from '@/types/news'

export const maxDuration = 60

function getBaseUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function formatDate(d: Date): { display: string; folder: string } {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return { display: `${y}.${m}.${day}`, folder: `${y}-${m}-${day}` }
}

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const isTest = request.nextUrl.searchParams.get('test') === 'true'
  if (!isTest) {
    const secret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization') ?? ''
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
  }

  const baseUrl = getBaseUrl()
  const { display: dateDisplay, folder: dateFolder } = formatDate(new Date())

  try {
    // ── 1. Fetch news ──────────────────────────────────────────────────────
    const newsRes = await fetch(`${baseUrl}/api/news/fetch`, { cache: 'no-store' })
    if (!newsRes.ok) {
      return NextResponse.json({ error: 'NEWS_FETCH_FAILED' }, { status: 500 })
    }
    const newsData = await newsRes.json() as { allNews: NewsItem[] }
    const allNews: NewsItem[] = newsData.allNews ?? []

    if (allNews.length === 0) {
      return NextResponse.json({ error: 'NO_NEWS' }, { status: 404 })
    }

    // ── 2. Analyze top 7 ───────────────────────────────────────────────────
    const analyzeRes = await fetch(`${baseUrl}/api/news/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ news: allNews.slice(0, 20) }),
      cache: 'no-store',
    })
    if (!analyzeRes.ok) {
      return NextResponse.json({ error: 'ANALYZE_FAILED' }, { status: 500 })
    }
    const analyzed: AnalyzedNews[] = await analyzeRes.json()

    if (!Array.isArray(analyzed) || analyzed.length === 0) {
      return NextResponse.json({ error: 'ANALYZE_EMPTY' }, { status: 500 })
    }

    // ── 3. Generate card images ────────────────────────────────────────────
    const imageResults = await Promise.all(
      analyzed.map(async (item, i) => {
        const params = new URLSearchParams({
          rank: String(item.rank ?? i + 1),
          titleKo: item.titleKo,
          summaryKo: item.summaryKo,
          source: item.source,
          category: item.category ?? 'general',
          date: dateDisplay,
        })
        const imgRes = await fetch(`${baseUrl}/api/card-news/image?${params.toString()}`)
        if (!imgRes.ok) throw new Error(`Image generation failed for rank ${item.rank}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        const fileName = `card-news-${dateFolder}-${String(i + 1).padStart(2, '0')}.png`
        return { buffer, fileName, news: item }
      })
    )

    // ── 4. Upload to Google Drive ─────────────────────────────────────────
    const uploaded = await uploadCardNewsImages(
      imageResults.map(({ buffer, fileName }) => ({ buffer, fileName })),
      dateFolder
    )

    return NextResponse.json({
      success: true,
      date: dateDisplay,
      count: uploaded.length,
      files: uploaded.map((f, i) => ({
        ...f,
        rank: analyzed[i]?.rank,
        titleKo: analyzed[i]?.titleKo,
      })),
    })
  } catch (err) {
    console.error('[card-news/generate]', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: String(err) },
      { status: 500 }
    )
  }
}
