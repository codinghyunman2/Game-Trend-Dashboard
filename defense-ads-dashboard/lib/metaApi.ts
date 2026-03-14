import { MetaAd } from '@/types/ad'

const META_API_URL = 'https://graph.facebook.com/v19.0/ads_archive'
const FIELDS = [
  'id',
  'ad_creative_link_titles',
  'ad_creative_bodies',
  'ad_creative_link_descriptions',
  'ad_snapshot_url',
  'page_name',
  'publisher_platforms',
  'ad_delivery_start_time',
  'ad_delivery_stop_time',
  'impressions',
].join(',')

const MAX_PAGES = 3
const PAGE_LIMIT = 50

export async function fetchAdsByKeyword(
  keyword: string,
  accessToken: string
): Promise<MetaAd[]> {
  const ads: MetaAd[] = []
  let afterCursor: string | null = null

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        access_token: accessToken,
        search_terms: keyword,
        ad_type: 'ALL',
        'ad_reached_countries': '["GB"]',
        fields: FIELDS,
        limit: PAGE_LIMIT.toString(),
      })

      if (afterCursor) {
        params.set('after', afterCursor)
      }

      const fullUrl = `${META_API_URL}?${params.toString()}`
      const safeParams = new URLSearchParams(params)
      safeParams.set('access_token', '[REDACTED]')
      console.log(`[MetaAPI] page=${page} keyword="${keyword}" URL: ${META_API_URL}?${safeParams.toString()}`)

      const response = await fetch(fullUrl)

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        console.error(
          `Meta API error for keyword "${keyword}": ${response.status} ${response.statusText}`,
          JSON.stringify(errBody)
        )
        break
      }

      const data = await response.json()
      console.log(`[MetaAPI] page=${page} keyword="${keyword}" status=${response.status} count=${data.data?.length ?? 0} hasPaging=${!!data.paging?.next}`)

      if (!data.data || data.data.length === 0) {
        break
      }

      const processedAds: MetaAd[] = data.data.map((ad: Record<string, unknown>) => ({
        ...ad,
        hasImpressionData: !!ad.impressions,
      }))

      ads.push(...processedAds)

      // Check for next page
      const nextCursor = data.paging?.cursors?.after
      if (!nextCursor || !data.paging?.next) {
        break
      }
      afterCursor = nextCursor
    }
  } catch (error) {
    console.error(`Error fetching ads for keyword "${keyword}":`, error)
  }

  return ads
}
