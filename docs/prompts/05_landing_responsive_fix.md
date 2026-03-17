app/page.tsx 랜딩 페이지를 모바일 반응형 + 레이아웃 높이/정렬 수정을 한번에 진행해줘.

## 1. 섹션 높이 전체 축소
모든 섹션 min-height: 100vh 제거하고 패딩으로 대체:
- 섹션 1 (히어로): py-32 데스크탑 / py-20 모바일
- 섹션 2 (숫자 지표): py-24 데스크탑 / py-16 모바일
- 섹션 3,4,5 (기능 소개): py-24 데스크탑 / py-16 모바일
- 섹션 6 (CTA): py-24 데스크탑 / py-16 모바일

## 2. 히어로 섹션 중앙 정렬
- flex flex-col items-center justify-center
- text-center
- 서브 카피: max-w-2xl mx-auto
- 버튼: mx-auto

## 3. 모바일 반응형 (breakpoint: 모바일 ~768px / 태블릿 768~1024px / 데스크탑 1024px~)

### 섹션 1 히어로
- 메인 카피: text-6xl → 모바일 text-3xl
- 서브 카피: text-xl → 모바일 text-base
- 버튼: 모바일 w-full

### 섹션 2 숫자 지표
- 데스크탑: grid-cols-4
- 태블릿/모바일: grid-cols-2
- 숫자: text-6xl → 모바일 text-4xl

### 섹션 3,4,5 기능 소개
- 데스크탑: grid-cols-2 (좌우 2단)
- 모바일: grid-cols-1 (1단)
- 섹션 4 우측 텍스트: 모바일에서 order-1로 텍스트 먼저
- 제목: text-4xl → 모바일 text-2xl
- 설명: 모바일 text-sm

### 섹션 6 CTA
- 버튼: 모바일 w-full
- 텍스트: 모바일 text-center

## 4. 공통 모바일 최적화
- 버튼 터치 영역: min-height 44px 이상
- 전체 패딩: 데스크탑 px-8 → 모바일 px-6
- scroll-smooth 적용
- 퀵메뉴: 모바일에서 "광고 트렌드" → "광고"로 축약

## 5. 확인
수정 후 개발자 도구에서 375px / 768px 뷰 정상 렌더링 확인

## GitHub push
완료 후 git add, commit, push
commit 메시지: "feat: 랜딩 페이지 모바일 반응형 + 레이아웃 높이/정렬 수정"
