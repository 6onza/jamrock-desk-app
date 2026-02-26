// ─── Auth-related TypeScript types ───

/** User object as returned by the backend UserSerializer */
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
}

/** Credentials sent to POST /auth/login/ */
export interface LoginCredentials {
  username: string // Can be username or email
  password: string
}

/** Response from POST /auth/login/ */
export interface LoginResponse {
  user: User
  access: string
  refresh: string
  is_staff: boolean
  is_admin: boolean
}

/** A pair of JWT tokens */
export interface TokenPair {
  access: string
  refresh: string
}

/** Payload for POST /auth/change-password/ */
export interface ChangePasswordPayload {
  old_password: string
  new_password: string
}

/** Response from POST /auth/change-password/ */
export interface ChangePasswordResponse {
  message: string
  access?: string // New access token if password changed successfully
}

/** Response from GET /auth/verify-admin/ */
export interface AdminVerifyResponse {
  is_admin: boolean
  is_staff: boolean
  username?: string
  message?: string
}

/** Auth state shape used by the Pinia store */
export interface AuthState {
  user: User | null
  isAdmin: boolean
  initialized: boolean
  loading: boolean
}
