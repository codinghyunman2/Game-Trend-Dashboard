'use client'

import { useState, useEffect } from 'react'
import { NewsItem } from '@/types/news'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / (1000 * 60))
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}일 전`
}

export default function NewsListItem({ item }: { item: NewsItem }) {
  const needsTranslation = !item.isKorean
  const [isTranslating, setIsTranslating] = useState(needsTranslation)
  const [displayTitle, setDisplayTitle] = useState(item.isKorean ? (item.titleKo || item.title) : '')
  const [displaySummary, setDisplaySummary] = useState(item.isKorean ? (item.summaryKo || item.summary) : '')

  useEffect(() => {
    if (!needsTranslation) return
    setDisplayTitle(item.titleKo || item.title)
    setDisplaySummary(item.summaryKo || item.summary)
    setIsTranslating(false)
  }, [needsTranslation, item])

  return (
    <div
      className="p-4 rounded-xl transition-colors bg-theme-card border border-theme-border"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center justify-between mb-2">
        {isTranslating ? (
          <div className="h-4 rounded bg-theme-surface animate-pulse flex-1 mr-3" />
        ) : (
          <h3 className="text-sm font-semibold leading-snug flex-1 mr-3 text-theme-text">
            {displayTitle}
          </h3>
        )}
        <span className="text-xs whitespace-nowrap shrink-0 text-theme-secondary">
          {timeAgo(item.pubDate)}
        </span>
      </div>
      {isTranslating ? (
        <div className="space-y-1.5 mb-2">
          <div className="h-3 rounded bg-theme-surface animate-pulse" />
          <div className="h-3 rounded bg-theme-surface animate-pulse w-4/5" />
        </div>
      ) : (
        <p className="text-xs leading-relaxed mb-2 line-clamp-2 text-theme-secondary">
          {displaySummary}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-theme-secondary">{item.source}</span>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline text-theme-accent"
        >
          원문보기 →
        </a>
      </div>
    </div>
  )
}
