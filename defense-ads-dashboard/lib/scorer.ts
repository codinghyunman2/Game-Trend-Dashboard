import { MetaAd } from '@/types/ad'

export function calculateScore(ad: MetaAd): number {
  let score = 0

  // 1. 최신성 (50점)
  if (ad.ad_delivery_start_time) {
    const startDate = new Date(ad.ad_delivery_start_time)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays <= 7) score += 50
    else if (diffDays <= 14) score += 40
    else if (diffDays <= 30) score += 30
    else if (diffDays <= 60) score += 15
    else if (diffDays <= 90) score += 5
  }

  // 2. 노출수 (30점) - impressions 있는 경우만
  if (ad.hasImpressionData && ad.impressions) {
    const lowerBound = parseInt(ad.impressions.lower_bound, 10) || 0

    if (lowerBound >= 1_000_000) score += 30
    else if (lowerBound >= 500_000) score += 22
    else if (lowerBound >= 100_000) score += 15
    else if (lowerBound >= 10_000) score += 8
    else score += 3
  }

  // 3. 크리에이티브 완성도 (20점)
  if (ad.ad_creative_link_titles?.[0]) score += 7
  if (ad.ad_creative_bodies?.[0]) score += 7
  if (ad.ad_creative_link_descriptions?.[0]) score += 6

  return score
}
