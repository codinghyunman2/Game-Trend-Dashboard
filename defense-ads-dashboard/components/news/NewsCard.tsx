'use client'

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

export default function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent)',
            color: 'var(--color-accent)',
          }}
        >
          {item.source}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{timeAgo(item.pubDate)}</span>
      </div>
      <h3 className="text-sm font-semibold leading-snug mb-2 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
        {item.titleKo || item.title}
      </h3>
      <p className="text-xs leading-relaxed mb-3 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
        {item.summaryKo || item.summary}
      </p>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
        style={{ color: 'var(--color-accent)' }}
      >
        원문보기
      </a>
    </div>
  )
}
