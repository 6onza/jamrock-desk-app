// ─── API Client ───
// Axios instance with interceptors that replicate the web frontend's
// token-refresh mutex, per-endpoint timeouts, and error handling —
// but adapted for Tauri (secure store instead of localStorage).

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { invoke } from '@tauri-apps/api/core'
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearAll,
  isTokenExpiringSoon,
} from './secureStore'
import { TIMEOUT_SETTINGS } from '@/types/api'
import type { ConnectionTestResult } from '@/types/api'

// ═══════════════════════════════════════
//  TOKEN REFRESH MUTEX
// ═══════════════════════════════════════

interface RefreshState {
  isRefreshing: boolean
  refreshPromise: Promise<string | null> | null
}

const refreshState: RefreshState = {
  isRefreshing: false,
  refreshPromise: null,
}

/**
 * Refresh the access token using the stored refresh token.
 * Uses a shared-promise pattern so concurrent requests don't trigger
 * multiple refresh calls.
 */
export async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, return the in-flight promise
  if (refreshState.isRefreshing && refreshState.refreshPromise) {
    return refreshState.refreshPromise
  }

  refreshState.isRefreshing = true
  refreshState.refreshPromise = (async (): Promise<string | null> => {
    try {
      const refresh = await getRefreshToken()
      if (!refresh) {
        await clearAll()
        return null
      }

      const baseUrl = await getApiBaseUrl()
      const response = await axios.post(`${baseUrl}/auth/token/refresh/`, { refresh })
      const newAccess = response.data.access as string

      // Persist the new access token (refresh token stays the same)
      await saveTokens(newAccess, refresh)
      return newAccess
    } catch (error) {
      const axErr = error as AxiosError
      console.error('[Auth] Token refresh failed:', axErr.message)
      if (axErr.response?.status === 401) {
        await clearAll()
      }
      return null
    } finally {
      refreshState.isRefreshing = false
      refreshState.refreshPromise = null
    }
  })()

  return refreshState.refreshPromise
}

// ═══════════════════════════════════════
//  BASE URL MANAGEMENT
// ═══════════════════════════════════════

let _baseUrl = ''

/** Resolve the API base URL from Tauri config store. */
async function getApiBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl
  try {
    _baseUrl = await invoke<string>('get_api_url')
  } catch {
    _baseUrl =
      import.meta.env.VITE_API_URL || 'https://jamrock-api.up.railway.app/api'
  }
  return _baseUrl
}

/** Initialise the API client (call once at app startup). */
export async function initApiClient(): Promise<void> {
  _baseUrl = await getApiBaseUrl()
  apiClient.defaults.baseURL = _baseUrl
}

/** Update the base URL at runtime (from SettingsPage). */
export async function updateApiBaseUrl(url: string): Promise<void> {
  const cleanUrl = url.replace(/\/+$/, '')
  _baseUrl = cleanUrl
  apiClient.defaults.baseURL = cleanUrl
  await invoke('set_api_url', { url: cleanUrl })
}

/** Return the currently-configured base URL. */
export function getBaseUrl(): string {
  return _baseUrl
}

// ═══════════════════════════════════════
//  TIMEOUT DETERMINATION
// ═══════════════════════════════════════

function determineTimeout(url = '', method = 'get'): number {
  if (!url) return TIMEOUT_SETTINGS.default

  const lowerUrl = url.toLowerCase()
  const isUpload =
    method.toLowerCase() === 'post' &&
    (lowerUrl.includes('/image') ||
      lowerUrl.includes('/upload') ||
      lowerUrl.includes('/file'))

  if (isUpload) return TIMEOUT_SETTINGS.upload
  if (lowerUrl.includes('/products/') && !lowerUrl.endsWith('/products/'))
    return TIMEOUT_SETTINGS.product
  if (lowerUrl.includes('/products')) return TIMEOUT_SETTINGS.productsList
  if (lowerUrl.includes('/auth/') || lowerUrl.includes('/login'))
    return TIMEOUT_SETTINGS.auth
  if (lowerUrl.includes('/orders/') || lowerUrl.includes('/order/'))
    return TIMEOUT_SETTINGS.orders

  return TIMEOUT_SETTINGS.default
}

// ═══════════════════════════════════════
//  AXIOS INSTANCE
// ═══════════════════════════════════════

const apiClient: AxiosInstance = axios.create({
  timeout: TIMEOUT_SETTINGS.default,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── Request interceptor: attach Bearer token + proactive refresh ───
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/token/refresh')

    if (!isAuthEndpoint) {
      let token = await getAccessToken()

      if (token) {
        const expiring = await isTokenExpiringSoon(5)
        if (expiring) {
          console.log('[Auth] Token expiring soon, refreshing proactively…')
          const fresh = await refreshAccessToken()
          token = fresh ?? token
        }
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    // Auto-set timeout unless the caller explicitly set it
    if (!(config as unknown as Record<string, unknown>).timeoutSet) {
      config.timeout = determineTimeout(config.url, config.method)
    }

    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor: error handling + 401 retry ───
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // ── Timeout ──
    if (error.code === 'ECONNABORTED') {
      const endpoint = error.config?.url
        ? `(${(error.config.method ?? 'GET').toUpperCase()} ${error.config.url})`
        : ''
      return Promise.reject({
        message: `La solicitud ${endpoint} tardó demasiado. Intentá nuevamente.`,
        originalError: error,
        isTimeout: true,
      })
    }

    // ── Network error ──
    if (error.message === 'Network Error') {
      return Promise.reject({
        message:
          'No se pudo conectar con el servidor. Verificá tu conexión a internet.',
        originalError: error,
        isNetworkError: true,
      })
    }

    // ── 401 Unauthorized → refresh & retry ──
    if (error.response?.status === 401) {
      const original = error.config as InternalAxiosRequestConfig &
        Record<string, unknown>
      if (original && !original._retry) {
        original._retry = true
        const newToken = await refreshAccessToken()
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`
          return apiClient(original)
        }
      }
      // Refresh failed — wipe session (the router guard will redirect)
      await clearAll()
      // Lazy-import router to avoid circular deps
      const { default: router } = await import('@/router')
      router.push({ name: 'Login', query: { expired: 'true' } })
    }

    // ── 403 Forbidden ──
    if (error.response?.status === 403) {
      console.warn('[API] 403 Forbidden:', error.config?.url)
    }

    return Promise.reject(error)
  },
)

// ═══════════════════════════════════════
//  CONNECTIVITY TEST
// ═══════════════════════════════════════

/** Ping the API to verify connectivity and measure latency. */
export async function checkApiConnection(
  urlOverride?: string,
): Promise<ConnectionTestResult> {
  const target = urlOverride ?? _baseUrl
  try {
    const start = Date.now()
    const response = await axios.get(`${target}/`, { timeout: 5000 })
    const latency = Date.now() - start
    return {
      connected: true,
      latency,
      status: response.status,
      message: `API conectada (${latency}ms)`,
    }
  } catch (error) {
    const axErr = error as AxiosError
    return {
      connected: false,
      latency: null,
      status: axErr.response?.status ?? 0,
      message:
        axErr.code === 'ECONNABORTED'
          ? 'Timeout (>5s)'
          : axErr.message === 'Network Error'
            ? 'Error de red — verificá la URL'
            : `Error: ${axErr.message || 'Desconocido'}`,
    }
  }
}

export default apiClient
