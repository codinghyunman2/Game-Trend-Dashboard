# CLAUDE.md — Defense Ads Dashboard

## 프로젝트 개요
- **목적**: Meta Ad Library API로 디펜스 장르 모바일 게임 광고를 수집·분석·시각화
- **주요 사용자**: 모바일 게임 마케터 팀 (팀원 간 URL 공유 용도)
- **스택**: Next.js 14 (App Router) + TypeScript + Tailwind CSS

---

## 아키텍처

```
app/
├── page.tsx                  # 메인 대시보드
├── layout.tsx
└── api/
    ├── fetch-ads/route.ts    # Meta Ad Library API 호출 (서버 전용)
    └── analyze/route.ts      # Claude API 분석 (서버 전용)
components/
├── AdCard.tsx                # 광고 카드
├── Top3Banner.tsx            # AI 분석 Top 3 배너
├── KeywordManager.tsx        # 키워드 추가/삭제 UI
└── ShareButton.tsx           # URL 클립보드 복사
lib/
├── metaApi.ts                # Meta API 클라이언트
└── scorer.ts                 # 광고 점수 계산
types/
└── ad.ts                     # 공통 타입 정의
```

---

## 외부 API 호출 (중요)

이 프로젝트는 두 개의 외부 API를 호출한다.
**모든 호출은 서버 라우트(`app/api/`) 안에서만 발생하며, 코드 생성 단계에서는 실제 호출하지 않는다.**

| API | 호출 위치 | 용도 |
|-----|----------|------|
| `graph.facebook.com/v19.0/ads_archive` | `app/api/fetch-ads/route.ts` | 광고 데이터 수집 |
| `api.anthropic.com/v1/messages` | `app/api/analyze/route.ts` | Top 3 광고 분석 |

환경변수:
```
META_ACCESS_TOKEN=   # Meta Graph API 액세스 토큰
ANTHROPIC_API_KEY=   # Claude API 키
```

---

## 핵심 비즈니스 로직

### 광고 수집 조건
- 검색 키워드: URL 파라미터 `?keywords=디펜스` (기본값: "디펜스", 복수 키워드 콤마 구분)
- 기간: 최근 90일
- 미디어 타입: VIDEO 전용
- 최대 수집: 키워드당 150개 (3페이지 페이지네이션)

### 광고 분류
수집된 광고는 `impressions` 필드 존재 여부로 두 그룹으로 분리:
- **scoredAds**: EU 지역 집행 광고 → 점수 계산 후 표시
- **unscoredAds**: 노출 데이터 없는 광고 → '노출 미집계' 섹션에 별도 표시 (기본 접힘)

### 점수 계산 (scorer.ts) — 총 100점
1. **최신성 (50점)** ← 최우선 지표
   - 7일 이내 → 50점 / 8~14일 → 40점 / 15~30일 → 30점 / 31~60일 → 15점 / 61~90일 → 5점
2. **노출수 (30점)** — impressions 있는 경우만
   - 100만+ → 30점 / 50만~100만 → 22점 / 10만~50만 → 15점 / 1만~10만 → 8점 / 1만 미만 → 3점
3. **크리에이티브 완성도 (20점)**
   - 제목 있음 +7점 / 본문 있음 +7점 / 설명 있음 +6점

### AI 분석 (analyze/route.ts)
- 모델: `claude-sonnet-4-20250514`
- 입력: scoredAds 상위 5개
- 출력: Top 3 JSON 배열 (rank, score, title, summary, hook, strengths, ad_snapshot_url)
- **title은 광고 원문 제목(ad_creative_link_titles[0]) 그대로 사용**

---

## UI 규칙

- **테마**: 다크 (배경 #0f0f1a, 카드 #1a1a2e, 보라/파랑 accent)
- **반응형**: 모바일 1열 / 태블릿 2열 / 데스크탑 3열
- **언어**: 모든 UI 텍스트 한국어
- **점수 색상**: 80+ 초록 / 60~79 노랑 / 60 미만 빨강
- **공유**: ShareButton이 현재 URL(키워드 포함)을 클립보드 복사 → 팀원이 동일 키워드로 열림

---

## 개발 시 주의사항

- `app/api/` 라우트는 서버 전용 (`'use server'` 또는 기본 서버 컴포넌트)
- 클라이언트에서 API 키가 노출되면 안 됨 — `NEXT_PUBLIC_` 접두사 사용 금지
- 캐싱: `sessionStorage` 사용, 키는 keywords 조합, TTL 1시간
- 에러 처리: 토큰 미설정 / API 에러 / 결과 0개 각각 별도 UI 처리