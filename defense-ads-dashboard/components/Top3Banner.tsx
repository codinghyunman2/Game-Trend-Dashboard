'use client'

import { AdAnalysis } from '@/types/ad'

interface Top3BannerProps {
  analyses: AdAnalysis[] | null
  isLoading: boolean
}

const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  return 'var(--color-accent)'
}

function SkeletonCard({ rank }: { rank: number }) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl opacity-30">{medals[rank - 1] || ''}</span>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-gray-700 rounded animate-pulse w-2/5" />
        </div>
        <div className="w-8 h-6 bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Hook */}
      <div
        className="mb-3 px-3 py-2 rounded-lg"
        style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-border)' }}
      >
        <div className="h-3 bg-gray-700 rounded animate-pulse w-full" />
      </div>

      {/* Summary */}
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-700 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-700 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4" />
      </div>

      {/* Strengths */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-700 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-700 rounded animate-pulse w-4/5" />
        <div className="h-3 bg-gray-700 rounded animate-pulse w-3/5" />
      </div>

      <p className="text-xs animate-pulse" style={{ color: 'var(--color-text-secondary)' }}>AI 분석 중...</p>
    </div>
  )
}

export default function Top3Banner({ analyses, isLoading }: Top3BannerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard rank={1} />
        <SkeletonCard rank={2} />
        <SkeletonCard rank={3} />
      </div>
    )
  }

  if (!analyses || analyses.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {analyses.map((analysis, index) => (
        <div
          key={analysis.rank}
          className="rounded-xl p-6 transition-colors animate-fadeIn"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{medals[index] || ''}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold leading-snug line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                {analysis.title}
              </h3>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
                {analysis.game_name}
              </p>
            </div>
            <span className="text-xl font-bold" style={{ color: getScoreColor(analysis.score) }}>
              {analysis.score}
            </span>
          </div>

          {/* Hook */}
          <div
            className="mb-3 px-3 py-2 rounded-lg"
            style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{analysis.hook}</p>
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-text-secondary)' }}>{analysis.summary}</p>

          {/* Strengths */}
          <ul className="space-y-1 mb-4">
            {analysis.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }}>&#x25B8;</span>
                {strength}
              </li>
            ))}
          </ul>

          {analysis.ad_snapshot_url && (
            <a
              href={analysis.ad_snapshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'var(--color-accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-accent)')}
            >
              광고 보기 &rarr;
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
