import { NextResponse } from 'next/server'
import { ShortsItem, ShortsFetchResponse } from '@/types/viral'

interface CacheEntry {
  data: ShortsFetchResponse
  timestamp: number
}

// Module-level server-side memory cache, TTL 12 hours
const memoryCache: { game: CacheEntry | null; all: CacheEntry | null } = { game: null, all: null }
const CACHE_TTL = 12 * 60 * 60 * 1000

function parseIso8601Duration(duration: string): number {
  // Examples: PT1M30S → 90, PT45S → 45, PT2M → 120
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? '0', 10)
  const minutes = parseInt(match[2] ?? '0', 10)
  const seconds = parseInt(match[3] ?? '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

interface YouTubeSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    publishedAt: string
    thumbnails: {
      high?: { url: string }
      medium?: { url: string }
      default?: { url: string }
    }
  }
}

interface YouTubeVideoItem {
  id: string
  statistics: {
    viewCount?: string
    likeCount?: string
  }
  contentDetails: {
    duration: string
  }
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[]
  error?: { code: number; message: string }
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[]
  error?: { code: number; message: string }
}

export async function GET(request: Request): Promise<NextResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY_NOT_SET', message: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 400 },
    )
  }

  const url = new URL(request.url)
  const tab = (url.searchParams.get('tab') ?? 'game') as 'game' | 'all'
  const query = tab === 'all' ? '#Shorts' : '게임 모바일게임 #Shorts'
  const cacheKey = tab === 'all' ? 'all' : 'game'

  // Serve from memory cache if fresh
  const cached = memoryCache[cacheKey]
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      cachedAt: new Date(cached.timestamp).toISOString(),
    })
  }

  const publishedAfter = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const baseParams = {
    q: query,
    type: 'video',
    videoDuration: 'short',
    publishedAfter,
    maxResults: '50',
    part: 'snippet',
    key: apiKey,
  }

  // 두 검색을 병렬로: 조회수순 + 최신순
  const [searchByViews, searchByDate] = await Promise.all([
    fetch(
      `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({ ...baseParams, order: 'viewCount' }).toString()}`,
      { next: { revalidate: 0 } },
    ).then((r) => r.json() as Promise<YouTubeSearchResponse>),
    fetch(
      `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({ ...baseParams, order: 'date' }).toString()}`,
      { next: { revalidate: 0 } },
    ).then((r) => r.json() as Promise<YouTubeSearchResponse>),
  ])

  // 에러 체크 (둘 중 하나라도 403이면 QUOTA_EXCEEDED)
  for (const searchData of [searchByViews, searchByDate]) {
    if (searchData.error) {
      if (searchData.error.code === 403) {
        return NextResponse.json(
          { error: 'QUOTA_EXCEEDED', message: 'YouTube API 할당량이 초과되었습니다. 내일 다시 시도해주세요.' },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'YOUTUBE_API_ERROR', message: searchData.error.message },
        { status: 500 },
      )
    }
  }

  // 중복 제거 — videoId 기준
  const snippetMap = new Map<string, YouTubeSearchItem>()
  for (const item of [...(searchByViews.items ?? []), ...(searchByDate.items ?? [])]) {
    if (!snippetMap.has(item.id.videoId)) snippetMap.set(item.id.videoId, item)
  }

  if (snippetMap.size === 0) {
    const response: ShortsFetchResponse = { items: [], fetchedAt: new Date().toISOString() }
    return NextResponse.json(response)
  }

  // 최대 100개 videoId를 50개씩 나눠 병렬로 상세 조회
  const allIds = [...snippetMap.keys()]
  const idChunks = [allIds.slice(0, 50), allIds.slice(50, 100)].filter((c) => c.length > 0)

  const videoDetailResults = await Promise.all(
    idChunks.map((chunk) =>
      fetch(
        `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ id: chunk.join(','), part: 'statistics,contentDetails', key: apiKey }).toString()}`,
        { next: { revalidate: 0 } },
      ).then((r) => r.json() as Promise<YouTubeVideosResponse>),
    ),
  )

  for (const videosData of videoDetailResults) {
    if (videosData.error) {
      if (videosData.error.code === 403) {
        return NextResponse.json(
          { error: 'QUOTA_EXCEEDED', message: 'YouTube API 할당량이 초과되었습니다. 내일 다시 시도해주세요.' },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { error: 'YOUTUBE_API_ERROR', message: videosData.error.message },
        { status: 500 },
      )
    }
  }

  const videoDetailsMap = new Map<string, YouTubeVideoItem>()
  for (const videosData of videoDetailResults) {
    for (const video of videosData.items ?? []) {
      videoDetailsMap.set(video.id, video)
    }
  }

  const searchItems = [...snippetMap.values()]

  const items: ShortsItem[] = []

  for (const searchItem of searchItems) {
    const videoId = searchItem.id.videoId
    const details = videoDetailsMap.get(videoId)
    if (!details) continue

    const duration = parseIso8601Duration(details.contentDetails.duration)
    if (duration > 60) continue

    const thumbnailUrl =
      searchItem.snippet.thumbnails.high?.url ??
      searchItem.snippet.thumbnails.medium?.url ??
      searchItem.snippet.thumbnails.default?.url ??
      ''

    items.push({
      id: videoId,
      title: searchItem.snippet.title,
      channelTitle: searchItem.snippet.channelTitle,
      thumbnailUrl,
      viewCount: parseInt(details.statistics.viewCount ?? '0', 10),
      likeCount: parseInt(details.statistics.likeCount ?? '0', 10),
      publishedAt: searchItem.snippet.publishedAt,
      duration,
      youtubeUrl: `https://www.youtube.com/shorts/${videoId}`,
    })
  }

  items.sort((a, b) => b.viewCount - a.viewCount)

  const now = new Date().toISOString()
  const response: ShortsFetchResponse = { items, fetchedAt: now }

  memoryCache[cacheKey] = { data: response, timestamp: Date.now() }

  return NextResponse.json(response)
}
