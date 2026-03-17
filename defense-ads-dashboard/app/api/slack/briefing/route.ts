import { NextRequest, NextResponse } from 'next/server'
import { NewsFetchResponse } from '@/types/news'

export const dynamic = 'force-dynamic'

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const day = DAYS_KO[date.getDay()]
  return `${y}년 ${m}월 ${d}일 (${day})`
}

async function fetchNewsData(): Promise<NewsFetchResponse | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/news/fetch`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('[slack/briefing] 뉴스 데이터 가져오기 실패:', e)
    return null
  }
}

async function generateBriefing(newsData: NewsFetchResponse): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const top20 = newsData.allNews.slice(0, 20).map((n) => ({
    title: n.titleKo || n.title,
    summary: n.summaryKo || n.summary,
    source: n.source,
    category: n.category,
  }))

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `다음 게임 업계 뉴스에서 오늘 가장 중요한 내용을 슬랙 메시지용으로 요약해줘.

형식 (정확히 이 형식으로):
뉴스1: [핵심 한 줄]
뉴스2: [핵심 한 줄]
뉴스3: [핵심 한 줄]
광고트렌드: [디펜스 장르 광고 동향 한 줄]

- 각 항목은 한 줄, 50자 이내
- 한국어로 작성
- 마크다운 없이 순수 텍스트만

뉴스 데이터:
${JSON.stringify(top20, null, 2)}`,
        }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.content?.[0]?.text?.trim() ?? null
  } catch (e) {
    console.error('[slack/briefing] Claude 브리핑 생성 실패:', e)
    return null
  }
}

function parseBriefingLines(text: string): { news: string[]; adTrend: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const news: string[] = []
  let adTrend = '디펜스 장르 광고 동향 집계 중'

  for (const line of lines) {
    if (line.startsWith('뉴스')) {
      const content = line.replace(/^뉴스\d+:\s*/, '')
      if (content) news.push(content)
    } else if (line.startsWith('광고트렌드:')) {
      adTrend = line.replace(/^광고트렌드:\s*/, '')
    }
  }

  return { news: news.slice(0, 3), adTrend }
}

async function sendSlackMessage(briefingText: string): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('[slack/briefing] SLACK_WEBHOOK_URL 미설정')
    return false
  }

  const today = formatDate(new Date())
  const { news, adTrend } = parseBriefingLines(briefingText)

  if (news.length === 0) {
    console.error('[slack/briefing] 파싱된 뉴스 없음')
    return false
  }

  const newsLines = news.map((n) => `• ${n}`).join('\n')

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*게임 트렌드 데일리 브리핑*\n${today}\n━━━━━━━━━━━━━━━━━━━━`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📰 *오늘의 주요 뉴스*\n${newsLines}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎮 *광고 트렌드*\n• ${adTrend}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `👉 전체 보기: https://game-trend-dashboard.vercel.app/dashboard`,
      },
    },
  ]

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })

    if (!res.ok) {
      console.error('[slack/briefing] 슬랙 발송 실패:', res.status, res.statusText)
      return false
    }
    return true
  } catch (e) {
    console.error('[slack/briefing] 슬랙 발송 에러:', e)
    return false
  }
}

export async function GET(request: NextRequest) {
  const isTest = request.nextUrl.searchParams.get('test') === 'true'

  // Vercel Cron 요청 검증 (test 모드 제외)
  if (!isTest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, message: '인증 실패' }, { status: 401 })
    }
  }

  // 1. 뉴스 데이터 가져오기
  const newsData = await fetchNewsData()
  if (!newsData || newsData.allNews.length === 0) {
    console.log('[slack/briefing] 뉴스 데이터 없음 — 발송 스킵')
    return NextResponse.json({ success: false, message: '뉴스 데이터 없음' })
  }

  // 2. Claude로 브리핑 생성
  const briefingText = await generateBriefing(newsData)
  if (!briefingText) {
    return NextResponse.json({ success: false, message: '브리핑 생성 실패' })
  }

  // 3. 슬랙 발송
  const sent = await sendSlackMessage(briefingText)
  if (!sent) {
    return NextResponse.json({ success: false, message: '슬랙 발송 실패' })
  }

  return NextResponse.json({ success: true, message: '브리핑 발송 완료' })
}
