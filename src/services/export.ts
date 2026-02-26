// ─── Export Service ───
// CSV export using Tauri's dialog + filesystem (Rust command).
// PDF / print uses the browser's native window.print() API.

import { invoke } from '@tauri-apps/api/core'
import type { Order } from '@/types/orders'
import type { Product } from '@/types/products'

// ═══════════════════════════════════════
//  CSV CORE
// ═══════════════════════════════════════

/**
 * Escape a value for CSV (handles commas, quotes, newlines).
 */
function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Build a CSV string from headers + rows.
 */
function buildCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(csvEscape).join(',')
  const dataLines = rows.map(row => row.map(csvEscape).join(','))
  return [headerLine, ...dataLines].join('\n')
}

/**
 * Open a native "Save As" dialog and write CSV data.
 * Returns the file path if saved, null if cancelled.
 */
async function saveCSV(csvData: string, filename: string): Promise<string | null> {
  return invoke<string | null>('export_csv', {
    data: csvData,
    defaultFilename: filename,
  })
}

// ═══════════════════════════════════════
//  EXPORT FUNCTIONS
// ═══════════════════════════════════════

/**
 * Export an array of orders to CSV.
 */
export async function exportOrdersToCSV(orders: Order[]): Promise<string | null> {
  const headers = [
    'ID', 'Cliente', 'Email', 'Fecha', 'Estado', 'Método envío',
    'Subtotal', 'Descuento', 'Total', 'Método pago',
  ]

  const rows = orders.map(o => [
    String(o.id),
    o.recipient_name || '',
    o.customer_email || '',
    new Date(o.created_at).toLocaleDateString('es-AR'),
    o.status,
    o.delivery_type || '',
    String(o.subtotal || 0),
    String(o.discount || 0),
    String(o.total),
    o.payment_method || '',
  ])

  const csv = buildCsv(headers, rows)
  const now = new Date().toISOString().slice(0, 10)
  return saveCSV(csv, `pedidos_${now}.csv`)
}

/**
 * Export an array of products to CSV.
 */
export async function exportProductsToCSV(products: Product[]): Promise<string | null> {
  const headers = [
    'ID', 'SKU', 'Nombre', 'Marca', 'Categoría', 'Precio',
    'Descuento %', 'Precio final', 'Stock', 'Disponible', 'Moneda',
  ]

  const rows = products.map(p => [
    String(p.id),
    p.sku || '',
    p.name,
    p.brand || '',
    p.category_name || '',
    String(p.price),
    String(p.discount || 0),
    String(p.final_price || p.price),
    String(p.stock),
    p.is_available ? 'Sí' : 'No',
    p.currency || 'ARS',
  ])

  const csv = buildCsv(headers, rows)
  const now = new Date().toISOString().slice(0, 10)
  return saveCSV(csv, `productos_${now}.csv`)
}

/**
 * Export generic statistics data to CSV.
 */
export async function exportStatsToCSV(
  headers: string[],
  rows: string[][],
  filenamePrefix = 'estadisticas',
): Promise<string | null> {
  const csv = buildCsv(headers, rows)
  const now = new Date().toISOString().slice(0, 10)
  return saveCSV(csv, `${filenamePrefix}_${now}.csv`)
}

/**
 * Trigger native print dialog for the current page content.
 * Used for printing order remitos.
 */
export function printCurrentPage(): void {
  window.print()
}

/**
 * Navigate to the print-order route and trigger print after render.
 */
export function printOrder(orderId: number): void {
  const printUrl = `${window.location.origin}/orders/${orderId}/print`
  const printWindow = window.open(printUrl, '_blank', 'width=800,height=600')
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => printWindow.print(), 500)
    })
  }
}
