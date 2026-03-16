import { MetaAd } from '@/types/ad'

const CTA_KEYWORDS = [
  'download', 'play', 'free', 'install', 'get', 'try',
  '지금', '무료', '다운로드', '플레이', '시작', '참여',
]

export function getCopyCount(ad: MetaAd, allAds: MetaAd[]): number {
  const body = ad.ad_creative_bodies?.[0]
  return allAds.filter(
    (a) => a.page_name === ad.page_name && a.ad_creative_bodies?.[0] === body
  ).length
}

export function calculateScore(ad: MetaAd, allAds: MetaAd[]): number {
  let score = 0
  const now = new Date()

  // 1. 최신성 (30점) — ad_delivery_start_time 기준 경과 일수
  if (ad.ad_delivery_start_time) {
    const diffDays = Math.floor(
      (now.getTime() - new Date(ad.ad_delivery_start_time).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays <= 7) score += 30
    else if (diffDays <= 14) score += 23
    else if (diffDays <= 30) score += 15
    else if (diffDays <= 60) score += 8
    else if (diffDays <= 90) score += 3
  }

  // 2. 집행 기간 (30점) — start_time 부터 현재까지 총 일수
  if (ad.ad_delivery_start_time) {
    const runDays = Math.floor(
      (now.getTime() - new Date(ad.ad_delivery_start_time).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (runDays >= 60) score += 30
    else if (runDays >= 30) score += 22
    else if (runDays >= 14) score += 15
    else if (runDays >= 7) score += 8
    else score += 3
  }

  // 3. 동일 소재 집행 수 (25점)
  const copyCount = getCopyCount(ad, allAds)
  if (copyCount >= 5) score += 25
  else if (copyCount >= 3) score += 15
  else if (copyCount >= 2) score += 8

  // 4. 크리에이티브 완성도 (15점)
  const title = ad.ad_creative_link_titles?.[0] ?? ''
  const body = ad.ad_creative_bodies?.[0] ?? ''
  const description = ad.ad_creative_link_descriptions?.[0] ?? ''

  if (title) score += 3
  if (body) score += 3
  if (description) score += 2

  // CTA 키워드 포함 여부 (+4점)
  const combinedText = (title + ' ' + body).toLowerCase()
  if (CTA_KEYWORDS.some((kw) => combinedText.includes(kw))) score += 4

  // 숫자/수치 포함 여부 (+3점)
  if (/\d/.test(body)) score += 3

  return score
}
