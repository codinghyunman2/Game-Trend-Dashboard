import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import { ScrollToTop } from '@/components/ScrollToTop'

export const metadata: Metadata = {
  title: '2026 게임 트렌드',
  description: '매일 아침 5분, 게임 업계의 모든 것. AI가 선별한 뉴스 + Meta 광고 라이브러리 크리에이티브 트렌드',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: '2026 게임 트렌드 대시보드',
    description: '매일 아침 5분, 게임 업계의 모든 것. AI가 선별한 뉴스 + Meta 광고 라이브러리 크리에이티브 트렌드',
    url: 'https://game-wave.vercel.app',
    siteName: '2026 게임 트렌드',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2026 게임 트렌드 대시보드',
    description: '매일 아침 5분, 게임 업계의 모든 것. AI가 선별한 뉴스 + Meta 광고 라이브러리 크리에이티브 트렌드',
  },
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
        <ScrollToTop />
        <NavBar />
        {children}
      </body>
    </html>
  )
}
