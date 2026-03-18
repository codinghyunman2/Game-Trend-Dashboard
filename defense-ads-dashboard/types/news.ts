export interface NewsItem {
  id: string;
  title: string;
  titleKo: string;
  summary: string;
  summaryKo: string;
  link: string;
  pubDate: string;
  source: string;
  sourceKey: string;
  category: 'defense' | 'mobile' | 'general';
  isKorean: boolean;
}

export interface NewsAnalysisItem {
  rank: number;
  titleKo: string;
  summaryKo: string;
  source: string;
  link: string;
  pubDate: string;
}

export interface AnalyzedNews {
  rank: number;
  titleKo: string;
  summaryKo: string; // 3문장, 줄바꿈(\n)으로 구분: 왜 중요한지 / 핵심 내용 / 업계 의미
  source: string;
  link: string;
  pubDate: string;
}

export interface UpcomingGame {
  id: string;
  name: string;
  nameKo: string;
  genres: string[];
  releaseDate: string;       // YYYY-MM-DD
  releaseDateLabel: string;  // "M/D(요일)" 형식
  platform: string[];        // ["iOS", "Android"]
  link: string;              // IGDB 또는 게임메카 링크
  source: 'igdb' | 'gamemeca';
}

export interface NewsFetchResponse {
  allNews: NewsItem[];
  byChannel: { [sourceKey: string]: NewsItem[] };
  fetchedAt: string;
  cachedAt?: string;
}

export interface NewsCacheEntry {
  data: NewsFetchResponse;
  timestamp: number;
  analyzedTop5?: AnalyzedNews[];
}
