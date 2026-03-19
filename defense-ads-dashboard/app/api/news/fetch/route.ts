import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { NewsItem, NewsFetchResponse } from '@/types/news'
import { getCache, setCache } from '@/lib/cache'
import { extractClientIp, createRateLimiter, auditLog } from '@/lib/security'

export const dynamic = 'force-dynamic'

const NEWS_CACHE_KEY = 'news_data'
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 3 // 3시간

// 10 req/min per IP
const rateLimiter = createRateLimiter(60_000, 10)

interface NewsCachePayload {
  data: NewsFetchResponse
  cachedAt: string
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

  // 모바일 게임 출시 정보
  { key: 'toucharcade', name: 'TouchArcade', url: 'https://toucharcade.com/feed/', isKorean: false },
  { key: 'pocketgamer', name: 'Pocket Gamer', url: 'https://www.pocketgamer.com/rss/', isKorean: false },
  { key: 'pocketgamer_biz', name: 'PocketGamer.biz', url: 'https://www.pocketgamer.biz/feed/', isKorean: false },
  { key: 'gamingonphone', name: 'GamingOnPhone', url: 'https://gamingonphone.com/feed/', isKorean: false },
] as const

type RSSSource = typeof RSS_SOURCES[number]

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
}

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
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
    textNodeName: '__text',
    isArray: (name) => name === 'item' || name === 'entry',
  })

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(xml) as Record<string, unknown>
  } catch {
    return []
  }

  // Support RSS 2.0 (rss > channel > item[]) and Atom (feed > entry[])
  const rss = parsed?.rss as Record<string, unknown> | undefined
  const channel = (rss?.channel ?? parsed?.feed ?? {}) as Record<string, unknown>
  const rawItems = (channel.item ?? channel.entry ?? []) as unknown[]

  const items: NewsItem[] = []

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as Record<string, unknown>

    // Extract text, handling CDATA wrapper objects from fast-xml-parser
    const extractText = (val: unknown): string => {
      if (typeof val === 'string') return val.trim()
      if (typeof val === 'number') return String(val)
      if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if (typeof obj.__cdata === 'string') return obj.__cdata.trim()
        if (typeof obj.__text === 'string') return obj.__text.trim()
      }
      return ''
    }

    // Atom feeds use <id> + <link href="..."> instead of <link> text
    const extractLink = (): string => {
      const linkVal = entry.link
      if (typeof linkVal === 'string') return linkVal.trim()
      if (typeof linkVal === 'number') return String(linkVal)
      if (linkVal && typeof linkVal === 'object') {
        const linkObj = linkVal as Record<string, unknown>
        // Atom: <link href="..." rel="alternate"/>
        if (typeof linkObj['@_href'] === 'string') return linkObj['@_href'].trim()
        if (typeof linkObj.__cdata === 'string') return linkObj.__cdata.trim()
        if (typeof linkObj.__text === 'string') return linkObj.__text.trim()
      }
      return ''
    }

    const title = decodeHtmlEntities(extractText(entry.title))
    const link = extractLink() || extractText(entry.id)
    const pubDateStr = extractText(entry.pubDate ?? entry.published ?? entry.updated ?? '')
    const description = extractText(entry.description ?? entry.summary ?? entry.content ?? '')

    if (!title || !link) continue

    // Strip HTML from description before storing (XSS defence for any future rendering)
    const plainDescription = description.replace(/<[^>]+>/g, '')

    const pubDate = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString()
    const summary = decodeHtmlEntities(plainDescription.slice(0, 200))

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
    if (!res.ok) return { source, items: [], error: `HTTP ${res.status}` }
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

  const translationInput = items.map((item, i) => ({
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
          content: `Translate the following gaming industry news titles and summaries into Korean. Respond with a JSON array.
Input format: [{ idx, title, summary }]
Output format: [{ idx, titleKo, summaryKo }]

Items to translate:
${JSON.stringify(translationInput, null, 2)}

Output JSON array only. Pure JSON, no markdown code blocks.`,
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

    for (let i = 0; i < items.length; i++) {
      const trans = translationMap.get(i)
      if (trans) {
        items[i].titleKo = trans.titleKo
        items[i].summaryKo = trans.summaryKo
      }
    }
  } catch {
    // Translation failure: keep originals
  }

  return items
}

export async function GET(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/news/fetch')
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

  if (!forceRefresh) {
    const cached = getCache<NewsCachePayload>(NEWS_CACHE_KEY)
    if (cached) {
      return NextResponse.json({ ...cached.data, cachedAt: cached.cachedAt })
    }
  }

  try {
    const results = await Promise.all(RSS_SOURCES.map((source) => fetchRSSFeed(source)))

    let allNews: NewsItem[] = []
    for (const result of results) {
      allNews.push(...result.items)
    }

    // Filter last 3 days
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    allNews = allNews.filter((item) => {
      try { return new Date(item.pubDate) >= threeDaysAgo } catch { return false }
    })

    // Deduplicate by title prefix + sourceKey
    const seen = new Set<string>()
    allNews = allNews.filter((item) => {
      const key = `${item.title.slice(0, 50)}_${item.sourceKey}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by date descending
    allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    // 번역 대상: 상위 10개 중 비한국어
    const translateCandidateIds = new Set<string>(allNews.slice(0, 10).map((n) => n.id))

    // Group by channel
    const byChannel: Record<string, NewsItem[]> = {}
    for (const source of RSS_SOURCES) {
      byChannel[source.key] = []
    }
    for (const item of allNews) {
      byChannel[item.sourceKey].push(item)
    }
    for (const key of Object.keys(byChannel)) {
      if (byChannel[key].length === 0) delete byChannel[key]
    }

    const responseData: NewsFetchResponse = {
      allNews,
      byChannel,
      fetchedAt: new Date().toISOString(),
    }

    // Await translation before returning so the response includes translated fields
    const toTranslate = allNews.filter((n) => !n.isKorean && translateCandidateIds.has(n.id))
    if (toTranslate.length > 0) {
      await batchTranslate(toTranslate)
    }

    const cachedAt = new Date().toISOString()
    setCache<NewsCachePayload>(NEWS_CACHE_KEY, { data: responseData, cachedAt }, NEWS_CACHE_TTL)

    return NextResponse.json({ ...responseData, cachedAt })
  } catch {
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: '뉴스를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
