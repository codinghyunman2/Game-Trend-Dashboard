/**
 * cache.ts — Simple in-memory cache
 *
 * ⚠️  SERVERLESS LIMITATION — CACHE IS IN-MEMORY ONLY
 * The `cacheStore` below is a plain module-level object. In a serverless /
 * edge environment (Vercel Functions, AWS Lambda, etc.) each function instance
 * has its own isolated memory. Cached values are NOT shared across instances
 * and are lost on every cold start, making this cache unreliable under
 * concurrent production traffic.
 *
 * TODO: Replace with a distributed cache such as Vercel KV (Redis) or
 * Upstash to share cache state across all instances and survive cold starts.
 * Example: https://vercel.com/docs/storage/vercel-kv
 */

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
