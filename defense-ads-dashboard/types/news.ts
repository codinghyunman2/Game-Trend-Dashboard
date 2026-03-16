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
}
