import Anthropic from '@anthropic-ai/sdk'
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

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: '당신은 게임 업계 뉴스 분석 전문가입니다.',
      messages: [{
        role: 'user',
        content: `아래 뉴스 목록에서 게임 업계에 가장 큰 영향을 미치는 뉴스 Top 5를 선정하고 분석해주세요.

선정 기준:
1. 업계 영향력 (시장 전체에 미치는 파급력)
2. 기업 공식 발표 (인수합병, 신작 출시, 실적 등)
3. 시장 트렌드 (새로운 장르, 기술, 비즈니스 모델)

뉴스 목록:
${JSON.stringify(newsInput, null, 2)}

summaryKo 필드는 반드시 3문장으로 작성하고 각 문장은 줄바꿈(\\n)으로 구분하세요:
1문장: 이 뉴스가 왜 중요한지
2문장: 핵심 내용이 무엇인지
3문장: 게임 업계에 어떤 의미인지

다음 JSON 배열 형식으로 응답해주세요. 마크다운 코드 블록 없이 순수 JSON만 출력해주세요:
[
  {
    "rank": 1,
    "titleKo": "한국어 제목",
    "summaryKo": "이 뉴스가 왜 중요한지 한 문장\\n핵심 내용이 무엇인지 한 문장\\n게임 업계에 어떤 의미인지 한 문장",
    "source": "출처명",
    "link": "원문 링크",
    "pubDate": "ISO 날짜"
  }
]`,
      }],
    })

    const responseText = message.content.find(c => c.type === 'text')?.text ?? '[]'
    const cleaned = responseText.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const analyzed = JSON.parse(cleaned)

    return NextResponse.json(analyzed)
  } catch {
    return NextResponse.json(
      { error: 'ANALYSIS_FAILED', message: '뉴스 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
