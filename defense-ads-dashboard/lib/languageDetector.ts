import { MetaAd } from '@/types/ad'

// 개별 문자에 직접 테스트 — pattern.source 재구성 우회, 서로게이트 쌍 대응
function charRatio(text: string, pattern: RegExp): number {
  const chars = Array.from(text) // Unicode code point 단위로 순회
  if (chars.length === 0) return 0
  const count = chars.filter((c) => pattern.test(c)).length
  return count / chars.length
}

const THRESHOLD = 0.05

// CJK 범위: 기본 블록 + Extension A + Compatibility Ideographs
const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/

export function detectCountry(ad: MetaAd): string {
  const combined =
    ad.ad_creative_bodies?.[0] ||
    ad.ad_creative_link_titles?.[0] ||
    ''

  if (!combined.trim()) return 'OTHER'

  const hangulRatio = charRatio(combined, /[\uAC00-\uD7A3\u1100-\u11FF]/)
  if (hangulRatio >= THRESHOLD) return 'KR'

  const hiraganaRatio = charRatio(combined, /[\u3040-\u309F]/)
  const katakanaRatio = charRatio(combined, /[\u30A0-\u30FF]/)
  if (hiraganaRatio + katakanaRatio >= THRESHOLD) return 'JP'

  const cjkRatio = charRatio(combined, CJK_RE)
  if (cjkRatio >= THRESHOLD) return 'TW'

  const latinRatio = charRatio(combined, /[a-zA-Z]/)
  if (latinRatio >= THRESHOLD) return 'US'

  return 'OTHER'
}
