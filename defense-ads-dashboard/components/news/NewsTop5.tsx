'use client'

import { AnalyzedNews } from '@/types/news'

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

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    2: 'bg-gray-400/20 text-gray-300 border-gray-400/40',
    3: 'bg-amber-700/20 text-amber-500 border-amber-700/40',
  }
  const color = colors[rank] ?? 'bg-gray-700/20 text-gray-400 border-gray-600/40'

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border ${color}`}>
      {rank}
    </span>
  )
}

function SkeletonItem() {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl animate-pulse bg-theme-card border border-theme-border"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700/60 rounded w-full" />
        <div className="h-3 bg-gray-700/40 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function NewsTop5({
  items,
  loading,
}: {
  items: AnalyzedNews[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center bg-theme-card border border-theme-border"
        style={{ boxShadow: 'var(--card-shadow)' }}
      >
        <p className="text-theme-secondary">AI 분석 결과가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.rank}
          className="flex items-start gap-4 p-4 rounded-xl transition-colors bg-theme-card border border-theme-border"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <RankBadge rank={item.rank} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug mb-1 text-theme-text">
              {item.titleKo}
            </h3>
            <div className="mb-2 space-y-0.5">
              {item.summaryKo.split('\n').map((line, i) => (
                <p key={i} className="leading-relaxed text-theme-secondary" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  · {line}
                </p>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-theme-secondary">
              <span>{item.source}</span>
              <span>{timeAgo(item.pubDate)}</span>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:underline text-theme-accent"
              >
                원문보기 →
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
