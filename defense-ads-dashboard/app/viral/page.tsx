'use client'

import { useEffect, useState } from 'react'
import { ShortsItem, ShortsFetchResponse } from '@/types/viral'
import ShortsCard from '@/components/viral/ShortsCard'
import LoadingSpinner from '@/components/LoadingSpinner'

const CACHE_KEY_GAME = 'viral_shorts_cache_game'
const CACHE_KEY_ALL = 'viral_shorts_cache_all'
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

function formatLastUpdated(date: Date): string {
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Tab = 'game' | 'all'

const PAGE_SIZE = 8

export default function ViralPage() {
  const [activeTab, setActiveTab] = useState<Tab>('game')
  const [tabData, setTabData] = useState<{ game: ShortsItem[]; all: ShortsItem[] }>({ game: [], all: [] })
  const [tabLoading, setTabLoading] = useState<{ game: boolean; all: boolean }>({ game: true, all: false })
  const [tabError, setTabError] = useState<{ game: string | null; all: string | null }>({ game: null, all: null })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [tabPage, setTabPage] = useState<{ game: number; all: number }>({ game: 1, all: 1 })

  const cacheKeyFor = (tab: Tab) => (tab === 'game' ? CACHE_KEY_GAME : CACHE_KEY_ALL)

  async function fetchShorts(tab: Tab, forceRefresh = false) {
    setTabLoading((prev) => ({ ...prev, [tab]: true }))
    setTabError((prev) => ({ ...prev, [tab]: null }))
    setTabPage((prev) => ({ ...prev, [tab]: 1 }))

    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(cacheKeyFor(tab))
        if (cached) {
          const entry: { data: ShortsFetchResponse; timestamp: number } = JSON.parse(cached)
          if (Date.now() - entry.timestamp < CACHE_TTL) {
            setTabData((prev) => ({ ...prev, [tab]: entry.data.items }))
            if (tab === activeTab) setLastUpdated(new Date(entry.data.fetchedAt))
            setTabLoading((prev) => ({ ...prev, [tab]: false }))
            return
          }
        }
      } catch (e) {
        console.warn('Viral shorts cache read failed:', e)
      }
    }

    try {
      const res = await fetch(`/api/viral-shorts?tab=${tab}`)
      const data = await res.json()

      if (!res.ok) {
        setTabError((prev) => ({ ...prev, [tab]: data.error ?? 'UNKNOWN_ERROR' }))
        setTabLoading((prev) => ({ ...prev, [tab]: false }))
        return
      }

      const response: ShortsFetchResponse = data
      setTabData((prev) => ({ ...prev, [tab]: response.items }))
      if (tab === activeTab) setLastUpdated(new Date(response.fetchedAt))

      try {
        sessionStorage.setItem(cacheKeyFor(tab), JSON.stringify({ data: response, timestamp: Date.now() }))
      } catch (e) {
        console.warn('Viral shorts cache write failed:', e)
      }
    } catch (e) {
      console.error('Viral shorts fetch error:', e)
      setTabError((prev) => ({ ...prev, [tab]: 'NETWORK_ERROR' }))
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }))
    }
  }

  useEffect(() => {
    fetchShorts('game')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    if (tabData[tab].length === 0 && !tabLoading[tab] && !tabError[tab]) {
      fetchShorts(tab)
    }
  }

  const isLoading = tabLoading[activeTab]
  const error = tabError[activeTab]
  const items = tabData[activeTab]
  const currentPage = tabPage[activeTab]
  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function setPage(page: number) {
    setTabPage((prev) => ({ ...prev, [activeTab]: page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
              오늘의 YouTube API 요청 할당량이 소진되었습니다. <br /> 내일 UTC 00:00 이후 다시 시도해주세요.
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
          <h1 className="text-2xl font-bold text-theme-text">바이럴 Shorts</h1>
          <button
            onClick={() => fetchShorts(activeTab, true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {isLoading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
        <p className="text-sm mb-4 text-theme-secondary">최근 14일 인기 YouTube Shorts (조회수 Top)</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--color-surface)' }}>
          {(['game', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="px-5 py-2 rounded-md text-sm font-medium transition-colors"
              style={
                activeTab === tab
                  ? { background: 'var(--color-accent)', color: '#fff' }
                  : { color: 'var(--color-secondary)' }
              }
            >
              {tab === 'game' ? '게임' : '전체'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSpinner variant="viral" />
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
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pagedItems.map((item) => (
                <ShortsCard key={item.id} item={item} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                >
                  ← 이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: p === currentPage ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: p === currentPage ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                >
                  다음 →
                </button>
              </div>
            )}
          </>
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
