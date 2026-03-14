'use client'

import { AdAnalysis } from '@/types/ad'

interface Top3BannerProps {
  analyses: AdAnalysis[] | null
  isLoading: boolean
}

const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-bg-card border border-gray-800 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-700 rounded w-5/6" />
        <div className="h-3 bg-gray-700 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function Top3Banner({ analyses, isLoading }: Top3BannerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!analyses || analyses.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {analyses.map((analysis, index) => (
        <div
          key={analysis.rank}
          className="rounded-xl bg-bg-card border border-gray-800 p-6 hover:border-accent-purple/40 transition-colors"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{medals[index] || ''}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white leading-snug line-clamp-2">
                {analysis.title}
              </h3>
            </div>
            <span
              className={`text-xl font-bold ${getScoreColor(analysis.score)}`}
            >
              {analysis.score}
            </span>
          </div>

          {/* Hook */}
          <div className="mb-3 px-3 py-2 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
            <p className="text-sm text-purple-300 font-medium">
              {analysis.hook}
            </p>
          </div>

          {/* Summary */}
          <p className="text-sm text-gray-300 leading-relaxed mb-3">
            {analysis.summary}
          </p>

          {/* Strengths */}
          <ul className="space-y-1 mb-4">
            {analysis.strengths.map((strength, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-400"
              >
                <span className="text-accent-blue mt-0.5 flex-shrink-0">&#x25B8;</span>
                {strength}
              </li>
            ))}
          </ul>

          {/* View ad button */}
          {analysis.ad_snapshot_url && (
            <a
              href={analysis.ad_snapshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 border border-accent-purple/40 text-sm font-medium transition-colors"
            >
              광고 보기 &rarr;
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
