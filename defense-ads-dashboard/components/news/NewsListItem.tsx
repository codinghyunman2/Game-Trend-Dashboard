'use client'

import { useState } from 'react'
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
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <div
      className="p-4 rounded-xl transition-colors"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold leading-snug flex-1 mr-3" style={{ color: 'var(--color-text-primary)' }}>
          {item.titleKo || item.title}
        </h3>
        <span className="text-xs whitespace-nowrap shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
          {timeAgo(item.pubDate)}
        </span>
      </div>
      <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
        {item.summaryKo || item.summary}
      </p>

      {!item.isKorean && item.title !== item.titleKo && (
        <>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-xs transition-colors mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {showOriginal ? '번역본 보기' : '원문 보기'}
          </button>
          {showOriginal && (
            <div
              className="mt-2 p-3 rounded-lg"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.summary}</p>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.source}</span>
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          원문 →
        </a>
      </div>
    </div>
  )
}
