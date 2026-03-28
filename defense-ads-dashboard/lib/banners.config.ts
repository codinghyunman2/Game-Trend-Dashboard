/**
 * 배너 광고 설정 파일
 *
 * 배너 추가/수정 방법:
 * 1. public/banners/{앱명}/ 폴더에 이미지 파일 추가
 * 2. 아래 APP_BANNERS의 해당 앱 images 배열에 경로 추가
 * 3. 배포하면 즉시 적용
 *
 * 링크 수정: APP_BANNERS의 links 객체만 수정
 */

export type BannerPage = 'news' | 'creative' | 'viral'

export interface BannerItem {
  id: string
  /** public/ 폴더 기준 경로 (예: /banners/wd/image.png) */
  imagePath: string
  /**
   * 클릭 시 이동할 URL — 빈 문자열이면 클릭 비활성화.
   * 페이지별로 다른 링크(Airbridge 트래킹)를 객체로 지정.
   */
  link: string | Partial<Record<BannerPage, string>>
  /** 이미지 대체 텍스트 */
  alt: string
  /** 표시할 페이지 목록 */
  pages: BannerPage[]
  /** false로 설정하면 배포 없이 즉시 숨김 */
  active: boolean
}

// ─── 앱별 Airbridge 트래킹 링크 + 이미지 목록 ─────────────────────────────
const APP_BANNERS: Record<string, { links: Record<BannerPage, string>; images: string[] }> = {
  bd: {
    links: {
      news:     'https://abr.ge/6zfqigw',
      creative: 'https://abr.ge/u45x7ca',
      viral:    'https://abr.ge/fkfhsz',
    },
    images: [
      '/banners/bd/bd_01.png',
      '/banners/bd/bd_02.png',
      '/banners/bd/bd_03.png',
    ],
  },
  wd: {
    links: {
      news:     'https://abr.ge/buasjb',
      creative: 'https://abr.ge/a9ve6y',
      viral:    'https://abr.ge/cy2rn21',
    },
    images: [
      '/banners/wd/wd_01.png',
      '/banners/wd/wd_02.png',
      '/banners/wd/wd_03.png',
    ],
  },
  sm: {
    links: {
      news:     'https://abr.ge/efu6ce',
      creative: 'https://abr.ge/sfwwjjx',
      viral:    'https://abr.ge/zxs3leo',
    },
    images: [
      '/banners/sm/sm_01.png',
      '/banners/sm/sm_02.png',
      '/banners/sm/sm_03.png',
    ],
  },
}

// BANNERS 배열 자동 생성 — 직접 수정하지 말고 위 APP_BANNERS를 수정하세요
export const BANNERS: BannerItem[] = Object.entries(APP_BANNERS).flatMap(([app, config]) =>
  config.images.map((imagePath, i) => ({
    id: `banner-${app}-${i + 1}`,
    imagePath,
    link: config.links,
    alt: '앱스토어 다운로드',
    pages: ['news', 'creative', 'viral'] as BannerPage[],
    active: true,
  }))
)
