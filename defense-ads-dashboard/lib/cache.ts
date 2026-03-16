interface CacheEntry<T> {
  data: T
  cachedAt: number
  ttl: number
}

const cacheStore: Record<string, CacheEntry<unknown>> = {}

export function getCache<T>(key: string): T | null {
  const entry = cacheStore[key]
  if (!entry) return null
  if (Date.now() - entry.cachedAt > entry.ttl) {
    delete cacheStore[key]
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cacheStore[key] = {
    data,
    cachedAt: Date.now(),
    ttl: ttlMs,
  }
}

export function clearCache(key: string): void {
  delete cacheStore[key]
}
