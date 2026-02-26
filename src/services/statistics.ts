// ─── Statistics Service ───
// Wraps the backend statistics endpoints with in-memory caching (5 min TTL).

import apiClient from './apiClient'
import type {
  OrderStatsParams,
  OrderAnalyticsResponse,
  UserStatsParams,
  UserStatisticsResponse,
} from '@/types/statistics'

// ═══════════════════════════════════════
//  IN-MEMORY CACHE
// ═══════════════════════════════════════

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function clearStatsCache(): void {
  cache.clear()
}

// ═══════════════════════════════════════
//  API FUNCTIONS
// ═══════════════════════════════════════

/**
 * GET /api/statistics/analytics/
 * Returns order analytics (revenue, sales count, timeline, etc.)
 */
export async function getOrderStats(
  params: OrderStatsParams = {},
): Promise<OrderAnalyticsResponse> {
  const cacheKey = `order_stats_${JSON.stringify(params)}`
  const cached = getCached<OrderAnalyticsResponse>(cacheKey)
  if (cached) return cached

  const queryParams: Record<string, string> = {}

  if (params.start_date && params.end_date) {
    queryParams.start_date = params.start_date
    queryParams.end_date = params.end_date
  } else if (params.period) {
    queryParams.period = params.period
  }

  const { data } = await apiClient.get<OrderAnalyticsResponse>(
    '/statistics/analytics/',
    { params: queryParams },
  )

  setCache(cacheKey, data)
  return data
}

/**
 * GET /api/statistics/users/
 * Returns user registration statistics.
 */
export async function getUserStats(
  params: UserStatsParams = {},
): Promise<UserStatisticsResponse> {
  const cacheKey = `user_stats_${JSON.stringify(params)}`
  const cached = getCached<UserStatisticsResponse>(cacheKey)
  if (cached) return cached

  const queryParams: Record<string, string> = {}

  if (params.start_date && params.end_date) {
    queryParams.start_date = params.start_date
    queryParams.end_date = params.end_date
  } else if (params.period) {
    queryParams.period = params.period
  }

  const { data } = await apiClient.get<UserStatisticsResponse>(
    '/statistics/users/',
    { params: queryParams },
  )

  setCache(cacheKey, data)
  return data
}
