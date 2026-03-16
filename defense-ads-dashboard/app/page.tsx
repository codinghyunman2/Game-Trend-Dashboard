'use client'

import { useEffect, useState, useCallback } from 'react'
import { NewsItem, AnalyzedNews, NewsFetchResponse, NewsCacheEntry } from '@/types/news'
import NewsTop5 from '@/components/news/NewsTop5'
import NewsCard from '@/components/news/NewsCard'
import ChannelTabs from '@/components/news/ChannelTabs'
import NewsListItem from '@/components/news/NewsListItem'
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

  const fetchAnalysis = useCallback(async (allNews: NewsItem[]) => {
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
            if (channels.length > 0 && !selectedChannel) {
              setSelectedChannel(channels[0])
            }
            fetchAnalysis(entry.data.allNews)
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
      if (channels.length > 0) {
        setSelectedChannel(channels[0])
      }

      try {
        const entry: NewsCacheEntry = { data, timestamp: Date.now() }
        sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(entry))
      } catch (e) {
        console.warn('News cache write failed:', e)
      }

      setIsLoading(false)
      fetchAnalysis(data.allNews)
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAnalysis])

  useEffect(() => {
    fetchNews()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                2026 게임 트렌드 for 로켓단게임즈
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => fetchNews(false)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  새로고침
                </button>
                <button
                  onClick={() => fetchNews(true)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-purple-700 text-sm text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  최신 데이터
                </button>
              </div>
              {lastUpdated && (
                <p className="text-xs text-gray-500">
                  마지막 업데이트: {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
          </div>
        </header>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-xl bg-[#1a1a2e] border border-red-900/40 p-8 text-center">
            <p className="text-red-400 text-lg mb-2">오류 발생</p>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : newsData && newsData.allNews.length === 0 ? (
          <div className="rounded-xl bg-[#1a1a2e] border border-gray-800 p-8 text-center">
            <p className="text-gray-400 text-lg mb-2">뉴스가 없습니다</p>
            <p className="text-gray-500">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : newsData && (
          <>
            {/* AI Top 5 */}
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-white mb-4">AI 오늘의 주요뉴스 Top 5</h2>
              <NewsTop5 items={analyzedTop5} loading={isAnalyzing} />
            </section>

            {/* Defense Top 3 */}
            {newsData.defenseTop3.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-white mb-4">디펜스 장르 Top 3</h2>
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
                <h2 className="text-lg font-semibold text-white mb-4">모바일 플랫폼 Top 3</h2>
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
                <h2 className="text-lg font-semibold text-white mb-4">채널별 전체보기</h2>
                <ChannelTabs
                  channels={channels}
                  selected={selectedChannel}
                  onSelect={setSelectedChannel}
                  channelNames={channelNames}
                />
                <div className="mt-4 space-y-3">
                  {channelItems.length === 0 ? (
                    <div className="rounded-xl bg-[#1a1a2e] border border-gray-800 p-6 text-center">
                      <p className="text-gray-400 text-sm">이 채널의 최근 뉴스가 없습니다.</p>
                    </div>
                  ) : (
                    channelItems.map((item, index) => (
                      <NewsListItem key={`${item.id}-${index}`} item={item} />
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
