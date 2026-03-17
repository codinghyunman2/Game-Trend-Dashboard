랜딩 페이지에서 대시보드 데이터를 백그라운드로 미리 fetch해줘.

## 구현 방식

app/page.tsx (랜딩 페이지) 에서
컴포넌트 마운트 시 (useEffect) 아래 두 API를
백그라운드에서 병렬 호출:

fetch('/api/news/fetch')
fetch('/api/fetch-ads')

## 조건
- 응답 데이터는 사용하지 않음 (캐시 워밍 목적)
- 에러 발생해도 무시 (백그라운드 작업이므로)
- 로딩 UI 변화 없음 (사용자에게 보이지 않게)
- 캐시가 이미 유효하면 서버에서 즉시 반환되므로
  중복 호출 부담 없음

## 추가: Link prefetch
app/page.tsx 의 "대시보드 바로가기" 버튼을
Next.js Link 컴포넌트로 변경하고
prefetch={true} 속성 추가
(Next.js가 /dashboard 페이지 JS 번들도 미리 로드)
