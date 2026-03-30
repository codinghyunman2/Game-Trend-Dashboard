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

function colorTitlePrefix(title: string): { text: string; highlight: boolean }[] {
  // 쉼표 또는 따옴표(' ' ' ") 이전 텍스트를 파란색으로
  const sepMatch = title.match(/[,，'''""]/)
  if (sepMatch && sepMatch.index !== undefined && sepMatch.index > 0) {
    return [
      { text: title.slice(0, sepMatch.index), highlight: true },
      { text: title.slice(sepMatch.index), highlight: false },
    ]
  }
  // 구분자 없으면 첫 번째 띄어쓰기 이전 단어만
  const spaceIdx = title.indexOf(' ')
  if (spaceIdx > 0) {
    return [
      { text: title.slice(0, spaceIdx), highlight: true },
      { text: title.slice(spaceIdx), highlight: false },
    ]
  }
  return [{ text: title, highlight: true }]
}

function highlightKeywords(text: string): { text: string; highlight: boolean }[] {
  const pattern = /(\d{4}년\s*\d{1,2}월(?:\s*\d{1,2}일)?|\d{1,2}월\s*\d{1,2}일|\d+[억만천백](?:\s*원)?|\d+%|\d+배|\d+개월|\d+주|\d+년\s*연속|\d+년(?!\s*\d))/g
  const segments: { text: string; highlight: boolean }[] = []
  let lastIndex = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), highlight: false })
    segments.push({ text: match[0], highlight: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), highlight: false })
  return segments.length > 0 ? segments : [{ text, highlight: false }]
}

function truncateLine(line: string, maxLen = 38): string {
  if (line.length <= maxLen) return line
  const sub = line.slice(0, maxLen)
  const lastSpace = sub.lastIndexOf(' ')
  return lastSpace > 10 ? line.slice(0, lastSpace) : sub
}

const MIN_BULLET_LEN = 8

function parseSummaryLines(summaryKo: string): string[] {
  const MIN = MIN_BULLET_LEN

  // 1순위: 실제 개행 또는 literal \n 분리
  const byNewline = summaryKo.split(/\n|\\n/).map((s) => s.trim()).filter((s) => s.length >= MIN)
  if (byNewline.length >= 2) return byNewline.slice(0, 3).map((l) => truncateLine(l))

  // 2순위: 마침표+공백 단순 분리
  const byDot = summaryKo.split(/\.\s+/).map((s) => s.trim()).filter((s) => s.length >= MIN)
  if (byDot.length >= 2) return byDot.slice(0, 3).map((l) => truncateLine(l))

  // 최후: 원문 1개 불릿
  const fallback = truncateLine(summaryKo.trim())
  return fallback.length >= MIN ? [fallback] : []
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
          height: '1350px',
          overflow: 'hidden',
          background: '#0f0f1a',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 72px 68px',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        {/* 배경 그라디언트 상단 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '600px',
            background: `radial-gradient(ellipse at 10% 0%, ${accentColor}44 0%, transparent 60%)`,
          }}
        />
        {/* 배경 그라디언트 하단 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '500px',
            height: '500px',
            background: `radial-gradient(ellipse at 100% 100%, ${accentColor}22 0%, transparent 65%)`,
          }}
        />

        {/* TOP N 워터마크 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '48px',
            transform: 'translateY(-50%)',
            fontSize: '280px',
            fontWeight: 800,
            color: '#ffffff',
            opacity: 0.05,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            fontFamily: 'Pretendard',
          }}
        >
          {rank}
        </div>

        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '80px',
          }}
        >
          <span
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}
          >
            🎮 오늘의 게임 뉴스
          </span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '22px', color: '#9ca3af', fontWeight: 500 }}>{date}</span>
            <span style={{ fontSize: '22px', color: '#4b5563', marginLeft: '10px', marginRight: '10px' }}>·</span>
            <span style={{ fontSize: '22px', color: '#9ca3af', fontWeight: 500 }}>{source}</span>
            <span style={{ fontSize: '22px', color: '#4b5563', marginLeft: '10px', marginRight: '10px' }}>·</span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffffff',
                background: accentColor,
                padding: '4px 16px',
                borderRadius: '999px',
              }}
            >
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* 뉴스 제목 */}
        <div
          style={{
            fontSize: '76px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.25,
            marginBottom: '60px',
            letterSpacing: '-0.03em',
            wordBreak: 'keep-all',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {colorTitlePrefix(titleKo).map((seg, j) => (
            <span key={j} style={{ color: seg.highlight ? '#60a5fa' : '#ffffff' }}>
              {seg.text}
            </span>
          ))}
        </div>

        {/* 구분선 */}
        <div
          style={{
            width: '100%',
            height: '3px',
            background: accentColor,
            borderRadius: '2px',
            marginBottom: '24px',
            opacity: 0.6,
          }}
        />

        {/* 불릿 요약 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: i < lines.length - 1 ? '44px' : '0px',
              }}
            >
              {/* 좌측 컬러 바 */}
              <div
                style={{
                  width: '5px',
                  alignSelf: 'stretch',
                  minHeight: '44px',
                  background: accentColor,
                  borderRadius: '3px',
                  flexShrink: 0,
                  marginRight: '28px',
                }}
              />
              <span
                style={{
                  fontSize: '44px',
                  color: '#f3f4f6',
                  lineHeight: 1.6,
                  fontWeight: 600,
                  wordBreak: 'keep-all',
                  display: 'flex',
                  flexWrap: 'wrap',
                }}
              >
                {highlightKeywords(line).map((seg, j) => (
                  <span key={j} style={{ color: seg.highlight ? '#60a5fa' : '#f3f4f6' }}>
                    {seg.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>

        {/* 하단 브랜드 */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '52px',
            right: '72px',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '20px', color: '#374151', fontWeight: 500 }}>
            rocket-brief.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: 'Pretendard', data: regularFont, weight: 400, style: 'normal' },
        { name: 'Pretendard', data: boldFont, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: extraBoldFont, weight: 800, style: 'normal' },
      ],
    }
  )
}
