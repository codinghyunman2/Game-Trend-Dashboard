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
      {platform}
    </span>
  )
}

function GenreBadge({ genre }: { genre: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-800/70 text-gray-400 border border-gray-700/40">
      {genre}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-theme-border rounded w-2/3 mb-2" />
        <div className="h-3 bg-theme-border rounded w-1/2" />
      </div>
      <div className="h-3 bg-theme-border rounded w-14 flex-shrink-0" />
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
        <div key={game.id}>
          {index > 0 && <div className="border-t border-theme-border" />}
          <div className="flex items-start gap-2 px-4 py-3 hover:bg-white/5 transition-colors">
            {/* Main info */}
            <div className="flex-1 min-w-0">
              {/* Row 1: game name + date */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-theme-text truncate" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {game.nameKo || game.name}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0">{game.releaseDateLabel}</span>
              </div>

              {/* Row 2: genre badges + platform badges + link */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {game.genres.slice(0, 2).map((genre) => (
                  <GenreBadge key={genre} genre={genre} />
                ))}
                {game.platform.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
                <a
                  href={game.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors flex-shrink-0"
                >
                  보기 →
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
