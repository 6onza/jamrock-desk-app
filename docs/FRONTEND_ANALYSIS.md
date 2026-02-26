# Frontend Vue 3 — Análisis Completo

> Documento de referencia para construir la app de escritorio Tauri.
> Generado a partir del análisis exhaustivo de todos los archivos del frontend Vue 3.
> **Exclusiones**: Blog (BlogCard, BlogNavigation, LatestBlogs, BlogCategories, BlogEditor, BlogManager, rutas /blog) y Carousel/Hero (HeroCarousel, CarouselManager, carousel endpoints).

---

## Tabla de Contenidos

1. [Mapa Completo de Páginas y Rutas](#1-mapa-completo-de-páginas-y-rutas)
2. [Inventario de Componentes](#2-inventario-de-componentes)
3. [Estado Global (Vuex + Pinia)](#3-estado-global-vuex--pinia)
4. [Catálogo de Servicios](#4-catálogo-de-servicios)
5. [Flujos de Usuario Completos](#5-flujos-de-usuario-completos)
6. [Patrones de UX](#6-patrones-de-ux)
7. [Sistema de Caché](#7-sistema-de-caché)
8. [Helpers, Composables y Utilidades](#8-helpers-composables-y-utilidades)
9. [Configuración y Bootstrap](#9-configuración-y-bootstrap)

---

## 1. Mapa Completo de Páginas y Rutas

### Router: `frontend/src/router/index.js`

El router usa `createWebHistory()` y tiene un `beforeEach` guard global.

#### Rutas Públicas

| Path | Name | Componente | Meta | Guard |
|------|------|-----------|------|-------|
| `/` | `Home` | `Home.vue` | — | — |
| `/producto/:id` | `ProductDetails` | `ProductDetails.vue` | — | — |
| `/productos` | `Products` | `ProductSearch.vue` | — | — |
| `/carrito/` | `ShoppingCart` | `ShoppingCart.vue` | — | — |
| `/iniciar-sesion` | `LoginForm` | `LoginForm.vue` | `{ redirectIfAuth: true }` | Redirige si autenticado |
| `/crear-cuenta` | `RegisterForm` | `RegisterForm.vue` | `{ redirectIfAuth: true }` | Redirige si autenticado |
| `/recuperar-contrasena` | `PasswordReset` | `PasswordResetPage.vue` | `{ redirectIfAuth: true }` | Redirige si autenticado |
| `/payment/result` | `PaymentResult` | `PaymentResult.vue` | `{ requiresAuth: true }` | Requiere auth |
| `/mantenimiento` | `Maintenance` | `MaintenancePage.vue` | `{ allowDuringMaintenance: true }` | Siempre permitido |
| `/:pathMatch(.*)*` | — | redirect a `/` | — | Catch-all 404 |

#### Rutas de Usuario Autenticado (bajo `/configuracion`)

Layout wrapper: `AdminPanel.vue`

| Path | Name | Componente | Meta |
|------|------|-----------|------|
| `/configuracion` | `UserDashboard` | `CustomerDashboard.vue` | `{ requiresAuth: true }` |
| `/configuracion/my-orders` | `CustomerOrders` | `CustomerOrders.vue` | `{ requiresAuth: true }` |
| `/configuracion/mi-cuenta` | `UserSettings` | `UserSettings.vue` | `{ requiresAuth: true }` |
| `/configuracion/pedidos/:id` | `order-details` | `OrderDetailsPage.vue` | `{ requiresAuth: true }` |

#### Rutas de Admin (bajo `/configuracion`, requieren `requiresAdmin: true`)

| Path | Name | Componente |
|------|------|-----------|
| `/configuracion/admin` | `AdminOverview` | `AdminOverview.vue` |
| `/configuracion/ventas` | `AdminSalesHistory` | `AdminSalesHistory.vue` |
| `/configuracion/ventas/nueva` | `admin-new-sale` | `AdminNewSale.vue` |
| `/configuracion/stats` | `AdminStats` | `AdminStats.vue` |
| `/configuracion/productos` | `AdminProductList` | `AdminProductList.vue` |
| `/configuracion/productos/agregar` | `AddProduct` | `ProductForm.vue` |
| `/configuracion/productos/editar/:productId` | `ProductEdit` | `ProductForm.vue` (props: true) |
| `/configuracion/actividad` | `AdminActivityPage` | `AdminActivity.vue` |
| `/configuracion/categorias` | `admin-categories` | `AdminCategories.vue` |
| `/configuracion/resenas` | `admin-reviews` | `AdminReviews.vue` |
| `/configuracion/clientes` | `admin-customers` / `customers` | `AdminCustomersList.vue` |
| `/configuracion/clientes/crear` | `create-customer` | `CreateCustomer.vue` |
| `/configuracion/clientes/:id` | `customer-profile` | `CustomerProfilePage.vue` |
| `/configuracion/coupons` | `AdminCoupons` | `AdminCoupons.vue` |
| `/configuracion/offers` | `AdminOffers` | `AdminOffers.vue` |
| `/configuracion/scheduled-discounts` | `AdminScheduledDiscounts` | `AdminScheduledDiscounts.vue` |
| `/configuracion/mi-tienda` | `StoreSettings` | `StoreSettings.vue` |
| `/configuracion/reviews` | `ReviewsManager` | `ReviewsManager.vue` |
| `/configuracion/ventas/:id/imprimir` | `PrintOrder` | `PrintOrderPage.vue` |

### Router Guard Global (`beforeEach`)

1. **Maintenance route** → siempre permitida
2. **Login/Register** → siempre permitido
3. **Si autenticado**: verificación admin con el servidor (`/api/auth/verify-admin/`)
   - Si es admin → acceso sin restricciones, fuerza `maintenance_mode=false`
4. **Verificación de mantenimiento**: si el sitio está en mantenimiento y el usuario NO es admin ni tiene bypass → redirige a `/mantenimiento`
5. **`requiresAuth`** → sin token, redirige a `/iniciar-sesion` con `redirect` query param
6. **`requiresAdmin`** → sin admin, redirige a `/configuracion/my-orders`

---

## 2. Inventario de Componentes

### 2.1 Componentes Reutilizables

#### `ProductCard.vue`
- **API**: `<script setup>` (Composition API)
- **Props**: `product` (Object, required) — full product shape
- **Events**: Ninguno
- **Slots**: Ninguno
- **Template**: Card con imagen (link a `/producto/:id`), badges de descuento/promoción, categoría tag, nombre, sección de precios (rango por variantes o single), CTA button
- **Computed**: `productPrice` (parsea `{parsedValue}` objetos), `productDiscount` (usa `total_discount` > `discount`), `finalPrice`, `priceRange` (min/max de variantes)
- **Dependencias**: `formatPrice` de `@/helpers/product`

#### `ProductList.vue`
- **API**: `<script setup>` (~2276 líneas)
- **Props**: `isProductsPage` (Boolean, default `true`)
- **Template**: Sidebar con búsqueda, checkbox "en oferta", grupos de categorías (accordion colapsable con subcategorías), chips de filtros activos → Grid de productos con `ProductCard`/`ProductSkeleton` → Paginación con sort dropdown
- **Refs**: `products`, `isLoading`, `initialLoad`, `currentPage`, `totalItems`, `pageSize`, `sortOrder`, `searchQuery`, `selectedCategories`, `showOnSaleOnly`, `categoryGroups`, `expandedGroups`
- **Métodos clave**: `loadProducts(page, preloadNext)`, `preloadPageProducts`, `handleSearch` (debounced 500ms), `updateRouteWithFilters`, `loadCategories`, `transformCategories`
- **Dependencias**: `getProducts`, `isProductOnSale`, `getProductsOnSale` de products; `getCategoriesHierarchical` de categories; `debounce` de utils
- **Patrón**: Paginación server-side + preload de siguiente página. URL query sincronizada bidireccionalmente. ScrollReveal en desktop.

#### `ProductReviews.vue`
- **Props**: `productId` ([Number, String], required)
- **Template**: Rating promedio, formulario de review (estrellas + textarea), lista de reviews aprobadas, modales de edit/delete (Bootstrap JS)
- **Métodos**: `loadReviews`, `checkUserReview`, `submitReview`, `editReview`, `deleteReview`
- **Dependencias**: `getProductReviews`, `createProductReview`, `hasUserReviewed`, `deleteProductReview` de products

#### `ProductsCarousel.vue`
- **Props**: `products` (Array, required), `isLoading` (Boolean), `itemsPerSlide` (Number, default 4)
- **Template**: Mobile: horizontal scroll con snap + dots. Desktop: Bootstrap carousel con slides agrupados + auto-rotate 6s.
- **Métodos**: `nextSlide`, `setActiveSlide`, `scrollToProduct`, `handleScroll`, `handleResize`

#### `ProductSkeleton.vue`
- Template-only: Placeholder card con pulse animation para skeleton loading

#### `NavbarComponent.vue`
- **API**: Options API con `setup()` (~2016 líneas)
- **Template**: Banner promo superior, navbar principal (logo, búsqueda desktop con autocomplete, cuenta usuario, carrito con badge, hamburger), offcanvas menú categorías desktop (accordion jerárquico), offcanvas menú mobile, overlay de búsqueda mobile
- **Setup returns**: `cartCount` (Vuex getter), `router`, `username`, `isAdmin`, `isAuthenticated`
- **Métodos clave**: `handleSearch`, `handleSearchInput` (debounced 250ms autocomplete), `loadCategories`, `updateNavbarHeightVariables` (CSS vars dinámicos)
- **Dependencias**: Vuex `useStore`, `getCategories`, `getSearchSuggestions`

#### `FooterComponent.vue`
- Template estático: Grid con logo, links útiles, info de contacto, social links. ScrollReveal animations.

#### `FilterGroup.vue`
- **Props**: `title` (String), `options` (Array), `modelValue` (Array)
- **Events**: `update:modelValue` (nuevo array de IDs seleccionados)
- **Patrón**: Componente `v-model` compatible (checkbox group)

#### `FaqSection.vue`
- Accordion custom con 6 FAQs hardcodeadas. CSS max-height transitions. ScrollReveal en desktop.

#### `Loader.vue` (LoaderAnimation)
- Full-screen fixed overlay con logo (pulse) + progress bar. Auto-hide después de 2s.

#### `AgeVerification.vue`
- **Events**: `verified` (sin payload)
- Gate component: bloquea acceso hasta confirmar 18+. Persiste en `localStorage.ageVerified`.

#### `UserOrdersList.vue`
- **Props**: `isLoading` (Boolean)
- Lista de pedidos del usuario con status badge, productos, cancel button. Bootstrap Modal para confirmaciones.

#### `PrintOrder.vue`
- **Props**: `order` (Object, required), `showPrintButton` (Boolean), `dollarRate` (Number)
- **Expone**: `print()` via `defineExpose`
- Layout de remito/factura A4 para impresión. Multi-currency (USD→ARS). `window.print()`.

#### `OrderDetailsModal.vue`
- **Props**: `orderId` ([String, Number], required)
- **Events**: `close`, `updated`
- Modal custom (no Bootstrap) con detalle de orden, avance de estado.

#### `MaintenancePage.vue`
- Página de mantenimiento para usuarios. Login admin button, bypass password flow.

#### `MaintenanceToggle.vue`
- Toggle switch admin para modo mantenimiento. Config de bypass password. Bootstrap modals.

#### `PasswordResetForm.vue`
- Wizard 3 pasos: email → código 6 dígitos + nueva password → success. Vuelidate validación.

### 2.2 Páginas Principales

#### `Home.vue` (~1061 líneas)
- Hero section (Vanta.js fog background), productos recientes (`ProductsCarousel`), productos en oferta (`ProductsCarousel`), FAQ section
- Carga paralela: on-sale primero, regulares con 500ms delay
- Mobile: ScrollReveal deshabilitado

#### `Products.vue` (~21 líneas)
- Wrapper delgado: `<ProductList :isProductsPage="true" />`

#### `ProductDetails.vue` (~1802 líneas)
- Imagen con zoom (mouse hover 2.5×), selección de variantes (select dropdowns), cálculo de precio con ajustes de variante + descuento, add to cart, productos relacionados (cache 5min), reviews section
- Variant price: soporta precio absoluto y ajuste relativo
- Cart item: `price` = precio final descontado, `original_price` = precio base

#### `ShoppingCart.vue` (~2277 líneas)
- Lista de items con TransitionGroup, formulario de checkout (nombre/DNI/email/phone), 4 opciones de envío/pago (radio buttons), mapa Leaflet (cobertura delivery 15km), input cupón con validación backend, conversión USD→ARS, validación compra mínima
- Debounced save de customer info al servidor (temp cart API, 3s)
- MercadoPago redirect para pagos online

#### `LoginForm.vue` (~283 líneas)
- Login con username/email + password, Vuelidate, detección de email no verificado (muestra input de código inline)
- Post-login: guarda tokens + `isAdmin` + dispatch storage event para reactividad Navbar

#### `RegisterForm.vue` (~619 líneas)
- Multi-step: formulario → verificación email (6 dígitos) → auto-login
- Manejo extensivo de "email already registered"

#### `PasswordResetPage.vue` (~53 líneas)
- Wrapper: delega a `PasswordResetForm` component

#### `PaymentResult.vue` (~113 líneas)
- Callback de MercadoPago. Lee `route.query.payment_id`, muestra estado: approved/pending/error

#### `ProductSearch.vue` (~14 líneas)
- Wrapper: extrae `?search=` de URL, pasa a `<ProductList :initialSearchTerm>`

#### `NotFound.vue` (~102 líneas)
- 404 page con CSS glitch animation. Sin JavaScript.

### 2.3 Páginas Admin

#### `AdminPanel.vue` (~1276 líneas)
- **Layout wrapper** con sidebar colapsable (secciones: Ventas, Clientes, Productos, Marketing, Perfil), hamburger mobile, `<router-view>` con fade transition
- Sidebar: accordion single-open, admin-gated routes redirigen non-admins
- 60s interval refresh de pending review badge count
- Verifica admin status con servidor en cada navegación

#### `AdminOverview.vue` (~1448 líneas)
- Dashboard: period selector (day/week/month/year/custom), 6 stat cards (visitors, registered users, sales count, billing, avg ticket, abandoned carts), 4 tablas de pedidos por estado (pending/paid/payment_pending/cancelled, capped at 5)
- USD→ARS conversion con dollar rate
- Skeleton loading

#### `AdminProductList.vue` (~1877 líneas)
- Búsqueda, 4 filtros select (categoría/precio/stock/disponibilidad), tabla de productos (imagen, nombre, marca, categoría, badge, precio, stock, acciones dropdown), quick-edit modal para precio/stock, delete modal, paginación
- Todos los filtros server-side. `<Teleport>` para dropdown mobile.

#### `AdminSalesHistory.vue` (~1922 líneas)
- Print order ref, date range modal, shipping notification modal, barra de filtros (search, status buttons con counts, date dropdown con presets + custom), tabla expandible con inline editing de cantidades, paginación
- Usa composable `useSales()`

#### `AdminNewSale.vue` (~1035 líneas)
- POS split-panel: izq = catálogo con búsqueda + add buttons, der = resumen de orden (line items, customer form: email/name/phone/delivery/address, submit)
- Multi-currency (USD→ARS)

#### `AdminStats.vue` (~945 líneas)
- Period selector, 6 stat cards, gráfico revenue (Chart.js bar+line), gráfico customers (doughnut)
- Chart.js dark theme con gradient fills

#### `AdminCategories.vue` (~815 líneas)
- Tabla jerárquica parent→children, 3 modales (crear/editar categoría, crear/editar subcategoría, confirmar delete)
- API calls directas via `apiClient`

#### `AdminCustomersList.vue` (~1580 líneas)
- Search, tabla responsive (desktop) + cards (mobile), paginación, 5 modales (contacto, detalles+historial, bloquear, desbloquear, eliminar)
- Usa composable `useCustomers()` + `useWindowSize()`

#### `AdminCoupons.vue` (~543 líneas)
- Tabla de cupones (código, tipo, valor, min purchase, usos/max, vencimiento, activo), modal crear/editar, modal de tracking de uso
- Campos: code, type (percentage/fixed), value, categories[], max_uses, expires_at, active, max_amount, min_purchase

#### `AdminOffers.vue` (~932 líneas)
- Form con 2 tabs de selección de productos (individual search OR categoría batch), lista de productos seleccionados, tabla de ofertas activas
- Campos: name, discount%, start_date, end_date, products[]

#### `AdminScheduledDiscounts.vue` (~622 líneas)
- Form (name, day_of_week, category, discount%, time range, validity dates, active), preview de cronjob, tabla con apply-now/remove-now
- Días: 0=Lunes a 6=Domingo

#### `AdminReviews.vue` (~500 líneas)
- Search, grid de review cards (pendientes), approve/reject/delete buttons
- Set-based per-review processing state

#### `AdminActivity.vue` (~1147 líneas)
- **Options API** (único componente). 4 stat cards, filtros (search, action type, date), timeline con iconos coloreados por tipo de acción, detalles expandibles de cambios (diff estructurado), "load more"
- Auto-refresh: 30s actividades, 5m stats. date-fns con locale español.

#### `AbandonedCarts.vue` (~715 líneas)
- 3 action buttons (system update, identify carts, migrate data), 4 stat cards, tabla de carritos (cliente, items, valor, última actividad, status, acciones), email reminder modal

#### `StoreSettings.vue` (~584 líneas)
- `MaintenanceToggle` component, email/phone de tienda, config dollar rate (3 modos: blue/official/manual), compra mínima, distribution centers CRUD
- Save atómico multi-sección

#### `ReviewsManager.vue` (~596 líneas)
- Gestión completa de reviews (no solo pending). Filtros (search, status, sort), tabla, modales Bootstrap de detalle/delete.

#### `CreateCustomer.vue` (~250 líneas)
- Form con Vuelidate: username, email, DNI, password. Progress bar dinámico.

#### `CustomerProfilePage.vue` (~120 líneas)
- Wrapper: fetch customer → delega a `CustomerProfile` component

#### `OrderDetailsPage.vue` (~1731 líneas)
- Vista primaria/moderna de detalle de orden. `PrintOrder` ref, timeline de progreso con barra animada, acciones por estado (mark paid, refund, cancel, ship), info de cliente/envío, MercadoPago info, items con badges de variante/promo, coupon details
- USD→ARS conversion

#### `PrintOrderPage.vue` (~50 líneas)
- Wrapper: fetch order + dollar rate → `<PrintOrder :order :dollar-rate :showPrintButton="true" />`

#### `ProductForm.vue` (~1228 líneas)
- Dual mode (create/edit via route param). Campos: name, brand, description (rich text editor `contenteditable` con toolbar), categoría (con inline create/delete), volume, dimensions, stock, price, currency (ARS/USD), discount%, special promotion toggle, variants system (categorías→opciones con name/price/stock), 2 image uploads (Cloudinary + paste support)
- Preview de precio calculado con USD conversion

#### `AdminMessagesList.vue` (~300 líneas)
- **Placeholder/mock** — datos hardcodeados, sin conexión a backend. TODOs pendientes.

### 2.4 Páginas de Usuario

#### `CustomerDashboard.vue`
- Welcome + 3 stat cards (total orders, last order date, account status) + tabla últimas 5 órdenes

#### `CustomerOrders.vue`
- "Mis Pedidos" completo con refresh, cards de orden expandidas, USD→ARS conversion, empty state

#### `CustomerProfile.vue`
- **Admin-facing**: Avatar (iniciales), stats (total orders, total spent, last purchase), tabs (Details/Orders), contact modal, block/unblock
- **Props**: `customerData` (Object)
- **Events**: `block`, `unblock`, `update:customerData`

#### `UserSettings.vue`
- Account settings: Personal Data form (con 2-step email change verification), Change Password form
- Admin-only section: dollar rate, distribution centers, site config

---

## 3. Estado Global (Vuex + Pinia)

### 3.1 Vuex Store (`store/index.js`)

#### Módulos registrados:
- `products` (namespaced)

#### State principal

```javascript
{
  cart: [],              // Array de CartItem, inicializado desde cookie 'cart'
  auth: {
    token: null,         // string | null — de localStorage.accessToken
    username: '',        // string — de localStorage.username
    isAdmin: false,      // boolean — de localStorage.isAdmin
    userId: null,        // string | null — de localStorage.userId
    userEmail: ''        // string — de localStorage.userEmail
  },
  syncInProgress: false, // boolean — mutex de sync
  lastSyncTime: null,    // number | null — timestamp última sync
  syncEnabled: true      // boolean — habilita/deshabilita auto-sync
}
```

**CartItem shape:**
```javascript
{
  id: number,
  blister_id: string | null,
  name: string,
  price: number,              // precio final (con descuento)
  original_price: number,     // precio original sin descuento
  brand: string,
  image: string,
  category_id: number,
  quantity: number,
  currency: 'ARS' | 'USD',
  discount: number,
  total_discount: number,
  variants: Object,
  has_special_promotion: boolean,
  special_promotion_name: string | null,
  lineId: string              // formato: "productId::blisterId::variantSignature"
}
```

#### Getters

| Getter | Retorna |
|--------|---------|
| `cartCount` | Suma de `quantity` de todos los items |
| `cartTotal` | Suma de `price * quantity` |
| `cartItems` | Array de items del carrito |
| `isCartOpen` | `state.isCartOpen` |
| `isSyncing` | `state.syncInProgress` |
| `lastSyncTime` | `state.lastSyncTime` |
| `isAuthenticated` | `!!state.auth.token` |
| `currentUsername` | `state.auth.username` |
| `isAdmin` | `state.auth.isAdmin` |
| `userId` | `state.auth.userId` |
| `userEmail` | `state.auth.userEmail` |

#### Mutations

| Mutation | Payload | Efecto |
|----------|---------|--------|
| `ADD_TO_CART` | `item: CartItem` | Agrega o incrementa quantity por `lineId`. Guarda en cookie. |
| `REMOVE_FROM_CART` | `lineId: string` | Remueve item por lineId. Actualiza cookie. |
| `UPDATE_QUANTITY` | `{ lineId, quantity }` | Actualiza cantidad (min 1). Si quantity=0, remueve. Actualiza cookie. |
| `CLEAR_CART` | — | Vacía carrito, remueve cookie y `cart_anonymous_id`. |
| `SET_SYNC_STATUS` | `status: boolean` | Setea `syncInProgress`. |
| `SET_LAST_SYNC_TIME` | — | Setea `lastSyncTime = Date.now()`. |
| `SET_SYNC_ENABLED` | `enabled: boolean` | Habilita/deshabilita sync. |
| `SET_CART_FROM_SERVER` | `serverCart: Array` | Reemplaza carrito local con server cart. |
| `SET_AUTH_USER` | `{ token, username, isAdmin, userId, userEmail }` | Setea auth state + localStorage. |
| `CLEAR_AUTH` | — | Limpia auth state + localStorage. |

#### Actions

| Action | Firma | Comportamiento |
|--------|-------|----------------|
| `addToCart` | `(product)` | Commit `ADD_TO_CART` + sync si habilitado |
| `removeFromCart` | `(lineId)` | Commit `REMOVE_FROM_CART` + sync si habilitado |
| `updateQuantity` | `(payload)` | Commit `UPDATE_QUANTITY` + sync si habilitado |
| `clearCart` | `()` | Commit `CLEAR_CART` + sync si habilitado |
| `syncCartWithServer` | `()` | Mutex guard → `syncCartWithServer()` service → set last sync time |
| `fetchCartFromServer` | `()` | `fetchCartFromServer()` → `convertServerCartToLocal()` → commit `SET_CART_FROM_SERVER` |
| `mergeLocalAndServerCarts` | `()` | Intenta cargar del servidor. Si no hay server cart pero sí local → sync al servidor. |
| `setAuthUser` | `(userData)` | Commit `SET_AUTH_USER` |
| `logout` | `()` | Commit `CLEAR_AUTH` |

### 3.2 Vuex `products` Module (`store/products.js`)

Namespaced: `products/`

#### State

```javascript
{
  products: [],
  onSaleProducts: [],
  loading: false,
  loadingOnSale: false,
  error: null,
  currentProduct: null
}
```

#### Mutations

| Mutation | Payload |
|----------|---------|
| `SET_PRODUCTS` | products array |
| `SET_ON_SALE_PRODUCTS` | products array |
| `SET_LOADING` | boolean |
| `SET_LOADING_ON_SALE` | boolean |
| `SET_ERROR` | error string/object |
| `SET_CURRENT_PRODUCT` | product object |
| `ADD_PRODUCT` | product object |
| `UPDATE_PRODUCT` | product object |
| `DELETE_PRODUCT` | productId |

#### Actions

| Action | Endpoint | Detalle |
|--------|----------|---------|
| `fetchProducts` | `GET /products/?page_size=24` | Intenta sin auth primero, fallback con auth |
| `fetchProductsOnSale` | `GET /products/on-sale-fast/` | Cache 2min en localStorage. Timeout 5s. Fallback a cache expirado. |
| `preloadProductsOnSale` | `GET /products/on-sale-fast/` | Silencioso, timeout 3s, solo si cache > 1min |
| `createProduct` | `POST /products/` | Con Bearer token |
| `fetchProductById` | `GET /products/{id}/` | Con Bearer token |
| `updateProduct` | `PUT /products/{id}/` | Con Bearer token |
| `deleteProduct` | `DELETE /products/{id}/` | Con Bearer token |
| `clearOnSaleCache` | — | Limpia localStorage keys |

#### Getters

| Getter | Retorna |
|--------|---------|
| `onSaleProducts` | `state.onSaleProducts || []` |
| `regularProducts` | `state.products.results?.slice(0, 12) || []` |

### 3.3 Pinia Store: `useSalesStore` (`store/sales.js`)

```javascript
defineStore('sales', () => {
  // State
  const sales = ref([])
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({ search: '', status: '', dateRange: null })

  // Getters
  const filteredSales = computed(() => /* filtra por search + status */)
  const statistics = computed(() => ({
    pending, processing, ready, shipping, delivered, completed, cancelled
  }))

  // Actions
  async function fetchSales() // GET /orders/
  async function updateSaleStatus(saleId, newStatus) // PATCH /orders/{id}/
  async function editSale(saleId, saleData) // PATCH /orders/{id}/
})
```

---

## 4. Catálogo de Servicios

### 4.1 `apiClient.js` — API Client Base

**Base URL**: `http://192.168.56.1:8000/api` (configurable via `VUE_APP_API_URL`)

**Timeouts**:
| Tipo | Valor |
|------|-------|
| Default | 30s |
| Product (individual) | 15s |
| Products list | 25s |
| Auth | 10s |
| Orders | 20s |
| Upload | 60s |

**Interceptor Request 1 — Token Auto-Refresh**:
- Excluye: `/auth/login`, `/auth/register`, `/auth/token/refresh`
- Si token expira en < 5 minutos → `refreshAccessToken()` con shared promise mutex
- `isTokenExpiringSoon(token, bufferMinutes=5)` — decodifica JWT payload.exp

**Interceptor Request 2 — Admin Route Protection**:
- Para rutas admin (`/admin/`, `/site-config/`, `/activity-logs/`, etc.): verifica `authState.isAdmin` via servidor
- Si no es admin → rechaza con 403

**Interceptor Response — Error Handling**:
- `ECONNABORTED` → timeout amigable con endpoint info
- `Network Error` → mensaje de conexión
- `401` → intenta refresh + retry original request → si falla → `clearAuthState()` + redirect a Login
- `403` → limpia isAdmin, redirige si está en ruta admin

**Exports**:
- `default`: instancia axios configurada
- `checkAdminStatus()` → `GET /api/auth/verify-admin/` → actualiza localStorage
- `checkApiConnection()` → `GET /api/ping/` → retorna `{ connected, latency, status, message }`
- `clearAuthState()` → limpia todos los tokens y estados de localStorage
- `refreshAccessToken()` — refresh con mutex
- `isTokenExpiringSoon(token, minutes)` — decodifica JWT

### 4.2 `auth.js` — Autenticación

| Función | Endpoint | Params | Retorna |
|---------|----------|--------|---------|
| `login(username, password)` | `POST /auth/login/` | `{ username, password, anonymous_cart_id? }` | `{ access, refresh, is_staff, is_admin, cart_linked?, cart_id? }` |
| `register(userData)` | `POST /auth/register/` | `{ first_name, last_name, username, email, password, anonymous_cart_id? }` | `{ message, email, user_id, resend }` |
| `logout()` | — (local) | — | Limpia localStorage: accessToken, refreshToken, isAdmin, username, etc. |
| `isAuthenticated()` | — (local) | — | `boolean` |
| `isAdmin(forceCheck?)` | `GET /auth/verify-admin/` (via checkAdminStatus) | — | `boolean` |
| `getUsername()` | — (local) | — | `string` |
| `getAccessToken()` | — (local) | — | `string` |
| `getUserInfo()` | `GET /auth/profile/` | Bearer token | User object |
| `updateUserProfile(userData)` | `PUT /auth/profile/` | User data | Updated user |
| `changePassword({old_password, new_password})` | `POST /auth/change-password/` | `{ old_password, new_password }` | `{ access? }` |
| `verifyEmail({ email, code })` | `POST /auth/verify-email/` | `{ email, code, anonymous_cart_id? }` | Response data |
| `resendVerification(email)` | `POST /auth/resend-verification/` | `{ email }` | Response data |
| `requestVerificationCode(type, newEmail?, password?)` | `POST /auth/verify-change/` | `{ type, new_email, password }` | Response data |
| `updateEmailWithVerification(email, code)` | `PUT /auth/profile/` | `{ email, verification_code }` | Response data |
| `getLoggedInUser()` | `GET /auth/me/` | Bearer token | User object |
| `forceAdminVerification()` | `GET /api/auth/verify-admin/` (fetch directo) | — | `{ isAdmin, verified, serverResponse? }` |

### 4.3 `products.js` — Productos

| Función | Endpoint | Params |
|---------|----------|--------|
| `getProducts(params, forceRefresh?)` | `GET /products/` o `GET /products/by-category/` | `{ page, page_size, search, category_name, is_available, stock_filter, price_filter, on_sale }` |
| `getProduct(id, forceRefresh?)` | `GET /products/{id}/` | — |
| `updateProduct(productId, productData)` | `PATCH /products/{id}/` | Partial product data |
| `createProduct(productData)` | `POST /products/` | Full product data |
| `deleteProduct(productId)` | `DELETE /products/{id}/` | — |
| `getCategories()` | `GET /products/categories/` | — |
| `createCategory(categoryData)` | `POST /categories/` | `{ name, parent? }` |
| `deleteCategory(categoryId)` | `DELETE /categories/{id}/` | — |
| `getProductsOnSale()` | `GET /products/on-sale/` | — |
| `getRelatedProducts(productId)` | `GET /products/{id}/related/` | — |
| `getSearchSuggestions(query)` | `GET /products/?search={q}&page_size=6` | — |
| `uploadImage(file)` | `POST https://api.cloudinary.com/v1_1/dwugxlsez/image/upload` | FormData (preset: 'productos') |
| `isProductOnSale(product)` | — (local) | Checks discount, final_price, total_discount, has_special_promotion |
| `getProductReviews(productId)` | `GET /reviews/for_product/?product_id={id}` | — |
| `createProductReview(reviewData)` | `POST /reviews/` | `{ product, rating, comment }` |
| `hasUserReviewed(productId)` | `GET /reviews/has_reviewed/?product_id={id}` | — |
| `getUserReviews()` | `GET /reviews/my_reviews/` | — |
| `getPendingReviews()` | `GET /reviews/pending/` | — |
| `approveReview(reviewId)` | `PATCH /reviews/{id}/approve/` | — |
| `rejectReview(reviewId)` | `PATCH /reviews/{id}/reject/` | — |
| `deleteReview(reviewId)` | `DELETE /reviews/{id}/` | — |
| `getAllReviews()` | `GET /reviews/` | — |

### 4.4 `orders.js` — Pedidos

| Función | Endpoint | Params |
|---------|----------|--------|
| `getUserOrders()` | `GET /orders/my-orders/` | Bearer token, include_items |
| `getOrders(ignoreCache?, includeTemp?, startDate?, endDate?)` | `GET /orders/` | `{ include_items, exclude_temporary, start_date?, end_date? }` |
| `createOrder(orderData)` | `POST /orders/` | Full order data + anonymous_id? |
| `getOrderDetails(orderId)` | `GET /orders/{id}/` | — |
| `getOrder(id)` | `GET /orders/{id}/` | — |
| `updateOrder(orderId, orderData)` | `PUT /orders/{id}/` | Full order data |
| `updateOrderStatus(orderId, status)` | `PATCH /orders/{id}/update_status/` | `{ status }` |
| `deleteOrder(id)` | `DELETE /orders/{id}/` | — |
| `getCustomerOrders()` | `GET /orders/my-orders/` | — |
| `cancelOrder(orderId)` | `POST /orders/{id}/cancel/` | — |
| `updateOrderItems(orderId, items)` | `PATCH /orders/{id}/items/` | `{ items }` |
| `notifyShipping(orderId)` | `POST /orders/{id}/notify_shipping/` | — |
| `runSystemUpdate(options)` | `POST /orders/run_system_update/` | `{ skipDollar?, skipCarts?, minutes?, dryRun? }` |

### 4.5 `payment.js` — Pagos

| Función | Endpoint |
|---------|----------|
| `createPayment(orderId)` | `POST /payments/create/` |
| `getPaymentStatus(orderId)` | `GET /payments/status/{orderId}/` |
| `updateDollarRateFromAPI(rateType?)` | `GET /payments/update-dollar-rate/?rate_type={type}` |
| `getCurrentDollarRate()` | `GET /payments/dollar-rates/?is_active=true` |
| `createDollarRate(data)` | `POST /payments/dollar-rates/` |
| `updateDollarRate(id, data)` | `PATCH /payments/dollar-rates/{id}/` |
| `getDistributionCenters()` | `GET /payments/distribution-centers/` |
| `createDistributionCenter(data)` | `POST /payments/distribution-centers/` |
| `updateDistributionCenter(id, data)` | `PATCH /payments/distribution-centers/{id}/` |
| `deleteDistributionCenter(id)` | `DELETE /payments/distribution-centers/{id}/` |
| `refundPayment(orderId)` | `POST /payments/refund/` |

### 4.6 `payments.js`

| Función | Endpoint |
|---------|----------|
| `checkPaymentStatus(orderId)` | `POST /payments/check-status/` |

### 4.7 `categories.js`

| Función | Endpoint |
|---------|----------|
| `getCategories()` | `GET /categories/` |
| `getCategoriesHierarchical()` | `GET /categories/hierarchical/` |

### 4.8 `coupons.js`

| Función | Endpoint | Params |
|---------|----------|--------|
| `getCoupons(params?)` | `GET /marketing/coupons/` | query params |
| `getCoupon(id)` | `GET /marketing/coupons/{id}/` | — |
| `getCouponUsages(id)` | `GET /marketing/coupons/{id}/usages/` | — |
| `createCoupon(data)` | `POST /marketing/coupons/` | Coupon data |
| `updateCoupon(id, data)` | `PUT /marketing/coupons/{id}/` | Coupon data |
| `deleteCoupon(id)` | `DELETE /marketing/coupons/{id}/` | — |
| `validateCoupon(data)` | `POST /marketing/coupons/validate/` | `{ code, purchase_amount? }` |
| `applyCoupon(id, data?)` | `POST /marketing/coupons/{id}/apply/` | — |
| `validateCouponWithProducts(code, products, amount)` | `POST /marketing/coupons/validate/` | `{ code, purchase_amount, products }` |

### 4.9 `offers.js`

| Función | Endpoint |
|---------|----------|
| `getOffers(params?)` | `GET /marketing/offers/` |
| `getOffer(id)` | `GET /marketing/offers/{id}/` |
| `createOffer(data)` | `POST /marketing/offers/` |
| `updateOffer(id, data)` | `PUT /marketing/offers/{id}/` |
| `deleteOffer(id)` | `DELETE /marketing/offers/{id}/` |

### 4.10 `bulkPromotions.js`

| Función | Endpoint |
|---------|----------|
| `getBulkPromotions(params?)` | `GET /marketing/bulk-promotions/` |
| `getBulkPromotion(id)` | `GET /marketing/bulk-promotions/{id}/` |
| `getActiveBulkPromotions()` | `GET /marketing/bulk-promotions/?active=true` |
| `createBulkPromotion(data)` | `POST /marketing/bulk-promotions/` |
| `updateBulkPromotion(id, data)` | `PUT /marketing/bulk-promotions/{id}/` |
| `deleteBulkPromotion(id)` | `DELETE /marketing/bulk-promotions/{id}/` |

### 4.11 `promotions.js`

| Función | Endpoint | Nota |
|---------|----------|------|
| `getActivePromotions()` | `GET /marketing/bulk-promotions/active/` | |
| `getPromotions(params?)` | `GET /marketing/bulk-promotions/` | |
| `getPromotion(id)` | `GET /marketing/bulk-promotions/{id}/` | |
| `checkProductPromotions(productId, quantity?)` | `POST /marketing/bulk-promotions/check_product/` | |
| `calculateCartPromotions(cartItems)` | — (local) | Calcula descuentos bulk client-side |
| `getPromotionBadge(promotionType)` | — (local) | Retorna `{ text, color, icon }` para badge UI |
| `createPromotion(data)` | `POST /marketing/bulk-promotions/` | |
| `updatePromotion(id, data)` | `PUT /marketing/bulk-promotions/{id}/` | |
| `deletePromotion(id)` | `DELETE /marketing/bulk-promotions/{id}/` | |

### 4.12 `scheduledDiscounts.js`

| Función | Endpoint |
|---------|----------|
| `getScheduledDiscounts(params?)` | `GET /marketing/scheduled-discounts/` |
| `getScheduledDiscount(id)` | `GET /marketing/scheduled-discounts/{id}/` |
| `createScheduledDiscount(data)` | `POST /marketing/scheduled-discounts/` |
| `updateScheduledDiscount(id, data)` | `PUT /marketing/scheduled-discounts/{id}/` |
| `deleteScheduledDiscount(id)` | `DELETE /marketing/scheduled-discounts/{id}/` |
| `getTodayDiscounts()` | `GET /marketing/scheduled-discounts/today/` |
| `getDiscountsByDay()` | `GET /marketing/scheduled-discounts/by_day/` |
| `applyDiscountNow(id)` | `POST /marketing/scheduled-discounts/{id}/apply_now/` |
| `removeDiscountNow(id)` | `POST /marketing/scheduled-discounts/{id}/remove_now/` |
| `previewApply()` | `POST /marketing/scheduled-discounts/preview_apply/` |

**Constante exportada**: `DAYS_OF_WEEK = [{ value: 0, label: 'Lunes' }, ..., { value: 6, label: 'Domingo' }]`

### 4.13 `tempCart.js` — Carrito Temporal

| Función | Endpoint |
|---------|----------|
| `syncCartWithServer(cartItems)` | `POST /orders/public/temp-cart/` (solo anónimos) |
| `fetchCartFromServer()` | `GET /orders/public/temp-cart/{anonymousId}/` |
| `fetchCustomerInfoFromTempCart()` | `GET /orders/public/temp-cart/{anonymousId}/` → `.customer_info` |
| `convertServerCartToLocal(serverCart)` | — (local) | Mapea server format → local CartItem |

### 4.14 `abandonedCarts.js` — Carritos Abandonados

| Función | Endpoint |
|---------|----------|
| `syncCartWithServer(cartItems)` | `POST /orders/abandoned-carts/public/cart/` (anónimos) |
| `fetchCartFromServer()` | `GET /orders/abandoned-carts/public/cart/{id}/` |
| `fetchCustomerInfoFromCart()` | `GET /orders/abandoned-carts/public/cart/{id}/` → `.customer` |
| `convertServerCartToLocal(serverCart)` | — (local) |
| `getAbandonedStatistics(period?, startDate?, endDate?)` | `GET /orders/abandoned-carts/statistics/` |
| `getAbandonedCarts(status?, days?)` | `GET /orders/abandoned-carts/` |
| `identifyAbandonedCarts()` | `POST /orders/abandoned-carts/identify/` |
| `recoverAbandonedCart(cartId)` | `POST /orders/abandoned-carts/{id}/recover/` |
| `convertToOrder(cartId)` | `POST /orders/abandoned-carts/{id}/convert_to_order/` |
| `migrateFromOrders()` | `POST /orders/abandoned-carts/migrate_from_orders/` |

### 4.15 `customers.js`

| Función | Endpoint |
|---------|----------|
| `getCustomers(params?)` | `GET /auth/customers/` |
| `getCustomerDetails(customerId)` | `GET /auth/customers/{id}/` |
| `createCustomer(data)` | `POST /auth/customers/` |
| `blockCustomer(id, adminNotes?)` | `POST /auth/customers/{id}/block/` |
| `unblockCustomer(id, adminNotes?)` | `POST /auth/customers/{id}/unblock/` |
| `deleteCustomer(id)` | `DELETE /auth/customers/{id}/` |
| `getCustomerOrders(id)` | `GET /auth/customers/{id}/orders/` |

### 4.16 `activity.js`

| Función | Endpoint | Cache |
|---------|----------|-------|
| `getActivityLogs(filters?, ignoreCache?)` | `GET /activity-logs/?{filters}` | 30s en localStorage |
| `getActivityStats(ignoreCache?)` | `GET /activity-logs/stats/` | 5min en localStorage |
| `clearActivityCache()` | — (local) | Limpia todas las keys `activities_*` y `activity_stats` |

### 4.17 `siteConfig.js`

| Función | Endpoint |
|---------|----------|
| `getSiteConfig()` | `GET /config/` |
| `getSiteConfigFromViewSet()` | `GET /site-config/` |
| `updateSiteConfig(data)` | `GET /site-config/` → `PATCH /site-config/{id}/` o `POST /site-config/` |

### 4.18 `statisticsService.js`

| Función | Endpoint | Params |
|---------|----------|--------|
| `getStatistics(period?, startDate?, endDate?)` | `GET /statistics/analytics/` | `{ period, start_date, end_date }` |
| `getCustomerStats()` | `GET /statistics/customers/` | — |
| `getVisitorStats(period?, startDate?, endDate?)` | `GET /visitors/stats/` | `{ period, start_date, end_date }` |
| `getUserStats(period?, startDate?, endDate?)` | `GET /statistics/users/` | `{ period, start_date, end_date }` |

### 4.19 `maintenanceService.js`

| Función | Descripción |
|---------|-------------|
| `isInMaintenance(forceCheck?)` | Verifica estado con cache (100s TTL). Admins siempre retorna false. |
| `getMaintenanceStatus()` | `GET /maintenance/status/` |
| `hasValidatedBypass()` | Verifica bypass password en localStorage |
| `resetMaintenanceCache(value?)` | Resetea cache de mantenimiento |

### 4.20 `maintenanceAdmin.js`

| Función | Endpoint |
|---------|----------|
| `toggleMaintenanceMode(enabled, message?, bypassPassword?)` | `POST /maintenance/toggle/` |
| `getMaintenanceStatus()` | `GET /maintenance/status/` |

### 4.21 `adminService.js`

| Función | Endpoint |
|---------|----------|
| `verifyAdminStatus()` | `GET /auth/verify-admin/` |
| `isAdminFromLocalStorage()` | — (local) |

### 4.22 `uploads.js`

| Función | Endpoint |
|---------|----------|
| `uploadFile(file)` | `POST /uploads/` (multipart) |
| _Carousel functions_ | _EXCLUIDAS — no relevantes_ |

### 4.23 `passwordReset.js`

| Función | Endpoint |
|---------|----------|
| `requestPasswordReset(email)` | `POST /auth/request-password-reset/` |
| `verifyPasswordReset({ email, code, new_password })` | `POST /auth/verify-password-reset/` |

### 4.24 `sales.js`

| Función | Endpoint |
|---------|----------|
| `getSaleById(id)` | `GET /orders/{id}/` |
| `updateOrderItems(orderId, items)` | `PUT /orders/{id}/items/` |

### 4.25 `marketing.js`

| Función | Endpoint |
|---------|----------|
| `getCategories()` | `GET /categories/` |

### 4.26 `authStore.js`

Vue 2-style singleton (usando `new Vue()`). Estado reactivo: `isLoggedIn`, `isAdmin`, `username`. Escucha eventos `storage` para cross-tab sync. **Nota**: Podría estar deprecado — el Vuex store ya maneja auth state.

---

## 5. Flujos de Usuario Completos

### 5.1 Login → Verificación Email → Dashboard

```
1. Usuario navega a /iniciar-sesion (LoginForm.vue)
2. Ingresa username + password
3. POST /auth/login/ { username, password, anonymous_cart_id? }
4a. Si éxito:
    - Guarda accessToken + refreshToken en localStorage
    - Determina isAdmin (is_staff || is_admin)
    - Guarda isAdmin + username en localStorage
    - Dispatch window.storage event (para Navbar reactivity)
    - Si admin → redirige a /configuracion/admin
    - Si no → redirige a /configuracion (UserDashboard)
4b. Si error "email not verified":
    - Muestra input de código de verificación inline
    - POST /auth/verify-email/ { email, code }
    - Si éxito → auto-login con los tokens recibidos
4c. Si error genérico → muestra mensaje de error
```

### 5.2 Registro → Verificación → Auto-Login

```
1. Usuario navega a /crear-cuenta (RegisterForm.vue)
2. Completa formulario (first_name, last_name, username, email, password, password2)
3. Validación Vuelidate (required, minLength, sameAs, email)
4. POST /auth/register/ { ...formData, anonymous_cart_id? }
5. Si éxito → transición a paso de verificación
6. Ingresa código de 6 dígitos
7. POST /auth/verify-email/ { email, code }
8. Si éxito:
    - Auto-login: POST /auth/login/ con credenciales
    - Vuex dispatch 'setAuthUser'
    - Redirige a /configuracion
9. Puede reenviar código via POST /auth/resend-verification/
```

### 5.3 Buscar Productos → Filtrar → Ver Detalle → Seleccionar Variante → Agregar al Carrito

```
1. Usuario busca en Navbar (SearchInput → debounce 250ms → GET /products/?search=X&page_size=6)
   - Autocomplete suggestions dropdown
   - Enter → navega a /productos?search=X
2. ProductList recibe initialSearchTerm, carga productos server-side
   - Filtros: categoría (accordion jerárquico), "En oferta" checkbox, sort order
   - URL query sync bidireccional (?page, ?categories, ?search, ?sale)
   - Paginación server-side + preload de siguiente página
3. Click en ProductCard → navega a /producto/:id
4. ProductDetails carga: getProduct(id), getRelatedProducts(id), reviews
5. Selección de variantes:
   - Cada grupo de variante genera un <select>
   - onVariantChange: calcula priceAdjustment (soporta absoluto y relativo)
   - Stock individual por opción de variante
6. Precio mostrado: base + variantAdjustment → aplicar discount% → finalPrice
7. Add to Cart:
   - Construye CartItem con price=finalPrice, original_price=basePrice
   - lineId = "productId::blisterId::variantSignature"
   - Vuex dispatch 'addToCart' → commit ADD_TO_CART → cookie → sync server
```

### 5.4 Carrito → Checkout → Pago → Resultado

```
1. ShoppingCart.vue muestra items con TransitionGroup
2. USD→ARS conversion con dollarRate (GET /payments/dollar-rates/?is_active=true)
3. Si tiene cupón:
   - Input código → POST /marketing/coupons/validate/ con productos
   - Aplica descuento (percentage o fixed, category-aware, max_amount cap)
4. Formulario checkout:
   - Recipient info: nombre, DNI/CUIT, email, teléfono
   - 4 opciones de envío/pago (radio):
     a. Retiro en local + efectivo
     b. Retiro en local + pago online
     c. Delivery + efectivo
     d. Delivery + pago online
   - Si delivery: dirección completa + mapa Leaflet (radio 15km)
5. Validación: Vuelidate + compra mínima (desde SiteConfig)
6. Click "Iniciar Pedido" → showCheckoutForm
7. Click "Confirmar Pedido":
   - POST /orders/ { recipient_name, customer_dni_cuit, items[], shipping_method, payment_method, coupon_code?, ... }
   - Si pago online → POST /payments/create/ → redirect a MercadoPago URL
   - Si efectivo → toast éxito + redirect a /configuracion/my-orders
8. MercadoPago callback → /payment/result?payment_id=X
   - GET /payments/status/{orderId}/
   - Muestra: approved / pending / error
```

### 5.5 Admin: Gestionar Productos

```
1. AdminProductList: tabla paginada, server-side filtering
   - Search debounced 300ms, filtros: categoría, precio, stock, disponibilidad
   - Quick edit modal para precio/stock (PATCH /products/{id}/)
   - Delete con confirmación (DELETE /products/{id}/)
2. Crear: /configuracion/productos/agregar → ProductForm (mode: create)
   - Rich text editor (contenteditable + toolbar)
   - Inline category CRUD
   - Variant builder: categorías → opciones (name, price, stock)
   - Image upload a Cloudinary (drag & drop + paste)
   - POST /products/
3. Editar: /configuracion/productos/editar/:id → ProductForm (mode: edit)
   - Carga producto existente, same form
   - PATCH /products/{id}/
```

### 5.6 Admin: Gestionar Pedidos

```
1. AdminSalesHistory: tabla con composable useSales()
   - Filtros: search, status tabs (con counts), date range presets + custom
   - Expandir fila → ver productos con inline editing
   - Cambiar estado: PATCH /orders/{id}/update_status/
   - Notificar envío: POST /orders/{id}/notify_shipping/
   - Imprimir: abre PrintOrderPage
2. OrderDetailsPage: vista detallada
   - Timeline de progreso (pending → payment_pending → paid → shipped)
   - Acciones según estado (mark paid, refund, cancel, ship)
   - MercadoPago refund: POST /payments/refund/
3. AdminNewSale: POS dual-panel
   - Catálogo con búsqueda + agregar productos
   - Customer form + delivery info
   - POST /orders/
```

### 5.7 Admin: Gestionar Clientes

```
1. AdminCustomersList: composable useCustomers()
   - Search, tabla responsive, paginación
   - Block: POST /auth/customers/{id}/block/ { admin_notes }
   - Unblock: POST /auth/customers/{id}/unblock/ { admin_notes }
   - Delete: DELETE /auth/customers/{id}/
2. CustomerProfilePage → CustomerProfile component
   - Stats, historial de pedidos, contacto
3. CreateCustomer: form Vuelidate → POST /auth/customers/
```

### 5.8 Admin: Marketing (Cupones, Ofertas, Bulk Promotions, Scheduled Discounts)

```
Cupones (AdminCoupons):
  - CRUD: /marketing/coupons/
  - Campos: code, type (percentage/fixed), value, categories[], max_uses, expires_at, max_amount, min_purchase
  - Ver uso: /marketing/coupons/{id}/usages/

Ofertas (AdminOffers):
  - CRUD: /marketing/offers/
  - Campos: name, discount%, start_date, end_date, products[]
  - Selección dual: individual search + batch por categoría

Bulk Promotions (via promotions.js):
  - CRUD: /marketing/bulk-promotions/
  - Tipos: 3x2, 2x1, 4x3, 5x4, custom
  - Check: /marketing/bulk-promotions/check_product/

Scheduled Discounts (AdminScheduledDiscounts):
  - CRUD: /marketing/scheduled-discounts/
  - Campos: name, day_of_week (0-6), category, discount%, time range, validity dates
  - Preview cronjob, apply/remove manual
  - DAYS_OF_WEEK: 0=Lunes ... 6=Domingo
```

---

## 6. Patrones de UX

### 6.1 Loading States

| Patrón | Componentes |
|--------|-------------|
| **Skeleton loading** (ProductSkeleton pulse animation) | ProductList, ProductsCarousel, AdminOverview, AdminStats, AdminActivity |
| **Full-screen loader** (Loader.vue, 2s auto-hide) | App.vue (initial load) |
| **Spinner inline** | CustomerOrders, AdminProductList, AdminCategories |
| **Loading overlay** | ProductList (filter change) |
| **Per-action loading** | OrderDetailsPage (per-button `loadingAction`) |
| **Boolean `isLoading` ref** | Prácticamente todos los componentes |

### 6.2 Errores

| Patrón | Uso |
|--------|-----|
| **Toast notifications** (vue-toastification, bottom-right, max 3, 3s timeout) | Éxito/error en todas las operaciones CRUD |
| **Inline error message** (ref `errorMessage`) | LoginForm, RegisterForm, PasswordResetForm |
| **Error state con retry** | OrderDetailsModal, CustomerProfilePage |
| **Validation feedback** (Vuelidate + per-field `$error`) | LoginForm, RegisterForm, CreateCustomer, ShoppingCart |
| **API error unwrapping** | Servicios extraen `error.response.data.error || .message` |

### 6.3 Toasts

Configuración global (`main.js`):
```javascript
{
  timeout: 3000,
  position: "bottom-right",
  hideProgressBar: true,
  maxToasts: 3,
  transition: "Vue-Toastification__fade",
  newestOnTop: true,
  filterBeforeCreate: // deduplica por content
}
```

### 6.4 Modales

| Tipo | Componentes |
|------|-------------|
| **Bootstrap Modal JS** (`new Modal(element)`) | ProductList, SalesHistory, ReviewsManager, ProductForm, MaintenanceToggle, UserOrdersList, ProductReviews |
| **Custom Vue modal** (v-if overlay con backdrop) | OrderDetailsModal, AdminCategories, AdminCoupons, AdminOffers, AdminReviews, AbandonedCarts, MaintenancePage |
| **Confirm dialog** (custom modal con OK/Cancel) | AdminProductList (delete), AdminCustomersList (block/unblock/delete), AdminSalesHistory (shipping notify) |

### 6.5 Transiciones / Animaciones

| Animación | Ubicación |
|-----------|-----------|
| Route transition (fade) | AdminPanel `<router-view>` |
| TransitionGroup (cart items) | ShoppingCart |
| ScrollReveal (desktop only) | Home, ProductList, FooterComponent, FaqSection |
| Vanta.js FOG (hero) | Home |
| CSS pulse (skeleton) | ProductSkeleton, AdminOverview |
| CSS glitch (404) | NotFound |
| Slide-in (custom modal) | OrderDetailsModal |

---

## 7. Sistema de Caché

### 7.1 localStorage Cache

| Key | TTL | Invalidación | Usado por |
|-----|-----|-------------|-----------|
| `products` + `productsTimestamp` | 5 min | `invalidateProductsCache()` en create/update/delete | products.js `getProducts()` |
| `onSaleProducts` + `onSaleProductsTimestamp` | 2 min | `clearOnSaleCache()` action | store/products.js |
| `userOrders` + `userOrdersTimestamp` | 10 min | `invalidateCache()` en update/delete | orders.js `getUserOrders()` |
| `adminOrders` + `ordersTimestamp` | 10 min | `invalidateCache()` en update/delete | orders.js `getOrders()` |
| `activities_{filters}` + timestamp | 30 seg | `clearActivityCache()` | activity.js |
| `activity_stats` + timestamp | 5 min | `clearActivityCache()` | activity.js |
| `maintenance_mode` + `maintenance_checked` | 100 seg | `resetMaintenanceCache()` | maintenanceService.js |
| `cacheVersion` | Permanente | Cambio de `CACHE_VERSION` (actualmente '1.4') | apiClient.js |
| `ageVerified` | Permanente | — | AgeVerification.vue |

### 7.2 Cookie Cache

| Key | TTL | Uso |
|-----|-----|-----|
| `cart` (JSON) | 7 días | Cart items (Vuex → cookie sync bidireccional) |

### 7.3 In-Memory Cache

| Variable | TTL | Uso |
|----------|-----|-----|
| `relatedProductsCache` (Map) | 5 min | ProductDetails.vue — cache per-product ID |
| `authState.lastVerified` | 5 min | apiClient.js — admin verification throttle |
| `maintenanceCache` (object) | 100s (configurable) | maintenanceService.js — maintenance status |
| `preloadedProducts` (Map) | Session | ProductList.vue — preloaded next pages |

### 7.4 Cache Invalidation en `apiClient.js`

Al detectar nueva `CACHE_VERSION` (actualmente '1.4'):
- Limpia `activities_*`, `activity_stats`, `products`, `productsTimestamp`, `userOrders`, `adminOrders`, `ordersTimestamp`
- Preserva tokens de acceso

---

## 8. Helpers, Composables y Utilidades

### 8.1 Composables

#### `useCustomers()` — `composables/useCustomers.js`
- **State**: `customers`, `loading`, `searchQuery`, `currentPage`, `totalPages`, `totalCustomers`, `pageSize` (24)
- **Computed**: `filteredCustomers` (search by username, email, DNI)
- **Actions**: `fetchCustomers`, `viewCustomerOrders`, `handleBlockCustomer`, `handleUnblockCustomer`, `handleDeleteCustomer`
- **Watchers**: auto-fetch on searchQuery/currentPage change

#### `useSales()` — `composables/useSales.js`
- **State**: `sales`, `loading`, `ventasAbiertas`, reactive `filters` (search, status, customer_id, sort, page, date range)
- **Reactive**: `statistics` (counts per status)
- **Actions**: `fetchSales`, `fetchSalesStatistics`, `updateSaleStatus`, `updateFilters`, `clearFilters`, `applyDateFilter`
- **Date presets**: today, yesterday, week, month, year, custom

#### `useWindowSize()` — `composables/useWindowSize.js`
- **Returns**: `width`, `height`, `isMobile()` (<768), `isTablet()` (768–1024), `isDesktop()` (≥1024)

### 8.2 Helpers

#### `helpers/product.js`
| Función | Descripción |
|---------|-------------|
| `formatPrice(price)` | Entero → formato con `.` separador de miles (ej: `1.234`) |
| `getDiscountedPrice(price, discount)` | `price * (1 - discount/100)` |
| `getBlisterMinPrice(blisters)` | Min price del array blisters |
| `getBlisterMaxPrice(blisters)` | Max price del array blisters |
| `getVariantFinalPrice(product)` | Base price + variant price_adjustment |

#### `helpers/text.js`
| Función | Descripción |
|---------|-------------|
| `truncateText(text, maxLength)` | Trunca a maxLength + `...` |

### 8.3 Utilidades

#### `utils/text.js`
| Función | Descripción |
|---------|-------------|
| `fixCloudinaryUrl(url)` | Elimina prefijos antes de `http` en URLs Cloudinary |
| `normalizeText(text)` | Lowercase + remove diacritics (NFD) + replace hyphens/special chars |
| `fuzzyMatch(text, query)` | AND-based: todas las palabras del query deben aparecer en el texto normalizado |
| `searchProducts(products, query, fields?, maxResults?)` | Filtra array de productos con `fuzzyMatch` sobre campos configurables |
| `debounce(fn, delay)` | Generic debounce utility |

#### `utils/dates.js`
| Función | Descripción |
|---------|-------------|
| `formatTimestamp(ts)` | `new Date(ts).toLocaleString()` |
| `formatDate(dateStr)` | Formato español largo (ej: "16 de febrero de 2026") via `es-ES` locale |

#### `utils/visitorTracker.js`
- `registerVisit()` → `POST /register-visit/` (una vez por sesión, auto-ejecuta en import)

#### `utils/maintenanceMonitor.js`
- `startMaintenanceMonitor(intervalMinutes?)` → setInterval que verifica maintenance status
- `useMaintenanceMonitor(intervalMinutes?)` → Vue composable wrapper con cleanup en `onUnmounted`

---

## 9. Configuración y Bootstrap

### 9.1 `main.js`

```javascript
createApp(App)
  .use(router)           // Vue Router 4
  .use(store)            // Vuex 4
  .use(Toast, options)   // vue-toastification
  .mount('#app')
```

Auto-importa `@/utils/visitorTracker` para registro automático de visitas.

### 9.2 `config/index.js`

```javascript
export const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:8000/api';
export const APP_NAME = 'Jamrock Growshop';
export const CURRENCY = 'ARS';
export const CURRENCY_SYMBOL = '$';
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

### 9.3 `package.json` — Dependencias principales

| Dependencia | Versión | Uso |
|-------------|---------|-----|
| vue | ^3.2.13 | Framework |
| vue-router | ^4.5.0 | Routing |
| vuex | ^4.1.0 | State management (cart + auth) |
| axios | ^1.6.2 | HTTP client |
| bootstrap | ^5.3.0 | CSS framework + JS components |
| chart.js | ^4.4.8 | Gráficos |
| vue-chartjs | ^5.3.2 | Vue wrapper para Chart.js |
| date-fns | ^4.1.0 | Formateo de fechas |
| js-cookie | ^3.0.5 | Gestión de cookies (carrito) |
| vue-toastification | ^2.0.0-rc.5 | Notificaciones toast |
| @vuelidate/core | ^2.0.0 | Validación de formularios |
| @vuelidate/validators | ^2.0.0 | Validators para Vuelidate |
| @headlessui/vue | ^1.7.23 | UI components headless |
| @vueuse/core | ^12.8.2 | Composables utilitarios |
| leaflet | ^1.9.4 | Mapas |
| scrollreveal | ^4.0.9 | Animaciones de scroll |
| three | ^0.134.0 | 3D graphics (Vanta.js dependency) |
| vanta | ^0.5.24 | Efectos de fondo animados |

### 9.4 Build: Vue CLI (`vue-cli-service`)

- `npm run serve` → desarrollo
- `npm run build` → producción
- `npm run lint` → linting

### 9.5 `App.vue` — Layout Raíz

```
<LoaderAnimation />                    <!-- Full-screen 2s loader -->
<AgeVerification v-if="showAgeModal" />  <!-- Gate 18+ -->
<NavbarComponent v-if="!shouldHideNavbar && !showAgeModal" />
<router-view v-if="!showAgeModal" />
<FooterComponent v-if="!shouldHideNavbar && !showAgeModal" />
<WhatsApp floating button v-if="!shouldHideNavbar && !showAgeModal" />
```

Oculta navbar/footer en rutas: `/blog`, `/configuracion`, `/mantenimiento`

Maintenance monitor inicializado en `onMounted` con check cada 5 minutos.
