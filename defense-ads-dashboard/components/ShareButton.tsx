'use client'

import { useState } from 'react'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.warn('클립보드 복사 실패:', e)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
      style={{
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {copied ? '복사됨!' : '링크 복사'}
    </button>
  )
}
