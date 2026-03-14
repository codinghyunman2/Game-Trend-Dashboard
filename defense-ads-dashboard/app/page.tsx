'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MetaAd, AdAnalysis, FetchAdsResponse, CacheEntry } from '@/types/ad'
import AdCard from '@/components/AdCard'
import Top3Banner from '@/components/Top3Banner'
import KeywordManager from '@/components/KeywordManager'
import ShareButton from '@/components/ShareButton'
import LoadingSpinner from '@/components/LoadingSpinner'

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordsParam = searchParams.get('keywords') || '디펜스'
  const initialKeywords = keywordsParam.split(',').map((k) => k.trim()).filter(Boolean)

  const [keywords, setKeywords] = useState<string[]>(initialKeywords)
  const [scoredAds, setScoredAds] = useState<MetaAd[]>([])
  const [unscoredAds, setUnscoredAds] = useState<MetaAd[]>([])
  const [analyses, setAnalyses] = useState<AdAnalysis[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score')
  const [showUnscored, setShowUnscored] = useState(false)

  const getCacheKey = useCallback((kws: string[]) => {
    return `ads_cache_${[...kws].sort().join(',')}`
  }, [])

  const fetchAnalysis = useCallback(async (ads: MetaAd[]) => {
    if (ads.length === 0) return
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ads: ads.slice(0, 5) }),
      })
      if (res.ok) {
        const data: AdAnalysis[] = await res.json()
        setAnalyses(data)
      }
    } catch {
      // Analysis failure is non-critical
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const fetchAds = useCallback(async (kws: string[]) => {
    setIsLoading(true)
    setError(null)
    setAnalyses(null)

    // Check cache
    const cacheKey = getCacheKey(kws)
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached)
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          setScoredAds(entry.data.scoredAds)
          setUnscoredAds(entry.data.unscoredAds)
          setIsLoading(false)
          fetchAnalysis(entry.data.scoredAds)
          return
        }
      }
    } catch {
      // Cache read failure is non-critical
    }

    try {
      const res = await fetch(`/api/fetch-ads?keywords=${encodeURIComponent(kws.join(','))}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'META_ACCESS_TOKEN_NOT_SET') {
          setError('META_ACCESS_TOKEN_NOT_SET')
        } else {
          setError(data.message || '광고 데이터를 가져오는 중 오류가 발생했습니다.')
        }
        setIsLoading(false)
        return
      }

      const response: FetchAdsResponse = data
      setScoredAds(response.scoredAds)
      setUnscoredAds(response.unscoredAds)

      // Save to cache
      try {
        const entry: CacheEntry = { data: response, timestamp: Date.now() }
        sessionStorage.setItem(cacheKey, JSON.stringify(entry))
      } catch {
        // Cache write failure is non-critical
      }

      setIsLoading(false)
      fetchAnalysis(response.scoredAds)
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }
  }, [getCacheKey, fetchAnalysis])

  useEffect(() => {
    fetchAds(keywords)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeywordsChange = (newKeywords: string[]) => {
    setKeywords(newKeywords)
    const params = new URLSearchParams()
    params.set('keywords', newKeywords.join(','))
    router.push(`?${params.toString()}`)
    fetchAds(newKeywords)
  }

  const sortedScoredAds = [...scoredAds].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.score ?? 0) - (a.score ?? 0)
    }
    const dateA = a.ad_delivery_start_time ? new Date(a.ad_delivery_start_time).getTime() : 0
    const dateB = b.ad_delivery_start_time ? new Date(b.ad_delivery_start_time).getTime() : 0
    return dateB - dateA
  })

  // Error states
  if (error === 'META_ACCESS_TOKEN_NOT_SET') {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-xl bg-bg-card border border-gray-800 p-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Meta API 토큰 설정 필요
          </h2>
          <p className="text-gray-300 mb-4">
            광고 데이터를 가져오려면 Meta Graph API 액세스 토큰이 필요합니다.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300">
            <p className="text-gray-500 mb-2"># .env.local 파일에 추가:</p>
            <p>META_ACCESS_TOKEN=여기에_토큰_입력</p>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>1. <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-accent-purple hover:underline">Meta for Developers</a>에서 앱을 생성하세요.</p>
            <p>2. Marketing API 권한을 추가하세요.</p>
            <p>3. 액세스 토큰을 발급받아 .env.local에 저장하세요.</p>
            <p>4. 서버를 재시작하세요.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              디펜스 광고 대시보드
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              디펜스 장르 모바일 게임 광고 수집 및 분석
            </p>
          </div>
          <ShareButton />
        </header>

        {/* Keyword Manager */}
        <section className="mb-8">
          <KeywordManager keywords={keywords} onChange={handleKeywordsChange} />
        </section>

        {/* 한국 광고 섹션 */}
        <section className="mb-8 rounded-xl bg-bg-card border border-gray-700 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <a
            href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&content_languages[0]=ko&country=KR&is_targeted_country=false&media_type=all&q=%EB%94%94%ED%8E%9C%EC%8A%A4&search_type=keyword_unordered&sort_data[mode]=relevancy_monthly_grouped&sort_data[direction]=desc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-medium text-sm transition-colors whitespace-nowrap"
          >
            🇰🇷 한국 광고 보기
          </a>
          <p className="text-gray-400 text-sm">
            Meta 광고 라이브러리에서 한국 타겟 디펜스 게임 광고를 확인하세요
          </p>
        </section>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-xl bg-bg-card border border-red-900/40 p-8 text-center">
            <p className="text-red-400 text-lg mb-2">오류 발생</p>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : scoredAds.length === 0 && unscoredAds.length === 0 ? (
          <div className="rounded-xl bg-bg-card border border-gray-800 p-8 text-center">
            <p className="text-gray-400 text-lg mb-2">검색 결과 없음</p>
            <p className="text-gray-500">
              다른 키워드로 검색해보세요.
            </p>
          </div>
        ) : (
          <>
            {/* Sort toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSortBy('score')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'score'
                    ? 'bg-accent-purple text-white'
                    : 'bg-bg-card text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                점수순
              </button>
              <button
                onClick={() => setSortBy('date')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'date'
                    ? 'bg-accent-purple text-white'
                    : 'bg-bg-card text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                최신순
              </button>
            </div>

            {/* AI Analysis Top 3 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">
                AI 분석 Top 3
              </h2>
              <Top3Banner analyses={analyses} isLoading={isAnalyzing} />
            </section>

            {/* Scored Ads Grid */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">
                광고 목록
                <span className="text-sm text-gray-400 font-normal ml-2">
                  ({sortedScoredAds.length}개)
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedScoredAds.map((ad) => (
                  <AdCard key={ad.id} ad={ad as MetaAd & { score: number }} />
                ))}
              </div>
            </section>

            {/* Unscored Ads */}
            {unscoredAds.length > 0 && (
              <section>
                <button
                  onClick={() => setShowUnscored(!showUnscored)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                  <span
                    className={`transition-transform ${showUnscored ? 'rotate-90' : ''}`}
                  >
                    &#x25B6;
                  </span>
                  <span className="text-lg font-semibold">
                    노출 미집계 광고
                  </span>
                  <span className="text-sm font-normal">
                    ({unscoredAds.length}개)
                  </span>
                </button>
                {showUnscored && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unscoredAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad as MetaAd & { score: number }}
                      />
                    ))}
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

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  )
}
