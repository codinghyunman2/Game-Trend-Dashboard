import { NextRequest, NextResponse } from 'next/server'
import { NewsItem, NewsFetchResponse } from '@/types/news'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const CACHE_FILE = path.join(process.cwd(), 'cache', 'news.json')
const CACHE_TTL_MS = 3 * 60 * 60 * 1000 // 3시간

interface CacheFile {
  cachedAt: string
  data: NewsFetchResponse
}

function readCache(): CacheFile | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
    return JSON.parse(raw) as CacheFile
  } catch {
    return null
  }
}

function writeCache(data: NewsFetchResponse): string {
  const cachedAt = new Date().toISOString()
  const cache: CacheFile = { cachedAt, data }
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8')
  } catch (e) {
    console.warn('[cache] 캐시 저장 실패:', e)
  }
  return cachedAt
}

const RSS_SOURCES = [
  // 한국 게임 언론
  { key: 'gamemeca', name: '게임메카', url: 'https://www.gamemeca.com/rss.php', isKorean: true },
  { key: 'gamedonga', name: '게임동아', url: 'https://game.donga.com/feeds/rss/', isKorean: true },
  { key: 'gamedonga_news', name: '게임동아 뉴스', url: 'https://game.donga.com/feeds/rss/news/', isKorean: true },
  { key: 'ruliweb', name: '루리웹', url: 'https://bbs.ruliweb.com/news/rss', isKorean: true },
  { key: 'gameshot', name: '게임샷', url: 'https://www.gameshot.net/rss/', isKorean: true },

  // 해외 게임 비즈니스
  { key: 'gi_news', name: 'GamesIndustry', url: 'https://www.gamesindustry.biz/feed/news', isKorean: false },
  { key: 'gi_data', name: 'GamesIndustry Data', url: 'https://www.gamesindustry.biz/feed/data', isKorean: false },
  { key: 'vgc', name: 'VGC', url: 'https://www.videogameschronicle.com/category/news/feed/', isKorean: false },
  { key: 'gamedev', name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml', isKorean: false },

  // 뉴스레터
  { key: 'naavik', name: 'Naavik', url: 'https://naavik.co/feed', isKorean: false },
  { key: 'mobilegamer', name: 'Mobile Gamer', url: 'https://mobilegamer.biz/feed/', isKorean: false },
] as const

type RSSSource = typeof RSS_SOURCES[number]

function classifyCategory(title: string, summary: string): 'defense' | 'mobile' | 'general' {
  const text = `${title} ${summary}`.toLowerCase()
  const defenseKeywords = ['디펜스', '타워디펜스', '타워', '수성', '방어', '성채', '요새', 'tower defense', 'defense', 'tower', 'defend', 'fortress', 'castle defense', 'kingdom defense', 'dungeon defense', 'strategy']
  const mobileKeywords = ['모바일', 'mobile', 'ios', 'android', 'app store', 'google play']

  for (const kw of defenseKeywords) {
    if (text.includes(kw)) return 'defense'
  }
  for (const kw of mobileKeywords) {
    if (text.includes(kw)) return 'mobile'
  }
  return 'general'
}

function parseRSSItems(xml: string, source: RSSSource): NewsItem[] {
  const items: NewsItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)

  for (const itemMatch of itemMatches) {
    const item = itemMatch[1]

    const extractTag = (tag: string): string => {
      const match = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
      return match?.[1]?.trim() ?? ''
    }

    const title = extractTag('title')
    const link = extractTag('link') || (item.match(/<link>\s*(https?:\/\/[^\s<]+)\s*/i)?.[1] ?? '')
    const pubDateStr = extractTag('pubDate')
    const description = extractTag('description')

    if (!title || !link) continue

    const pubDate = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString()
    const summary = description.replace(/<[^>]+>/g, '').slice(0, 200)

    const id = Buffer.from(`${title.slice(0, 50)}_${source.key}`).toString('base64').slice(0, 16)

    items.push({
      id,
      title,
      titleKo: title,
      summary,
      summaryKo: summary,
      link,
      pubDate,
      source: source.name,
      sourceKey: source.key,
      category: classifyCategory(title, summary),
      isKorean: source.isKorean,
    })
  }

  return items
}

type FetchResult = { source: RSSSource; items: NewsItem[]; error?: string }

async function fetchRSSFeed(source: RSSSource): Promise<FetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GameTrendBot/1.0' },
    })
    if (!res.ok) return { source, items: [], error: `HTTP ${res.status} ${res.statusText}` }
    const xml = await res.text()
    const items = parseRSSItems(xml, source)
    return { source, items }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { source, items: [], error: msg }
  } finally {
    clearTimeout(timeout)
  }
}

async function batchTranslate(items: NewsItem[]): Promise<NewsItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || items.length === 0) return items

  const toTranslate = items
  if (toTranslate.length === 0) return items

  const translationInput = toTranslate.map((item, i) => ({
    idx: i,
    title: item.title,
    summary: item.summary,
  }))

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `다음 게임 업계 뉴스 제목과 요약을 한국어로 번역해주세요. JSON 배열로 응답해주세요.
입력 형식: [{ idx, title, summary }]
출력 형식: [{ idx, titleKo, summaryKo }]

번역할 항목:
${JSON.stringify(translationInput, null, 2)}

JSON 배열만 출력해주세요. 마크다운 코드 블록 없이 순수 JSON만 응답해주세요.`,
        }],
      }),
    })

    if (!res.ok) return items

    const data = await res.json()
    const responseText = data.content?.[0]?.text ?? ''
    const cleaned = responseText.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const translations: { idx: number; titleKo: string; summaryKo: string }[] = JSON.parse(cleaned)

    const translationMap = new Map<number, { titleKo: string; summaryKo: string }>()
    for (const t of translations) {
      translationMap.set(t.idx, { titleKo: t.titleKo, summaryKo: t.summaryKo })
    }

    // Apply translations back
    for (let i = 0; i < toTranslate.length; i++) {
      const trans = translationMap.get(i)
      if (trans) {
        toTranslate[i].titleKo = trans.titleKo
        toTranslate[i].summaryKo = trans.summaryKo
      }
    }
  } catch {
    // Translation failure: keep originals
  }

  return items
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

  if (!forceRefresh) {
    const cached = readCache()
    if (cached) {
      const age = Date.now() - new Date(cached.cachedAt).getTime()
      if (age < CACHE_TTL_MS) {
        console.log('[cache] 캐시 반환 (age:', Math.round(age / 60000), 'min)')
        return NextResponse.json({ ...cached.data, cachedAt: cached.cachedAt })
      }
    }
  }

  try {
    const results = await Promise.all(
      RSS_SOURCES.map((source) => fetchRSSFeed(source))
    )

    let allNews: NewsItem[] = []
    for (const result of results) {
      if (result.error) {
        console.log(`[${result.source.name}] ❌ 실패 - ${result.error}`)
      } else {
        console.log(`[${result.source.name}] ✅ 성공 - ${result.items.length}개 수집`)
      }
      allNews.push(...result.items)
    }

    // Filter last 3 days
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    allNews = allNews.filter((item) => {
      try {
        return new Date(item.pubDate) >= threeDaysAgo
      } catch {
        return false
      }
    })

    // Dedup by title prefix + sourceKey
    const seen = new Set<string>()
    allNews = allNews.filter((item) => {
      const key = `${item.title.slice(0, 50)}_${item.sourceKey}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by date descending
    allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    // Category tops (번역 전 선별)
    const defenseTop3 = allNews.filter((n) => n.category === 'defense').slice(0, 3)
    const mobileTop3 = allNews.filter((n) => n.category === 'mobile').slice(0, 3)

    // 번역 대상: defenseTop3 + mobileTop3 + allNews 상위 10개 중 비한국어만 (최대 16개)
    const translateCandidateIds = new Set<string>([
      ...defenseTop3.map((n) => n.id),
      ...mobileTop3.map((n) => n.id),
      ...allNews.slice(0, 10).map((n) => n.id),
    ])
    // Group by channel
    const byChannel: Record<string, NewsItem[]> = {}
    for (const item of allNews) {
      if (!byChannel[item.sourceKey]) byChannel[item.sourceKey] = []
      byChannel[item.sourceKey].push(item)
    }

    const responseData: NewsFetchResponse = {
      allNews,
      defenseTop3,
      mobileTop3,
      byChannel,
      fetchedAt: new Date().toISOString(),
    }

    // 번역 없이 먼저 캐시 저장 & 응답 반환
    const cachedAt = writeCache(responseData)
    const response = NextResponse.json({ ...responseData, cachedAt })

    // 번역은 백그라운드에서 실행 → 다음 캐시 요청부터 번역된 데이터 제공
    const toTranslate = allNews.filter((n) => !n.isKorean && translateCandidateIds.has(n.id))
    if (toTranslate.length > 0) {
      console.log(`[번역] 백그라운드 번역 시작 (${toTranslate.length}개)`)
      batchTranslate(toTranslate).then(() => {
        writeCache(responseData)
        console.log('[번역] 완료 — 캐시 업데이트')
      }).catch((e) => console.warn('[번역] 실패:', e))
    }

    return response
  } catch (error) {
    console.error('News fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', message: '뉴스를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
