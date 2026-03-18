뉴스 허브 메인 페이지(/dashboard)에
"이번 주 출시 예정 게임" 섹션을 추가해줘.

## 1. RSS 소스 추가 (app/api/news/fetch/route.ts)

RSS_SOURCES 배열에 아래 채널 추가:

```typescript
{ key: 'toucharcade', name: 'TouchArcade', url: 'https://toucharcade.com/feed/', isKorean: false },
{ key: 'pocketgamer', name: 'Pocket Gamer', url: 'https://www.pocketgamer.com/rss/', isKorean: false },
{ key: 'pocketgamer_biz', name: 'PocketGamer.biz', url: 'https://www.pocketgamer.biz/feed/', isKorean: false },
{ key: 'gamingonphone', name: 'GamingOnPhone', url: 'https://gamingonphone.com/feed/', isKorean: false },
```

## 2. 출시 예정 게임 감지 로직 (lib/upcomingDetector.ts)

뉴스 제목 + 내용에서 출시 예정 게임을 감지하는 함수:

### 키워드 감지
아래 키워드가 포함된 뉴스를 출시 예정으로 분류:
- 영어: "launches", "release date", "coming soon", "out now",
        "available now", "soft launch", "global launch",
        "pre-register", "pre-registration", "releasing"
- 한국어: "출시", "런칭", "사전예약", "정식 출시", "글로벌 출시"

### 날짜 파싱
기사 본문/제목에서 날짜 추출 시도:
- "March 20", "3월 20일", "this week", "이번 주" 등
- 파싱 성공 시 releaseDate 필드에 저장
- 실패 시 null (기사 pubDate 기준으로 "최근" 처리)

### 반환 타입
```typescript
interface UpcomingGame {
  title: string        // 게임명 (기사 제목에서 추출)
  titleKo: string      // 한국어 번역
  releaseDate: string | null  // 출시일 (파싱된 경우)
  platform: string[]   // iOS / Android / 감지 불가
  source: string       // 출처 채널명
  link: string         // 원문 URL
  pubDate: string      // 기사 발행일
}
```

### 플랫폼 감지
- "iOS", "App Store", "iPhone", "iPad" → iOS
- "Android", "Google Play", "APK" → Android
- 둘 다 없으면 → ["모바일"]

## 3. fetch API 업데이트 (app/api/news/fetch/route.ts)

반환 데이터에 upcomingGames 추가:
- TouchArcade, PocketGamer 등에서 수집된 뉴스 중
  출시 예정 키워드 포함된 것만 필터링
- 최근 7일 이내 기사만 (기존 3일 필터와 별도)
- 최대 10개, pubDate 최신순 정렬
- 중복 제거 (동일 게임명 기준)

반환 형식 추가:
```typescript
{
  ...기존 필드,
  upcomingGames: UpcomingGame[]
}
```

## 4. 대시보드 섹션 추가 (app/dashboard/page.tsx)

AI Top 5 섹션 아래, 디펜스/모바일 Top 3 위에 배치:

### UI 구조
```
─────────────────────────────────────
이번 주 출시 예정 게임
─────────────────────────────────────
┌─────────────────────────────────────┐
│ 게임명 (한국어)          iOS · Android│
│ 출시일 또는 "이번 주"    출처 · 시간  │
│                          [원문보기 →] │
├─────────────────────────────────────┤
│ 게임명                              │
│ ...                                 │
└─────────────────────────────────────┘
```

### 표시 규칙
- 출시일 있으면: "3월 20일 출시"
- 출시일 없으면: "출시 임박" 또는 "이번 주"
- 플랫폼 배지: iOS (파랑), Android (초록), 모바일 (회색)
- 데이터 없으면 섹션 숨김 (빈 섹션 표시 안 함)
- 로딩 중: 스켈레톤 3줄

### 번역
- 게임명과 한줄 요약은 기존 번역 로직 활용
- upcomingGames 중 isKorean: false 인 것만 번역

## 5. 슬랙 브리핑 업데이트 (app/api/slack/briefing/route.ts)

upcomingGames 있을 경우 브리핑에 섹션 추가:

```
🎮 *이번 주 출시 예정*
• <링크|게임명> — iOS/Android · 출시일
• ...
```

upcomingGames 없으면 해당 섹션 생략

## 6. CLAUDE.md 업데이트
출시 예정 게임 감지 기능 및 신규 RSS 채널 추가 내용 반영

## 7. GitHub push
완료 후 git add, commit, push
commit 메시지: "feat: 이번 주 출시 예정 게임 섹션 추가"
