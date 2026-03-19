import { NextResponse } from 'next/server'
import { ShortsItem, ShortsFetchResponse } from '@/types/viral'

interface CacheEntry {
  data: ShortsFetchResponse
  timestamp: number
}

// Module-level server-side memory cache, TTL 12 hours
let memoryCache: CacheEntry | null = null
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

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YOUTUBE_API_KEY_NOT_SET', message: 'YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 400 },
    )
  }

  // Serve from memory cache if fresh
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...memoryCache.data,
      cachedAt: new Date(memoryCache.timestamp).toISOString(),
    })
  }

  const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const searchParams = new URLSearchParams({
    q: '게임 모바일게임 #Shorts',
    type: 'video',
    videoDuration: 'short',
    order: 'viewCount',
    publishedAfter,
    maxResults: '20',
    part: 'snippet',
    key: apiKey,
  })

  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    { next: { revalidate: 0 } },
  )

  const searchData: YouTubeSearchResponse = await searchRes.json()

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

  const searchItems = searchData.items ?? []

  if (searchItems.length === 0) {
    const response: ShortsFetchResponse = { items: [], fetchedAt: new Date().toISOString() }
    return NextResponse.json(response)
  }

  const videoIds = searchItems.map((item) => item.id.videoId).join(',')

  const videosParams = new URLSearchParams({
    id: videoIds,
    part: 'statistics,contentDetails',
    key: apiKey,
  })

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`,
    { next: { revalidate: 0 } },
  )

  const videosData: YouTubeVideosResponse = await videosRes.json()

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

  const videoDetailsMap = new Map<string, YouTubeVideoItem>()
  for (const video of videosData.items ?? []) {
    videoDetailsMap.set(video.id, video)
  }

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

  memoryCache = { data: response, timestamp: Date.now() }

  return NextResponse.json(response)
}
