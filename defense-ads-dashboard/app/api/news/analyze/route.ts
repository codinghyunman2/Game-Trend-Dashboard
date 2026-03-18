import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/types/news'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not set' },
      { status: 500 }
    )
  }

  try {
    const { news }: { news: NewsItem[] } = await request.json()

    if (!news || news.length === 0) {
      return NextResponse.json(
        { error: 'No news provided' },
        { status: 400 }
      )
    }

    const newsInput = news.slice(0, 20).map((n, i) => ({
      idx: i + 1,
      title: n.titleKo || n.title,
      summary: n.summaryKo || n.summary,
      source: n.source,
      link: n.link,
      pubDate: n.pubDate,
      category: n.category,
    }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `당신은 게임 업계 뉴스 분석 전문가입니다. 아래 뉴스 목록에서 게임 업계에 가장 큰 영향을 미치는 뉴스 Top 5를 선정하고 분석해주세요.

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
    "summaryKo": "이 뉴스가 왜 중요한지 한 문장\n핵심 내용이 무엇인지 한 문장\n게임 업계에 어떤 의미인지 한 문장",
    "source": "출처명",
    "link": "원문 링크",
    "pubDate": "ISO 날짜"
  }
]`,
        }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Claude API error:', errText)
      return NextResponse.json(
        { error: 'Analysis failed' },
        { status: 500 }
      )
    }

    const data = await res.json()
    const responseText = data.content?.[0]?.text ?? '[]'
    const cleaned = responseText.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
    const analyzed = JSON.parse(cleaned)

    return NextResponse.json(analyzed)
  } catch (error) {
    console.error('News analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', message: '뉴스 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
