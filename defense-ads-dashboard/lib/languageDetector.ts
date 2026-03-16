import { MetaAd } from '@/types/ad'

export function detectCountry(ad: MetaAd): string {
  const texts = [
    ...(ad.ad_creative_bodies ?? []),
    ...(ad.ad_creative_link_titles ?? []),
    ...(ad.ad_creative_link_descriptions ?? []),
  ]
  const combined = texts.join(' ')

  if (!combined.trim()) return 'OTHER'

  const hasHangul = /[\uAC00-\uD7A3\u1100-\u11FF]/.test(combined)
  if (hasHangul) return 'KR'

  const hasHiragana = /[\u3040-\u309F]/.test(combined)
  const hasKatakana = /[\u30A0-\u30FF]/.test(combined)
  if (hasHiragana || hasKatakana) return 'JP'

  const hasCJK = /[\u4E00-\u9FFF]/.test(combined)
  if (hasCJK) return 'TW'

  const hasLatin = /[a-zA-Z]/.test(combined)
  if (hasLatin) return 'US'

  return 'OTHER'
}
