'use client'

import { useEffect, useState } from 'react'
import { ShortsItem, ShortsFetchResponse } from '@/types/viral'
import ShortsCard from '@/components/viral/ShortsCard'
import LoadingSpinner from '@/components/LoadingSpinner'

const CACHE_KEY = 'viral_shorts_cache'
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

function formatLastUpdated(date: Date): string {
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ViralPage() {
  const [items, setItems] = useState<ShortsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function fetchShorts(forceRefresh = false) {
    setIsLoading(true)
    setError(null)

    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const entry: { data: ShortsFetchResponse; timestamp: number } = JSON.parse(cached)
          if (Date.now() - entry.timestamp < CACHE_TTL) {
            setItems(entry.data.items)
            setLastUpdated(new Date(entry.data.fetchedAt))
            setIsLoading(false)
            return
          }
        }
      } catch (e) {
        console.warn('Viral shorts cache read failed:', e)
      }
    }

    try {
      const res = await fetch('/api/viral-shorts')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'UNKNOWN_ERROR')
        setIsLoading(false)
        return
      }

      const response: ShortsFetchResponse = data
      setItems(response.items)
      setLastUpdated(new Date(response.fetchedAt))

      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: response, timestamp: Date.now() }))
      } catch (e) {
        console.warn('Viral shorts cache write failed:', e)
      }
    } catch (e) {
      console.error('Viral shorts fetch error:', e)
      setError('NETWORK_ERROR')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShorts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderError() {
    if (error === 'YOUTUBE_API_KEY_NOT_SET') {
      return (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div
            className="max-w-lg w-full rounded-xl p-8 bg-theme-card border border-theme-border"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <h2 className="text-xl font-bold mb-4 text-theme-text">YouTube API 키 설정 필요</h2>
            <p className="mb-4 text-theme-secondary">
              바이럴 Shorts 데이터를 가져오려면 YouTube Data API v3 키가 필요합니다.
            </p>
            <div className="rounded-lg p-4 text-sm font-mono bg-theme-surface">
              <p className="mb-2 text-theme-secondary"># .env.local 파일에 추가:</p>
              <p className="text-theme-text">YOUTUBE_API_KEY=여기에_API_키_입력</p>
            </div>
            <div className="mt-4 text-sm space-y-1 text-theme-secondary">
              <p>1. <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-theme-accent">Google Cloud Console</a>에서 프로젝트를 생성하세요.</p>
              <p>2. YouTube Data API v3를 활성화하세요.</p>
              <p>3. API 키를 발급받아 .env.local에 저장하세요.</p>
              <p>4. 서버를 재시작하세요.</p>
            </div>
          </div>
        </div>
      )
    }

    if (error === 'QUOTA_EXCEEDED') {
      return (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div
            className="max-w-lg w-full rounded-xl p-8 text-center bg-theme-card border border-theme-border"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <p className="text-2xl mb-3">⏳</p>
            <h2 className="text-lg font-bold mb-2 text-theme-text">YouTube API 할당량 초과</h2>
            <p className="text-theme-secondary">
              오늘의 YouTube API 요청 할당량이 소진되었습니다. 내일 UTC 00:00 이후 다시 시도해주세요.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div
          className="max-w-lg w-full rounded-xl p-8 text-center bg-theme-card"
          style={{ border: '1px solid rgba(239,68,68,0.3)', boxShadow: 'var(--card-shadow)' }}
        >
          <p className="text-red-400 text-lg mb-2">오류 발생</p>
          <p className="text-theme-secondary">데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-theme-text">🎬 바이럴 Shorts</h1>
          <button
            onClick={() => fetchShorts(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {isLoading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
        <p className="text-sm mb-8 text-theme-secondary">최근 30일 인기 게임 YouTube Shorts</p>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          renderError()
        ) : items.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center bg-theme-card border border-theme-border"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <p className="text-lg mb-2 text-theme-secondary">결과 없음</p>
            <p className="text-sm text-theme-secondary">현재 조건에 맞는 Shorts 영상이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ShortsCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {lastUpdated && (
          <p className="mt-8 text-xs text-center text-theme-secondary">
            업데이트: {formatLastUpdated(lastUpdated)}
          </p>
        )}
      </div>
    </div>
  )
}
