'use client'

import { ShortsItem } from '@/types/viral'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatViewCount(n: number): string {
  let value: number
  let suffix: string

  if (n >= 100_000_000) {
    value = n / 100_000_000
    suffix = '억'
  } else if (n >= 10_000) {
    value = n / 10_000
    suffix = '만'
  } else if (n >= 1_000) {
    value = n / 1_000
    suffix = '천'
  } else {
    return String(n)
  }

  const rounded = Math.round(value * 10) / 10
  const formatted = rounded % 1 === 0 ? String(Math.floor(rounded)) : String(rounded)
  return `${formatted}${suffix}`
}

function formatRelativeTime(publishedAt: string): string {
  const diff = Date.now() - new Date(publishedAt).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days < 1) return '오늘'
  if (days === 1) return '1일 전'
  if (days < 7) return `${days}일 전`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}주 전`
  const months = Math.floor(days / 30)
  return `${months}개월 전`
}

interface ShortsCardProps {
  item: ShortsItem
}

export default function ShortsCard({ item }: ShortsCardProps) {
  return (
    <a
      href={item.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-theme-card border border-theme-border rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-lg"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      {/* Thumbnail with duration overlay */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute bottom-2 right-2 text-xs font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
        >
          {formatDuration(item.duration)}
        </span>
      </div>

      {/* Card body */}
      <div className="p-3">
        <p
          className="text-sm font-medium line-clamp-2 mb-1 leading-snug"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {item.title}
        </p>
        <p
          className="text-xs mb-0.5 truncate"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {item.channelTitle}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {formatViewCount(item.viewCount)}회
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {formatRelativeTime(item.publishedAt)}
          </span>
        </div>
      </div>
    </a>
  )
}
