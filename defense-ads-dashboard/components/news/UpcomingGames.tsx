'use client'

import { UpcomingGame } from '@/types/news'

interface Props {
  games: UpcomingGame[]
  loading: boolean
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'iOS') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/40">
        iOS
      </span>
    )
  }
  if (platform === 'Android') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/40 text-green-300 border border-green-700/40">
        Android
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-700/40">
      모바일
    </span>
  )
}

function ReleaseDateLabel({ releaseDate }: { releaseDate: string | null }) {
  if (!releaseDate) {
    return <span className="text-yellow-400 text-xs font-medium">출시 임박</span>
  }
  if (releaseDate === '이번 주') {
    return <span className="text-yellow-400 text-xs font-medium">이번 주</span>
  }
  return <span className="text-theme-secondary text-xs">{releaseDate} 출시</span>
}

function timeAgo(pubDate: string): string {
  const diff = Date.now() - new Date(pubDate).getTime()
  const hours = Math.floor(diff / 1000 / 60 / 60)
  if (hours < 1) return '방금'
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3 animate-pulse">
      <div className="flex-1 min-w-0 mr-4">
        <div className="h-4 bg-theme-border rounded w-2/3 mb-2" />
        <div className="h-3 bg-theme-border rounded w-1/3" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 w-10 bg-theme-border rounded" />
      </div>
    </div>
  )
}

export default function UpcomingGames({ games, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden bg-theme-card border border-theme-border" style={{ boxShadow: 'var(--card-shadow)' }}>
        <SkeletonRow />
        <div className="border-t border-theme-border" />
        <SkeletonRow />
        <div className="border-t border-theme-border" />
        <SkeletonRow />
      </div>
    )
  }

  if (games.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden bg-theme-card border border-theme-border" style={{ boxShadow: 'var(--card-shadow)' }}>
      {games.map((game, index) => (
        <div key={`${game.link}-${index}`}>
          {index > 0 && <div className="border-t border-theme-border" />}
          <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-medium text-theme-text truncate">
                {game.titleKo || game.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <ReleaseDateLabel releaseDate={game.releaseDate} />
                <span className="text-theme-secondary text-xs">·</span>
                <span className="text-theme-secondary text-xs truncate">{game.source}</span>
                <span className="text-theme-secondary text-xs">·</span>
                <span className="text-theme-secondary text-xs">{timeAgo(game.pubDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-1">
                {game.platform.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
              <a
                href={game.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors whitespace-nowrap"
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
