<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Star, Search, CheckCircle, XCircle, Trash2, RefreshCw,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import {
  getAllReviews, getPendingReviews,
  approveReview, rejectReview, deleteReview,
} from '@/services/products'
import type { ProductReview } from '@/types/products'

type TabKey = 'pending' | 'approved' | 'rejected' | 'all'

// State
const reviews = ref<ProductReview[]>([])
const loading = ref(true)
const activeTab = ref<TabKey>('pending')
const searchText = ref('')
const sortBy = ref<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')

// Delete dialog
const deleteTarget = ref<ProductReview | null>(null)
const deleteDialogOpen = ref(false)
const deleting = ref(false)

// Processing actions
const processingId = ref<number | null>(null)

// Message
const msg = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// Tab counts
const pendingCount = computed(() => reviews.value.filter(r => !r.is_approved).length)
const approvedCount = computed(() => reviews.value.filter(r => r.is_approved).length)

// Tabs definition
const tabs: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'all', label: 'Todas' },
]

// Filtered list
const filtered = computed(() => {
  let list = [...reviews.value]

  // Tab filter
  if (activeTab.value === 'pending') list = list.filter(r => !r.is_approved)
  else if (activeTab.value === 'approved') list = list.filter(r => r.is_approved)

  // Search
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(r =>
      r.product_name?.toLowerCase().includes(q) ||
      r.username?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q),
    )
  }

  // Sort
  list.sort((a, b) => {
    if (sortBy.value === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortBy.value === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy.value === 'highest') return b.rating - a.rating
    return a.rating - b.rating
  })

  return list
})

// ── Load ──
async function loadReviews() {
  loading.value = true
  try {
    const [all, pending] = await Promise.all([
      getAllReviews().catch(() => []),
      getPendingReviews().catch(() => []),
    ])
    // Merge: all reviews + any pending not in "all" (backend might separate them)
    const map = new Map<number, ProductReview>()
    const allArr = Array.isArray(all) ? all : (all as { results?: ProductReview[] }).results || []
    const pendArr = Array.isArray(pending) ? pending : (pending as { results?: ProductReview[] }).results || []
    for (const r of [...allArr, ...pendArr]) map.set(r.id, r)
    reviews.value = Array.from(map.values())
  } finally { loading.value = false }
}

// ── Actions ──
async function doApprove(r: ProductReview) {
  processingId.value = r.id
  try {
    await approveReview(r.id)
    r.is_approved = true
    showMsg('success', `Reseña de "${r.username}" aprobada`)
  } catch { showMsg('error', 'Error al aprobar reseña') }
  finally { processingId.value = null }
}

async function doReject(r: ProductReview) {
  processingId.value = r.id
  try {
    await rejectReview(r.id)
    r.is_approved = false
    showMsg('success', `Reseña de "${r.username}" rechazada`)
  } catch { showMsg('error', 'Error al rechazar reseña') }
  finally { processingId.value = null }
}

function confirmDelete(r: ProductReview) {
  deleteTarget.value = r
  deleteDialogOpen.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteReview(deleteTarget.value.id)
    reviews.value = reviews.value.filter(r => r.id !== deleteTarget.value!.id)
    showMsg('success', 'Reseña eliminada')
  } catch { showMsg('error', 'Error al eliminar reseña') }
  finally {
    deleting.value = false; deleteTarget.value = null; deleteDialogOpen.value = false
  }
}

// ── Helpers ──
function showMsg(type: 'success' | 'error', text: string) {
  msg.value = { type, text }
  setTimeout(() => { msg.value = null }, 4000)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function reviewStatus(r: ProductReview): 'approved' | 'pending' {
  return r.is_approved ? 'approved' : 'pending'
}

onMounted(() => loadReviews())
</script>

<template>
  <div>
    <PageHeader title="Reseñas" subtitle="Moderación de reseñas de clientes">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-surface-700/50 px-3 py-2 text-sm text-gray-400 hover:bg-surface-700 hover:text-gray-200"
          :disabled="loading"
          @click="loadReviews"
        >
          <RefreshCw :size="14" :class="loading ? 'animate-spin' : ''" />
          Actualizar
        </button>
      </template>
    </PageHeader>

    <!-- Toast message -->
    <Transition name="dialog">
      <div v-if="msg"
        class="mb-4 rounded-lg border px-4 py-2.5 text-sm"
        :class="msg.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'"
      >{{ msg.text }}</div>
    </Transition>

    <!-- Tabs + Search bar -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex rounded-lg border border-surface-700/50 p-0.5">
        <button
          v-for="tab in tabs" :key="tab.key"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-primary-500/15 text-primary-400' : 'text-gray-500 hover:text-gray-300'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'pending' && pendingCount > 0"
            class="ml-1 rounded-full bg-amber-500/20 px-1.5 text-2xs text-amber-400"
          >{{ pendingCount }}</span>
          <span
            v-else-if="tab.key === 'approved'"
            class="ml-1 text-2xs text-gray-600"
          >{{ approvedCount }}</span>
          <span
            v-else-if="tab.key === 'all'"
            class="ml-1 text-2xs text-gray-600"
          >{{ reviews.length }}</span>
        </button>
      </div>
      <div class="relative flex-1">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input v-model="searchText" placeholder="Buscar por producto, usuario o comentario…"
          class="w-full rounded-lg border border-surface-700/50 bg-surface-800 py-2 pl-8 pr-3 text-sm text-gray-200 placeholder-gray-600 focus:border-primary-500/50 focus:outline-none" />
      </div>
      <select v-model="sortBy"
        class="rounded-lg border border-surface-700/50 bg-surface-800 px-3 py-2 text-xs text-gray-300 focus:border-primary-500/50 focus:outline-none"
      >
        <option value="newest">Más recientes</option>
        <option value="oldest">Más antiguas</option>
        <option value="highest">Mayor rating</option>
        <option value="lowest">Menor rating</option>
      </select>
    </div>

    <!-- Content -->
    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner text="Cargando reseñas…" /></div>
    <div v-else-if="filtered.length === 0" class="py-16">
      <EmptyState title="Sin reseñas" :message="searchText ? 'No se encontraron resultados para la búsqueda.' : 'No hay reseñas en esta categoría.'" />
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="r in filtered" :key="r.id"
        class="rounded-xl border border-surface-700/50 bg-surface-800 p-4 transition-colors hover:border-surface-700"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <!-- Product + Username -->
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium text-gray-200">{{ r.product_name || `Producto #${r.product}` }}</span>
              <span class="text-gray-600">·</span>
              <span class="text-gray-400">{{ r.username }}</span>
            </div>
            <!-- Stars -->
            <div class="mt-1 flex items-center gap-0.5">
              <Star
                v-for="s in 5" :key="s" :size="14"
                :class="s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-700'"
              />
              <span class="ml-1.5 text-xs text-gray-500">{{ r.rating }}/5</span>
            </div>
            <!-- Comment -->
            <p class="mt-2 text-sm leading-relaxed text-gray-300">{{ r.comment }}</p>
            <!-- Meta -->
            <div class="mt-2 flex items-center gap-3">
              <StatusBadge :status="reviewStatus(r)" />
              <span class="text-2xs text-gray-600">{{ fmtDate(r.created_at) }}</span>
            </div>
          </div>
          <!-- Actions -->
          <div class="flex flex-shrink-0 items-center gap-1">
            <button
              v-if="!r.is_approved"
              class="rounded-lg p-2 text-gray-500 hover:bg-green-500/10 hover:text-green-400 disabled:opacity-50"
              title="Aprobar"
              :disabled="processingId === r.id"
              @click="doApprove(r)"
            ><CheckCircle :size="16" /></button>
            <button
              v-if="r.is_approved"
              class="rounded-lg p-2 text-gray-500 hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-50"
              title="Rechazar"
              :disabled="processingId === r.id"
              @click="doReject(r)"
            ><XCircle :size="16" /></button>
            <button
              class="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
              title="Eliminar"
              @click="confirmDelete(r)"
            ><Trash2 :size="16" /></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <ConfirmDialog
      v-model:open="deleteDialogOpen"
      title="Eliminar reseña"
      :message="`¿Eliminar la reseña de &quot;${deleteTarget?.username ?? ''}&quot; en &quot;${deleteTarget?.product_name ?? ''}&quot;? Esta acción no se puede deshacer.`"
      variant="danger"
      confirm-label="Eliminar"
      @confirm="doDelete"
      @cancel="deleteDialogOpen = false; deleteTarget = null"
    />
  </div>
</template>
