export interface MetaAdImpression {
  lower_bound: string
  upper_bound: string
}

export interface MetaAd {
  id: string
  ad_creative_link_titles?: string[]
  ad_creative_bodies?: string[]
  ad_creative_link_descriptions?: string[]
  ad_snapshot_url?: string
  page_name?: string
  publisher_platforms?: string[]
  ad_delivery_start_time?: string
  ad_delivery_stop_time?: string
  impressions?: MetaAdImpression
  hasImpressionData: boolean
  score?: number
  copyCount?: number
  detectedCountry?: string
}

export interface AdAnalysis {
  rank: number
  score: number
  title: string
  game_name: string
  summary: string
  hook: string
  strengths: string[]
  ad_snapshot_url?: string
}

export interface FetchAdsResponse {
  ads: MetaAd[]
  uniqueAds: MetaAd[]
  fetchedAt: string
  cachedAt: string
  keywords: string[]
}

export interface CacheEntry {
  data: FetchAdsResponse
  timestamp: number
}
