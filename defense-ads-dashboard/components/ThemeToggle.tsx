'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const light = stored !== 'dark'
    if (light) {
      document.documentElement.classList.add('light')
      setIsLight(true)
    } else {
      document.documentElement.classList.remove('light')
      setIsLight(false)
    }
  }, [])

  const toggle = () => {
    const next = !isLight
    setIsLight(next)
    if (next) {
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="테마 전환"
      style={{
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '16px',
        lineHeight: 1,
        color: 'var(--color-text-secondary)',
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {isLight ? '🌙' : '☀️'}
    </button>
  )
}
