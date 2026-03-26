import { BANNERS, BannerPage } from '@/lib/banners.config'

export default function BannerSlot({ page }: { page: BannerPage }) {
  const banner = BANNERS.find((b) => b.active && b.pages.includes(page))
  if (!banner) return null

  const inner = (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
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

  if (banner.link) {
    return (
      <div className="mb-6">
        <a href={banner.link} target="_blank" rel="noopener noreferrer sponsored">
          {inner}
        </a>
      </div>
    )
  }

  return <div className="mb-6">{inner}</div>
}
