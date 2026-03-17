# 07. OG Image 구현

Next.js Dynamic OG Image를 구현해줘.

## 1. app/opengraph-image.tsx 생성

Next.js ImageResponse를 사용해서
히어로 섹션 디자인을 OG 이미지로 구현:

- 사이즈: 1200 x 630 (OG 표준)
- 배경: 다크 (#0d0d0d)
- 상단: "2026 게임 트렌드" (작은 텍스트, accent 레드)
- 중앙: 메인 카피 (흰색, 크게)
  "매일 아침 5분, 게임 업계의 모든 것" (원하는 타이틀로 교체)
- 하단: "game-trend-dashboard.vercel.app" (회색, 작게)
- 우측 하단: 숫자 지표 2~3개 간단히 표시
  (11개 채널 / 매일 업데이트)

## 2. app/layout.tsx 메타태그 업데이트

metadata에 OG 관련 태그 추가:
- og:title
- og:description
- og:image (자동으로 opengraph-image.tsx 참조)
- og:url
- twitter:card: summary_large_image

## 3. 히어로 섹션 CTA 버튼 제거
app/page.tsx 히어로 섹션에서
"대시보드 바로가기" 버튼 제거
(섹션 6 CTA에만 버튼 유지)

## GitHub push
완료 후 git add, commit, push
commit 메시지: "feat: OG 이미지 추가 및 히어로 CTA 버튼 제거"
