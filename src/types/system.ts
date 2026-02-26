// ─── Activity Log types ───

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'register'
  | 'login'
  | 'order'
  | 'status_change'

export const ACTION_LABELS: Record<ActivityAction, string> = {
  create: 'Creación',
  update: 'Modificación',
  delete: 'Eliminación',
  register: 'Registro',
  login: 'Inicio de sesión',
  order: 'Orden',
  status_change: 'Cambio de estado',
}

export const ACTION_COLORS: Record<ActivityAction, string> = {
  create: 'text-green-400 bg-green-500/10',
  update: 'text-amber-400 bg-amber-500/10',
  delete: 'text-red-400 bg-red-500/10',
  register: 'text-cyan-400 bg-cyan-500/10',
  login: 'text-blue-400 bg-blue-500/10',
  order: 'text-purple-400 bg-purple-500/10',
  status_change: 'text-indigo-400 bg-indigo-500/10',
}

export interface ActivityLog {
  id: number
  user: number | null
  user_username: string | null
  action: ActivityAction
  description: string
  content_type: number | null
  content_type_name: string | null
  object_id: string | null
  changes: Record<string, unknown> | null
  timestamp: string
  ip_address: string | null
}

export interface ActivityFilters {
  action?: string
  user_id?: number
  date_from?: string
  date_to?: string
  content_type?: string
  description?: string
  page?: number
  page_size?: number
}

export interface ActivityStats {
  total_activities: number
  activities_today: number
  activities_last_week: number
  activities_last_month: number
  activities_by_type: { action: string; count: number }[]
  most_active_users: { user__username: string; user_id: number; total: number }[]
  latest_activities: ActivityLog[]
}

// ─── Site Config types ───

export interface SiteConfig {
  id: number
  min_purchase_amount: number
  maintenance_mode: boolean
  maintenance_message: string
  created_at: string
  updated_at: string
}

export interface MaintenanceStatus {
  maintenance_mode: boolean
  message: string
  has_bypass_password: boolean
}

export interface MaintenanceTogglePayload {
  maintenance_mode: boolean
  maintenance_message?: string
  bypass_password?: string | null
}

export interface EmailConfigResult {
  status: string
  message?: string
  config?: Record<string, unknown>
}

export interface TestEmailResult {
  success: boolean
  message: string
  config?: Record<string, unknown>
  error?: string
}
