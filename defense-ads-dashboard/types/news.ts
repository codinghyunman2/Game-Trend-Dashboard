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
  summaryKo: string;
  source: string;
  link: string;
  pubDate: string;
}

export interface UpcomingGame {
  id: string;
  name: string;
  nameKo: string;
  coverUrl: string | null;
  genres: string[];
  releaseDate: string;       // YYYY-MM-DD
  releaseDateLabel: string;  // "오늘", "내일", "N일 후", "3월 20일"
  platform: string[];        // ["iOS", "Android"]
  igdbLink: string;
}

export interface NewsFetchResponse {
  allNews: NewsItem[];
  defenseTop3: NewsItem[];
  mobileTop3: NewsItem[];
  byChannel: { [sourceKey: string]: NewsItem[] };
  fetchedAt: string;
  cachedAt?: string;
}

export interface NewsCacheEntry {
  data: NewsFetchResponse;
  timestamp: number;
  analyzedTop5?: AnalyzedNews[];
}
