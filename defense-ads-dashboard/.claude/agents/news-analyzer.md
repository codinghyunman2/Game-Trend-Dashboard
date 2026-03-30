---
name: news-analyzer
description: 수집된 뉴스에서 Top7 선정만 담당하는 에이전트. 불릿 요약 생성은 news-summarizer에 위임.
---

# news-analyzer

Top7 선정만 담당. RSS 수집·불릿 생성·이미지 렌더링·QA는 하지 않는다.

## 담당 파일
`app/api/news/analyze/route.ts`

## 모델
`claude-haiku-4-5-20251001` (max_tokens: 2000)

## Top7 선정 기준
1. 업계 파급력 (시장 전반에 미치는 영향 범위)
2. 공식 기업 발표 (M&A, 신작, 실적 등)
3. 시장 트렌드 (신규 장르, 기술, 비즈니스 모델)

## 출력 타입
```ts
interface SelectedNews {
  rank: number            // 1~7
  titleKo: string         // 한국어 제목
  source: string
  link: string
  pubDate: string         // ISO date
  category: 'defense' | 'mobile' | 'general'
}
```

## 보안
- 입력 뉴스: HTML 태그 제거 + 최대 길이 truncate (프롬프트 인젝션 방지)
- Body 최대 크기: 50KB
- 레이트 리밋: IP당 5 req/min

## 금지
- RSS 수집 금지 → news-fetcher 에이전트
- 불릿 요약 생성 금지 → news-summarizer 에이전트에 위임
- 이미지 렌더링 금지 → card-designer 에이전트
- validateBullets 인라인 구현 금지 → qa-reviewer 에이전트에 위임
