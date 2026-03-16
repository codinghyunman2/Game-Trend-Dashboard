import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { MetaAd, AdAnalysis } from '@/types/ad'

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY_NOT_SET' },
      { status: 401 }
    )
  }

  try {
    const { ads }: { ads: MetaAd[] } = await request.json()

    if (!ads || ads.length === 0) {
      return NextResponse.json(
        { error: 'NO_ADS_PROVIDED', message: '분석할 광고가 없습니다.' },
        { status: 400 }
      )
    }

    const adsData = ads.slice(0, 5).map((ad, i) => ({
      index: i + 1,
      title: ad.ad_creative_link_titles?.[0] || '',
      body: ad.ad_creative_bodies?.[0] || '',
      ad_snapshot_url: ad.ad_snapshot_url || '',
    }))

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system:
        '당신은 모바일 게임 광고 전문 마케터입니다. 주어진 광고 데이터를 분석하여 가장 효과적인 광고 Top 3를 선정하고 JSON으로만 응답합니다.',
      messages: [
        {
          role: 'user',
          content: `다음 디펜스 장르 모바일 게임 광고 상위 5개를 분석하여 가장 효과적인 Top 3를 선정해주세요.

광고 데이터:
${JSON.stringify(adsData, null, 2)}

다음 JSON 배열 형식으로만 응답해주세요 (마크다운 코드블록 없이):
[
  {
    "rank": 1,
    "score": (100점 만점 종합 점수),
    "title": "(광고 원문 제목 그대로 - title 필드)",
    "game_name": "(게임명 - title 또는 본문에서 추출)",
    "summary": "(광고 전략 요약 2~3문장)",
    "hook": "(이 광고의 핵심 후킹 포인트)",
    "strengths": ["강점1", "강점2", "강점3"],
    "ad_snapshot_url": "(원본 URL)"
  }
]`,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'ANALYSIS_ERROR', message: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 }
      )
    }

    let responseText = textContent.text.trim()
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) responseText = codeBlockMatch[1].trim()

    const analyses: AdAnalysis[] = JSON.parse(responseText)
    return NextResponse.json(analyses)
  } catch (error) {
    console.error('Error in analyze route:', error)
    return NextResponse.json(
      { error: 'ANALYSIS_ERROR', message: 'AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
