import { detectCountry } from '../lib/languageDetector'
import type { MetaAd } from '../types/ad'

function makeAd(body: string): MetaAd {
  return { id: 'test', hasImpressionData: false, ad_creative_bodies: [body] }
}

describe('detectCountry', () => {
  test('번체 한자 → TW', () => {
    expect(detectCountry(makeAd('300萬玩家一致推薦！2025年度最佳人氣遊戲。'))).toBe('TW')
  })

  test('영어 → US', () => {
    expect(detectCountry(makeAd('Build your guild and stop the invasion.'))).toBe('US')
  })

  test('한국어 → KR', () => {
    expect(detectCountry(makeAd('독특한 레시피로 적을 물리치고 주방을 지켜라!'))).toBe('KR')
  })

  test('일본어 히라가나/한자 혼합 → JP', () => {
    expect(detectCountry(makeAd('ギルドを作って敵を倒せ！'))).toBe('JP')
  })

  test('한국어 + 숫자 → KR', () => {
    expect(detectCountry(makeAd('300만 플레이어 추천！'))).toBe('KR')
  })

  test('텍스트 없음 → OTHER', () => {
    expect(detectCountry(makeAd(''))).toBe('OTHER')
  })

  test('숫자/특수문자만 → OTHER', () => {
    expect(detectCountry(makeAd('12345 !!!'))).toBe('OTHER')
  })
})
