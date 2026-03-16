'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MetaAd, AdAnalysis, FetchAdsResponse, CacheEntry } from '@/types/ad'
import AdCard from '@/components/AdCard'
import Top3Banner from '@/components/Top3Banner'
import KeywordManager from '@/components/KeywordManager'
import ShareButton from '@/components/ShareButton'
import LoadingSpinner from '@/components/LoadingSpinner'

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

type TabId = 'summary' | 'KR' | 'US' | 'JP' | 'TW'

const TABS: { id: TabId; label: string }[] = [
  { id: 'summary', label: '요약' },
  { id: 'KR', label: '🇰🇷 한국' },
  { id: 'US', label: '🇺🇸 영어권' },
  { id: 'JP', label: '🇯🇵 일본' },
  { id: 'TW', label: '🇹🇼 대만' },
]

function formatLastUpdated(date: Date): string {
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InsightSection({ allAds }: { allAds: MetaAd[] }) {
  const pageCount: Record<string, number> = {}
  for (const ad of allAds) {
    if (ad.page_name) pageCount[ad.page_name] = (pageCount[ad.page_name] ?? 0) + 1
  }
  const top3Games = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const now = Date.now()
  const recentCount = allAds.filter((ad) => {
    if (!ad.ad_delivery_start_time) return false
    const diff = (now - new Date(ad.ad_delivery_start_time).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length

  const countryCodes = ['KR', 'JP', 'TW', 'US']
  const countryCount: Record<string, number> = { KR: 0, JP: 0, TW: 0, US: 0, OTHER: 0 }
  for (const ad of allAds) {
    const c = ad.detectedCountry ?? 'OTHER'
    if (countryCodes.includes(c)) countryCount[c]++
    else countryCount['OTHER']++
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">📊 소재 인사이트</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-bg-card border border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">🔥 가장 많은 소재 집행</p>
          {top3Games.length === 0 ? (
            <p className="text-gray-500 text-sm">데이터 없음</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {top3Games.map(([name, count], i) => (
                <li key={name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-300 truncate">
                    <span className="text-accent-purple font-bold mr-1">{i + 1}.</span>
                    {name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple whitespace-nowrap">
                    {count}개
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-xl bg-bg-card border border-gray-800 p-4 flex flex-col justify-center">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">⚡ 이번 주 신규 소재</p>
          <p className="text-3xl font-bold text-white">
            {recentCount}
            <span className="text-base font-normal text-gray-400 ml-1">개</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">최근 7일 내 신규 집행 감지</p>
        </div>

        <div className="rounded-xl bg-bg-card border border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">🌍 국가별 광고 분포</p>
          <div className="flex flex-col gap-1.5">
            {[
              { code: 'KR', label: '🇰🇷 KR' },
              { code: 'JP', label: '🇯🇵 JP' },
              { code: 'TW', label: '🇹🇼 TW' },
              { code: 'US', label: '🇺🇸 US' },
              { code: 'OTHER', label: '🌐 기타' },
            ].map(({ code, label }) => (
              <div key={code} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-semibold">{countryCount[code]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CountryAdGrid({ ads, countryCode }: { ads: MetaAd[]; countryCode: string }) {
  const filtered = ads
    .filter((ad) => ad.detectedCountry === countryCode)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl bg-bg-card border border-gray-800 p-8 text-center">
        <p className="text-gray-400">해당 국가 광고가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((ad) => (
        <AdCard key={ad.id} ad={ad as MetaAd & { score: number }} />
      ))}
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const keywordsParam = searchParams.get('keywords') || '디펜스'
  const initialKeywords = keywordsParam.split(',').map((k) => k.trim()).filter(Boolean)

  const [keywords, setKeywords] = useState<string[]>(initialKeywords)
  const [ads, setAds] = useState<MetaAd[]>([])
  const [analyses, setAnalyses] = useState<AdAnalysis[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  const getCacheKey = useCallback((kws: string[]) => {
    return `ads_cache_v3_${[...kws].sort().join(',')}`
  }, [])

  const fetchAnalysis = useCallback(async (topAds: MetaAd[]) => {
    if (topAds.length === 0) return
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ads: topAds.slice(0, 5) }),
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

  const fetchAds = useCallback(async (kws: string[], forceRefresh = false) => {
    setIsLoading(true)
    setError(null)
    setAnalyses(null)

    const cacheKey = getCacheKey(kws)

    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached)
          if (Date.now() - entry.timestamp < CACHE_TTL) {
            setAds(entry.data.ads)
            setLastUpdated(new Date(entry.timestamp))
            setIsLoading(false)
            fetchAnalysis(entry.data.ads)
            return
          }
        }
      } catch {
        // Cache read failure is non-critical
      }
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
      setAds(response.ads)

      const now = Date.now()
      setLastUpdated(new Date(now))

      try {
        const entry: CacheEntry = { data: response, timestamp: now }
        sessionStorage.setItem(cacheKey, JSON.stringify(entry))
      } catch {
        // Cache write failure is non-critical
      }

      setIsLoading(false)
      fetchAnalysis(response.ads)
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

  const handleRefresh = () => {
    fetchAds(keywords, true)
  }

  if (error === 'META_ACCESS_TOKEN_NOT_SET') {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-xl bg-bg-card border border-gray-800 p-8">
          <h2 className="text-xl font-bold text-white mb-4">Meta API 토큰 설정 필요</h2>
          <p className="text-gray-300 mb-4">
            광고 데이터를 가져오려면 Meta Graph API 액세스 토큰이 필요합니다.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300">
            <p className="text-gray-500 mb-2"># .env.local 파일에 추가:</p>
            <p>META_ACCESS_TOKEN=여기에_토큰_입력</p>
          </div>
          <div className="mt-4 text-sm text-gray-400 space-y-1">
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                🎮 디펜스 게임 광고 트렌드 대시보드
              </h1>
              {lastUpdated && (
                <p className="text-gray-500 text-sm mt-1">
                  마지막 업데이트: {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-card border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                새로고침
              </button>
              <ShareButton />
            </div>
          </div>
        </header>

        {/* Keyword Manager */}
        <section className="mb-6">
          <KeywordManager keywords={keywords} onChange={handleKeywordsChange} />
        </section>

        {/* 한국 광고 보기 */}
        <section className="mb-8 rounded-xl bg-bg-card border border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
        ) : ads.length === 0 ? (
          <div className="rounded-xl bg-bg-card border border-gray-800 p-8 text-center">
            <p className="text-gray-400 text-lg mb-2">검색 결과 없음</p>
            <p className="text-gray-500">다른 키워드로 검색해보세요.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-800">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                    activeTab === tab.id
                      ? 'text-white border-accent-purple'
                      : 'text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'summary' ? (
              <>
                <InsightSection allAds={ads} />
                <section className="mb-8">
                  <h2 className="text-lg font-semibold text-white mb-4">⚡ AI 분석 Top 3</h2>
                  <Top3Banner analyses={analyses} isLoading={isAnalyzing} />
                </section>
              </>
            ) : (
              <section className="mb-8">
                <CountryAdGrid ads={ads} countryCode={activeTab} />
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
