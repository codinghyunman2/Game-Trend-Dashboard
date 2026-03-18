import { NextRequest, NextResponse } from 'next/server'
import { UpcomingGame } from '@/types/news'
import { fetchUpcomingMobileGames } from '@/lib/igdb'
import { getCache, setCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'upcoming_games'
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6시간

interface UpcomingGamesCache {
  games: UpcomingGame[]
  fetchedAt: string
}

async function translateGameNames(games: UpcomingGame[]): Promise<UpcomingGame[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || games.length === 0) return games

  const toTranslate = games.map((g, i) => ({ idx: i, name: g.name }))

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
          content: `다음 게임 이름을 한국어로 번역해주세요. 고유명사나 브랜드명은 원문을 유지하되, 일반 영어 단어로 구성된 제목은 자연스러운 한국어로 번역해주세요.
JSON 배열로만 응답하세요 (다른 텍스트 없이):
[{ "idx": 0, "nameKo": "번역된 이름" }, ...]

번역할 게임 목록:
${JSON.stringify(toTranslate, null, 2)}`,
        }],
      }),
    })

    if (!res.ok) return games

    const data = await res.json()
    const text = (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const translations: { idx: number; nameKo: string }[] = JSON.parse(text)

    const translated = [...games]
    for (const t of translations) {
      if (t.idx >= 0 && t.idx < translated.length) {
        translated[t.idx] = { ...translated[t.idx], nameKo: t.nameKo }
      }
    }
    return translated
  } catch {
    return games
  }
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

  if (!forceRefresh) {
    const cached = getCache<UpcomingGamesCache>(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  try {
    const rawGames = await fetchUpcomingMobileGames()
    const games = await translateGameNames(rawGames)
    const fetchedAt = new Date().toISOString()

    setCache<UpcomingGamesCache>(CACHE_KEY, { games, fetchedAt }, CACHE_TTL)
    return NextResponse.json({ games, fetchedAt })
  } catch (error) {
    console.error('[upcoming-games] 오류:', error)
    return NextResponse.json(
      { error: 'IGDB 데이터를 가져오는 중 오류가 발생했습니다.', games: [], fetchedAt: new Date().toISOString() },
      { status: 500 }
    )
  }
}
