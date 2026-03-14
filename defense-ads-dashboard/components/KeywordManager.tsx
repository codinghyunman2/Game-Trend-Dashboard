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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-purple/20 border border-accent-purple/40 text-sm"
          >
            {keyword}
            <button
              onClick={() => removeKeyword(keyword)}
              disabled={keywords.length <= 1}
              className="ml-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          className="px-3 py-1.5 rounded-lg bg-bg-card border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple transition-colors"
        />
        <button
          onClick={addKeyword}
          disabled={!input.trim()}
          className="px-4 py-1.5 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
      </div>
    </div>
  )
}
