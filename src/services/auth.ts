// ─── Auth Service ───
// High-level authentication operations that combine
// API calls with secure-store persistence.

import apiClient from './apiClient'
import {
  saveTokens,
  clearAll,
  saveUserData,
  saveLastUsername,
  getRefreshToken,
} from './secureStore'
import type {
  User,
  LoginCredentials,
  LoginResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
  AdminVerifyResponse,
} from '@/types/auth'

// ═══════════════════════════════════════
//  LOGIN / LOGOUT
// ═══════════════════════════════════════

/**
 * Authenticate with username (or email) + password.
 * Tokens are automatically persisted in the secure store.
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login/', credentials)
  const data = response.data

  // Persist tokens + user data in Tauri store
  await saveTokens(data.access, data.refresh)
  await saveUserData(data.user)
  await saveLastUsername(credentials.username)

  return data
}

/** Clear all stored credentials and user data. */
export async function logout(): Promise<void> {
  await clearAll()
}

// ═══════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════

/** Fetch the authenticated user's profile from the server. */
export async function getProfile(): Promise<User> {
  const response = await apiClient.get<User>('/auth/profile/')
  return response.data
}

/** Update the authenticated user's profile. */
export async function updateProfile(userData: Partial<User>): Promise<User> {
  const response = await apiClient.put<User>('/auth/profile/', userData)
  // Sync updated data back to the store
  await saveUserData(response.data)
  return response.data
}

// ═══════════════════════════════════════
//  PASSWORD
// ═══════════════════════════════════════

/** Change the authenticated user's password. */
export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  const response = await apiClient.post<ChangePasswordResponse>(
    '/auth/change-password/',
    payload,
  )

  // If the backend returns a new access token, persist it
  if (response.data.access) {
    const refresh = await getRefreshToken()
    if (refresh) {
      await saveTokens(response.data.access, refresh)
    }
  }

  return response.data
}

// ═══════════════════════════════════════
//  ADMIN VERIFICATION
// ═══════════════════════════════════════

/**
 * Check with the server whether the current user is an admin.
 * Returns `true` only if the server confirms `is_admin === true`.
 */
export async function verifyAdmin(): Promise<boolean> {
  try {
    const response = await apiClient.get<AdminVerifyResponse>(
      '/auth/verify-admin/',
      { timeout: 5000 },
    )
    return response.data.is_admin === true
  } catch {
    return false
  }
}
