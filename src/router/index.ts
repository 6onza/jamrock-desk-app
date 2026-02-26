// ─── Application Router ───
// All routes for the JamRock Admin desktop app.
// Routes with `layout: 'admin'` meta are wrapped by AdminLayout.
// Routes with `layout: 'blank'` (or without layout) render standalone.

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupGuards } from './guards'

// ─── Standalone (no layout) ───
const standaloneRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false, layout: 'blank', title: 'Iniciar sesión' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: { requiresAuth: false, layout: 'blank', title: 'Configuración' },
  },
  {
    path: '/orders/:id/print',
    name: 'PrintOrder',
    component: () => import('@/pages/PrintOrderPage.vue'),
    meta: { requiresAuth: true, layout: 'blank', title: 'Imprimir remito' },
  },
]

// ─── Admin layout routes ───
const adminRoutes: RouteRecordRaw[] = [
  // Dashboard
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Dashboard',
      icon: 'LayoutDashboard',
      breadcrumb: [{ label: 'Dashboard' }],
    },
  },
  {
    path: '/dashboard/stats',
    name: 'Stats',
    component: () => import('@/pages/StatsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Estadísticas',
      icon: 'BarChart3',
      breadcrumb: [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Estadísticas' },
      ],
    },
  },

  // Catálogo
  {
    path: '/products',
    name: 'Products',
    component: () => import('@/pages/ProductListPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Productos',
      icon: 'Package',
      breadcrumb: [{ label: 'Productos' }],
    },
  },
  {
    path: '/products/new',
    name: 'ProductCreate',
    component: () => import('@/pages/ProductFormPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Nuevo producto',
      icon: 'PackagePlus',
      breadcrumb: [
        { label: 'Productos', to: '/products' },
        { label: 'Nuevo producto' },
      ],
    },
  },
  {
    path: '/products/:id/edit',
    name: 'ProductEdit',
    component: () => import('@/pages/ProductFormPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Editar producto',
      icon: 'PackagePlus',
      breadcrumb: [
        { label: 'Productos', to: '/products' },
        { label: 'Editar producto' },
      ],
    },
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('@/pages/CategoriesPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Categorías',
      icon: 'FolderTree',
      breadcrumb: [{ label: 'Categorías' }],
    },
  },

  // Ventas
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/pages/OrdersPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Pedidos',
      icon: 'ShoppingCart',
      breadcrumb: [{ label: 'Pedidos' }],
    },
  },
  {
    path: '/orders/new',
    name: 'NewSale',
    component: () => import('@/pages/NewSalePage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Nueva venta',
      icon: 'PlusCircle',
      breadcrumb: [
        { label: 'Pedidos', to: '/orders' },
        { label: 'Nueva venta' },
      ],
    },
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: () => import('@/pages/OrderDetailPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Detalle de pedido',
      icon: 'FileText',
      breadcrumb: [
        { label: 'Pedidos', to: '/orders' },
        { label: 'Detalle' },
      ],
    },
  },
  {
    path: '/abandoned-carts',
    name: 'AbandonedCarts',
    component: () => import('@/pages/AbandonedCartsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Carritos abandonados',
      icon: 'ShoppingBag',
      breadcrumb: [{ label: 'Carritos abandonados' }],
    },
  },

  // Clientes
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/pages/CustomersPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Clientes',
      icon: 'Users',
      breadcrumb: [{ label: 'Clientes' }],
    },
  },
  {
    path: '/customers/new',
    name: 'CustomerCreate',
    component: () => import('@/pages/CreateCustomerPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Nuevo cliente',
      icon: 'UserPlus',
      breadcrumb: [
        { label: 'Clientes', to: '/customers' },
        { label: 'Nuevo cliente' },
      ],
    },
  },
  {
    path: '/customers/:id',
    name: 'CustomerProfile',
    component: () => import('@/pages/CustomerProfilePage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Perfil de cliente',
      icon: 'User',
      breadcrumb: [
        { label: 'Clientes', to: '/customers' },
        { label: 'Perfil' },
      ],
    },
  },

  // Marketing
  {
    path: '/coupons',
    name: 'Coupons',
    component: () => import('@/pages/CouponsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Cupones',
      icon: 'Ticket',
      breadcrumb: [{ label: 'Cupones' }],
    },
  },
  {
    path: '/offers',
    name: 'Offers',
    component: () => import('@/pages/OffersPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Ofertas',
      icon: 'Tag',
      breadcrumb: [{ label: 'Ofertas' }],
    },
  },
  {
    path: '/bulk-promotions',
    name: 'BulkPromotions',
    component: () => import('@/pages/BulkPromotionsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Promociones bulk',
      icon: 'Layers',
      breadcrumb: [{ label: 'Promociones bulk' }],
    },
  },
  {
    path: '/scheduled-discounts',
    name: 'ScheduledDiscounts',
    component: () => import('@/pages/ScheduledDiscountsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Descuentos programados',
      icon: 'CalendarClock',
      breadcrumb: [{ label: 'Descuentos programados' }],
    },
  },

  // Sistema
  {
    path: '/activity',
    name: 'Activity',
    component: () => import('@/pages/ActivityPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Actividad',
      icon: 'Activity',
      breadcrumb: [{ label: 'Actividad' }],
    },
  },
  {
    path: '/store-settings',
    name: 'StoreSettings',
    component: () => import('@/pages/StoreSettingsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Configuración tienda',
      icon: 'Store',
      breadcrumb: [{ label: 'Configuración tienda' }],
    },
  },
  {
    path: '/reviews',
    name: 'Reviews',
    component: () => import('@/pages/ReviewsPage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Reseñas',
      icon: 'Star',
      breadcrumb: [{ label: 'Reseñas' }],
    },
  },
  {
    path: '/profile',
    name: 'AdminProfile',
    component: () => import('@/pages/AdminProfilePage.vue'),
    meta: {
      requiresAuth: true,
      layout: 'admin',
      title: 'Mi perfil',
      icon: 'UserCog',
      breadcrumb: [{ label: 'Mi perfil' }],
    },
  },
]

// ─── Assemble full route list ───
const routes: RouteRecordRaw[] = [
  ...standaloneRoutes,
  ...adminRoutes,
  // Root redirect
  { path: '/', redirect: '/dashboard' },
  // Catch-all
  { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Install navigation guards (auth check, redirect logic)
setupGuards(router)

export default router
