'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ShareButton from './ShareButton'

export default function NavBar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: '메인' },
    { href: '/ads', label: '크리에이티브' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800" style={{ backgroundColor: '#0f0f1a' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              {links.map((link) => {
                const isActive = link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] inline-flex items-center ${
                      isActive
                        ? 'bg-accent-purple/20 text-purple-300 border border-accent-purple/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <ShareButton />
        </div>
      </div>
    </nav>
  )
}
