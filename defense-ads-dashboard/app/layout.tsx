import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '디펜스 광고 대시보드',
  description: '디펜스 장르 모바일 게임 광고 수집·분석 도구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body style={{ backgroundColor: '#0f0f1a', color: '#e2e8f0' }}>
        {children}
      </body>
    </html>
  )
}
