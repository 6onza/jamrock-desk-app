// ─── Statistics-related TypeScript types ───

/** Period values accepted by the statistics endpoints */
export type StatsPeriod = 'day' | 'week' | 'month' | 'year'

/** Parameters for GET /api/statistics/analytics/ */
export interface OrderStatsParams {
  period?: StatsPeriod
  start_date?: string
  end_date?: string
}

/** A single datapoint in the revenue timeline */
export interface TimelinePoint {
  date: string
  value: number
  orders: number
}

/** The stats object nested inside the analytics response */
export interface OrderAnalyticsStats {
  ventas: number
  ventas_pagadas: number
  facturacion: number
  ticketPromedio: number
  visitas: number
  changes: {
    ventas: number
    facturacion: number
  }
  customers: {
    new: number
    total: number
  }
  timeline: TimelinePoint[]
}

/** Full response shape from GET /api/statistics/analytics/ */
export interface OrderAnalyticsResponse {
  stats: OrderAnalyticsStats
  period: string
  start_date: string
  end_date: string
}

/** Parameters for GET /api/statistics/users/ */
export interface UserStatsParams {
  period?: StatsPeriod
  start_date?: string
  end_date?: string
}

/** A single datapoint in the user registrations timeline */
export interface UserTimelinePoint {
  date: string
  count: number
}

/** Stats object nested inside the user statistics response */
export interface UserStatisticsStats {
  period_customers: number
  total_customers: number
  timeline: UserTimelinePoint[]
}

/** Full response shape from GET /api/statistics/users/ */
export interface UserStatisticsResponse {
  stats: UserStatisticsStats
  period: string
  start_date: string
  end_date: string
}

/** Stat card configuration for the dashboard UI */
export interface StatCardConfig {
  label: string
  key: string
  icon: string
  iconBg: string
  iconColor: string
  isCurrency: boolean
  tooltip: string
}
