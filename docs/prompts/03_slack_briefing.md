# 슬랙 데일리 브리핑 자동 발송

매일 오전 9시에 슬랙으로 데일리 브리핑을 자동 발송하는 기능을 구현해줘.

## 1. 환경변수 추가 (.env.local, .env.sample)

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

## 2. 슬랙 발송 API (app/api/slack/briefing/route.ts)

### GET 요청 처리 (Vercel Cron Job에서 호출)

### 처리 순서
1. /api/news/fetch 데이터 가져오기 (캐시 우선)
2. Claude Haiku로 브리핑 텍스트 생성
3. 슬랙 Webhook으로 발송

### Claude 브리핑 생성 프롬프트
모델: claude-haiku-4-5-20251001

"다음 게임 업계 뉴스에서 오늘 가장 중요한 내용을
슬랙 메시지용으로 요약해줘.

형식:
- 뉴스 3개: 한 줄씩 핵심만
- 광고 트렌드: 한 줄 요약
- 전체 200자 이내

뉴스 데이터: [allNews 상위 20개]"

### 슬랙 메시지 형식 (Slack Block Kit)

```
*2026 게임 트렌드 데일리 브리핑*
YYYY년 MM월 DD일 (요일)
━━━━━━━━━━━━━━━━━━━━

📰 *오늘의 주요 뉴스*
• [뉴스 1 한국어 요약]
• [뉴스 2 한국어 요약]
• [뉴스 3 한국어 요약]

🎮 *광고 트렌드*
• [디펜스 장르 광고 동향 한 줄]

👉 전체 보기: https://game-trend-dashboard.vercel.app/dashboard
```

### 에러 처리
- 뉴스 데이터 없으면 발송 스킵
- 슬랙 발송 실패 시 console.error 로그
- 응답: { success: true/false, message: '...' }

## 3. Vercel Cron Job 설정 (vercel.json)

프로젝트 루트에 vercel.json 파일 생성:

{
  "crons": [
    {
      "path": "/api/slack/briefing",
      "schedule": "0 0 * * *"
    }
  ]
}

schedule "0 0 * * *" 은 UTC 00:00 = 한국시간 오전 9시

## 4. 수동 테스트 엔드포인트
GET /api/slack/briefing?test=true 로 즉시 발송 테스트 가능하게

## 5. .env.sample 업데이트
SLACK_WEBHOOK_URL= 항목 추가
주석: # Slack Incoming Webhook URL (슬랙 앱 설정에서 발급)

## 6. CLAUDE.md 업데이트
슬랙 브리핑 기능 및 Vercel Cron Job 설정 내용 추가

## 7. GitHub push
완료 후 git add, commit, push
commit 메시지: "feat: 슬랙 데일리 브리핑 자동 발송 구현"
