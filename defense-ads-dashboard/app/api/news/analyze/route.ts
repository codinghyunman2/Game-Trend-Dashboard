import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/types/news'
import {
  extractClientIp,
  createRateLimiter,
  isBodyTooLarge,
  auditLog,
} from '@/lib/security'

const MAX_BODY_SIZE = 50 * 1024 // 50 KB
const MAX_NEWS_ITEMS = 20

// 5 req/min per IP (AI call)
const rateLimiter = createRateLimiter(60_000, 5)

/** Strip HTML tags and truncate a string */
function sanitiseText(text: string, maxLen: number): string {
  return String(text ?? '')
    .replace(/<[^>]+>/g, '')  // strip HTML (prevents prompt injection via markup)
    .slice(0, maxLen)
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_NOT_SET' },
      { status: 500 },
    )
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = extractClientIp(request.headers)
  const rl = rateLimiter.check(ip)
  if (!rl.allowed) {
    auditLog('RATE_LIMIT', ip, '/api/news/analyze')
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    )
  }

  // ── Body size ──────────────────────────────────────────────────────────────
  if (isBodyTooLarge(request.headers.get('content-length'), MAX_BODY_SIZE)) {
    return NextResponse.json(
      { error: 'PAYLOAD_TOO_LARGE', message: '요청 크기가 너무 큽니다.' },
      { status: 413 },
    )
  }

  // ── Parse & validate body ──────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    )
  }

  if (!body || typeof body !== 'object' || !('news' in body)) {
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: '잘못된 요청 형식입니다.' },
      { status: 400 },
    )
  }

  const { news } = body as { news: unknown }

  if (!Array.isArray(news) || news.length === 0) {
    return NextResponse.json(
      { error: 'NO_NEWS_PROVIDED', message: '분석할 뉴스가 없습니다.' },
      { status: 400 },
    )
  }

  try {
    // Sanitise each news item: strip HTML, truncate — prevents prompt injection
    const newsInput = (news as NewsItem[])
      .slice(0, MAX_NEWS_ITEMS)
      .map((n, i) => ({
        idx: i + 1,
        title: sanitiseText(n.titleKo || n.title, 200),
        summary: sanitiseText(n.summaryKo || n.summary, 400),
        source: sanitiseText(n.source, 100),
        link: String(n.link ?? '').slice(0, 500),
        pubDate: String(n.pubDate ?? ''),
        category: String(n.category ?? ''),
      }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: 'You are an expert analyst of the gaming industry news.',
        messages: [{
          role: 'user',
          content: `From the news list below, select and analyze the Top 5 most impactful stories for the gaming industry.

Selection criteria:
1. Industry impact (breadth of effect on the overall market)
2. Official corporate announcements (M&A, new releases, earnings, etc.)
3. Market trends (new genres, technology, business models)

News list:
${JSON.stringify(newsInput, null, 2)}

The summaryKo field must be exactly 3 sentences separated by newlines (\\n):
Sentence 1: Why this news matters
Sentence 2: What the key content is
Sentence 3: What it means for the gaming industry
Write all summaryKo sentences in Korean.

Respond in the following JSON array format. Output pure JSON only, no markdown code blocks:
[
  {
    "rank": 1,
    "titleKo": "Korean title",
    "summaryKo": "Why this news matters (Korean)\\nWhat the key content is (Korean)\\nWhat it means for the industry (Korean)",
    "source": "source name",
    "link": "original URL",
    "pubDate": "ISO date"
  }
]`,
        }],
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[news/analyze] Anthropic API error', res.status, errBody)
      return NextResponse.json(
        { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    const data = await res.json()
    const responseText = data.content?.[0]?.text ?? '[]'
    const cleaned = responseText.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const analyzed = JSON.parse(cleaned)

    return NextResponse.json(analyzed)
  } catch (err) {
    console.error('[news/analyze] Unexpected error:', err)
    return NextResponse.json(
      { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
