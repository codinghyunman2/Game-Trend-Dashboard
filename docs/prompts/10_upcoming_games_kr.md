출시 예정 게임 섹션을 두 가지 작업으로 개선해줘.

## 1. 게임메카 출시 일정 파싱 (국내 게임 추가)

### app/api/upcoming-games/route.ts 수정

기존 IGDB 조회와 병렬로 게임메카 출시 일정 페이지 파싱 추가.

파싱 대상 API:
https://www.gamemeca.com/json.php?rts=json/index/gmdb_schedule&type=list&ym=YYYYMM

(YYYYMM은 현재 월, 7일 이내에 다음 달이 포함되면 다음 달도 추가 조회)

파싱 방법:
- 서버 사이드에서 fetch로 JSON 가져오기
- 모바일 게임 필터: gm_platform_1st_array 에 "178" 포함
- 오늘부터 7일 이내 symd(YYYYMMDD) 기준 필터링
- 링크 형식: https://www.gamemeca.com/game.php?gmid={gmid}

반환 타입에 source/link 필드 추가:
```typescript
interface UpcomingGame {
  ...기존 필드 (igdbLink 제거),
  source: 'igdb' | 'gamemeca'  // 데이터 출처
  link: string  // IGDB는 igdb.com 링크, 게임메카는 gamemeca 링크
}
```

중복 제거:
- 게임명이 유사한 경우 (IGDB + 게임메카 둘 다 있는 경우)
  게임메카 데이터 우선 사용

결과 정렬:
- 출시일 오름차순
- 같은 날이면 source='gamemeca' 먼저

### 카드 UI 업데이트 (components/news/UpcomingGames.tsx)
- 게임메카 출처 게임: "게임메카" 배지 표시
- IGDB 출처 게임: "IGDB" 배지 표시
- 링크 버튼: source에 따라 "게임메카 보기" 또는 "IGDB 보기"

## 2. IGDB 게임명 한국어 번역 개선

### app/api/upcoming-games/route.ts 수정

translateGameNames 프롬프트를 아래와 같이 개선:

"다음 모바일 게임 이름과 장르를 한국어로 번역해줘.

규칙:
- 고유명사(게임 제목)는 한국 게임 커뮤니티에서 통용되는
  한국어 표기로 번역 (예: Fortnite → 포트나이트)
- 공식 한국어 제목이 있으면 그것을 우선 사용
- 직역보다 자연스러운 한국어 표현 사용
- 장르명도 한국 게임 커뮤니티 통용 표현으로 번역
  (예: Battle Royale → 배틀로얄, RPG → RPG 그대로)
- 번역 불필요하면 원문 그대로 반환

JSON 배열만 반환:
[{ 'idx': 0, 'nameKo': '한국어 게임명', 'genresKo': ['장르1', '장르2'] }]

원문: [{ idx, name, genres }]"

## 3. GitHub push
git add, commit, push
commit 메시지: "feat: 국내 게임 출시 일정 추가 (게임메카) + IGDB 번역 개선"
