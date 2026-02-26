<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  LayoutDashboard,
  BarChart3,
  Package,
  FolderTree,
  ShoppingCart,
  PlusCircle,
  Users,
  Ticket,
  Tag,
  Activity,
  Store,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gauge,
  BoxesIcon,
  CreditCard,
  Megaphone,
  Settings,
  Search,
} from 'lucide-vue-next'
import logoUrl from '@/assets/jamrock-logo.png'

// ─── Sidebar collapse state ───
const collapsed = ref(false)
function toggleCollapse() {
  collapsed.value = !collapsed.value
}

// ─── Quick search ───
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

// ─── Navigation structure ───
interface NavItem {
  label: string
  to: string
  icon: ReturnType<typeof LayoutDashboard> | unknown
  badge?: number
  badgeColor?: 'primary' | 'green' | 'amber' | 'red'
}

interface NavGroup {
  title: string
  icon: ReturnType<typeof LayoutDashboard> | unknown
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    title: 'Dashboard',
    icon: Gauge,
    items: [
      { label: 'Resumen general', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Estadísticas', to: '/dashboard/stats', icon: BarChart3 },
    ],
  },
  {
    title: 'Catálogo',
    icon: BoxesIcon,
    items: [
      { label: 'Productos', to: '/products', icon: Package },
      { label: 'Categorías', to: '/categories', icon: FolderTree },
    ],
  },
  {
    title: 'Ventas',
    icon: CreditCard,
    items: [
      { label: 'Pedidos', to: '/orders', icon: ShoppingCart },
      { label: 'Nueva venta', to: '/orders/new', icon: PlusCircle },
    ],
  },
  {
    title: 'Clientes',
    icon: Users,
    items: [{ label: 'Lista de clientes', to: '/customers', icon: Users }],
  },
  {
    title: 'Marketing',
    icon: Megaphone,
    items: [
      { label: 'Cupones', to: '/coupons', icon: Ticket },
      { label: 'Ofertas', to: '/offers', icon: Tag },
    ],
  },
  {
    title: 'Sistema',
    icon: Settings,
    items: [
      { label: 'Actividad', to: '/activity', icon: Activity },
      { label: 'Configuración tienda', to: '/store-settings', icon: Store },
      { label: 'Reseñas', to: '/reviews', icon: Star },
    ],
  },
]

// ─── Filtered navigation (search) ───
const filteredNavigation = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return navigation
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          group.title.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.items.length > 0)
})

// ─── Active route matching ───
const route = useRoute()
const router = useRouter()

function isActive(to: string): boolean {
  if (to === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(to)
}

function isGroupActive(group: NavGroup): boolean {
  return group.items.some((item) => isActive(item.to))
}

// ─── Open/close groups ───
const openGroups = ref<Set<string>>(new Set())

watch(
  () => route.path,
  () => {
    for (const group of navigation) {
      if (isGroupActive(group)) {
        openGroups.value.add(group.title)
      }
    }
  },
  { immediate: true },
)

// Auto-open all groups when searching
watch(searchQuery, (q) => {
  if (q.trim()) {
    filteredNavigation.value.forEach((g) => openGroups.value.add(g.title))
  }
})

function toggleGroup(title: string) {
  if (openGroups.value.has(title)) {
    openGroups.value.delete(title)
  } else {
    openGroups.value.add(title)
  }
}

function navigateTo(to: RouteLocationRaw) {
  searchQuery.value = ''
  router.push(to)
}

// Keyboard shortcut: Ctrl+K to focus search
function handleKeyboard(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (collapsed.value) collapsed.value = false
    nextTick(() => searchInputRef.value?.focus())
  }
}

// Register globally
import { onMounted, onUnmounted } from 'vue'
onMounted(() => window.addEventListener('keydown', handleKeyboard))
onUnmounted(() => window.removeEventListener('keydown', handleKeyboard))

const sidebarWidth = computed(() => (collapsed.value ? 'w-[68px]' : 'w-64'))
</script>

<template>
  <aside
    :class="[
      sidebarWidth,
      'sidebar-root group/sidebar flex flex-col border-r border-white/[0.06] bg-surface-850 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
    ]"
  >
    <!-- ══════ Logo area ══════ -->
    <div class="flex h-14 items-center gap-3 px-4">
      <div class="relative flex-shrink-0">
        <img
          :src="logoUrl"
          alt="Jamrock"
          class="h-9 w-9 rounded-xl object-contain shadow-lg shadow-black/20 ring-1 ring-white/[0.08] transition-transform duration-300"
          :class="{ 'scale-90': collapsed }"
        />
        <!-- Online pulse dot -->
        <span class="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-surface-850" />
        </span>
      </div>
      <Transition name="slide-fade">
        <div v-if="!collapsed" class="min-w-0">
          <h2 class="text-sm font-bold tracking-tight text-gray-100">Jamrock</h2>
          <p class="text-2xs text-gray-500 font-medium">Admin Panel</p>
        </div>
      </Transition>
    </div>

    <!-- ══════ Search bar (expanded only) ══════ -->
    <Transition name="slide-fade">
      <div v-if="!collapsed" class="px-3 pb-2 pt-1">
        <div class="relative">
          <Search :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Buscar..."
            class="search-input w-full rounded-lg border border-white/[0.06] bg-surface-900/60 py-1.5 pl-8 pr-10 text-xs text-gray-300 placeholder:text-gray-600 transition-all duration-200 focus:border-primary-500/40 focus:bg-surface-900 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
          />
          <kbd class="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/[0.08] bg-surface-800 px-1 py-0.5 text-[9px] font-medium text-gray-500 leading-none">
            ⌘K
          </kbd>
        </div>
      </div>
    </Transition>

    <!-- Separator -->
    <div class="mx-3 border-t border-white/[0.05]" />

    <!-- ══════ Navigation ══════ -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2 sidebar-scroll">
      <TransitionGroup name="nav-group">
        <div
          v-for="(group, groupIndex) in filteredNavigation"
          :key="group.title"
          class="nav-section"
          :class="{ 'mt-1': groupIndex > 0 }"
        >
          <!-- Group header -->
          <button
            class="group/header flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 mx-1.5 text-[12px] font-bold uppercase tracking-[0.04em] transition-colors duration-150"
            :class="[
              isGroupActive(group)
                ? 'text-gray-400'
                : 'text-gray-600 hover:text-gray-400',
            ]"
            :title="collapsed ? group.title : undefined"
            @click="collapsed ? undefined : toggleGroup(group.title)"
          >
            <component
              :is="group.icon"
              :size="16"
              class="flex-shrink-0 transition-colors duration-150"
              :class="isGroupActive(group) ? 'text-primary-400/70' : 'text-gray-600 group-hover/header:text-gray-500'"
            />
            <template v-if="!collapsed">
              <span class="flex-1 text-left">{{ group.title }}</span>
              <ChevronDown
                :size="11"
                class="transition-transform duration-300 ease-out text-gray-600"
                :class="{ '-rotate-90': !openGroups.has(group.title) }"
              />
            </template>
          </button>

          <!-- Group items with animated expand/collapse -->
          <Transition name="expand">
            <div
              v-show="collapsed || openGroups.has(group.title)"
              class="mt-0.5 space-y-0.5 px-1.5"
            >
              <button
                v-for="item in group.items"
                :key="item.to"
                class="nav-item ms-4 group/item relative flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] transition-all duration-150"
                :class="[
                  isActive(item.to)
                    ? 'bg-primary-500/[0.08] text-primary-300 font-medium shadow-[inset_0_0_0_1px_rgba(30,167,253,0.1)]'
                    : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200',
                ]"
                :title="collapsed ? item.label : undefined"
                @click="navigateTo(item.to)"
              >
                <!-- Active indicator bar -->
                <Transition name="indicator">
                  <div
                    v-if="isActive(item.to)"
                    class="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500 shadow-[0_0_8px_rgba(30,167,253,0.4)]"
                  />
                </Transition>

                <!-- Icon with subtle glow when active -->
                <div class="relative flex-shrink-0">
                  <component
                    :is="item.icon"
                    :size="17"
                    class="relative z-10 transition-colors duration-150"
                    :class="isActive(item.to) ? 'text-primary-400' : 'text-gray-500 group-hover/item:text-gray-400'"
                  />
                  <div
                    v-if="isActive(item.to)"
                    class="absolute inset-0 -m-1 rounded-full bg-primary-500/10 blur-sm"
                  />
                </div>

                <span v-if="!collapsed" class="truncate">{{ item.label }}</span>

                <!-- Badge -->
                <span
                  v-if="!collapsed && item.badge"
                  class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none"
                  :class="{
                    'bg-primary-500/15 text-primary-400': !item.badgeColor || item.badgeColor === 'primary',
                    'bg-green-500/15 text-green-400': item.badgeColor === 'green',
                    'bg-amber-500/15 text-amber-400': item.badgeColor === 'amber',
                    'bg-red-500/15 text-red-400': item.badgeColor === 'red',
                  }"
                >
                  {{ item.badge }}
                </span>

                <!-- Tooltip when collapsed -->
                <div
                  v-if="collapsed"
                  class="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-surface-800 px-3 py-2 text-xs font-medium text-gray-200 opacity-0 shadow-xl shadow-black/30 ring-1 ring-white/[0.08] transition-all duration-200 translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0"
                >
                  {{ item.label }}
                  <div class="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-surface-800 ring-1 ring-white/[0.08] ring-offset-0" style="clip-path: polygon(0 0, 0 100%, 100% 100%)" />
                </div>
              </button>
            </div>
          </Transition>
        </div>
      </TransitionGroup>

      <!-- Empty search state -->
      <Transition name="fade">
        <div
          v-if="searchQuery && filteredNavigation.length === 0"
          class="flex flex-col items-center gap-2 px-4 py-8 text-center"
        >
          <Search :size="24" class="text-gray-600" />
          <p class="text-xs text-gray-500">
            No se encontraron resultados para<br />
            <span class="font-medium text-gray-400">"{{ searchQuery }}"</span>
          </p>
        </div>
      </Transition>
    </nav>

    <!-- ══════ Footer: collapse toggle ══════ -->
    <div class="border-t border-white/[0.05] p-2">
      <button
        class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-gray-500 transition-all duration-200 hover:bg-white/[0.04] hover:text-gray-300"
        :class="{ 'justify-center': collapsed }"
        :title="collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'"
        @click="toggleCollapse"
      >
        <div
          class="flex h-6 w-6 items-center justify-center rounded-md bg-surface-800 ring-1 ring-white/[0.06] transition-colors duration-200"
        >
          <ChevronLeft
            v-if="!collapsed"
            :size="14"
            class="transition-transform duration-300"
          />
          <ChevronRight
            v-else
            :size="14"
            class="transition-transform duration-300"
          />
        </div>
        <Transition name="slide-fade">
          <span v-if="!collapsed" class="font-medium">Colapsar</span>
        </Transition>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* ── Slide-fade transition ── */
.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-fade-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-6px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

/* ── Fade transition ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Indicator bar transition ── */
.indicator-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.indicator-leave-active {
  transition: all 0.15s ease-out;
}
.indicator-enter-from {
  opacity: 0;
  transform: translateY(-50%) scaleY(0);
}
.indicator-leave-to {
  opacity: 0;
  transform: translateY(-50%) scaleY(0);
}

/* ── Expand/collapse group animation ── */
.expand-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.expand-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* ── Nav group list transition ── */
.nav-group-enter-active {
  transition: all 0.3s ease;
}
.nav-group-leave-active {
  transition: all 0.2s ease;
}
.nav-group-enter-from,
.nav-group-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Scrollbar ── */
.sidebar-scroll::-webkit-scrollbar {
  width: 3px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 9999px;
  transition: background 0.2s;
}
.sidebar-scroll:hover::-webkit-scrollbar-thumb {
  background: rgb(55 65 81 / 0.4);
}

/* ── Focus ring ── */
.nav-item:focus-visible {
  @apply outline-none ring-2 ring-primary-500/40 ring-offset-1 ring-offset-surface-850;
}

/* ── Search input focus glow ── */
.search-input:focus {
  box-shadow: 0 0 0 1px rgba(30, 167, 253, 0.15), 0 2px 8px rgba(30, 167, 253, 0.06);
}

/* ── Subtle hover lift for nav items ── */
.nav-item:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}
</style>
