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
    <div className="rounded-xl bg-[#1a1a2e] border border-gray-800 p-4 hover:border-purple-500/40 hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/20 text-purple-300 border border-accent-purple/30">
          {item.source}
        </span>
        <span className="text-xs text-gray-500">{timeAgo(item.pubDate)}</span>
      </div>
      <h3 className="text-white font-semibold text-sm leading-snug mb-2 line-clamp-2">
        {item.titleKo || item.title}
      </h3>
      <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-1">
        {item.summaryKo || item.summary}
      </p>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-accent-purple hover:text-purple-300 transition-colors font-medium"
      >
        원문보기
      </a>
    </div>
  )
}
