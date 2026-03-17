# CLAUDE.md — Game Trend Dashboard

## 프로젝트 개요
- **목적**: 게임 업계 뉴스 허브 + Meta Ad Library API 디펜스 장르 광고 분석
- **주요 사용자**: 모바일 게임 마케터 팀 (팀원 간 URL 공유 용도)
- **스택**: Next.js 14 (App Router) + TypeScript + Tailwind CSS

---

## 서비스 구조

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 랜딩 페이지 | 서비스 소개 + 지표 |
| `/dashboard` | 뉴스 허브 | 게임 업계 RSS 뉴스 수집·번역·AI 분석 |
| `/dashboard/ads` | 광고 트렌드 | Meta Ad Library 기반 디펜스 광고 대시보드 |

---

## 페이지 라우팅 구조
- `/` → 랜딩 페이지 (서비스 소개 + 지표)
- `/dashboard` → 뉴스 허브 메인
- `/dashboard/ads` → 광고 트렌드 대시보드

## 퀵메뉴 구성
- 홈 → `/`
- 대시보드 → `/dashboard`
- 광고 트렌드 → `/dashboard/ads`

## 신규 페이지 추가 시 주의사항
- 모든 내부 링크는 위 라우팅 구조 기준으로 작성
- `/ads` 또는 `/` (뉴스 허브) 로 링크하지 말 것
- 반드시 `/dashboard` 또는 `/dashboard/ads` 사용

---

## 아키텍처

```
app/
├── page.tsx                          # 랜딩 페이지 (서비스 소개 + 지표)
├── dashboard/
│   ├── page.tsx                      # 뉴스 허브 메인
│   └── ads/page.tsx                  # 광고 트렌드 대시보드
├── layout.tsx                        # NavBar 포함 공통 레이아웃
└── api/
    ├── fetch-ads/route.ts            # Meta Ad Library API 호출
    ├── analyze/route.ts              # 광고 AI 분석
    └── news/
        ├── fetch/route.ts            # RSS 뉴스 수집 + 번역
        └── analyze/route.ts          # 뉴스 AI Top 5 분석
components/
├── NavBar.tsx                        # 상단 네비게이션
├── AdCard.tsx                        # 광고 카드
├── Top3Banner.tsx                    # AI 분석 Top 3 배너
├── KeywordManager.tsx                # 키워드 추가/삭제 UI
├── ShareButton.tsx                   # URL 클립보드 복사
├── LoadingSpinner.tsx                # 로딩 스피너
└── news/
    ├── NewsTop5.tsx                  # AI 분석 Top 5 뉴스
    ├── NewsCard.tsx                  # 뉴스 카드 (카테고리 Top 3용)
    ├── ChannelTabs.tsx               # 채널별 탭
    └── NewsListItem.tsx              # 채널별 뉴스 리스트 아이템
lib/
├── metaApi.ts                        # Meta API 클라이언트
└── scorer.ts                         # 광고 점수 계산
types/
├── ad.ts                             # 광고 타입 정의
└── news.ts                           # 뉴스 타입 정의
```

---

## 외부 API 호출 (중요)

이 프로젝트는 외부 API를 호출한다.
**모든 호출은 서버 라우트(`app/api/`) 안에서만 발생하며, 코드 생성 단계에서는 실제 호출하지 않는다.**

| API | 호출 위치 | 용도 |
|-----|----------|------|
| `graph.facebook.com/v19.0/ads_archive` | `app/api/fetch-ads/route.ts` | 광고 데이터 수집 |
| `api.anthropic.com/v1/messages` | `app/api/analyze/route.ts` | Top 3 광고 분석 |
| RSS 피드 (16개 소스) | `app/api/news/fetch/route.ts` | 게임 뉴스 수집 |
| `api.anthropic.com/v1/messages` | `app/api/news/fetch/route.ts` | 뉴스 번역 (배치, 채널당 최대 10개) |
| `api.anthropic.com/v1/messages` | `app/api/news/analyze/route.ts` | 뉴스 Top 5 AI 분석 |

환경변수:
```
META_ACCESS_TOKEN=   # Meta Graph API 액세스 토큰
ANTHROPIC_API_KEY=   # Claude API 키
```

### RSS 뉴스 소스 (16개)
- **한국 (5)**: 게임메카, 인벤, 게임포커스, IT조선 게임, ZDNet 게임
- **해외 (11)**: Pocket Gamer, Mobile Gamer, VentureBeat Games, Game Developer, Deconstructor of Fun, GamesIndustry.biz, Sensor Tower, data.ai Blog, Mobile Gaming Blog, Apptopia, Naavik

### 뉴스 번역 방식
- 비한국어 뉴스를 Claude API로 배치 번역 (채널당 최대 10개)
- 모델: `claude-sonnet-4-20250514`
- 실패 시 원문 유지 (titleKo = title, summaryKo = summary)

### 뉴스 카테고리 분류
- `defense`: 디펜스, 타워디펜스, tower defense, defense, strategy
- `mobile`: 모바일, mobile, iOS, Android, App Store, Google Play
- `general`: 그 외 전부

---

## 핵심 비즈니스 로직

### 광고 수집 조건
- 검색 키워드: URL 파라미터 `?keywords=디펜스` (기본값: "디펜스", 복수 키워드 콤마 구분)
- 기간: 최근 90일
- 미디어 타입: VIDEO 전용
- 최대 수집: 키워드당 150개 (3페이지 페이지네이션)

### 광고 분류
모든 광고를 단일 배열(`ads`)로 통합, 점수 내림차순 정렬하여 표시.
(scoredAds/unscoredAds 구분 및 '노출 미집계' 섹션 없음)

### 점수 계산 (scorer.ts) — 총 100점
1. **최신성 (30점)** — ad_delivery_start_time 기준 경과 일수
   - 7일 이내 → 30점 / 8~14일 → 23점 / 15~30일 → 15점 / 31~60일 → 8점 / 61~90일 → 3점
2. **집행 기간 (30점)** — start_time 부터 현재까지 총 집행 일수 (성과 없으면 끄기 때문에 오래 집행 = 효율 신호)
   - 60일 이상 → 30점 / 30~59일 → 22점 / 14~29일 → 15점 / 7~13일 → 8점 / 7일 미만 → 3점
3. **동일 소재 집행 수 (25점)** — 같은 page_name + ad_creative_bodies[0] 기준
   - 5개 이상 → 25점 / 3~4개 → 15점 / 2개 → 8점 / 1개 → 0점
4. **크리에이티브 완성도 (15점)**
   - 제목 있음 +3점 / 본문 있음 +3점 / 설명 있음 +2점
   - CTA 키워드 포함 +4점 ("download", "play", "free", "지금", "무료", "다운로드", "플레이", "시작", "참여", "install", "get", "try")
   - 숫자/수치 포함 +3점 (본문에 숫자가 포함된 경우)

### AI 분석 (analyze/route.ts)
- 모델: `claude-sonnet-4-20250514`
- 입력: 전체 광고 중 점수 상위 5개
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