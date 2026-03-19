export interface ShortsItem {
  id: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  publishedAt: string  // ISO8601
  duration: number     // seconds
  youtubeUrl: string   // https://www.youtube.com/shorts/{id}
}

export interface ShortsFetchResponse {
  items: ShortsItem[]
  fetchedAt: string
  cachedAt?: string
}
