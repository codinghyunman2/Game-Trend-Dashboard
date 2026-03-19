import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '2026 게임 트렌드 대시보드'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0d0d0d',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 100px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 배경 그라디언트 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse at 0% 0%, rgba(220,38,38,0.15) 0%, transparent 70%)',
          }}
        />

        {/* 상단 태그 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#dc2626',
            }}
          >
            2026 게임 트렌드
          </span>
        </div>

        {/* 메인 카피 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '72px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '32px',
            maxWidth: '800px',
          }}
        >
          <span>매일 아침 5분,</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ color: '#dc2626' }}>게임 업계의</span>
            <span>모든 것</span>
          </div>
        </div>

        {/* 설명 */}
        <div
          style={{
            display: 'flex',
            fontSize: '24px',
            color: '#9ca3af',
            marginBottom: '60px',
            maxWidth: '700px',
            lineHeight: 1.5,
          }}
        >
          AI가 선별한 뉴스 + Meta 광고 라이브러리 크리에이티브 트렌드
        </div>

        {/* 하단 영역 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* URL */}
          <span style={{ fontSize: '18px', color: '#6b7280' }}>
            game-wave.vercel.app
          </span>

          {/* 지표 */}
          <div style={{ display: 'flex', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '40px', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
                11
              </span>
              <span style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px' }}>뉴스 채널</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '40px', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
                매일
              </span>
              <span style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px' }}>자동 업데이트</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '40px', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
                AI
              </span>
              <span style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px' }}>자동 분석</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
