export interface UpcomingGame {
  title: string
  titleKo: string
  releaseDate: string | null
  platform: string[]
  source: string
  link: string
  pubDate: string
}

const UPCOMING_KEYWORDS_EN = [
  'launches', 'release date', 'coming soon', 'out now',
  'available now', 'soft launch', 'global launch',
  'pre-register', 'pre-registration', 'releasing',
]

const UPCOMING_KEYWORDS_KO = [
  '출시', '런칭', '사전예약', '정식 출시', '글로벌 출시',
]

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
}

export function isUpcomingKeyword(text: string): boolean {
  const lower = text.toLowerCase()
  for (const kw of UPCOMING_KEYWORDS_EN) {
    if (lower.includes(kw)) return true
  }
  for (const kw of UPCOMING_KEYWORDS_KO) {
    if (text.includes(kw)) return true
  }
  return false
}

export function parseReleaseDate(text: string): string | null {
  const lower = text.toLowerCase()

  // "this week" / "이번 주"
  if (lower.includes('this week') || text.includes('이번 주')) return '이번 주'

  // English: "March 20", "March 20, 2025"
  const enMatch = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s*\d{4})?\b/)
  if (enMatch) {
    const month = MONTH_MAP[enMatch[1]]
    const day = parseInt(enMatch[2], 10)
    if (month && day >= 1 && day <= 31) {
      return `${month}월 ${day}일`
    }
  }

  // Korean: "3월 20일"
  const koMatch = text.match(/(\d{1,2})월\s*(\d{1,2})일/)
  if (koMatch) {
    return `${koMatch[1]}월 ${koMatch[2]}일`
  }

  return null
}

export function detectPlatform(text: string): string[] {
  const lower = text.toLowerCase()
  const platforms: string[] = []

  if (lower.includes('ios') || lower.includes('app store') || lower.includes('iphone') || lower.includes('ipad')) {
    platforms.push('iOS')
  }
  if (lower.includes('android') || lower.includes('google play') || lower.includes('apk')) {
    platforms.push('Android')
  }

  return platforms.length > 0 ? platforms : ['모바일']
}

interface NewsItemLike {
  title: string
  titleKo: string
  summary: string
  summaryKo: string
  link: string
  pubDate: string
  source: string
}

export function detectUpcomingGames(items: NewsItemLike[]): UpcomingGame[] {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const seen = new Set<string>()
  const games: UpcomingGame[] = []

  for (const item of items) {
    // 7일 이내 기사만
    try {
      if (new Date(item.pubDate) < sevenDaysAgo) continue
    } catch {
      continue
    }

    const combinedText = `${item.title} ${item.summary}`
    if (!isUpcomingKeyword(combinedText)) continue

    // 중복 제거 (제목 앞 30자 기준)
    const dedupKey = item.title.slice(0, 30).toLowerCase().trim()
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)

    const releaseDate = parseReleaseDate(combinedText)
    const platform = detectPlatform(combinedText)

    games.push({
      title: item.title,
      titleKo: item.titleKo || item.title,
      releaseDate,
      platform,
      source: item.source,
      link: item.link,
      pubDate: item.pubDate,
    })
  }

  // 최신순 정렬, 최대 10개
  games.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  return games.slice(0, 10)
}
