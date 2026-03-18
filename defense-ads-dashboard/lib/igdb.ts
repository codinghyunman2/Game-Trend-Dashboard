import { UpcomingGame } from '@/types/news'

const IGDB_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_API_URL = 'https://api.igdb.com/v4/release_dates'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken
  }

  const clientId = process.env.IGDB_CLIENT_ID
  const clientSecret = process.env.IGDB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('IGDB_CLIENT_ID 또는 IGDB_CLIENT_SECRET 환경변수가 설정되지 않았습니다.')
  }

  const res = await fetch(IGDB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!res.ok) {
    throw new Error(`Twitch OAuth 토큰 발급 실패: ${res.status}`)
  }

  const data: { access_token: string; expires_in: number } = await res.json()
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return tokenCache.accessToken
}

function formatReleaseDateLabel(unixTimestamp: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const releaseDate = new Date(unixTimestamp * 1000)
  releaseDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '내일'
  if (diffDays > 1) return `${diffDays}일 후`

  const m = releaseDate.getMonth() + 1
  const d = releaseDate.getDate()
  return `${m}월 ${d}일`
}

function formatReleaseDateISO(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString().slice(0, 10)
}

function normalizeIgdbCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const normalized = url.startsWith('//') ? `https:${url}` : url
  return normalized.replace('/t_thumb/', '/t_cover_big/')
}

interface IGDBReleaseDate {
  id: number
  date: number
  platform: { id: number; name: string }
  game: {
    id: number
    name: string
    cover?: { url: string }
    genres?: { name: string }[]
    summary?: string
  }
}

export async function fetchUpcomingMobileGames(): Promise<UpcomingGame[]> {
  const clientId = process.env.IGDB_CLIENT_ID
  if (!clientId) return []

  const token = await getAccessToken()

  const now = Math.floor(Date.now() / 1000)
  const sevenDaysLater = now + 7 * 24 * 60 * 60

  const body = `fields game.name, game.cover.url, game.genres.name, game.summary, date, platform.name;
where platform = (34, 39)
& date >= ${now}
& date <= ${sevenDaysLater};
sort date asc;
limit 20;`

  const res = await fetch(IGDB_API_URL, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })

  if (!res.ok) {
    throw new Error(`IGDB API 요청 실패: ${res.status}`)
  }

  const releaseDates: IGDBReleaseDate[] = await res.json()
  console.log('[igdb] raw response:', JSON.stringify(releaseDates, null, 2))

  // 게임 ID 기준 중복 제거 + 플랫폼 병합
  const gameMap = new Map<number, {
    releaseDateTs: number
    platforms: string[]
    game: IGDBReleaseDate['game']
  }>()

  for (const rd of releaseDates) {
    if (!rd.game || !rd.date) continue

    // IGDB 실제 매핑: id=34 → Android, id=39 → iOS
    // platform.name을 그대로 사용하여 오매핑 방지
    const platformName = rd.platform?.name ?? '모바일'
    const platformLabel = platformName === 'iOS' ? 'iOS'
      : platformName === 'Android' ? 'Android'
      : platformName

    const existing = gameMap.get(rd.game.id)
    if (existing) {
      if (!existing.platforms.includes(platformLabel)) {
        existing.platforms.push(platformLabel)
      }
      if (rd.date < existing.releaseDateTs) {
        existing.releaseDateTs = rd.date
      }
    } else {
      gameMap.set(rd.game.id, {
        releaseDateTs: rd.date,
        platforms: [platformLabel],
        game: rd.game,
      })
    }
  }

  const games: UpcomingGame[] = Array.from(gameMap.values()).map(({ releaseDateTs, platforms, game }) => ({
    id: String(game.id),
    name: game.name,
    nameKo: game.name,
    coverUrl: normalizeIgdbCoverUrl(game.cover?.url ?? null),
    genres: (game.genres ?? []).map((g) => g.name).slice(0, 3),
    releaseDate: formatReleaseDateISO(releaseDateTs),
    releaseDateLabel: formatReleaseDateLabel(releaseDateTs),
    platform: platforms,
    link: `https://www.igdb.com/games/${game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    source: 'igdb' as const,
  }))

  games.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))

  return games
}
