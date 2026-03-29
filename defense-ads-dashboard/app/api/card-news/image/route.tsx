import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const CATEGORY_COLORS: Record<string, string> = {
  defense: '#7c3aed',
  mobile: '#2563eb',
  general: '#6b7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  defense: '디펜스',
  mobile: '모바일',
  general: '일반',
}

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  return res.arrayBuffer()
}

function parseSummaryLines(summaryKo: string): string[] {
  // 1순위: \n 분리
  let lines = summaryKo.split('\n').map((s) => s.trim()).filter(Boolean)
  if (lines.length >= 2) return lines.slice(0, 3)
  // 2순위: 음슴체 어미 뒤 공백 기준 분리
  lines = summaryKo.split(/(?<=[음슴됨함임]\.?)\s+(?=[가-힣])/).map((s) => s.trim()).filter(Boolean)
  if (lines.length >= 2) return lines.slice(0, 3)
  // 3순위: 마침표 + 공백
  lines = summaryKo.split(/\.\s+/).map((s) => s.trim()).filter(Boolean)
  return lines.slice(0, 3)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rank = searchParams.get('rank') || '1'
  const titleKo = searchParams.get('titleKo') || ''
  const summaryKo = searchParams.get('summaryKo') || ''
  const source = searchParams.get('source') || ''
  const category = searchParams.get('category') || 'general'
  const date = searchParams.get('date') || ''

  const lines = parseSummaryLines(summaryKo)

  const accentColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general
  const categoryLabel = CATEGORY_LABELS[category] ?? category

  const origin = new URL(request.url).origin
  const [regularFont, boldFont, extraBoldFont] = await Promise.all([
    loadFont(`${origin}/fonts/Pretendard-Regular.otf`),
    loadFont(`${origin}/fonts/Pretendard-Bold.otf`),
    loadFont(`${origin}/fonts/Pretendard-ExtraBold.otf`),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '900px',
          background: '#0f0f1a',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 68px 28px',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        {/* 배경 그라디언트 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '360px',
            background: `radial-gradient(ellipse at 10% 0%, ${accentColor}44 0%, transparent 65%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: `radial-gradient(ellipse at 100% 100%, ${accentColor}1a 0%, transparent 65%)`,
          }}
        />

        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '25px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}
            >
              🎮 오늘의 게임 뉴스
            </span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '17px', color: '#e5e7eb', fontWeight: 500 }}>{date}</span>
              <span style={{ fontSize: '17px', color: '#6b7280', marginLeft: '8px', marginRight: '8px' }}>·</span>
              <span style={{ fontSize: '17px', color: '#e5e7eb', fontWeight: 500 }}>{source}</span>
              <span style={{ fontSize: '17px', color: '#6b7280', marginLeft: '8px', marginRight: '8px' }}>·</span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: accentColor,
                  padding: '3px 12px',
                  borderRadius: '999px',
                }}
              >
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* 순위 배지 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}88)`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.1em',
                marginBottom: '1px',
              }}
            >
              TOP
            </span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              {rank}
            </span>
          </div>
        </div>

        {/* 구분선 */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: `linear-gradient(to right, ${accentColor}cc, transparent)`,
            marginBottom: '20px',
          }}
        />

        {/* 뉴스 제목 */}
        <div
          style={{
            fontSize: '42px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.3,
            marginBottom: '18px',
            letterSpacing: '-0.02em',
            wordBreak: 'keep-all',
          }}
        >
          {titleKo}
        </div>

        {/* 액센트 바 */}
        <div
          style={{
            width: '40px',
            height: '3px',
            background: accentColor,
            borderRadius: '2px',
            marginBottom: '18px',
          }}
        />

        {/* 불릿 요약 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '14px',
            padding: '24px 28px',
            flex: 1,
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: i < lines.length - 1 ? '12px' : '0px',
              }}
            >
              {/* 불릿 */}
              <span
                style={{
                  fontSize: '28px',
                  color: accentColor,
                  fontWeight: 700,
                  lineHeight: 1.7,
                  marginRight: '14px',
                  flexShrink: 0,
                  marginTop: '-2px',
                }}
              >
                •
              </span>
              {/* 문장 */}
              <span
                style={{
                  fontSize: '28px',
                  color: '#d1d5db',
                  lineHeight: 1.7,
                  fontWeight: 400,
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </span>
            </div>
          ))}
        </div>

        {/* 하단 브랜드 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: '16px',
          }}
        >
          <span style={{ fontSize: '15px', color: '#4b5563', fontWeight: 500 }}>
            rocket-brief.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 900,
      fonts: [
        { name: 'Pretendard', data: regularFont, weight: 400, style: 'normal' },
        { name: 'Pretendard', data: boldFont, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: extraBoldFont, weight: 800, style: 'normal' },
      ],
    }
  )
}
