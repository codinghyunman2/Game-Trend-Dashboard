import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { detectCountry } from '../lib/languageDetector'
import type { MetaAd } from '../types/ad'

function makeAd(body: string): MetaAd {
  return { id: 'test', hasImpressionData: false, ad_creative_bodies: [body] }
}

test('번체 한자 → TW', () => {
  const result = detectCountry(makeAd('300萬玩家一致推薦！2025年度最佳人氣遊戲。'))
  assert.equal(result, 'TW')
})

test('영어 → US', () => {
  const result = detectCountry(makeAd('Build your guild and stop the invasion.'))
  assert.equal(result, 'US')
})

test('한국어 → KR', () => {
  const result = detectCountry(makeAd('독특한 레시피로 적을 물리치고 주방을 지켜라!'))
  assert.equal(result, 'KR')
})

test('일본어 히라가나/한자 혼합 → JP', () => {
  const result = detectCountry(makeAd('ギルドを作って敵を倒せ！'))
  assert.equal(result, 'JP')
})

test('한국어 + 숫자 → KR', () => {
  const result = detectCountry(makeAd('300만 플레이어 추천！'))
  assert.equal(result, 'KR')
})

test('텍스트 없음 → OTHER', () => {
  const result = detectCountry(makeAd(''))
  assert.equal(result, 'OTHER')
})

test('숫자/특수문자만 → OTHER', () => {
  const result = detectCountry(makeAd('12345 !!!'))
  assert.equal(result, 'OTHER')
})
