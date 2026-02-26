// ─── API-related TypeScript types ───

/** Standard paginated response from Django REST Framework */
export interface ApiPaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Generic API error shape (backend returns various formats) */
export interface ApiError {
  detail?: string
  message?: string
  error?: string | string[]
  [key: string]: unknown
}

/** Extended Axios config with custom flags */
export interface ApiRequestConfig {
  /** If true, the auto-timeout logic won't override this request's timeout */
  timeoutSet?: boolean
  /** Set to true internally to prevent infinite 401 retry loops */
  _retry?: boolean
}

/** Timeout presets (milliseconds) per endpoint category */
export const TIMEOUT_SETTINGS = {
  default: 30_000,
  product: 15_000,
  productsList: 25_000,
  auth: 10_000,
  orders: 20_000,
  upload: 60_000,
} as const

export type TimeoutPreset = keyof typeof TIMEOUT_SETTINGS

/** Result of an API connectivity test */
export interface ConnectionTestResult {
  connected: boolean
  latency: number | null
  status?: number
  message: string
}
