/**
 * 배너 광고 설정 파일
 *
 * 배너 추가 방법:
 * 1. public/banners/ 폴더에 이미지 파일 복사 (권장 크기: 1200×160px)
 * 2. 아래 BANNERS 배열에 항목 추가
 * 3. 배포하면 즉시 적용
 */

export type BannerPage = 'news' | 'creative' | 'viral'

export interface BannerItem {
  id: string
  /** public/ 폴더 기준 경로 (예: /banners/my-banner.jpg) */
  imagePath: string
  /** 클릭 시 이동할 URL — 빈 문자열이면 클릭 비활성화 */
  link: string
  /** 이미지 대체 텍스트 */
  alt: string
  /** 표시할 페이지 목록 */
  pages: BannerPage[]
  /** false로 설정하면 배포 없이 즉시 숨김 */
  active: boolean
}

export const BANNERS: BannerItem[] = [
  // 예시:
  // {
  //   id: 'banner-1',
  //   imagePath: '/banners/my-banner.jpg',
  //   link: 'https://example.com',
  //   alt: '광고 배너 설명',
  //   pages: ['news', 'creative', 'viral'],
  //   active: true,
  // },
]
