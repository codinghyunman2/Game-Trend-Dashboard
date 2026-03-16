import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: '2026 게임 트렌드',
  description: '게임 업계 뉴스 허브 & 디펜스 장르 광고 트렌드 분석',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}` }} />
      </head>
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  )
}
