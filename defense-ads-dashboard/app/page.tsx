'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function useCountUp(target: number, duration: number = 1500, start: boolean = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || target === 0) return
    const startTime = performance.now()
    const raf = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target, duration, start])
  return count
}

export default function LandingPage() {
  const [newsCount, setNewsCount] = useState<number | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    fetch('/api/news/fetch')
      .then((r) => r.json())
      .then((data) => {
        if (data?.allNews?.length != null) setNewsCount(data.allNews.length)
      })
      .catch(() => {})
    fetch('/api/fetch-ads').catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 200)
    return () => clearTimeout(timer)
  }, [])

  const channelCount = useCountUp(11, 1500, started)
  const newsCountAnimated = useCountUp(newsCount ?? 0, 1500, started && newsCount !== null)
  const aiCount = useCountUp(2, 1500, started)

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>

      {/* 섹션 1 — 히어로 */}
      <section
        className="flex flex-col items-center justify-center text-center px-6 lg:px-20 py-20 lg:py-32"
        style={{
          background: 'radial-gradient(ellipse at 20% 50%, var(--color-accent-soft) 0%, transparent 60%)',
        }}
      >
        <div className="max-w-3xl w-full mx-auto">
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase mb-6"
            style={{ color: 'var(--color-accent)' }}
          >
            2026 게임 트렌드
          </p>
          <h1
            className="text-3xl sm:text-5xl lg:text-7xl font-extrabold leading-tight mb-6"
            style={{ color: 'var(--color-text-primary)' }}
          >
            매일 아침 5분,
            <br />
            게임 업계를 
            <span style={{ color: 'var(--color-accent)' }}> 한눈에</span>
          </h1>
          <p
            className="text-base sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            AI가 매일 선별하는 게임 업계 핵심 뉴스, 
            <br />
            Meta 라이브러리 기반 실시간 크리에이티브 트렌드
          </p>
        </div>
      </section>

      {/* 섹션 2 — 숫자 지표 */}
      <section
        className="flex flex-col items-center justify-center px-6 lg:px-20 py-16 lg:py-24"
        style={{ background: 'var(--color-accent)' }}
      >
        <p className="text-sm font-bold tracking-[0.2em] uppercase mb-4 text-white/70">
          Intelligence
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white text-center mb-16 max-w-2xl leading-tight">
          매일 자동으로 수집되는
          <br />
          게임 인텔리전스
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-20 w-full max-w-4xl">
          <div className="flex flex-col items-center text-center">
            <p className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-none mb-3">
              {channelCount}
            </p>
            <p className="text-white/70 font-medium">뉴스 채널</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-none mb-3">
              {newsCount === null ? '—' : `${newsCountAnimated}+`}
            </p>
            <p className="text-white/70 font-medium">수집 뉴스</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-none mb-3">
              {aiCount}
            </p>
            <p className="text-white/70 font-medium">AI 분석 섹션</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-none mb-3">
              매일
            </p>
            <p className="text-white/70 font-medium">업데이트</p>
          </div>
        </div>
      </section>

      {/* 섹션 3 — 게임 뉴스 */}
      <section
        className="px-6 lg:px-20 py-16 lg:py-24"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* 텍스트 */}
          <div>
            <span
              className="inline-block text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full mb-6"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              NEWS
            </span>
            <h2
              className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              11개 채널,
              <br />
              매일 자동 수집
            </h2>
            <p
              className="text-sm sm:text-lg leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              게임동아, GamesIndustry, VGC 등 국내외 주요 게임 언론사 11개 채널의 뉴스를 매일 자동으로 수집합니다.
              <br />
              최근 3일 이내 뉴스만 필터링해 항상 최신 정보를 제공합니다.
            </p>
            <ul className="space-y-3">
              {['한국 게임 언론 5개 채널', '해외 게임 비즈니스 채널', '전문 뉴스레터'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  <span className="text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* 비주얼 */}
          <div
            className="rounded-3xl p-10 flex flex-col items-center justify-center gap-6 min-h-[280px] lg:min-h-[320px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none" aria-hidden>
              <rect x="8" y="12" width="64" height="8" rx="4" fill="var(--color-accent)" opacity="0.9" />
              <rect x="8" y="28" width="48" height="6" rx="3" fill="var(--color-accent)" opacity="0.5" />
              <rect x="8" y="40" width="56" height="6" rx="3" fill="var(--color-accent)" opacity="0.3" />
              <rect x="8" y="52" width="40" height="6" rx="3" fill="var(--color-accent)" opacity="0.2" />
              <rect x="8" y="64" width="52" height="6" rx="3" fill="var(--color-accent)" opacity="0.15" />
            </svg>
            <div className="text-center">
              <p
                className="text-5xl font-extrabold mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                11
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                뉴스 채널 동시 수집
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 4 — AI 분석 */}
      <section
        className="px-6 lg:px-20 py-16 lg:py-24"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* 비주얼 (좌) */}
          <div
            className="rounded-3xl p-10 flex flex-col items-center justify-center gap-6 min-h-[280px] lg:min-h-[320px] order-2 lg:order-1"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none" aria-hidden>
              <circle cx="40" cy="40" r="30" stroke="var(--color-accent)" strokeWidth="3" opacity="0.3" />
              <circle cx="40" cy="40" r="20" stroke="var(--color-accent)" strokeWidth="3" opacity="0.5" />
              <circle cx="40" cy="40" r="8" fill="var(--color-accent)" />
              <line x1="40" y1="10" x2="40" y2="22" stroke="var(--color-accent)" strokeWidth="2" opacity="0.6" />
              <line x1="40" y1="58" x2="40" y2="70" stroke="var(--color-accent)" strokeWidth="2" opacity="0.6" />
              <line x1="10" y1="40" x2="22" y2="40" stroke="var(--color-accent)" strokeWidth="2" opacity="0.6" />
              <line x1="58" y1="40" x2="70" y2="40" stroke="var(--color-accent)" strokeWidth="2" opacity="0.6" />
            </svg>
            <div className="text-center">
              <p
                className="text-5xl font-extrabold mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                Top 5
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                매일 AI가 자동 선별
              </p>
            </div>
          </div>
          {/* 텍스트 (우) */}
          <div className="order-1 lg:order-2">
            <span
              className="inline-block text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full mb-6"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              AI
            </span>
            <h2
              className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              매일 Top 5
              <br />
              자동 선별
            </h2>
            <p
              className="text-sm sm:text-lg leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Claude AI가 수집된 뉴스 중 게임 업계 실무자에게 가장 중요한 Top 5를 매일 자동으로 선별합니다.
              <br />
              산업 전반의 임팩트, 주요 기업 동향, 시장 트렌드를 기준으로 분석합니다.
            </p>
            <ul className="space-y-3">
              {['오늘의 주요 뉴스 Top 5', '디펜스 장르 Top 3', '모바일 플랫폼 Top 3'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  <span className="text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 섹션 5 — 광고 트렌드 */}
      <section
        className="px-6 lg:px-20 py-16 lg:py-24"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* 텍스트 */}
          <div>
            <span
              className="inline-block text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full mb-6"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              ADS
            </span>
            <h2
              className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Meta 광고 라이브러리
              <br />
              기반 크리에이티브 트렌드
            </h2>
            <p
              className="text-sm sm:text-lg leading-relaxed mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Meta 광고 라이브러리 API를 통해 디펜스 장르 모바일 게임의 광고 소재를 수집하고 분석합니다.
              <br />
              최신성과 집행 규모를 기반으로 주목할 광고를 자동으로 선별합니다.
            </p>
            <ul className="space-y-3">
              {['최근 90일 영상 광고 수집', '국가별 광고 분류 (한국/일본/대만/영어권)', 'AI Top 3 크리에이티브 분석'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  <span className="text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* 비주얼 */}
          <div
            className="rounded-3xl p-10 flex flex-col items-center justify-center gap-6 min-h-[280px] lg:min-h-[320px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none" aria-hidden>
              <rect x="10" y="50" width="12" height="22" rx="2" fill="var(--color-accent)" opacity="0.4" />
              <rect x="28" y="36" width="12" height="36" rx="2" fill="var(--color-accent)" opacity="0.6" />
              <rect x="46" y="22" width="12" height="50" rx="2" fill="var(--color-accent)" opacity="0.85" />
              <rect x="64" y="10" width="10" height="62" rx="2" fill="var(--color-accent)" />
            </svg>
            <div className="text-center">
              <p
                className="text-5xl font-extrabold mb-1"
                style={{ color: 'var(--color-accent)' }}
              >
                90일
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                광고 데이터 자동 수집
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 6 — CTA */}
      <section
        className="flex flex-col items-center justify-center px-6 py-16 lg:py-24 text-center"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, var(--color-accent-soft) 0%, transparent 60%)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <h2
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6"
          style={{ color: 'var(--color-text-primary)' }}
        >
          지금 바로 시작하세요
        </h2>
        <Link
          href="/dashboard"
          prefetch={true}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:scale-105 hover:opacity-90 mb-6 w-full sm:w-auto"
          style={{ background: 'var(--color-accent)', minHeight: '44px' }}
        >
          대시보드 바로가기
          <span aria-hidden>→</span>
        </Link>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          매일 오전 9시 슬랙으로 브리핑이 발송됩니다
        </p>
      </section>

    </div>
  )
}
