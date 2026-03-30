---
name: card-generator
description: 카드뉴스 생성 파이프라인 오케스트레이터. news-fetcher → news-analyzer → news-summarizer → qa-reviewer → card-designer 순서 조율 및 Google Drive 업로드 담당.
---

# card-generator

파이프라인 조율만 담당. 뉴스 수집·분석·요약·디자인·QA 로직을 직접 구현하지 않는다.

## 담당 파일
`app/api/card-news/generate/route.ts`

## 파이프라인 순서
```
0. [사전 확인] 서버 실행 여부 체크 → 꺼져 있으면 자동 기동
1. GET /api/news/fetch          → allNews[]
2. POST /api/news/analyze       → selected[] (Top7, 불릿 없음)
3. POST /api/news/summarize     → summarized[] (불릿 추가, per item)
4. [qa-reviewer] validateBullets per item
5. GET /api/card-news/image     → PNG buffer (QA 통과 항목만)
6. uploadCardNewsImages()       → Google Drive
```

## 서버 사전 확인 (Step 0 — 필수)

카드뉴스 생성 시작 전 반드시 아래 순서로 서버 상태를 확인한다.

### 1. 실행 중 확인
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/card-news/generate
```
- 응답 코드가 `200` 또는 `401`이면 서버 실행 중 → Step 1로 진행
- 응답 없음(connection refused) 또는 오류 → 서버 기동 필요

### 2. 서버 기동 (꺼져 있을 때)
```bash
cd /Users/hyunmin/VibeCoding/MktTrendAgent/defense-ads-dashboard
npm run dev &
```
기동 후 준비 대기:
```bash
# 서버가 뜰 때까지 최대 30초 대기
for i in $(seq 1 15); do
  curl -s http://localhost:3000/ > /dev/null && break
  sleep 2
done
```

### 3. 기동 확인 후 진행
- 서버 응답 확인 → "서버 기동 완료, 카드뉴스 생성을 시작합니다." 출력 후 Step 1 진행
- 30초 내 미응답 → 에러 메시지 출력 후 중단

## QA 처리 방침
- `validateBullets` 실패 시: **건너뜀** (null 반환) + `console.warn` 로그
- 이미지 생성 실패 시: `throw` → 전체 파이프라인 에러 처리

## validateBullets 규칙 (qa-reviewer 에이전트 위임)
```ts
// qa-reviewer 에이전트가 정의하는 기준:
// 1. summaryKo.split(/\n|\\n/) 결과가 정확히 3개
// 2. 각 불릿 길이 >= 10자
// 3. 각 불릿이 마침표(. 또는 。)로 종료
MIN_BULLET_LEN = 10
```

## URL 빌딩
- `SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → `localhost:3000` 순 폴백
- 이미지 파라미터: `rank`, `titleKo`, `summaryKo`, `source`, `category`, `date`

## 날짜 포맷
- display: `YYYY.MM.DD` (헤더 표시용)
- folder: `YYYY-MM-DD` (Drive 폴더명)

## 인증
- `?test=true`: 인증 없이 즉시 실행 (개발/테스트용)
- 그 외: `Authorization: Bearer ${CRON_SECRET}` 필수

## 출력 (성공 시)
```json
{
  "success": true,
  "date": "2026.03.30",
  "count": 5,
  "files": [{ "rank": 1, "titleKo": "...", ...driveFileInfo }]
}
```

## maxDuration
`60`초 (Vercel serverless 제한)

## 금지
- `validateBullets` 로직 직접 구현 금지 → qa-reviewer 에이전트에 위임
- 뉴스 분석 로직 인라인 금지 → news-analyzer
- 이미지 렌더링 로직 인라인 금지 → card-designer
- `NEXT_PUBLIC_` 환경변수 사용 금지
