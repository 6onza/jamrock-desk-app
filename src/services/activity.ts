import apiClient from './apiClient'
import type { ActivityLog, ActivityFilters, ActivityStats } from '@/types/system'
import type { ApiPaginatedResponse } from '@/types/api'

/**
 * GET /api/activity-logs/
 */
export async function getActivityLogs(
  filters: ActivityFilters = {},
): Promise<ApiPaginatedResponse<ActivityLog>> {
  const params: Record<string, string | number> = {}
  if (filters.action) params.action = filters.action
  if (filters.user_id) params.user_id = filters.user_id
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  if (filters.content_type) params.content_type = filters.content_type
  if (filters.description) params.description = filters.description
  if (filters.page) params.page = filters.page
  if (filters.page_size) params.page_size = filters.page_size

  const { data } = await apiClient.get('/activity-logs/', { params })
  return data
}

/**
 * GET /api/activity-logs/stats/
 */
export async function getActivityStats(): Promise<ActivityStats> {
  const { data } = await apiClient.get('/activity-logs/stats/')
  return data
}
