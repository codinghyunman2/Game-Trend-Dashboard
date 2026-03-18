import { NextRequest, NextResponse } from 'next/server'
import { NewsFetchResponse } from '@/types/news'
import { FetchAdsResponse } from '@/types/ad'

export const dynamic = 'force-dynamic'

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const day = DAYS_KO[date.getDay()]
  return `${y}년 ${m}월 ${d}일 (${day})`
}

function getBaseUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function fetchNewsData(): Promise<NewsFetchResponse | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/news/fetch`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('[slack/briefing] 뉴스 데이터 가져오기 실패:', e)
    return null
  }
}

async function fetchAdsData(): Promise<FetchAdsResponse | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/fetch-ads?keywords=디펜스`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('[slack/briefing] 광고 데이터 가져오기 실패:', e)
    return null
  }
}

interface AdSummary {
  page_name: string
  body: string
}

async function generateBriefing(
  newsData: NewsFetchResponse,
  adsData: FetchAdsResponse | null,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const top20 = newsData.allNews.slice(0, 20).map((n) => ({
    title: n.titleKo || n.title,
    summary: n.summaryKo || n.summary,
    link: n.link,
    source: n.source,
    category: n.category,
  }))

  const top5Ads: AdSummary[] = (adsData?.ads ?? []).slice(0, 5).map((ad) => ({
    page_name: ad.page_name ?? '(알 수 없음)',
    body: ad.ad_creative_bodies?.[0] ?? '(광고 텍스트 없음)',
  }))

  const adsSection = top5Ads.length > 0
    ? `광고 데이터 (점수 상위 5개):\n${JSON.stringify(top5Ads, null, 2)}`
    : '광고 데이터: 수집된 광고 없음'

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `당신은 게임 업계 전문 애널리스트입니다.
오늘의 게임 업계 뉴스와 광고 트렌드를 바탕으로 실무자에게 유용한 데일리 브리핑을 작성해주세요.

작성 규칙:
- 뉴스 3개: 구체적인 사실 기반으로 한 줄씩
- 광고트렌드: 실제 수집된 광고 데이터 기반으로 현재 어떤 소재/메시지가 집행되고 있는지 구체적으로
- 각 항목은 실무에 바로 활용 가능한 인사이트로
- 뉴스 요약은 50자 이내
- 한국어로 작성
- 반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이)

응답 형식 (JSON만):
{
  "news": [
    { "summary": "핵심 한 줄 요약", "link": "원문 URL", "source": "출처명" },
    { "summary": "핵심 한 줄 요약", "link": "원문 URL", "source": "출처명" },
    { "summary": "핵심 한 줄 요약", "link": "원문 URL", "source": "출처명" }
  ],
  "adTrends": [
    "집행 중인 주요 소재/메시지 요약 (실제 광고 데이터 기반, 50자 이내)",
    "광고에서 보이는 핵심 전략 또는 트렌드 (50자 이내)",
    "실무 인사이트 또는 시사점 (50자 이내)"
  ]
}

뉴스 데이터:
${JSON.stringify(top20, null, 2)}

${adsSection}`,
        }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const text = data.content?.[0]?.text?.trim() ?? null
    // JSON 블록 마크다운 제거 (```json ... ``` 형태 대응)
    if (text) {
      const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
      return fenceMatch ? fenceMatch[1].trim() : text
    }
    return null
  } catch (e) {
    console.error('[slack/briefing] Claude 브리핑 생성 실패:', e)
    return null
  }
}

interface BriefingNewsItem {
  summary: string
  link: string
  source: string
}

// Slack mrkdwn 특수문자 이스케이프 (LLM 출력 삽입 전 필수)
function escapeSlackText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function parseBriefingLines(text: string): { news: BriefingNewsItem[]; adTrends: string[] } {
  try {
    const parsed = JSON.parse(text)
    const news: BriefingNewsItem[] = Array.isArray(parsed.news)
      ? parsed.news.slice(0, 3).map((n: BriefingNewsItem) => ({
          summary: n.summary ?? '',
          link: n.link ?? '',
          source: n.source ?? '',
        }))
      : []
    const adTrends: string[] = Array.isArray(parsed.adTrends) && parsed.adTrends.length > 0
      ? parsed.adTrends.slice(0, 3)
      : ['디펜스 장르 광고 동향 집계 중']
    return { news, adTrends }
  } catch {
    return { news: [], adTrends: ['디펜스 장르 광고 동향 집계 중'] }
  }
}

async function sendSlackMessage(briefingText: string): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('[slack/briefing] SLACK_WEBHOOK_URL 미설정')
    return false
  }

  const today = formatDate(new Date())
  const { news, adTrends } = parseBriefingLines(briefingText)

  if (news.length === 0) {
    console.error('[slack/briefing] 파싱된 뉴스 없음')
    return false
  }

  const newsLines = news
    .map((n) => {
      const summary = escapeSlackText(n.summary)
      const source = escapeSlackText(n.source)
      return n.link && isValidHttpsUrl(n.link)
        ? `• <${n.link}|${summary}> — ${source}`
        : `• ${summary} — ${source}`
    })
    .join('\n')

  const adTrendLines = adTrends.map((t) => `• ${escapeSlackText(t)}`).join('\n')

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
        text: `🎮 *광고 트렌드*\n${adTrendLines}`,
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
      body: JSON.stringify({ blocks, unfurl_links: false, unfurl_media: false }),
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

  // 1. 뉴스 + 광고 데이터 병렬 가져오기
  const [newsData, adsData] = await Promise.all([fetchNewsData(), fetchAdsData()])

  if (!newsData || newsData.allNews.length === 0) {
    console.log('[slack/briefing] 뉴스 데이터 없음 — 발송 스킵')
    return NextResponse.json({ success: false, message: '뉴스 데이터 없음' })
  }

  // 2. Claude로 브리핑 생성
  const briefingText = await generateBriefing(newsData, adsData)
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
