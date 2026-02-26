<script setup lang="ts">
/**
 * Badge component for order/entity status display.
 *
 * Usage:
 *   <StatusBadge status="paid" />
 *   <StatusBadge status="shipped" size="sm" />
 */

withDefaults(
  defineProps<{
    status: string
    size?: 'xs' | 'sm' | 'md'
  }>(),
  { size: 'sm' },
)

const statusConfig: Record<string, { label: string; class: string }> = {
  // Orders
  pending: { label: 'Pendiente', class: 'bg-amber-500/10 text-amber-400' },
  paid: { label: 'Pagado', class: 'bg-green-500/10 text-green-400' },
  shipped: { label: 'Enviado', class: 'bg-blue-500/10 text-blue-400' },
  delivered: { label: 'Entregado', class: 'bg-teal-500/10 text-teal-400' },
  cancelled: { label: 'Cancelado', class: 'bg-red-500/10 text-red-400' },
  archived: { label: 'Archivado', class: 'bg-gray-500/10 text-gray-400' },
  abandoned: { label: 'Abandonado', class: 'bg-orange-500/10 text-orange-400' },
  recovered: { label: 'Recuperado', class: 'bg-emerald-500/10 text-emerald-400' },
  converted: { label: 'Convertido', class: 'bg-cyan-500/10 text-cyan-400' },

  // Generic
  active: { label: 'Activo', class: 'bg-green-500/10 text-green-400' },
  inactive: { label: 'Inactivo', class: 'bg-gray-500/10 text-gray-400' },
  expired: { label: 'Expirado', class: 'bg-red-500/10 text-red-400' },
  blocked: { label: 'Bloqueado', class: 'bg-red-500/10 text-red-400' },
  approved: { label: 'Aprobado', class: 'bg-green-500/10 text-green-400' },
  rejected: { label: 'Rechazado', class: 'bg-red-500/10 text-red-400' },
  draft: { label: 'Borrador', class: 'bg-gray-500/10 text-gray-400' },

  // Boolean-like
  true: { label: 'Sí', class: 'bg-green-500/10 text-green-400' },
  false: { label: 'No', class: 'bg-gray-500/10 text-gray-400' },
}

function getConfig(status: string) {
  return statusConfig[status] ?? { label: status, class: 'bg-gray-500/10 text-gray-400' }
}

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-2xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium',
      getConfig(status).class,
      sizeClasses[size],
    ]"
  >
    {{ getConfig(status).label }}
  </span>
</template>
