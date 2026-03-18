'use client'

import Image from 'next/image'
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
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-700/30">
      {genre}
    </span>
  )
}

function SourceBadge({ source }: { source: 'igdb' | 'gamemeca' }) {
  if (source === 'gamemeca') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-900/30 text-orange-300 border border-orange-700/30">
        게임메카
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-700/30">
      IGDB
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-12 h-16 bg-theme-border rounded flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-theme-border rounded w-2/3 mb-2" />
        <div className="h-3 bg-theme-border rounded w-1/3 mb-2" />
        <div className="h-3 bg-theme-border rounded w-1/2" />
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
        <div key={game.id}>
          {index > 0 && <div className="border-t border-theme-border" />}
          <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
            {/* Cover Image */}
            <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center">
              {game.coverUrl ? (
                <Image
                  src={game.coverUrl}
                  alt={game.nameKo || game.name}
                  width={48}
                  height={64}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-600" fill="currentColor">
                  <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 10 18.5 10s1.5.67 1.5 1.5S19.33 12 18.5 12z" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-text truncate">
                {game.nameKo || game.name}
              </p>

              {/* Genres */}
              {game.genres.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {game.genres.slice(0, 2).map((genre) => (
                    <GenreBadge key={genre} genre={genre} />
                  ))}
                </div>
              )}

              {/* Platform + Date + Link */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex gap-1">
                  {game.platform.map((p) => (
                    <PlatformBadge key={p} platform={p} />
                  ))}
                </div>
                <span className="text-theme-secondary text-xs">{game.releaseDateLabel} 출시</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <SourceBadge source={game.source} />
                  <a
                    href={game.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {game.source === 'gamemeca' ? '게임메카 보기 →' : 'IGDB 보기 →'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
