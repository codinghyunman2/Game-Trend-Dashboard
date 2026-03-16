'use client'

import { useState } from 'react'
import { MetaAd } from '@/types/ad'

interface AdCardProps {
  ad: MetaAd & { score: number }
}

function getCopyBadge(count: number): { label: string; color: string } | null {
  if (count < 2) return null
  if (count >= 5) return { label: `🔥 ${count}개 소재 집행 중`, color: 'bg-red-600/80 text-red-100' }
  if (count >= 3) return { label: `🔥 ${count}개 소재 집행 중`, color: 'bg-orange-600/80 text-orange-100' }
  return { label: `🔥 ${count}개 소재 집행 중`, color: 'bg-yellow-600/80 text-yellow-100' }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  return '#e5384f'
}

function formatImpressions(lower: string, upper: string): string {
  const lowerNum = Math.round(parseInt(lower, 10) / 10000)
  const upperNum = Math.round(parseInt(upper, 10) / 10000)
  return `약 ${lowerNum}만 ~ ${upperNum}만 노출`
}

function getDaysAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '오늘'
  return `${diff}일 전`
}

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-600',
  messenger: 'bg-purple-600',
  audience_network: 'bg-green-600',
}

export default function AdCard({ ad }: AdCardProps) {
  const [expanded, setExpanded] = useState(false)

  const score = ad.score
  const color = getScoreColor(score)
  const circumference = 226.2
  const offset = circumference - (score / 100) * circumference

  const title = ad.ad_creative_link_titles?.[0] || '(제목 없음)'
  const body = ad.ad_creative_bodies?.[0] || ''
  const truncatedBody = body.length > 120 ? body.slice(0, 120) + '...' : body
  const copyBadge = getCopyBadge(ad.copyCount ?? 0)

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 transition-colors"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Copy badge */}
      {copyBadge && (
        <div className="flex">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${copyBadge.color}`}>
            {copyBadge.label}
          </span>
        </div>
      )}
      {/* Header: Score gauge + Title */}
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0 w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color }}>
              {score}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold leading-snug line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
          {ad.page_name && (
            <p className="text-sm mt-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>{ad.page_name}</p>
          )}
        </div>
      </div>

      {/* Impressions & Date */}
      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {ad.impressions && (
          <span
            className="px-2 py-1 rounded"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {formatImpressions(ad.impressions.lower_bound, ad.impressions.upper_bound)}
          </span>
        )}
        {ad.ad_delivery_start_time && (
          <span>{getDaysAgo(ad.ad_delivery_start_time)}</span>
        )}
      </div>

      {/* Platform badges */}
      {ad.publisher_platforms && ad.publisher_platforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ad.publisher_platforms.map((platform) => (
            <span
              key={platform}
              className={`px-2 py-0.5 rounded text-xs text-white ${platformColors[platform] || 'bg-gray-600'}`}
            >
              {platform}
            </span>
          ))}
        </div>
      )}

      {/* Body text */}
      {body && (
        <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          <p>{expanded ? body : truncatedBody}</p>
          {body.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      )}

      {/* View ad link */}
      {ad.ad_snapshot_url && (
        <a
          href={ad.ad_snapshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm transition-colors mt-auto hover:underline"
          style={{ color: 'var(--color-accent)' }}
        >
          광고 보기 &rarr;
        </a>
      )}
    </div>
  )
}
