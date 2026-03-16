# 디펜스 광고 대시보드

디펜스 장르 모바일 게임 광고를 Meta Ad Library API로 수집하고, Claude AI로 분석하는 대시보드입니다.

## 주요 기능

- **광고 수집**: Meta Ad Library API를 통해 디펜스 장르 모바일 게임 광고를 자동 수집
- **점수 계산**: 최신성(50점), 노출수(30점), 크리에이티브 완성도(20점) 기준 100점 만점 평가
- **AI 분석**: Claude AI가 상위 광고를 분석하여 Top 3 선정 및 인사이트 제공
- **키워드 관리**: 다중 키워드로 검색 범위 확장 가능
- **팀 공유**: URL 복사를 통해 팀원과 동일한 검색 결과 공유

## 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Meta Graph API 액세스 토큰
- Anthropic API 키 (AI 분석 기능용)

## 설치 및 실행

### 1. 의존성 설치

```bash
cd game-trend-dashboard
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 편집하여 API 키를 입력합니다:

```
META_ACCESS_TOKEN=실제_메타_액세스_토큰
ANTHROPIC_API_KEY=실제_클로드_API_키
```

### 3. Meta 액세스 토큰 발급 방법

1. [Meta for Developers](https://developers.facebook.com)에 접속합니다.
2. 새 앱을 생성하거나 기존 앱을 선택합니다.
3. Marketing API 권한을 추가합니다.
4. 도구 > Graph API 탐색기에서 액세스 토큰을 발급받습니다.
5. `ads_archive` 읽기 권한이 포함되어야 합니다.

### 4. 로컬 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 팀 공유 방법

1. 대시보드에서 원하는 키워드로 검색합니다.
2. 우측 상단의 "링크 복사" 버튼을 클릭합니다.
3. 복사된 URL을 팀원에게 공유합니다.
4. 팀원이 URL을 열면 동일한 키워드로 검색된 결과를 볼 수 있습니다.

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일**: Tailwind CSS (다크 테마)
- **AI**: Anthropic Claude API
- **데이터**: Meta Ad Library API
