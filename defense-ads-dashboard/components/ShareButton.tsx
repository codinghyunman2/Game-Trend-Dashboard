'use client'

import { useState } from 'react'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = window.location.href
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
