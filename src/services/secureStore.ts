// ─── Secure Store Service ───
// Wraps Tauri secure-store (Rust commands) for tokens
// and @tauri-apps/plugin-store (JS) for user data.
// Tokens NEVER touch localStorage — they live in Tauri's encrypted store.

import { invoke } from '@tauri-apps/api/core'
import { load, type Store } from '@tauri-apps/plugin-store'
import type { User } from '@/types/auth'

// ─── Constants ───
const USER_STORE_FILE = 'user-data.json'
const USER_KEY = 'user'
const IS_ADMIN_KEY = 'is_admin'
const LAST_USERNAME_KEY = 'last_username'

// ─── Lazy store singleton ───
let _userStore: Store | null = null

async function userStore(): Promise<Store> {
  if (!_userStore) {
    _userStore = await load(USER_STORE_FILE)
  }
  return _userStore
}

// ═══════════════════════════════════════
//  TOKEN OPERATIONS  (backed by Rust IPC)
// ═══════════════════════════════════════

/** Persist JWT tokens in the Tauri secure store. */
export async function saveTokens(access: string, refresh: string): Promise<void> {
  await invoke('store_tokens', { accessToken: access, refreshToken: refresh })
}

/** Retrieve the current access token (or null). */
export async function getAccessToken(): Promise<string | null> {
  return invoke<string | null>('get_access_token')
}

/** Retrieve the current refresh token (or null). */
export async function getRefreshToken(): Promise<string | null> {
  return invoke<string | null>('get_refresh_token')
}

/** Remove both tokens from the secure store. */
export async function clearTokens(): Promise<void> {
  await invoke('clear_tokens')
}

/**
 * Check whether the stored access token will expire within `bufferMinutes`.
 * Returns `true` if expiring soon or no token exists.
 */
export async function isTokenExpiringSoon(bufferMinutes = 5): Promise<boolean> {
  return invoke<boolean>('is_token_expiring_soon', { bufferMinutes })
}

// ═══════════════════════════════════════
//  USER DATA  (JS plugin-store)
// ═══════════════════════════════════════

/** Save user profile + admin flag after login / profile refresh. */
export async function saveUserData(user: User): Promise<void> {
  const store = await userStore()
  await store.set(USER_KEY, user)
  await store.set(IS_ADMIN_KEY, user.is_staff || user.is_superuser)
  await store.save()
}

/** Load stored user profile (returns null if not found). */
export async function getUserData(): Promise<User | null> {
  const store = await userStore()
  return ((await store.get<User>(USER_KEY)) as User | undefined) ?? null
}

/** Check the persisted admin flag. */
export async function getIsAdmin(): Promise<boolean> {
  const store = await userStore()
  return ((await store.get<boolean>(IS_ADMIN_KEY)) as boolean | undefined) ?? false
}

/** Clear user profile data (but NOT tokens — call clearTokens separately). */
export async function clearUserData(): Promise<void> {
  const store = await userStore()
  await store.delete(USER_KEY)
  await store.delete(IS_ADMIN_KEY)
  await store.save()
}

// ═══════════════════════════════════════
//  LAST USERNAME  (convenience)
// ═══════════════════════════════════════

/** Remember the last username used to log in. */
export async function saveLastUsername(username: string): Promise<void> {
  const store = await userStore()
  await store.set(LAST_USERNAME_KEY, username)
  await store.save()
}

/** Retrieve the last-used username (for pre-filling the login form). */
export async function getLastUsername(): Promise<string> {
  const store = await userStore()
  return ((await store.get<string>(LAST_USERNAME_KEY)) as string | undefined) ?? ''
}

// ═══════════════════════════════════════
//  FULL CLEANUP  (logout)
// ═══════════════════════════════════════

/** Nuclear option — clear tokens AND user data. */
export async function clearAll(): Promise<void> {
  await clearTokens()
  await clearUserData()
}
