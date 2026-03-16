'use client'

import { useState } from 'react'

interface KeywordManagerProps {
  keywords: string[]
  onChange: (keywords: string[]) => void
}

export default function KeywordManager({ keywords, onChange }: KeywordManagerProps) {
  const [input, setInput] = useState('')

  const addKeyword = () => {
    const trimmed = input.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed])
      setInput('')
    }
  }

  const removeKeyword = (keyword: string) => {
    if (keywords.length <= 1) return
    onChange(keywords.filter((k) => k !== keyword))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
            style={{
              background: 'var(--color-accent-soft)',
              border: '1px solid var(--color-accent)',
              color: 'var(--color-text-primary)',
            }}
          >
            {keyword}
            <button
              onClick={() => removeKeyword(keyword)}
              disabled={keywords.length <= 1}
              className="ml-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label={`${keyword} 삭제`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="키워드 입력..."
          className="px-3 py-1.5 rounded-lg text-sm focus:outline-none transition-colors"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={addKeyword}
          disabled={!input.trim()}
          className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ background: 'var(--color-accent)' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--color-accent-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent)' }}
        >
          추가
        </button>
      </div>
    </div>
  )
}
