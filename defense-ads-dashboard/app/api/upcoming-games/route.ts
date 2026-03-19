import { NextRequest, NextResponse } from 'next/server'
import { UpcomingGame } from '@/types/news'
import { fetchUpcomingMobileGames } from '@/lib/igdb'
import { getCache, setCache } from '@/lib/cache'
import { extractClientIp, createRateLimiter, auditLog } from '@/lib/security'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'upcoming_games'
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6시간

// 10 req/min per IP
const rateLimiter = createRateLimiter(60_000, 10)

interface UpcomingGamesCache {
  games: UpcomingGame[]
  fetchedAt: string
}

// ─── 게임메카 ────────────────────────────────────────────────────────────────

interface GamemecaGame {
  gmid: string
  gm_platform_1st: string
  gm_platform_1st_array: string[]
  title: string
  symd: string   // YYYYMMDD
  period: string // YYYY.MM.DD
  seq: number
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function formatDateLabel(releaseDate: string): string {
  const release = new Date(releaseDate)
  const m = release.getMonth() + 1
  const d = release.getDate()
  const day = DAY_NAMES[release.getDay()]
  return `${m}/${d}(${day})`
}

function extractPlatformsFromTitle(title: string): string[] {
  const platforms: string[] = []
  if (/iOS|아이폰|아이패드/i.test(title)) platforms.push('iOS')
  if (/Android|안드로이드/i.test(title)) platforms.push('Android')
  return platforms.length > 0 ? platforms : ['모바일']
}

function cleanGameTitle(title: string): string {
  return title.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

async function fetchGamemecaGames(): Promise<UpcomingGame[]> {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
  const fourteenDaysLater = new Date(now)
  fourteenDaysLater.setUTCDate(now.getUTCDate() + 14)
  const fourteenStr = `${fourteenDaysLater.getUTCFullYear()}${pad(fourteenDaysLater.getUTCMonth() + 1)}${pad(fourteenDaysLater.getUTCDate())}`

  const months: string[] = []
  const ym1 = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}`
  months.push(ym1)
  if (fourteenDaysLater.getUTCMonth() !== now.getUTCMonth()) {
    const ym2 = `${fourteenDaysLater.getUTCFullYear()}${pad(fourteenDaysLater.getUTCMonth() + 1)}`
    months.push(ym2)
  }

  const games: UpcomingGame[] = []

  for (const ym of months) {
    try {
      const res = await fetch(
        `https://www.gamemeca.com/json.php?rts=json/index/gmdb_schedule&type=list&ym=${ym}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.gamemeca.com/game.php?rts=schedule' } },
      )
      if (!res.ok) continue

      const data: GamemecaGame[] | null = await res.json()
      if (!Array.isArray(data)) continue

      for (const g of data) {
        if (!g.gm_platform_1st_array?.includes('178')) continue
        if (!g.symd || g.symd < todayStr || g.symd > fourteenStr) continue

        const releaseDate = `${g.symd.slice(0, 4)}-${g.symd.slice(4, 6)}-${g.symd.slice(6, 8)}`
        const name = cleanGameTitle(g.title)

        games.push({
          id: g.gmid,
          name,
          nameKo: name,
          genres: [],
          releaseDate,
          releaseDateLabel: formatDateLabel(releaseDate),
          platform: extractPlatformsFromTitle(g.title),
          link: `https://www.gamemeca.com/game.php?gmid=${g.gmid}`,
          source: 'gamemeca',
        })
      }
    } catch (e) {
      console.error(`[upcoming-games] 게임메카 ${ym} 파싱 오류:`, e)
    }
  }

  return games
}

// ─── 중복 제거 ────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
}

function isSimilarName(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}

function mergeGames(igdbGames: UpcomingGame[], gamemecaGames: UpcomingGame[]): UpcomingGame[] {
  const filteredIgdb = igdbGames.filter(
    (ig) => !gamemecaGames.some((gm) => isSimilarName(ig.name, gm.name) || isSimilarName(ig.nameKo, gm.nameKo)),
  )
  return [...gamemecaGames, ...filteredIgdb]
}

// ─── 번역 ─────────────────────────────────────────────────────────────────────

async function translateGameNames(games: UpcomingGame[]): Promise<UpcomingGame[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const targets = games
    .map((g, i) => ({ idx: i, name: g.name, genres: g.genres, source: g.source }))
    .filter((t) => t.source === 'igdb')

  if (!apiKey || targets.length === 0) return games

  const input = targets.map(({ idx, name, genres }) => ({ idx, name, genres }))

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
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Translate the following mobile game names and genres into Korean.

Rules:
- Game titles: use the Korean transliteration common in the Korean gaming community (e.g., Fortnite → 포트나이트)
- Use the official Korean title if one exists
- Prefer natural Korean expressions over literal translations
- Genre names: use Korean gaming community conventions (e.g., Battle Royale → 배틀로얄, RPG → RPG unchanged)
- If no translation is needed, return the original text

Return JSON array only (no other text):
[{ "idx": 0, "nameKo": "Korean game name", "genresKo": ["genre1", "genre2"] }]

Source:
${JSON.stringify(input, null, 2)}`,
        }],
      }),
    })

    if (!res.ok) return games

    const data = await res.json()
    const text = (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const translations: { idx: number; nameKo: string; genresKo: string[] }[] = JSON.parse(text)

    const translated = [...games]
    for (const t of translations) {
      if (t.idx >= 0 && t.idx < translated.length) {
        translated[t.idx] = {
          ...translated[t.idx],
          nameKo: t.nameKo ?? translated[t.idx].nameKo,
          genres: t.genresKo?.length ? t.genresKo : translated[t.idx].genres,
        }
      }
    }
    return translated
  } catch {
    return games
  }
}

// ─── 정렬 ─────────────────────────────────────────────────────────────────────

function sortGames(games: UpcomingGame[]): UpcomingGame[] {
  return [...games].sort((a, b) => {
    if (a.releaseDate !== b.releaseDate) return a.releaseDate.localeCompare(b.releaseDate)
    if (a.source === 'gamemeca' && b.source !== 'gamemeca') return -1
    if (b.source === 'gamemeca' && a.source !== 'gamemeca') return 1
    return 0
  })
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/upcoming-games')
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
    const cached = getCache<UpcomingGamesCache>(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  try {
    const [igdbRaw, gamemecaGames] = await Promise.all([
      fetchUpcomingMobileGames(),
      fetchGamemecaGames(),
    ])

    const merged = mergeGames(igdbRaw, gamemecaGames)
    const translated = await translateGameNames(merged)
    const games = sortGames(translated)
    const fetchedAt = new Date().toISOString()

    setCache<UpcomingGamesCache>(CACHE_KEY, { games, fetchedAt }, CACHE_TTL)
    return NextResponse.json({ games, fetchedAt })
  } catch (err) {
    console.error('[upcoming-games] 500 error:', err)
    return NextResponse.json(
      { error: 'FETCH_ERROR', games: [], fetchedAt: new Date().toISOString() },
      { status: 500 },
    )
  }
}
