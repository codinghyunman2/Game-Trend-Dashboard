'use client'

import { useState, useEffect } from 'react'

const MESSAGES = [
  "전 세계 게임 뉴스 수집 중... 🕵️",
  "RSS 피드 16개 구독 중... 📡",
  "Claude가 기사를 정독하는 중... 🤖",
  "디펜스 업계 동향 파악 중... 🏰",
  "번역 완료율 계산 중... 📊",
  "모바일 게임 시장 스캔 중... 📱",
  "오늘의 핵심 뉴스 선별 중... ✨",
  "잠깐만요, 거의 다 됐어요... ⏳",
]

export default function LoadingSpinner() {
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
