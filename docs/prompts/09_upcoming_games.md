기존에 RSS 기반으로 개발된 "이번 주 출시 예정 게임" 섹션을
IGDB API 기반으로 교체해줘.

## 1. 환경변수 추가 (.env.local, .env.sample)

IGDB_CLIENT_ID=      # Twitch 개발자 포털에서 발급
IGDB_CLIENT_SECRET=  # Twitch 개발자 포털에서 발급

## 2. 기존 코드 확인 후 교체

먼저 아래 파일들을 확인해줘:
- 기존 출시 예정 게임 관련 컴포넌트/함수가 어디 있는지
- app/api/news/fetch/route.ts 의 upcomingGames 관련 로직
- lib/upcomingDetector.ts 존재 여부
- app/dashboard/page.tsx 의 출시 예정 섹션

확인 후 아래 내용으로 교체:

## 3. IGDB 인증 토큰 관리 (lib/igdb.ts 신규 생성)

Twitch OAuth2로 액세스 토큰 발급 후 메모리 캐싱:
- POST https://id.twitch.tv/oauth2/token
  파라미터: client_id, client_secret, grant_type=client_credentials
- 응답: { access_token, expires_in }
- 토큰은 모듈 레벨 변수에 캐싱 (만료 전까지 재사용)
- 만료 시 자동 갱신

fetchUpcomingMobileGames(): Promise<UpcomingGame[]>

IGDB API 쿼리:
- 엔드포인트: POST https://api.igdb.com/v4/release_dates
- 헤더: Client-ID, Authorization: Bearer {token}
- 쿼리 바디:
  fields game.name, game.cover.url, game.genres.name,
         game.summary, date, platform.name;
  where platform = (34, 39)
  & date >= {오늘 Unix timestamp}
  & date <= {7일 후 Unix timestamp};
  sort date asc;
  limit 20;

  플랫폼 ID: iOS = 34, Android = 39

반환 타입:
interface UpcomingGame {
  id: string
  name: string
  nameKo: string
  coverUrl: string | null
  genres: string[]
  releaseDate: string      // YYYY-MM-DD
  releaseDateLabel: string // "오늘", "내일", "N일 후", "3월 20일"
  platform: string[]       // ["iOS", "Android"]
  igdbLink: string
}

## 4. 기존 RSS 기반 로직 제거

- lib/upcomingDetector.ts 파일 삭제
- app/api/news/fetch/route.ts 에서
  upcomingGames 관련 코드 및 반환 필드 제거
- TouchArcade, PocketGamer 등 출시 예정 감지용으로만
  추가했던 RSS 소스가 있으면 유지 (뉴스 채널로는 계속 사용)

## 5. 출시 예정 게임 전용 API 라우트 (app/api/upcoming-games/route.ts 신규)

- GET 요청
- lib/igdb.ts 호출
- 게임명 한국어 번역 (Claude Haiku, 배치 처리)
- 메모리 캐시 TTL: 6시간
- ?refresh=true 로 강제 갱신
- 반환: { games: UpcomingGame[], fetchedAt: string }

## 6. 대시보드 섹션 교체 (app/dashboard/page.tsx)

기존 RSS 기반 출시 예정 섹션을 IGDB 기반으로 교체.
위치는 기존과 동일하게 유지.

레이아웃:
이번 주 출시 예정 게임
┌──────┬──────────────────────────────┐
│커버  │ 게임명 (한국어)               │
│이미지│ 장르 배지들                   │
│      │ iOS · Android   3월 20일 출시 │
│      │               [IGDB 보기 →]  │
└──────┴──────────────────────────────┘

표시 규칙:
- 커버 이미지: IGDB 이미지 URL (없으면 회색 플레이스홀더)
- 출시일 라벨: "오늘", "내일", "N일 후", "3월 20일"
- 플랫폼 배지: iOS(파랑), Android(초록)
- 장르 배지: 최대 2개
- 데이터 없으면 섹션 숨김
- 로딩 중: 스켈레톤 3줄

## 7. 기존 prefetch 업데이트 (app/page.tsx)

기존 prefetch 목록에 /api/upcoming-games 추가
(기존 /api/news/fetch, /api/fetch-ads 는 유지)

## 8. 슬랙 브리핑 업데이트 (app/api/slack/briefing/route.ts)

기존 RSS 기반 upcomingGames 섹션을
/api/upcoming-games 데이터로 교체:

*이번 주 출시 예정*
- 게임명 — iOS/Android · 출시일

## 9. CLAUDE.md 업데이트
- IGDB API 연동 구조 및 환경변수 추가
- 기존 RSS 기반 출시 예정 로직 제거 내용 반영

## 10. GitHub push
git add, commit, push
commit 메시지: "feat: 출시 예정 게임 섹션 RSS → IGDB API로 교체"
