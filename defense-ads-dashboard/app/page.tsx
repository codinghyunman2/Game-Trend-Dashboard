'use client'

import { useEffect, useState, useRef } from 'react'
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

interface Stat {
  value: number | null
  label: string
  suffix: string
  prefix: string
  isText?: boolean
  textValue?: string
}

export default function LandingPage() {
  const [newsCount, setNewsCount] = useState<number | null>(null)
  const [started, setStarted] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/news/fetch')
      .then((r) => r.json())
      .then((data) => {
        if (data?.allNews?.length != null) {
          setNewsCount(data.allNews.length)
        }
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

  const stats: Stat[] = [
    { value: 11, label: '뉴스 채널', suffix: '', prefix: '', },
    { value: newsCount, label: '수집 뉴스', suffix: '+', prefix: '', },
    { value: 2, label: 'AI 분석 섹션', suffix: '', prefix: '', },
    { value: null, label: '업데이트', suffix: '', prefix: '', isText: true, textValue: '매일' },
  ]

  const displayValues = [channelCount, newsCountAnimated, aiCount]

  const features = [
    {
      icon: '📰',
      title: '게임 뉴스',
      desc: '11개 채널 실시간 수집',
      detail: '국내외 주요 게임 미디어의 최신 소식을 한 곳에서 확인하세요.',
    },
    {
      icon: '📊',
      title: '광고 트렌드',
      desc: 'Meta 광고 라이브러리 기반',
      detail: '디펜스 장르 경쟁사 광고 소재를 분석하고 트렌드를 파악하세요.',
    },
    {
      icon: '🤖',
      title: 'AI 분석',
      desc: '매일 Top 5 자동 선별',
      detail: 'Claude AI가 오늘의 주요 뉴스와 광고 인사이트를 자동으로 선별합니다.',
    },
  ]

  return (
    <div className="min-h-screen bg-theme-bg">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-16 text-center"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, var(--color-accent-soft) 0%, transparent 60%)',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--color-accent)' }}
          >
            for 로켓단게임즈
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight text-theme-text">
            2026 게임 트렌드
            <br />
            <span style={{ color: 'var(--color-accent)' }}>한눈에 보기</span>
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto text-theme-secondary">
            게임 업계 뉴스부터 Meta 광고 소재 분석까지 — 마케터를 위한 트렌드 대시보드
          </p>
          <Link
            href="/dashboard"
            prefetch={true}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-transform hover:scale-105"
            style={{ background: 'var(--color-accent)' }}
          >
            대시보드 바로가기
            <span>→</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto w-full">
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center">
              <p
                className="text-3xl sm:text-4xl font-extrabold"
                style={{ color: 'var(--color-accent)' }}
              >
                {stat.isText
                  ? stat.textValue
                  : stat.value === null
                  ? '---'
                  : `${stat.prefix}${displayValues[i]}${stat.suffix}`}
              </p>
              <p className="text-sm mt-1 text-theme-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12 text-theme-text">
            주요 기능
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 border border-theme-border bg-theme-card transition-transform duration-200 hover:-translate-y-1"
                style={{ boxShadow: 'var(--card-shadow)' }}
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-1 text-theme-text">{f.title}</h3>
                <p
                  className="text-sm font-semibold mb-3"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {f.desc}
                </p>
                <p className="text-sm text-theme-secondary leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-theme-text">
            지금 바로 시작하세요
          </h2>
          <p className="mb-8 text-theme-secondary">
            매일 업데이트되는 게임 트렌드를 팀원과 함께 공유하세요.
          </p>
          <Link
            href="/dashboard"
            prefetch={true}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-transform hover:scale-105"
            style={{ background: 'var(--color-accent)' }}
          >
            대시보드 바로가기
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
