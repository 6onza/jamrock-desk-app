import apiClient from './apiClient'
import type {
  SiteConfig,
  MaintenanceStatus,
  MaintenanceTogglePayload,
  EmailConfigResult,
  TestEmailResult,
} from '@/types/system'

// ═══════════════════════════════════════
//  SITE CONFIG
// ═══════════════════════════════════════

/**
 * GET /api/site-config/ — returns the singleton SiteConfig.
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  const { data } = await apiClient.get('/site-config/')
  // The ViewSet overrides list() to return the single instance directly
  return data
}

/**
 * PATCH /api/site-config/{id}/ — update site configuration.
 */
export async function updateSiteConfig(
  configData: Partial<SiteConfig>,
): Promise<SiteConfig> {
  // The singleton always uses the same object, so we first get its id
  const config = await getSiteConfig()
  const { data } = await apiClient.patch<SiteConfig>(
    `/site-config/${config.id}/`,
    configData,
  )
  return data
}

// ═══════════════════════════════════════
//  MAINTENANCE MODE
// ═══════════════════════════════════════

/**
 * GET /api/maintenance/status/
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const { data } = await apiClient.get('/maintenance/status/')
  return data
}

/**
 * POST /api/maintenance/toggle/
 */
export async function toggleMaintenance(
  payload: MaintenanceTogglePayload,
): Promise<MaintenanceStatus> {
  const { data } = await apiClient.post('/maintenance/toggle/', payload)
  return data
}

// ═══════════════════════════════════════
//  EMAIL
// ═══════════════════════════════════════

/**
 * GET /api/check-email-config/
 */
export async function checkEmailConfig(): Promise<EmailConfigResult> {
  const { data } = await apiClient.get('/check-email-config/')
  return data
}

/**
 * POST /api/send-test-email/
 */
export async function sendTestEmail(
  email?: string,
): Promise<TestEmailResult> {
  const { data } = await apiClient.post('/send-test-email/', {
    email: email || undefined,
  })
  return data
}
