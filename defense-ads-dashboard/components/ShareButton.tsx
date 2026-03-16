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
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 border border-accent-purple/40 text-sm font-medium transition-all duration-200"
    >
      {copied ? '\u2705 \ubcf5\uc0ac\ub428!' : '\uD83D\uDD17 \ub9c1\ud06c \ubcf5\uc0ac'}
    </button>
  )
}
