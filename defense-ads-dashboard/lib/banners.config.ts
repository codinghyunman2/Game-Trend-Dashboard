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
  /**
   * 클릭 시 이동할 URL — 빈 문자열이면 클릭 비활성화.
   * 페이지별로 다른 링크(예: Airbridge 트래킹)가 필요하면 객체로 지정:
   *   { news: 'https://abr.ge/...', creative: 'https://abr.ge/...' }
   */
  link: string | Partial<Record<BannerPage, string>>
  /** 이미지 대체 텍스트 */
  alt: string
  /** 표시할 페이지 목록 */
  pages: BannerPage[]
  /** false로 설정하면 배포 없이 즉시 숨김 */
  active: boolean
}

export const BANNERS: BannerItem[] = [
  {
    id: 'banner-img1',
    imagePath: '/banners/wd_Creative_image29_1_1.91_kr.png',
    link: {
      news:     'https://abr.ge/buasjb',
      creative: 'https://abr.ge/a9ve6y',
      viral:    'https://abr.ge/cy2rn21',
    },
    alt: '앱스토어 다운로드',
    pages: ['news', 'creative', 'viral'],
    active: true,
  },
  {
    id: 'banner-img2',
    imagePath: '/banners/wd_Creative_image33_1_1.91_kr.png',
    link: {
      news:     'https://abr.ge/buasjb',
      creative: 'https://abr.ge/a9ve6y',
      viral:    'https://abr.ge/cy2rn21',
    },
    alt: '앱스토어 다운로드',
    pages: ['news', 'creative', 'viral'],
    active: true,
  },
  {
    id: 'banner-img3',
    imagePath: '/banners/wd_thumbnail_11_landscape.png',
    link: {
      news:     'https://abr.ge/buasjb',
      creative: 'https://abr.ge/a9ve6y',
      viral:    'https://abr.ge/cy2rn21',
    },
    alt: '앱스토어 다운로드',
    pages: ['news', 'creative', 'viral'],
    active: true,
  },
]
