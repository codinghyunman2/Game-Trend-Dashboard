'use client'

import { useEffect, useState } from 'react'
import { BANNERS, BannerItem, BannerPage } from '@/lib/banners.config'

export default function BannerSlot({ page }: { page: BannerPage }) {
  const [banner, setBanner] = useState<BannerItem | null>(null)

  useEffect(() => {
    const candidates = BANNERS.filter((b) => b.active && b.pages.includes(page))
    if (candidates.length === 0) return

    const idx = Math.floor(Math.random() * candidates.length)
    setBanner(candidates[idx])
  }, [page])

  if (!banner) return null

  const link = typeof banner.link === 'string'
    ? banner.link
    : (banner.link[page] ?? '')

  const inner = (
    <div className="relative w-full overflow-hidden rounded-xl border border-theme-border">
      <img
        src={banner.imagePath}
        alt={banner.alt}
        className="w-full h-auto block"
        loading="lazy"
      />
      <span
        className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.7)' }}
      >
        광고
      </span>
    </div>
  )

  return (
    <div className="mb-6">
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer sponsored">
          {inner}
        </a>
      ) : inner}
    </div>
  )
}
