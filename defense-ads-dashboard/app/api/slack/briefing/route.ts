import { NextRequest, NextResponse } from 'next/server'
import { NewsFetchResponse, UpcomingGame } from '@/types/news'
import { FetchAdsResponse } from '@/types/ad'
import {
  extractClientIp,
  createRateLimiter,
  safeCompareSecret,
  auditLog,
  validateSelfCallBaseUrl,
} from '@/lib/security'

export const dynamic = 'force-dynamic'

// 3 req/min per IP — this endpoint is cron-only in normal operation
const rateLimiter = createRateLimiter(60_000, 3)

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const day = DAYS_KO[date.getDay()]
  return `${y}년 ${m}월 ${d}일 (${day})`
}

/**
 * Build the base URL for internal self-calls.
 * Validates each candidate against SSRF rules before use.
 */
function getBaseUrl(): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // localhost only in development — validateSelfCallBaseUrl blocks it in production
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
  ]

  for (const candidate of candidates) {
    if (candidate && validateSelfCallBaseUrl(candidate)) {
      return candidate
    }
  }

  // Should not reach here in production; indicates misconfiguration
  console.error('[slack/briefing] No valid base URL found — check SITE_URL env var')
  return 'http://localhost:3000'
}

async function fetchUpcomingGamesData(): Promise<UpcomingGame[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/upcoming-games`, { cache: 'no-store' })
    if (!res.ok) return []
    const data: { games: UpcomingGame[] } = await res.json()
    return data.games ?? []
  } catch (e) {
    console.error('[slack/briefing] 출시 예정 게임 데이터 가져오기 실패:', e)
    return []
  }
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

// Slack mrkdwn special-character escaping (must be applied before inserting any
// untrusted or LLM-generated text into Block Kit messages)
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

async function sendSlackMessage(
  briefingText: string,
  _newsData?: NewsFetchResponse | null,
  upcomingGames: UpcomingGame[] = [],
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('[slack/briefing] SLACK_WEBHOOK_URL 미설정')
    return false
  }

  // Validate the webhook URL is actually a Slack endpoint
  try {
    const parsed = new URL(webhookUrl)
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('slack.com')) {
      console.error('[slack/briefing] SLACK_WEBHOOK_URL이 유효한 Slack 주소가 아닙니다')
      return false
    }
  } catch {
    console.error('[slack/briefing] SLACK_WEBHOOK_URL 파싱 실패')
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

  const upcomingBlock = upcomingGames.length > 0
    ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🎮 *신규 출시 예정*\n${upcomingGames.slice(0, 5).map((g) => {
            const name = escapeSlackText(g.nameKo || g.name)
            const platform = g.platform.join('/')
            const date = g.releaseDateLabel ? ` · ${g.releaseDateLabel}` : ''
            return g.link && isValidHttpsUrl(g.link)
              ? `• <${g.link}|${name}> — ${platform}${date}`
              : `• ${name} — ${platform}${date}`
          }).join('\n')}\n`,
        },
      }]
    : []

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*게임 트렌드 데일리 브리핑*\n${today}\n━━━━━━━━━━━━━━━━━━`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `📰 *오늘의 주요 뉴스*\n${newsLines}\n` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `🖥️ *광고 트렌드*\n${adTrendLines}\n` },
    },
    ...upcomingBlock,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `👉 <https://game-trend-dashboard.vercel.app/dashboard|전체 보기>`,
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
      console.error('[slack/briefing] 슬랙 발송 실패:', res.status)
      return false
    }
    return true
  } catch (e) {
    console.error('[slack/briefing] 슬랙 발송 에러:', e)
    return false
  }
}

export async function GET(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/slack/briefing')
    return NextResponse.json(
      { success: false, message: '너무 많은 요청입니다.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // ── Cron authentication ────────────────────────────────────────────────────
  // Test mode requires SLACK_TEST_MODE=true in env — disabled by default in production.
  const testModeEnabled = process.env.SLACK_TEST_MODE === 'true'
  const isTest = testModeEnabled && request.nextUrl.searchParams.get('test') === 'true'

  if (!isTest) {
    const cronSecret = process.env.CRON_SECRET ?? ''
    if (!cronSecret) {
      // Misconfiguration: no secret configured
      console.error('[slack/briefing] CRON_SECRET 미설정 — 요청 거부')
      auditLog('AUTH_FAILURE', ip, '/api/slack/briefing', 'CRON_SECRET_NOT_SET')
      return NextResponse.json({ success: false, message: '인증 실패' }, { status: 401 })
    }

    const authHeader = request.headers.get('authorization') ?? ''
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    // Constant-time comparison prevents timing-based secret enumeration
    if (!safeCompareSecret(provided, cronSecret)) {
      auditLog('AUTH_FAILURE', ip, '/api/slack/briefing', 'INVALID_CRON_SECRET')
      return NextResponse.json({ success: false, message: '인증 실패' }, { status: 401 })
    }

    auditLog('CRON_AUTH_SUCCESS', ip, '/api/slack/briefing')
  }

  // ── Fetch data & send briefing ─────────────────────────────────────────────
  const [newsData, adsData, upcomingGames] = await Promise.all([
    fetchNewsData(),
    fetchAdsData(),
    fetchUpcomingGamesData(),
  ])

  if (!newsData || newsData.allNews.length === 0) {
    return NextResponse.json({ success: false, message: '뉴스 데이터 없음' })
  }

  const briefingText = await generateBriefing(newsData, adsData)
  if (!briefingText) {
    return NextResponse.json({ success: false, message: '브리핑 생성 실패' })
  }

  const sent = await sendSlackMessage(briefingText, newsData, upcomingGames)
  if (!sent) {
    return NextResponse.json({ success: false, message: '슬랙 발송 실패' })
  }

  return NextResponse.json({ success: true, message: '브리핑 발송 완료' })
}
