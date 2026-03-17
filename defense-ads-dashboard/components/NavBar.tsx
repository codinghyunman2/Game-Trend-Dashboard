'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ShareButton from './ShareButton'
import ThemeToggle from './ThemeToggle'

export default function NavBar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: '홈' },
    { href: '/dashboard', label: '대시보드' },
    { href: '/dashboard/ads', label: '광고 트렌드' },
  ]

  return (
    <nav
      className="sticky top-0 z-50 bg-theme-surface border-b border-theme-border"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              {links.map((link) => {
                const isActive = link.href === '/'
                  ? pathname === '/'
                  : link.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-3 text-sm font-medium transition-colors min-h-[44px] inline-flex items-center"
                    style={{
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ShareButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
