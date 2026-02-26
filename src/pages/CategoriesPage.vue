<script setup lang="ts">
// ─── CategoriesPage ───
// Tree/flat category management with inline CRUD and product counts.

import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '@/stores/products'
import { getHierarchicalCategories } from '@/services/products'
import { PageHeader, LoadingSpinner, ConfirmDialog, EmptyState } from '@/components/ui'
import type { Category, HierarchicalCategory } from '@/types/products'
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  List,
  GitBranch,
  Package,
} from 'lucide-vue-next'

const store = useProductsStore()

// ─── State ───
const isLoading = ref(true)
const hierarchicalCategories = ref<HierarchicalCategory[]>([])
const viewMode = ref<'flat' | 'tree'>('tree')

// Create state
const showCreateForm = ref(false)
const newName = ref('')
const newParent = ref<number | null>(null)
const isCreating = ref(false)

// Edit state
const editingId = ref<number | null>(null)
const editName = ref('')
const editParent = ref<number | null>(null)
const isUpdating = ref(false)

// Delete state
const showDeleteDialog = ref(false)
const categoryToDelete = ref<Category | null>(null)

// Tree expanded state
const expandedIds = ref<Set<number>>(new Set())

// ─── Computed ───
const flatCategories = computed(() => store.categories)

// ─── Load data ───
async function loadData() {
  isLoading.value = true
  await store.fetchCategories()
  try {
    hierarchicalCategories.value = await getHierarchicalCategories()
    // Auto-expand all root categories
    hierarchicalCategories.value.forEach((c) => expandedIds.value.add(c.id))
  } catch {
    // Fallback: flat list only
  }
  isLoading.value = false
}

onMounted(loadData)

// ─── Toggle expand ───
function toggleExpand(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

// ─── Create ───
async function handleCreate() {
  if (!newName.value.trim()) return
  isCreating.value = true
  const cat = await store.addCategory(newName.value.trim(), newParent.value)
  if (cat) {
    newName.value = ''
    newParent.value = null
    showCreateForm.value = false
    await loadData() // Refresh hierarchical
  }
  isCreating.value = false
}

// ─── Edit ───
function startEdit(cat: Category | HierarchicalCategory) {
  editingId.value = cat.id
  editName.value = cat.name
  editParent.value = 'parent' in cat ? (cat as Category).parent : null
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
}

async function handleEdit() {
  if (!editingId.value || !editName.value.trim()) return
  isUpdating.value = true
  const updated = await store.editCategory(editingId.value, editName.value.trim(), editParent.value)
  if (updated) {
    editingId.value = null
    await loadData()
  }
  isUpdating.value = false
}

// ─── Delete ───
function confirmDelete(cat: Category | HierarchicalCategory) {
  categoryToDelete.value = cat as Category
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!categoryToDelete.value) return
  const ok = await store.removeCategory(categoryToDelete.value.id)
  showDeleteDialog.value = false
  categoryToDelete.value = null
  if (ok) await loadData()
}

// ─── Helpers ───
function getParentName(parentId: number | null): string {
  if (!parentId) return 'Ninguna (raíz)'
  const cat = flatCategories.value.find((c) => c.id === parentId)
  return cat ? cat.name : '—'
}
</script>

<template>
  <div>
    <!-- Header -->
    <PageHeader title="Categorías" subtitle="Gestión del árbol de categorías">
      <template #actions>
        <button
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500"
          @click="showCreateForm = !showCreateForm"
        >
          <Plus class="h-4 w-4" />
          Nueva categoría
        </button>
      </template>
    </PageHeader>

    <!-- Toolbar -->
    <div class="mt-6 flex items-center justify-between">
      <span class="text-sm text-surface-400">
        {{ flatCategories.length }} categoría{{ flatCategories.length !== 1 ? 's' : '' }}
      </span>
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-lg border border-surface-600 p-0.5">
          <button
            class="rounded-md p-1.5 transition"
            :class="viewMode === 'tree' ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-white'"
            @click="viewMode = 'tree'"
            title="Vista árbol"
          >
            <GitBranch class="h-4 w-4" />
          </button>
          <button
            class="rounded-md p-1.5 transition"
            :class="viewMode === 'flat' ? 'bg-surface-600 text-white' : 'text-surface-400 hover:text-white'"
            @click="viewMode = 'flat'"
            title="Vista lista"
          >
            <List class="h-4 w-4" />
          </button>
        </div>
        <button
          class="rounded-lg border border-surface-600 p-2 text-surface-400 transition hover:text-white"
          :disabled="isLoading"
          @click="loadData"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Create form -->
    <Transition name="slide">
      <div v-if="showCreateForm" class="mt-4 rounded-xl border border-surface-700 bg-surface-800/50 p-4">
        <h3 class="mb-3 text-sm font-semibold text-white">Nueva categoría</h3>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label class="mb-1 block text-xs text-surface-400">Nombre</label>
            <input
              v-model="newName"
              type="text"
              placeholder="Nombre de la categoría"
              class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
              @keyup.enter="handleCreate"
            />
          </div>
          <div class="sm:w-48">
            <label class="mb-1 block text-xs text-surface-400">Categoría padre</label>
            <select
              v-model="newParent"
              class="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
            >
              <option :value="null">Ninguna (raíz)</option>
              <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="flex gap-2">
            <button
              class="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-500 disabled:opacity-50"
              :disabled="isCreating || !newName.trim()"
              @click="handleCreate"
            >
              <RefreshCw v-if="isCreating" class="h-3.5 w-3.5 animate-spin" />
              <Check v-else class="h-3.5 w-3.5" />
              Crear
            </button>
            <button
              class="rounded-lg border border-surface-600 px-3 py-2 text-sm text-surface-400 hover:text-white"
              @click="showCreateForm = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="isLoading" class="mt-12">
      <LoadingSpinner label="Cargando categorías…" />
    </div>

    <!-- Empty -->
    <div v-else-if="flatCategories.length === 0" class="mt-12">
      <EmptyState
        :icon="FolderTree"
        title="Sin categorías"
        message="Aún no tenés categorías creadas."
      >
        <template #action>
          <button
            class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500"
            @click="showCreateForm = true"
          >
            <Plus class="h-4 w-4" />
            Crear primera categoría
          </button>
        </template>
      </EmptyState>
    </div>

    <!-- ════════════════════ TREE VIEW ════════════════════ -->
    <template v-else-if="viewMode === 'tree'">
      <div class="mt-4 space-y-1">
        <template v-for="cat in hierarchicalCategories" :key="cat.id">
          <!-- Root category -->
          <div
            class="rounded-lg border border-surface-700 bg-surface-800/50 transition hover:border-surface-600"
          >
            <div class="flex items-center gap-2 px-4 py-3">
              <!-- Expand toggle -->
              <button
                v-if="cat.children && cat.children.length > 0"
                class="rounded p-0.5 text-surface-400 transition hover:text-white"
                @click="toggleExpand(cat.id)"
              >
                <ChevronDown v-if="expandedIds.has(cat.id)" class="h-4 w-4" />
                <ChevronRight v-else class="h-4 w-4" />
              </button>
              <div v-else class="w-5"></div>

              <FolderTree class="h-4 w-4 text-primary-400" />

              <!-- Name / Edit inline -->
              <template v-if="editingId === cat.id">
                <input
                  v-model="editName"
                  type="text"
                  class="flex-1 rounded border border-primary-500 bg-surface-900 px-2 py-1 text-sm text-white outline-none"
                  @keyup.enter="handleEdit"
                  @keyup.escape="cancelEdit"
                />
                <button
                  class="rounded p-1 text-emerald-400 hover:bg-emerald-500/20"
                  :disabled="isUpdating"
                  @click="handleEdit"
                >
                  <Check class="h-4 w-4" />
                </button>
                <button
                  class="rounded p-1 text-surface-400 hover:text-white"
                  @click="cancelEdit"
                >
                  <X class="h-4 w-4" />
                </button>
              </template>

              <template v-else>
                <span class="flex-1 text-sm font-medium text-white">{{ cat.name }}</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400">
                  <Package class="h-3 w-3" />
                  {{ cat.product_count }}
                </span>
                <button
                  class="rounded p-1 text-surface-400 transition hover:text-primary-400"
                  @click="startEdit(cat)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  class="rounded p-1 text-surface-400 transition hover:text-red-400"
                  @click="confirmDelete(cat)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </template>
            </div>

            <!-- Children -->
            <Transition name="slide">
              <div
                v-if="expandedIds.has(cat.id) && cat.children && cat.children.length > 0"
                class="border-t border-surface-700/50 bg-surface-900/30"
              >
                <div
                  v-for="child in cat.children"
                  :key="child.id"
                  class="flex items-center gap-2 border-b border-surface-700/30 px-4 py-2.5 pl-12 last:border-0"
                >
                  <FolderTree class="h-3.5 w-3.5 text-surface-400" />

                  <template v-if="editingId === child.id">
                    <input
                      v-model="editName"
                      type="text"
                      class="flex-1 rounded border border-primary-500 bg-surface-800 px-2 py-1 text-sm text-white outline-none"
                      @keyup.enter="handleEdit"
                      @keyup.escape="cancelEdit"
                    />
                    <button
                      class="rounded p-1 text-emerald-400 hover:bg-emerald-500/20"
                      :disabled="isUpdating"
                      @click="handleEdit"
                    >
                      <Check class="h-3.5 w-3.5" />
                    </button>
                    <button
                      class="rounded p-1 text-surface-400 hover:text-white"
                      @click="cancelEdit"
                    >
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </template>

                  <template v-else>
                    <span class="flex-1 text-sm text-surface-200">{{ child.name }}</span>
                    <span class="inline-flex items-center gap-1 rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400">
                      <Package class="h-3 w-3" />
                      {{ child.product_count }}
                    </span>
                    <button
                      class="rounded p-1 text-surface-400 transition hover:text-primary-400"
                      @click="startEdit(child)"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                    </button>
                    <button
                      class="rounded p-1 text-surface-400 transition hover:text-red-400"
                      @click="confirmDelete(child)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </template>
                </div>
              </div>
            </Transition>
          </div>
        </template>
      </div>
    </template>

    <!-- ════════════════════ FLAT VIEW ════════════════════ -->
    <template v-else>
      <div class="mt-4 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800/50">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-700 text-left text-xs uppercase text-surface-400">
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Slug</th>
              <th class="px-4 py-3">Padre</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-700/50">
            <tr v-for="cat in flatCategories" :key="cat.id" class="transition hover:bg-surface-700/30">
              <td class="px-4 py-3">
                <template v-if="editingId === cat.id">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="editName"
                      type="text"
                      class="rounded border border-primary-500 bg-surface-900 px-2 py-1 text-sm text-white outline-none"
                      @keyup.enter="handleEdit"
                      @keyup.escape="cancelEdit"
                    />
                    <select
                      v-model="editParent"
                      class="rounded border border-surface-600 bg-surface-900 px-2 py-1 text-xs text-white outline-none"
                    >
                      <option :value="null">Sin padre</option>
                      <option
                        v-for="opt in flatCategories.filter((c) => c.id !== cat.id)"
                        :key="opt.id"
                        :value="opt.id"
                      >
                        {{ opt.name }}
                      </option>
                    </select>
                    <button
                      class="text-emerald-400 hover:text-emerald-300"
                      :disabled="isUpdating"
                      @click="handleEdit"
                    >
                      <Check class="h-4 w-4" />
                    </button>
                    <button class="text-surface-400 hover:text-white" @click="cancelEdit">
                      <X class="h-4 w-4" />
                    </button>
                  </div>
                </template>
                <span v-else class="font-medium text-white">{{ cat.name }}</span>
              </td>
              <td class="px-4 py-3 text-surface-400">{{ cat.slug }}</td>
              <td class="px-4 py-3 text-surface-400">{{ getParentName(cat.parent) }}</td>
              <td class="px-4 py-3">
                <div v-if="editingId !== cat.id" class="flex items-center justify-end gap-1">
                  <button
                    class="rounded-lg p-1.5 text-surface-400 transition hover:text-primary-400"
                    @click="startEdit(cat)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-surface-400 transition hover:text-red-400"
                    @click="confirmDelete(cat)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Delete dialog -->
    <ConfirmDialog
      :open="showDeleteDialog"
      variant="danger"
      title="Eliminar categoría"
      :message="`¿Estás seguro que querés eliminar &quot;${categoryToDelete?.name}&quot;? Los productos asociados quedarán sin categoría.`"
      confirm-label="Eliminar"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
