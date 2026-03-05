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
import { enqueueRequest } from './offlineDb'
import type { OfflineHttpRequest } from '@/types/offline'

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

    // ── Network error on write → queue for offline replay ──
    if (
      error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK'
    ) {
      const config = error.config
      const method = (config?.method ?? 'get').toLowerCase()
      const isMutation = ['post', 'put', 'patch', 'delete'].includes(method)

      // Skip queueing for auth endpoints and sync endpoints (handled separately)
      const url = config?.url ?? ''
      const skipQueue =
        url.includes('/auth/') ||
        url.includes('/token/') ||
        url.includes('/sync/') ||
        url.includes('/login')

      if (isMutation && config && !skipQueue) {
        // Build a user-readable label from the URL
        const label = _buildOfflineLabel(method, url)

        const offlineReq: OfflineHttpRequest = {
          id: crypto.randomUUID(),
          method,
          url,
          data: config.data ? JSON.parse(typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : null,
          createdAt: new Date().toISOString(),
          label,
          retryCount: 0,
          status: 'pending',
          lastError: '',
        }

        // Queue it (fire-and-forget, don't block the rejection)
        enqueueRequest(offlineReq).catch((e) =>
          console.error('[Offline] Failed to queue request:', e),
        )

        // Show toast notification (lazy import to avoid circular deps)
        _showOfflineToast(label)

        console.log(`[Offline] Queued: ${method.toUpperCase()} ${url} → ${offlineReq.id}`)

        return Promise.reject({
          message: `Sin conexión. "${label}" se guardó y se aplicará automáticamente al volver internet.`,
          originalError: error,
          isNetworkError: true,
          isOfflineQueued: true,
          offlineRequestId: offlineReq.id,
        })
      }

      // Read-only request or auth endpoint — just reject normally
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

// ═══════════════════════════════════════
//  OFFLINE QUEUE HELPERS
// ═══════════════════════════════════════

/** Build a user-friendly label from method + URL */
function _buildOfflineLabel(method: string, url: string): string {
  const m = method.toUpperCase()
  // Extract the resource name from the URL
  const clean = url.replace(/^\/|\/$/g, '').replace(/\d+/g, '#')
  const parts = clean.split('/')
  const resource = parts[0] ?? ''

  const resourceNames: Record<string, string> = {
    products: 'producto',
    categories: 'categoría',
    orders: 'orden',
    payments: 'pago',
    marketing: 'marketing',
    reviews: 'reseña',
    'site-config': 'configuración',
    'dollar-rates': 'cotización',
    'distribution-centers': 'centro de distribución',
  }

  const name = resourceNames[resource] ?? resource

  switch (m) {
    case 'POST': return `Crear ${name}`
    case 'PUT':
    case 'PATCH': return `Actualizar ${name}`
    case 'DELETE': return `Eliminar ${name}`
    default: return `${m} ${name}`
  }
}

/** Deduplicated toast: max 1 offline toast every 3 seconds */
let _lastOfflineToast = 0

function _showOfflineToast(label: string): void {
  const now = Date.now()
  if (now - _lastOfflineToast < 3000) return
  _lastOfflineToast = now

  // Lazy-import to avoid circular dependency (vue-toastification uses Vue app context)
  import('vue-toastification').then(({ useToast }) => {
    const toast = useToast()
    toast.warning(
      `Sin conexión — "${label}" se guardó localmente y se aplicará automáticamente al reconectarse.`,
      { timeout: 6000 },
    )
  }).catch(() => {
    // Fallback if toastification isn't available
    console.warn(`[Offline] ${label} queued for later.`)
  })
}

export default apiClient
