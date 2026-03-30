import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/types/news'
import {
  extractClientIp,
  createRateLimiter,
  isBodyTooLarge,
  auditLog,
  checkRateLimit,
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
  const rl = await checkRateLimit(ip, rateLimiter, 5, 60_000)
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
    const rawBody = await request.text()
    if (rawBody.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'PAYLOAD_TOO_LARGE', message: '요청 크기가 너무 큽니다.' },
        { status: 413 },
      )
    }
    body = JSON.parse(rawBody)
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
        max_tokens: 6000,
        system: 'You are an expert analyst of the gaming industry news.',
        messages: [{
          role: 'user',
          content: `From the news list below, select and analyze the Top 7 most impactful stories for the gaming industry.

Selection criteria:
1. Industry impact (breadth of effect on the overall market)
2. Official corporate announcements (M&A, new releases, earnings, etc.)
3. Market trends (new genres, technology, business models)

News list:
${JSON.stringify(newsInput, null, 2)}

titleKo rules:
- Maximum 22 Korean characters. Compress aggressively if needed.
- Mixed Korean/English: insert a space between Korean and English word boundaries naturally.
- Numbers + unit + Korean: always insert a space (e.g. "700% 달성", "3조 원", "1위 등극").

The summaryKo field must contain EXACTLY 3 bullets separated by the newline character (\\n).
Each bullet MUST be 50~80 Korean characters — a complete, informative sentence.
Written in 음슴체 (ending with ~음, ~슴, ~함, ~됨, ~임 etc. Never use 합쇼체 or 해요체).
Each bullet must end with a period (.).
Numbers + unit + Korean inside bullets: always insert a space (e.g. "700% 달성", "3조 원").
Bullet 1: The single most important fact (핵심 팩트 한 줄)
Bullet 2: Industry impact in one line (업계 파급력 한 줄)
Bullet 3: What to watch next (주목 포인트 한 줄)
Do NOT use literal backslash-n (\\\\n). Use only the actual \\n newline escape in JSON strings.

For the category field, use one of: "defense" (디펜스/타워디펜스 관련), "mobile" (모바일 게임 관련), "general" (그 외).

Respond in the following JSON array format. Output pure JSON only, no markdown code blocks:
[
  {
    "rank": 1,
    "titleKo": "Korean title",
    "summaryKo": "핵심 팩트 한 줄\\n업계 파급력 한 줄\\n주목 포인트 한 줄",
    "source": "source name",
    "link": "original URL",
    "pubDate": "ISO date",
    "category": "defense | mobile | general"
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
    const responseText: string = data.content?.[0]?.text ?? ''

    // Extract JSON array — handles code fences and surrounding prose
    let analyzed: unknown
    try {
      // First try: strip code fences and parse directly
      const stripped = responseText.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
      try {
        analyzed = JSON.parse(stripped)
      } catch {
        // Fallback: find the first `[` ... last `]` block in the response
        const start = responseText.indexOf('[')
        const end = responseText.lastIndexOf(']')
        if (start === -1 || end === -1 || end <= start) throw new Error('no JSON array found')
        analyzed = JSON.parse(responseText.slice(start, end + 1))
      }
    } catch {
      console.error('[news/analyze] Failed to parse LLM JSON response:', responseText.slice(0, 200))
      return NextResponse.json(
        { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    if (!Array.isArray(analyzed) || analyzed.length === 0) {
      console.error('[news/analyze] LLM returned empty or non-array response')
      return NextResponse.json(
        { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    // Normalise each item — coerce types instead of hard-failing on minor LLM quirks
    type RawItem = Record<string, unknown>
    const VALID_CATEGORIES = ['defense', 'mobile', 'general'] as const
    const normalized = (analyzed as RawItem[])
      .filter((item) => item !== null && typeof item === 'object' && ('titleKo' in item || 'summaryKo' in item))
      .map((item, i) => ({
        rank: typeof item.rank === 'number' ? item.rank : Number(item.rank) || i + 1,
        titleKo: String(item.titleKo ?? ''),
        summaryKo: String(item.summaryKo ?? ''),
        source: String(item.source ?? ''),
        link: item.link != null ? String(item.link) : '',
        pubDate: String(item.pubDate ?? ''),
        category: (VALID_CATEGORIES as readonly string[]).includes(String(item.category))
          ? (String(item.category) as 'defense' | 'mobile' | 'general')
          : ('general' as const),
      }))
      .filter((item) => item.titleKo.length > 0)

    if (normalized.length === 0) {
      console.error('[news/analyze] No valid items after normalisation')
      return NextResponse.json(
        { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('[news/analyze] Unexpected error:', err)
    return NextResponse.json(
      { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
