'use client'

import { useState, useEffect } from 'react'

const NEWS_MESSAGES = [
  "전 세계 게임 뉴스 수집 중... 🕵️",
  "RSS 피드 16개 구독 중... 📡",
  "Claude가 기사를 정독하는 중... 🤖",
  "디펜스 업계 동향 파악 중... 🏰",
  "번역 완료율 계산 중... 📊",
  "모바일 게임 시장 스캔 중... 📱",
  "오늘의 핵심 뉴스 선별 중... ✨",
  "잠깐만요, 거의 다 됐어요... ⏳",
]

const CREATIVE_MESSAGES = [
  "Meta 광고 라이브러리 스캔 중... 🔍",
  "디펜스 게임 광고 수집 중... 🏰",
  "경쟁사 소재 분석 중... 📊",
  "Claude가 광고 트렌드 파악 중... 🤖",
  "고성과 소재 점수 계산 중... 🎯",
  "국가별 광고 분류 중... 🌏",
  "오래 집행된 승자 소재 추출 중... 🏆",
  "잠깐만요, 거의 다 됐어요... ⏳",
]

const VIRAL_MESSAGES = [
  "YouTube Shorts 최신 영상 수집 중... 🎬",
  "조회수 Top 영상 추려내는 중... 🔥",
  "게임 카테고리 필터링 중... 🎮",
  "바이럴 지표 계산 중... 📈",
  "썸네일 & 제목 분석 중... 🖼️",
  "인기 급상승 Shorts 정렬 중... ⚡",
  "잠깐만요, 거의 다 됐어요... ⏳",
]

export default function LoadingSpinner({ variant = 'news' }: { variant?: 'news' | 'creative' | 'viral' }) {
  const MESSAGES = variant === 'creative' ? CREATIVE_MESSAGES : variant === 'viral' ? VIRAL_MESSAGES : NEWS_MESSAGES
  const [index, setIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % MESSAGES.length)
        setIsVisible(true)
      }, 250)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <svg
        className="animate-spin h-12 w-12 text-theme-accent"
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="80 40"
          className="opacity-30"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="30 90"
        />
      </svg>
      <p
        className="text-sm text-theme-accent mt-4 text-center transition-opacity duration-250"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        {MESSAGES[index]}
      </p>
    </div>
  )
}
