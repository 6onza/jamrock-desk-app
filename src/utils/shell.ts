// ─── Shell / URL Utilities ───
// Open external URLs in the user's default browser via Tauri opener plugin.

import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * Open any URL in the system's default browser.
 */
export async function openInBrowser(url: string): Promise<void> {
  try {
    await openUrl(url)
  } catch (err) {
    // Fallback — shouldn't happen in desktop context
    console.error('Failed to open URL:', err)
    window.open(url, '_blank')
  }
}

/**
 * Open a product in the public storefront.
 * Constructs the URL from the configured store base.
 */
export function openProductInStore(productId: number): Promise<void> {
  const storeBase = 'https://jamrockgrowshop.vercel.app'
  return openInBrowser(`${storeBase}/productos/${productId}`)
}

/**
 * Open an order in MercadoPago (if external payment URL exists).
 */
export function openPaymentUrl(url: string): Promise<void> {
  return openInBrowser(url)
}
