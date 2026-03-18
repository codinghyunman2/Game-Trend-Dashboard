'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { NewsItem, AnalyzedNews, NewsFetchResponse, NewsCacheEntry, UpcomingGame } from '@/types/news'
import NewsTop5 from '@/components/news/NewsTop5'
import NewsCard from '@/components/news/NewsCard'
import ChannelTabs from '@/components/news/ChannelTabs'
import NewsListItem from '@/components/news/NewsListItem'
import UpcomingGames from '@/components/news/UpcomingGames'
import LoadingSpinner from '@/components/LoadingSpinner'

const NEWS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const NEWS_CACHE_KEY = 'news_cache'

function formatLastUpdated(date: Date): string {
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NewsHub() {
  const [newsData, setNewsData] = useState<NewsFetchResponse | null>(null)
  const [analyzedTop5, setAnalyzedTop5] = useState<AnalyzedNews[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const hasInitializedChannel = useRef(false)
  const [channelPages, setChannelPages] = useState<Record<string, number>>({})
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([])
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(true)

  const fetchAnalysis = useCallback(async (allNews: NewsItem[], cacheTimestamp?: number) => {
    if (allNews.length === 0) return
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/news/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news: allNews.slice(0, 20) }),
      })
      if (res.ok) {
        const data: AnalyzedNews[] = await res.json()
        setAnalyzedTop5(data)
        // 분석 결과를 뉴스 캐시에 함께 저장
        if (cacheTimestamp !== undefined) {
          try {
            const cached = sessionStorage.getItem(NEWS_CACHE_KEY)
            if (cached) {
              const entry: NewsCacheEntry = JSON.parse(cached)
              if (entry.timestamp === cacheTimestamp) {
                entry.analyzedTop5 = data
                sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(entry))
              }
            }
          } catch (e) {
            console.warn('Analysis cache write failed:', e)
          }
        }
      }
    } catch {
      // Analysis failure is non-critical
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const fetchNews = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)
    setAnalyzedTop5([])

    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(NEWS_CACHE_KEY)
        if (cached) {
          const entry: NewsCacheEntry = JSON.parse(cached)
          if (Date.now() - entry.timestamp < NEWS_CACHE_TTL) {
            setNewsData(entry.data)
            setLastUpdated(new Date(entry.timestamp))
            setIsLoading(false)
            // Set default channel
            const channels = Object.keys(entry.data.byChannel)
            if (channels.length > 0 && !hasInitializedChannel.current) {
              hasInitializedChannel.current = true
              setSelectedChannel(channels[0])
            }
            if (entry.analyzedTop5 && entry.analyzedTop5.length > 0) {
              setAnalyzedTop5(entry.analyzedTop5)
            } else {
              fetchAnalysis(entry.data.allNews, entry.timestamp)
            }
            return
          }
        }
      } catch (e) {
        console.warn('News cache read failed:', e)
      }
    }

    try {
      const url = forceRefresh ? '/api/news/fetch?refresh=true' : '/api/news/fetch'
      const res = await fetch(url)
      if (!res.ok) {
        setError('뉴스를 가져오는 중 오류가 발생했습니다.')
        setIsLoading(false)
        return
      }

      const data: NewsFetchResponse = await res.json()
      setNewsData(data)

      const updatedTime = data.cachedAt ? new Date(data.cachedAt) : new Date()
      setLastUpdated(updatedTime)

      // Set default channel
      const channels = Object.keys(data.byChannel)
      if (channels.length > 0 && !hasInitializedChannel.current) {
        hasInitializedChannel.current = true
        setSelectedChannel(channels[0])
      }

      const newTimestamp = Date.now()
      try {
        const entry: NewsCacheEntry = { data, timestamp: newTimestamp }
        sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(entry))
      } catch (e) {
        console.warn('News cache write failed:', e)
      }

      setIsLoading(false)
      fetchAnalysis(data.allNews, newTimestamp)
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }
  }, [fetchAnalysis])

  const fetchUpcomingGames = useCallback(async (forceRefresh = false) => {
    setIsUpcomingLoading(true)
    try {
      const url = forceRefresh ? '/api/upcoming-games?refresh=true' : '/api/upcoming-games'
      const res = await fetch(url)
      if (res.ok) {
        const data: { games: UpcomingGame[] } = await res.json()
        setUpcomingGames(data.games ?? [])
      } else {
        setUpcomingGames([])
      }
    } catch {
      setUpcomingGames([])
    } finally {
      setIsUpcomingLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    fetchUpcomingGames()
  }, [fetchNews, fetchUpcomingGames])

  // Build channel name map
  const channelNames: Record<string, string> = {}
  if (newsData) {
    for (const item of newsData.allNews) {
      if (!channelNames[item.sourceKey]) {
        channelNames[item.sourceKey] = item.source
      }
    }
  }

  const channels = newsData ? Object.keys(newsData.byChannel) : []
  const channelItems = newsData && selectedChannel ? newsData.byChannel[selectedChannel] ?? [] : []

  const PAGE_SIZE = 5
  const currentPage = channelPages[selectedChannel] ?? 1
  const totalPages = Math.ceil(channelItems.length / PAGE_SIZE)
  const pagedItems = channelItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function setPageForChannel(channel: string, page: number) {
    setChannelPages(prev => ({ ...prev, [channel]: page }))
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div
            className="rounded-xl p-8 text-center bg-theme-card border border-theme-border"
            style={{ border: '1px solid rgba(239,68,68,0.3)', boxShadow: 'var(--card-shadow)' }}
          >
            <p className="text-red-400 text-lg mb-2">오류 발생</p>
            <p className="text-theme-secondary">{error}</p>
          </div>
        ) : newsData && newsData.allNews.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center bg-theme-card border border-theme-border"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <p className="text-lg mb-2 text-theme-secondary">뉴스가 없습니다</p>
            <p className="text-theme-secondary">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : newsData && (
          <>
            {/* Upcoming Games */}
            {(isUpcomingLoading || upcomingGames.length > 0) && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-theme-text">이번 주 출시 예정 게임</h2>
                <UpcomingGames games={upcomingGames} loading={isUpcomingLoading} />
              </section>
            )}

            {/* AI Top 5 */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-theme-text">AI 오늘의 주요뉴스 Top 5</h2>
                <button
                  onClick={() => fetchNews(false)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-theme-card border border-theme-border text-theme-secondary"
                >
                  새로고침
                </button>
              </div>
              <NewsTop5 items={analyzedTop5} loading={isAnalyzing} />
            </section>

            {/* Defense Top 3 */}
            {newsData.defenseTop3.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-theme-text">디펜스 장르 Top 3</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newsData.defenseTop3.map((item, index) => (
                    <NewsCard key={`${item.id}-${index}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Mobile Top 3 */}
            {newsData.mobileTop3.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-theme-text">모바일 플랫폼 Top 3</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newsData.mobileTop3.map((item, index) => (
                    <NewsCard key={`${item.id}-${index}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Channel Browse */}
            {channels.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-theme-text">채널별 전체보기</h2>
                <ChannelTabs
                  channels={channels}
                  selected={selectedChannel}
                  onSelect={setSelectedChannel}
                  channelNames={channelNames}
                />
                <div className="mt-4 space-y-3">
                  {channelItems.length === 0 ? (
                    <div
                      className="rounded-xl p-6 text-center bg-theme-card border border-theme-border"
                      style={{ boxShadow: 'var(--card-shadow)' }}
                    >
                      <p className="text-sm text-theme-secondary">이 채널의 최근 뉴스가 없습니다.</p>
                    </div>
                  ) : (
                    pagedItems.map((item, index) => (
                      <NewsListItem key={`${item.id}-${index}`} item={item} />
                    ))
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setPageForChannel(selectedChannel, currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-theme-card border border-theme-border text-theme-secondary"
                    >
                      이전
                    </button>
                    <span className="text-sm text-theme-secondary tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPageForChannel(selectedChannel, currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-theme-card border border-theme-border text-theme-secondary"
                    >
                      다음
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
