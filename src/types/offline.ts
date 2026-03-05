// ─── Offline System TypeScript Types ───

/** Status of an operation in the offline queue */
export type OfflineOperationStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict'

/** Types of operations that can be queued offline */
export type OfflineOperationType = 'create_order' | 'update_order' | 'update_stock' | 'create_payment'

/** A single offline operation in the local queue */
export interface OfflineOperation {
  /** UUID v4 generated client-side — this is the idempotency key */
  clientOperationId: string
  /** What kind of operation */
  operationType: OfflineOperationType
  /** ISO timestamp when the operation was created locally */
  clientTimestamp: string
  /** The actual data payload (order data, stock update, etc.) */
  payload: Record<string, unknown>
  /** Current status of this operation */
  status: OfflineOperationStatus
  /** Number of sync attempts */
  retryCount: number
  /** Error message from last attempt */
  lastError: string
  /** Server-assigned ID after successful sync */
  serverId: number | null
  /** Conflict details if status is 'conflict' */
  conflictDetails: Record<string, unknown> | null
}

/** App connectivity state */
export type ConnectionStatus = 'online' | 'offline' | 'degraded'

/** Sync engine state */
export interface SyncState {
  /** Current connectivity */
  connectionStatus: ConnectionStatus
  /** Is sync currently running? */
  isSyncing: boolean
  /** Number of pending operations in queue */
  pendingCount: number
  /** Number of failed operations */
  failedCount: number
  /** Number of conflict operations */
  conflictCount: number
  /** ISO timestamp of last successful sync */
  lastSyncTimestamp: string | null
  /** Latency to API in ms (null if offline) */
  latency: number | null
}

/** Result from a single sync attempt */
export interface SyncOperationResult {
  clientOperationId: string
  status: 'success' | 'conflict' | 'failed' | 'duplicate'
  serverId: number | null
  error: string
  conflictDetails?: Record<string, unknown>
}

/** Response from the sync push endpoint */
export interface SyncPushResponse {
  results: SyncOperationResult[]
  server_timestamp: string
  processed_count: number
  success_count: number
  conflict_count: number
  failed_count: number
  duplicate_count: number
}

/** Response from the sync pull endpoint */
export interface SyncPullResponse {
  server_timestamp: string
  products?: SyncPullProduct[]
  categories?: SyncPullCategory[]
  orders?: Record<string, unknown>[]
  dollar_rate?: {
    id: number
    value: string
    rate_type: string
    is_active: boolean
    updated_at: string
  } | null
}

/** Slimmed-down product for local cache */
export interface SyncPullProduct {
  id: number
  name: string
  sku: string
  price: number
  final_price: number
  stock: number
  discount: number
  total_discount: number
  image: string | null
  category_name: string
  currency: 'ARS' | 'USD'
  is_available: boolean
  has_variants: boolean
  variants: unknown[] | null
}

/** Category for local cache */
export interface SyncPullCategory {
  id: number
  name: string
  slug: string
  parent_id: number | null
}

/** Cached product data stored locally in Tauri store */
export interface OfflineProductCache {
  products: SyncPullProduct[]
  categories: SyncPullCategory[]
  dollarRate: SyncPullResponse['dollar_rate']
  lastPullTimestamp: string | null
  version: number
}

// ═══════════════════════════════════════
//  GENERIC HTTP REQUEST QUEUE
// ═══════════════════════════════════════

/**
 * A serialized HTTP request that failed because the app was offline.
 * Stored locally and replayed automatically when connectivity returns.
 */
export interface OfflineHttpRequest {
  /** UUID for tracking */
  id: string
  /** HTTP method (post, put, patch, delete) */
  method: string
  /** Relative URL (e.g. /products/42/) */
  url: string
  /** Request body (JSON-serializable) */
  data: unknown
  /** ISO timestamp when the request was originally attempted */
  createdAt: string
  /** Human-readable label for the UI (e.g. "Actualizar producto #42") */
  label: string
  /** Number of replay attempts */
  retryCount: number
  /** Status of this queued request */
  status: 'pending' | 'replaying' | 'replayed' | 'failed'
  /** Error message from the last replay attempt */
  lastError: string
}
