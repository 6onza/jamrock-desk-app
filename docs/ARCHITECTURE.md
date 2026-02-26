# Arquitectura — JamRock GrowShop Desktop Admin

> Definición de arquitectura completa para la app de escritorio Tauri 2.
> Basado en: [API_CONTRACTS.md](./API_CONTRACTS.md) y [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md).
> Plataforma objetivo: **Windows (.exe)**.

---

## Tabla de Contenidos

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Responsabilidades del Rust Backend (Tauri)](#3-responsabilidades-del-rust-backend-tauri)
4. [Responsabilidades del Frontend Vue](#4-responsabilidades-del-frontend-vue)
5. [Mapa de Features](#5-mapa-de-features)
6. [Flujo de Autenticación para Escritorio](#6-flujo-de-autenticación-para-escritorio)
7. [Configuración de Entorno](#7-configuración-de-entorno)
8. [Diagrama de Comunicación](#8-diagrama-de-comunicación)
9. [Arquitectura de Stores (Pinia)](#9-arquitectura-de-stores-pinia)
10. [Arquitectura de Servicios HTTP](#10-arquitectura-de-servicios-http)
11. [Arquitectura de Routing](#11-arquitectura-de-routing)
12. [Mapa de Componentes por Feature](#12-mapa-de-componentes-por-feature)
13. [Configuración CORS del Backend Django](#13-configuración-cors-del-backend-django)
14. [Convenciones y Estándares](#14-convenciones-y-estándares)
15. [Consideraciones de Performance](#15-consideraciones-de-performance)

---

## 1. Stack Tecnológico

### Core

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| Runtime nativo | **Tauri 2** | ^2.x estable | App nativa Windows con webview, ~10 MB vs ~200 MB Electron |
| Backend nativo | **Rust** | stable (edition 2021) | Requerido por Tauri para IPC, secure store, filesystem |
| Framework UI | **Vue 3** | ^3.4+ | Composition API + `<script setup>`, coherencia con frontend web existente |
| Language | **TypeScript** | ^5.3+ | Type safety en todo el frontend, interfaces para API contracts |
| State Management | **Pinia** | ^2.1+ | Reemplazo moderno de Vuex, mejor DX con TypeScript, stores composables |
| Router | **Vue Router 4** | ^4.3+ | SPA routing, navigation guards para auth/admin |
| Styling | **Tailwind CSS** | ^3.4+ | Utility-first, look nativo de escritorio, eliminamos Bootstrap |
| HTTP Client | **Axios** | ^1.6+ | Interceptores, timeout config, consistencia con frontend web |
| Build Tool | **Vite** | ^5.x | Bundler nativo de Tauri, HMR rápido, TypeScript support |
| Charts | **Chart.js** + **vue-chartjs** | ^4.4 / ^5.3 | Gráficos del dashboard, mismos que el frontend web |
| Date Handling | **date-fns** | ^3.x+ | Formateo de fechas en español, tree-shakeable |
| Forms | **VeeValidate** + **Zod** | ^4.x / ^3.x | Validación con schemas TypeScript (reemplazo de Vuelidate) |
| Icons | **Lucide Vue** | ^0.3+ | Icon set moderno, tree-shakeable, look nativo |

### Tauri Plugins (Oficiales)

| Plugin | Crate / npm | Uso |
|--------|------------|-----|
| `tauri-plugin-store` | `@tauri-apps/plugin-store` | Almacenamiento seguro de tokens JWT y preferencias |
| `tauri-plugin-shell` | `@tauri-apps/plugin-shell` | Abrir URLs externas en navegador, clipboard |
| `tauri-plugin-dialog` | `@tauri-apps/plugin-dialog` | Diálogos nativos de guardar/abrir archivo |
| `tauri-plugin-fs` | `@tauri-apps/plugin-fs` | Lectura/escritura de archivos para export de reportes |
| `tauri-plugin-notification` | `@tauri-apps/plugin-notification` | Notificaciones nativas del SO |
| `tauri-plugin-updater` | `@tauri-apps/plugin-updater` | Auto-update de la aplicación |
| `tauri-plugin-http` | `@tauri-apps/plugin-http` | (Opcional) HTTP requests desde Rust si se necesita bypass de CORS |
| `tauri-plugin-process` | `@tauri-apps/plugin-process` | Reiniciar app, obtener info del proceso |

### Dev Dependencies

| Herramienta | Uso |
|-------------|-----|
| `@tauri-apps/cli` | CLI de Tauri para desarrollo y build |
| `typescript` | Compilador TypeScript |
| `vue-tsc` | Type checking para SFC |
| `eslint` + `@typescript-eslint/*` | Linting |
| `prettier` + `prettier-plugin-tailwindcss` | Formateo de código con sorting de clases Tailwind |
| `autoprefixer` + `postcss` | PostCSS para Tailwind |

---

## 2. Estructura del Proyecto

```
tauri-app/
├── docs/                          # Documentación del proyecto
│   ├── API_CONTRACTS.md           # Contratos de la API (generado en Prompt 1)
│   ├── FRONTEND_ANALYSIS.md       # Análisis del frontend web (generado en Prompt 2)
│   └── ARCHITECTURE.md            # Este archivo
│
├── src-tauri/                     # ── Rust backend de Tauri ──
│   ├── Cargo.toml                 # Dependencias Rust + plugins Tauri
│   ├── tauri.conf.json            # Configuración de Tauri (ventana, permisos, seguridad)
│   ├── capabilities/              # Capabilities de Tauri 2 (permisos granulares)
│   │   └── default.json           # Permisos por defecto de la app
│   ├── icons/                     # Iconos de la app (.ico, .png)
│   └── src/
│       ├── main.rs                # Entry point Rust (NO tocar — Tauri lo genera)
│       ├── lib.rs                 # Registro de plugins y comandos
│       └── commands/              # Comandos IPC invocables desde Vue
│           ├── mod.rs             # Re-exports de módulos
│           ├── auth.rs            # Secure store: get/set/delete tokens
│           ├── config.rs          # Leer/escribir config local (server URL, prefs)
│           ├── export.rs          # Generar y guardar PDFs de facturas/reportes
│           └── system.rs          # Info del sistema, open external URLs
│
├── src/                           # ── Frontend Vue 3 + TypeScript ──
│   ├── main.ts                    # Bootstrap: createApp + plugins
│   ├── App.vue                    # Layout raíz
│   ├── env.d.ts                   # Declaraciones de tipos para import de assets
│   │
│   ├── assets/                    # Archivos estáticos
│   │   ├── logo.svg               # Logo de JamRock
│   │   └── styles/
│   │       ├── main.css           # Entry point CSS (imports Tailwind)
│   │       └── components.css     # Estilos custom que Tailwind no cubre
│   │
│   ├── types/                     # ── TypeScript Interfaces ──
│   │   ├── index.ts               # Re-exports
│   │   ├── auth.ts                # User, LoginRequest, LoginResponse, AdminVerification
│   │   ├── products.ts            # Product, Variant, VariantOption, Category
│   │   ├── orders.ts              # Order, OrderItem, OrderStatus, ShippingMethod
│   │   ├── customers.ts           # Customer, CustomerStats
│   │   ├── marketing.ts           # Coupon, Offer, BulkPromotion, ScheduledDiscount
│   │   ├── statistics.ts          # DashboardStats, ChartData, PeriodFilter
│   │   ├── payments.ts            # DollarRate, DistributionCenter, PaymentStatus
│   │   ├── activity.ts            # ActivityLog, ActivityStats, ActivityFilter
│   │   ├── abandoned-carts.ts     # AbandonedCart, AbandonedCartStats
│   │   ├── site-config.ts         # SiteConfig, MaintenanceStatus
│   │   └── api.ts                 # PaginatedResponse<T>, ApiError, RequestConfig
│   │
│   ├── services/                  # ── Capa HTTP (Axios) ──
│   │   ├── apiClient.ts           # Instancia Axios + interceptores + token refresh
│   │   ├── auth.service.ts        # Login, logout, verify admin
│   │   ├── products.service.ts    # CRUD productos, categorías, imágenes, reviews
│   │   ├── orders.service.ts      # CRUD órdenes, cambio de estado, items
│   │   ├── customers.service.ts   # CRUD clientes, block/unblock
│   │   ├── coupons.service.ts     # CRUD cupones, validar, ver uso
│   │   ├── offers.service.ts      # CRUD ofertas
│   │   ├── promotions.service.ts  # CRUD bulk promotions
│   │   ├── scheduled-discounts.service.ts  # CRUD descuentos programados
│   │   ├── payments.service.ts    # Dollar rates, distribution centers, refunds
│   │   ├── statistics.service.ts  # Analytics, visitor stats, user stats
│   │   ├── activity.service.ts    # Activity logs y stats
│   │   ├── abandoned-carts.service.ts  # Stats, listar, identificar, recuperar
│   │   ├── site-config.service.ts # Config del sitio, maintenance toggle
│   │   └── uploads.service.ts     # Upload de imágenes a Cloudinary
│   │
│   ├── stores/                    # ── Pinia Stores ──
│   │   ├── auth.store.ts          # Estado de autenticación + tokens (via Tauri secure store)
│   │   ├── products.store.ts      # Cache de productos, producto actual
│   │   ├── orders.store.ts        # Órdenes con filtros reactivos
│   │   ├── customers.store.ts     # Lista de clientes paginada
│   │   ├── dashboard.store.ts     # Estadísticas del dashboard
│   │   ├── marketing.store.ts     # Cupones, ofertas, promotions, scheduled discounts
│   │   ├── activity.store.ts      # Activity logs con auto-refresh
│   │   ├── ui.store.ts            # Estado de UI (sidebar, modales, toasts, loading)
│   │   └── config.store.ts        # URL del API, preferencias de usuario
│   │
│   ├── composables/               # ── Composables reutilizables ──
│   │   ├── useAuth.ts             # Acceso reactivo a auth store + guards
│   │   ├── usePagination.ts       # Paginación genérica server-side
│   │   ├── useFilters.ts          # Filtros genéricos con URL sync
│   │   ├── useConfirmDialog.ts    # Diálogos de confirmación reutilizables
│   │   ├── useToast.ts            # Wrapper de notificaciones toast
│   │   ├── useExport.ts           # Export de datos (CSV, PDF via Tauri)
│   │   ├── useDollarRate.ts       # Conversión USD→ARS reactiva
│   │   ├── useAutoRefresh.ts      # Polling automático configurable con cleanup
│   │   └── useSecureStore.ts      # Wrapper de tauri-plugin-store para Vue reactivity
│   │
│   ├── router/                    # ── Vue Router ──
│   │   ├── index.ts               # Router instance + guards
│   │   └── routes.ts              # Definición de rutas (lazy loaded)
│   │
│   ├── layouts/                   # ── Layouts ──
│   │   ├── AuthLayout.vue         # Layout para login (centrado, sin sidebar)
│   │   └── AdminLayout.vue        # Layout principal (sidebar + topbar + content)
│   │
│   ├── pages/                     # ── Páginas (route-level components) ──
│   │   ├── LoginPage.vue
│   │   ├── DashboardPage.vue
│   │   ├── products/
│   │   │   ├── ProductListPage.vue
│   │   │   ├── ProductFormPage.vue      # Create + Edit (dual mode)
│   │   │   └── ProductDetailPage.vue    # Vista detalle read-only admin
│   │   ├── orders/
│   │   │   ├── OrderListPage.vue
│   │   │   ├── OrderDetailPage.vue
│   │   │   ├── NewSalePage.vue          # POS de venta manual
│   │   │   └── PrintOrderPage.vue
│   │   ├── customers/
│   │   │   ├── CustomerListPage.vue
│   │   │   ├── CustomerDetailPage.vue
│   │   │   └── CustomerCreatePage.vue
│   │   ├── marketing/
│   │   │   ├── CouponsPage.vue
│   │   │   ├── OffersPage.vue
│   │   │   ├── BulkPromotionsPage.vue
│   │   │   └── ScheduledDiscountsPage.vue
│   │   ├── analytics/
│   │   │   ├── StatsPage.vue
│   │   │   └── ActivityPage.vue
│   │   ├── settings/
│   │   │   ├── StoreSettingsPage.vue
│   │   │   └── AppSettingsPage.vue      # Config URL API, tema, idioma
│   │   ├── categories/
│   │   │   └── CategoriesPage.vue
│   │   ├── reviews/
│   │   │   └── ReviewsPage.vue
│   │   └── abandoned-carts/
│   │       └── AbandonedCartsPage.vue
│   │
│   ├── components/                # ── Componentes reutilizables ──
│   │   ├── ui/                    # Componentes UI base (design system)
│   │   │   ├── AppButton.vue
│   │   │   ├── AppInput.vue
│   │   │   ├── AppSelect.vue
│   │   │   ├── AppModal.vue
│   │   │   ├── AppTable.vue
│   │   │   ├── AppPagination.vue
│   │   │   ├── AppBadge.vue
│   │   │   ├── AppCard.vue
│   │   │   ├── AppDropdown.vue
│   │   │   ├── AppToast.vue
│   │   │   ├── AppSkeleton.vue
│   │   │   ├── AppConfirmDialog.vue
│   │   │   ├── AppEmptyState.vue
│   │   │   ├── AppSearchInput.vue
│   │   │   └── AppLoadingOverlay.vue
│   │   ├── layout/                # Componentes de layout
│   │   │   ├── TheSidebar.vue
│   │   │   ├── TheTopbar.vue
│   │   │   └── TheBreadcrumb.vue
│   │   ├── dashboard/             # Widgets del dashboard
│   │   │   ├── StatCard.vue
│   │   │   ├── RevenueChart.vue
│   │   │   ├── CustomersChart.vue
│   │   │   ├── OrdersByStatusTable.vue
│   │   │   └── PeriodSelector.vue
│   │   ├── products/              # Componentes de productos
│   │   │   ├── ProductTable.vue
│   │   │   ├── ProductQuickEdit.vue
│   │   │   ├── ProductFormFields.vue
│   │   │   ├── VariantEditor.vue
│   │   │   ├── ImageUploader.vue
│   │   │   └── RichTextEditor.vue
│   │   ├── orders/                # Componentes de pedidos
│   │   │   ├── OrderTable.vue
│   │   │   ├── OrderStatusBadge.vue
│   │   │   ├── OrderTimeline.vue
│   │   │   ├── OrderItemsList.vue
│   │   │   └── PrintableInvoice.vue
│   │   ├── customers/             # Componentes de clientes
│   │   │   ├── CustomerTable.vue
│   │   │   ├── CustomerProfileCard.vue
│   │   │   └── CustomerOrdersTab.vue
│   │   └── marketing/             # Componentes de marketing
│   │       ├── CouponForm.vue
│   │       ├── OfferForm.vue
│   │       ├── PromotionForm.vue
│   │       └── ScheduledDiscountForm.vue
│   │
│   └── utils/                     # ── Utilidades ──
│       ├── format.ts              # formatPrice, formatDate, formatCurrency
│       ├── text.ts                # normalizeText, fuzzyMatch, truncate
│       ├── constants.ts           # ORDER_STATUSES, DAYS_OF_WEEK, CURRENCIES, etc.
│       └── cloudinary.ts          # fixCloudinaryUrl, getOptimizedUrl
│
├── index.html                     # Entry point HTML (Vite)
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
└── .gitignore
```

---

## 3. Responsabilidades del Rust Backend (Tauri)

El backend Rust de Tauri **NO** es un servidor. Es un proceso nativo que:

### 3.1 Almacenamiento Seguro de Tokens (`commands/auth.rs`)

**¿Por qué no localStorage?** En una app de escritorio, localStorage vive en un directorio accesible del filesystem. `tauri-plugin-store` encripta los datos usando la API de credenciales del SO (Windows Credential Manager).

```rust
// Comandos IPC expuestos al frontend Vue:

#[tauri::command]
async fn store_tokens(
    app: AppHandle,
    access_token: String,
    refresh_token: String,
) -> Result<(), String>;

#[tauri::command]
async fn get_access_token(app: AppHandle) -> Result<Option<String>, String>;

#[tauri::command]
async fn get_refresh_token(app: AppHandle) -> Result<Option<String>, String>;

#[tauri::command]
async fn clear_tokens(app: AppHandle) -> Result<(), String>;

#[tauri::command]
async fn is_token_expiring_soon(
    app: AppHandle,
    buffer_minutes: u64,
) -> Result<bool, String>;
```

**Flujo**: Vue llama `invoke('get_access_token')` → Rust lee el secure store → retorna el token → Vue lo usa en el header HTTP.

### 3.2 Gestión de Configuración Local (`commands/config.rs`)

Archivo de configuración persistido en el directorio de datos de la app (`%APPDATA%/com.jamrock.admin/`).

```rust
#[tauri::command]
async fn get_config(app: AppHandle) -> Result<AppConfig, String>;

#[tauri::command]
async fn set_config(app: AppHandle, config: AppConfig) -> Result<(), String>;

#[tauri::command]
async fn get_api_url(app: AppHandle) -> Result<String, String>;

#[tauri::command]
async fn set_api_url(app: AppHandle, url: String) -> Result<(), String>;
```

**Estructura `AppConfig`**:
```rust
#[derive(Serialize, Deserialize)]
struct AppConfig {
    api_url: String,            // "https://jamrock-api.up.railway.app" o "http://localhost:8000"
    theme: String,              // "dark" | "light" | "system"
    sidebar_collapsed: bool,
    auto_refresh_interval: u64, // segundos para polling de datos (0 = deshabilitado)
    last_username: String,      // Para prellenar el login
}
```

### 3.3 Exportación de Archivos (`commands/export.rs`)

```rust
#[tauri::command]
async fn export_order_pdf(
    app: AppHandle,
    order_html: String,        // HTML renderizado del componente PrintableInvoice
    filename: String,
) -> Result<String, String>;   // Retorna path del archivo guardado

#[tauri::command]
async fn export_csv(
    app: AppHandle,
    csv_content: String,
    filename: String,
) -> Result<String, String>;
```

**Implementación**: Usa `tauri-plugin-dialog` para el diálogo nativo "Guardar como..." y `tauri-plugin-fs` para escribir el archivo. Para PDF, la estrategia es renderizar HTML en el webview y capturar via `window.print()` o una librería Rust como `printpdf` para PDFs programáticos.

### 3.4 Auto-Update (`lib.rs`)

```rust
// En lib.rs, registrar el plugin de updater:
tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    // ...
```

Configuración en `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "endpoints": ["https://jamrock-api.up.railway.app/api/desktop/updates/{{target}}/{{arch}}/{{current_version}}"],
      "pubkey": "..."
    }
  }
}
```

**Nota**: Requiere un endpoint en el backend Django que sirva el manifiesto de versiones. Esto se puede implementar como un endpoint estático o usar GitHub Releases como backend de updates.

### 3.5 Notificaciones Nativas del SO

```rust
// Registrar plugin en lib.rs:
.plugin(tauri_plugin_notification::init())
```

Uso desde Vue:
```typescript
import { sendNotification } from '@tauri-apps/plugin-notification';

await sendNotification({
  title: 'Nuevo Pedido',
  body: 'Se recibió el pedido #1234',
  icon: 'icons/icon.png'
});
```

### 3.6 Comandos de Sistema (`commands/system.rs`)

```rust
#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String>;
// Abre URL en el navegador por defecto del SO

#[tauri::command]
async fn get_app_version(app: AppHandle) -> Result<String, String>;
// Retorna la versión de la app desde Cargo.toml

#[tauri::command]
async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String>;
// Copia texto al clipboard del SO
```

### Resumen de Responsabilidades Rust

| Responsabilidad | Plugin/Crate | Por qué en Rust |
|----------------|-------------|-----------------|
| Secure token storage | `tauri-plugin-store` | Encriptación a nivel de SO, no accesible desde JS |
| Config persistence | `tauri-plugin-fs` | Filesystem del SO, directorio de la app |
| PDF/CSV export | `tauri-plugin-dialog` + `tauri-plugin-fs` | Diálogo nativo "Guardar como..." |
| Auto-update | `tauri-plugin-updater` | Descarga, verificación de firma, reemplazo de binario |
| Notificaciones | `tauri-plugin-notification` | Notificaciones nativas del SO (tray) |
| Open URL | `tauri-plugin-shell` | Abrir browser externo |
| Clipboard | `tauri-plugin-clipboard-manager` | Acceso al clipboard del SO |

---

## 4. Responsabilidades del Frontend Vue

El frontend Vue maneja **toda la lógica de negocio visible** y la UI:

### 4.1 UI y UX

- **Renderizado completo** de todas las vistas del panel admin
- **Sistema de layouts** (AuthLayout para login, AdminLayout para el resto)
- **Sistema de componentes** basado en Tailwind CSS con look nativo de escritorio
- **Transiciones y animaciones** suaves entre rutas
- **Responsive dentro de la ventana** (la ventana se puede redimensionar, pero no es responsive para mobile)
- **Dark mode** nativo (detecta preferencia del SO + toggle manual)

### 4.2 Consumo de API REST

- **Todos los HTTP requests** al backend Django se hacen desde Vue via Axios
- **Los tokens se obtienen de Rust** via `invoke()` antes de cada request
- **Interceptores** manejan auth headers, token refresh, y errores

### 4.3 State Management (Pinia)

- **Stores tipados** con TypeScript interfaces
- **Cache reactivo** de datos con TTL configurable
- **Acciones async** que llaman a los servicios HTTP
- **Getters computados** para datos derivados

### 4.4 Routing

- **Vue Router 4** con navegation guards para auth/admin
- **Lazy loading** de todas las páginas excepto Login y Dashboard
- **History mode** (createWebHistory) — funciona en Tauri sin configuración extra

---

## 5. Mapa de Features

### ✅ Features INCLUIDAS (Admin)

| Feature | Página(s) Desktop | Endpoints API Clave | Prioridad |
|---------|-------------------|---------------------|-----------|
| **Login admin** | `LoginPage` | `POST /auth/login/`, `GET /auth/verify-admin/` | P0 |
| **Dashboard** | `DashboardPage` | `GET /statistics/analytics/`, `GET /statistics/users/`, `GET /visitors/stats/`, `GET /orders/` | P0 |
| **Productos CRUD** | `ProductListPage`, `ProductFormPage` | `GET/POST/PATCH/DELETE /products/`, `GET /categories/` | P0 |
| **Categorías CRUD** | `CategoriesPage` | `GET/POST/DELETE /categories/`, `GET /categories/hierarchical/` | P0 |
| **Pedidos (listar, detalle, estado)** | `OrderListPage`, `OrderDetailPage` | `GET /orders/`, `GET /orders/{id}/`, `PATCH /orders/{id}/update_status/` | P0 |
| **Imprimir pedido** | `PrintOrderPage` | `GET /orders/{id}/` | P1 |
| **Venta manual (POS)** | `NewSalePage` | `POST /orders/`, `GET /products/` | P1 |
| **Clientes** | `CustomerListPage`, `CustomerDetailPage` | `GET /auth/customers/`, `POST .../block/`, `POST .../unblock/` | P1 |
| **Crear cliente** | `CustomerCreatePage` | `POST /auth/customers/` | P2 |
| **Cupones** | `CouponsPage` | `GET/POST/PUT/DELETE /marketing/coupons/`, `.../validate/`, `.../usages/` | P1 |
| **Ofertas** | `OffersPage` | `GET/POST/PUT/DELETE /marketing/offers/` | P1 |
| **Promociones bulk** | `BulkPromotionsPage` | `GET/POST/PUT/DELETE /marketing/bulk-promotions/` | P2 |
| **Descuentos programados** | `ScheduledDiscountsPage` | `GET/POST/PUT/DELETE /marketing/scheduled-discounts/`, `.../apply_now/`, `.../remove_now/` | P2 |
| **Estadísticas** | `StatsPage` | `GET /statistics/analytics/`, `GET /statistics/customers/` | P1 |
| **Logs de actividad** | `ActivityPage` | `GET /activity-logs/`, `GET /activity-logs/stats/` | P2 |
| **Reseñas** | `ReviewsPage` | `GET /reviews/`, `PATCH .../approve/`, `PATCH .../reject/`, `DELETE` | P2 |
| **Carritos abandonados** | `AbandonedCartsPage` | `GET /orders/abandoned-carts/`, `.../statistics/`, `.../identify/` | P2 |
| **Config tienda** | `StoreSettingsPage` | `GET/PATCH /site-config/`, `POST /maintenance/toggle/`, dollar rates, distribution centers | P1 |
| **Config app desktop** | `AppSettingsPage` | — (local, via Tauri commands) | P1 |
| **Export PDF/CSV** | Integrado en varias páginas | — (local, via Tauri commands) | P2 |
| **Notificaciones nativas** | Sistema global | — (local, via Tauri notification plugin) | P3 |

### ❌ Features EXCLUIDAS

| Feature Web | Motivo de Exclusión |
|------------|-------------------|
| Blog completo (CRUD, editor, categorías, navegación) | Módulo separado, no es core admin |
| Carousel/Hero management | Solo relevante para la web pública |
| Tienda pública (Home, catálogo, carrito de compra) | Los clientes usan la web, no el desktop |
| Registro de cuenta / Verificación email | Los admins ya existen en el sistema |
| Verificación de edad (AgeVerification) | Gate para la web pública solamente |
| WhatsApp floating button | Widget de la web pública |
| Visitor tracking auto-register | Se registra desde la web pública |
| FAQ section | Contenido de la web pública |
| Maintenance page (vista usuario) | El admin toglea mantenimiento, no lo ve como usuario |
| Password reset flow | El admin resetea desde el backend/Django admin |
| MercadoPago redirect (checkout) | El checkout lo hacen los clientes en la web |
| Leaflet maps (delivery coverage) | Solo relevante para el checkout del cliente |
| Vanta.js / ScrollReveal / Three.js | Efectos visuales de la web pública |

---

## 6. Flujo de Autenticación para Escritorio

### 6.1 Login Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  LoginPage  │────▶│ auth.service│────▶│ Django API       │────▶│ Response     │
│  (Vue)      │     │ .login()    │     │ POST /auth/login/│     │ {access,     │
│             │     │             │     │                  │     │  refresh,    │
│             │     │             │     │                  │     │  is_admin}   │
└─────────────┘     └─────────────┘     └─────────────────┘     └──────┬───────┘
                                                                        │
                    ┌─────────────┐     ┌─────────────────┐            │
                    │ Tauri Rust  │◀────│ auth.store      │◀───────────┘
                    │ Secure Store│     │ .handleLogin()  │
                    │ (encrypted) │     │                 │
                    └─────────────┘     └────────┬────────┘
                                                  │
                                        ┌────────▼────────┐
                                        │ Verify Admin    │
                                        │ GET /auth/      │
                                        │ verify-admin/   │
                                        └────────┬────────┘
                                                  │
                                   ┌──────────────┴──────────────┐
                                   │                              │
                              is_admin=true                  is_admin=false
                                   │                              │
                          ┌────────▼────────┐            ┌───────▼────────┐
                          │ Navigate to     │            │ Show Error:    │
                          │ /dashboard      │            │ "Solo admins"  │
                          │                 │            │ Clear tokens   │
                          └─────────────────┘            └────────────────┘
```

### 6.2 Detalle del Flujo

1. **Usuario abre la app** → Router guard detecta `!isAuthenticated` → redirige a `/login`
2. **LoginPage** muestra formulario (username + password)
3. **Submit** → `authService.login({ username, password })`
4. **Django responde** con `{ access, refresh, is_staff, is_admin, user_id, username }`
5. **Auth store** recibe la respuesta:
   - Llama `invoke('store_tokens', { accessToken, refreshToken })` → Rust guarda en secure store
   - Verifica admin: `GET /auth/verify-admin/` con el access token
   - Si `is_admin === true` → guarda user info en store → navega a `/dashboard`
   - Si `is_admin === false` → muestra error "Esta app es solo para administradores" → limpia tokens

### 6.3 Token Refresh Automático

```typescript
// En apiClient.ts — Interceptor de request:

async function getValidToken(): Promise<string | null> {
  const token = await invoke<string | null>('get_access_token');
  if (!token) return null;

  const expiringSoon = await invoke<boolean>('is_token_expiring_soon', {
    bufferMinutes: 5
  });

  if (expiringSoon) {
    const refreshToken = await invoke<string | null>('get_refresh_token');
    if (!refreshToken) return null;

    const response = await axios.post(`${apiUrl}/auth/token/refresh/`, {
      refresh: refreshToken
    });

    await invoke('store_tokens', {
      accessToken: response.data.access,
      refreshToken: response.data.refresh || refreshToken
    });

    return response.data.access;
  }

  return token;
}
```

**Patrón de mutex**: Igual que el frontend web, se usa una shared promise para evitar múltiples refresh simultáneos.

### 6.4 Logout

```typescript
async function logout() {
  await invoke('clear_tokens');         // Limpia secure store
  authStore.$reset();                    // Resetea Pinia store
  router.push('/login');                 // Navega al login
}
```

### 6.5 Startup Check

Al iniciar la app:
1. `invoke('get_access_token')` → si hay token, verificar con el servidor
2. `GET /auth/verify-admin/` → si es admin válido → navegar al dashboard
3. Si el token expiró → intentar refresh → si falla → mostrar login
4. Si no hay token → mostrar login

---

## 7. Configuración de Entorno

### 7.1 Settings Screen (`AppSettingsPage.vue`)

La app necesita saber a qué URL de API conectarse. Esto se configura una vez y se persiste localmente.

**Opciones de API URL**:
| Entorno | URL | Cuándo |
|---------|-----|--------|
| Producción | `https://jamrock-api.up.railway.app` | Default para usuario final |
| Desarrollo | `http://localhost:8000` | Cuando el dev corre Django localmente |
| Custom | Cualquier URL | Para testing con ngrok o staging |

**UI de configuración**:
```
┌────────────────────────────────────────────┐
│  Configuración de la App                   │
├────────────────────────────────────────────┤
│                                            │
│  Servidor API                              │
│  ○ Producción (jamrock-api.up.railway.app) │
│  ○ Desarrollo (localhost:8000)             │
│  ○ Personalizado: [_______________]        │
│                                            │
│  [Probar conexión]  Estado: ✅ Conectado    │
│                                            │
│  ─────────────────────────────────         │
│  Apariencia                                │
│  Tema: [Sistema ▼]                         │
│                                            │
│  ─────────────────────────────────         │
│  Auto-refresh                              │
│  Intervalo: [30 seg ▼]                     │
│                                            │
│  [Guardar]                                 │
└────────────────────────────────────────────┘
```

**Persistencia**: Via `invoke('set_config', { config })` → Rust guarda en `%APPDATA%/com.jamrock.admin/config.json`.

**Test de conexión**: `GET /api/ping/` → muestra latencia y estado.

### 7.2 CORS — Cambios Necesarios en Django

El backend Django necesita aceptar requests desde la app Tauri. En Tauri 2, el origin de los requests HTTP desde el webview es:

- **Windows**: `http://tauri.localhost` (Tauri 2 default)

**Cambios requeridos en `backend/core/settings.py`**:

```python
CORS_ALLOWED_ORIGINS = [
    # ... orígenes existentes ...

    # Tauri Desktop App
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost",
]

CSRF_TRUSTED_ORIGINS = [
    # ... orígenes existentes ...

    # Tauri Desktop App
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost",
]
```

**Nota**: En desarrollo local, `CORS_ALLOW_ALL_ORIGINS = True` (ya está configurado así cuando no es Railway), así que no necesita cambios para dev. Solo para producción.

### 7.3 Tauri Security Configuration (`tauri.conf.json`)

```json
{
  "app": {
    "windows": [
      {
        "title": "JamRock Admin",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://jamrock-api.up.railway.app http://localhost:8000 https://api.cloudinary.com; img-src 'self' https://res.cloudinary.com data:; style-src 'self' 'unsafe-inline'; script-src 'self'"
    }
  },
  "identifier": "com.jamrock.admin",
  "productName": "JamRock Admin",
  "version": "1.0.0"
}
```

**CSP explicado**:
- `connect-src`: Permite conexiones a la API Django (prod + dev) y Cloudinary (uploads)
- `img-src`: Permite imágenes de Cloudinary + data URIs (previews)
- `style-src 'unsafe-inline'`: Necesario para Tailwind y estilos dinámicos

### 7.4 Capabilities (`src-tauri/capabilities/default.json`)

```json
{
  "identifier": "default",
  "description": "Default capabilities for JamRock Admin",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "store:default",
    "shell:default",
    "dialog:default",
    "fs:default",
    "notification:default",
    "updater:default",
    "process:default",
    "clipboard-manager:default"
  ]
}
```

---

## 8. Diagrama de Comunicación

```
╔══════════════════════════════════════════════════════════════════╗
║                     APP TAURI (PROCESO)                        ║
╠══════════════════════════════╦═══════════════════════════════════╣
║                              ║                                   ║
║  ┌────────────────────────┐  ║  ┌─────────────────────────────┐  ║
║  │   Frontend Vue 3       │  ║  │   Rust Backend (Tauri)      │  ║
║  │                        │  ║  │                             │  ║
║  │  ┌──────────────────┐  │  ║  │  ┌───────────────────────┐  │  ║
║  │  │ Pages / Components│  │  ║  │  │ commands/auth.rs      │  │  ║
║  │  └────────┬─────────┘  │  ║  │  │ • store_tokens()      │  │  ║
║  │           │             │  ║  │  │ • get_access_token()  │  │  ║
║  │  ┌────────▼─────────┐  │◄─╬─►│  │ • clear_tokens()      │  │  ║
║  │  │ Pinia Stores     │  │IPC║  │  └───────────────────────┘  │  ║
║  │  └────────┬─────────┘  │  ║  │                             │  ║
║  │           │             │  ║  │  ┌───────────────────────┐  │  ║
║  │  ┌────────▼─────────┐  │  ║  │  │ commands/config.rs    │  │  ║
║  │  │ Services (Axios) │  │◄─╬─►│  │ • get_api_url()       │  │  ║
║  │  └────────┬─────────┘  │  ║  │  │ • set_config()        │  │  ║
║  │           │             │  ║  │  └───────────────────────┘  │  ║
║  │           │ HTTP/S      │  ║  │                             │  ║
║  └───────────┼─────────────┘  ║  │  ┌───────────────────────┐  │  ║
║              │                ║  │  │ commands/export.rs    │  │  ║
║              │                ║  │  │ • export_order_pdf()  │  │  ║
║              │                ║  │  │ • export_csv()        │  │  ║
║              │                ║  │  └───────────┬───────────┘  │  ║
║              │                ║  │              │              │  ║
╠══════════════╪════════════════╬══╪══════════════╪══════════════╣  ║
║              │                ║  │              │              ║  ║
║              │                ║  │    ┌─────────▼──────────┐  ║  ║
║              │                ║  │    │ Windows OS APIs    │  ║  ║
║              │                ║  │    │ • Credential Mgr   │  ║  ║
║              │                ║  │    │ • Filesystem        │  ║  ║
║              │                ║  │    │ • Notifications     │  ║  ║
║              │                ║  │    │ • Clipboard         │  ║  ║
║              │                ║  │    └────────────────────┘  ║  ║
╚══════════════╪════════════════╩══╩════════════════════════════╝  ║
               │                                                    ║
               │ HTTPS                                              ║
               ▼                                                    ║
╔══════════════════════════════════╗                                ║
║  Django REST API (Railway)       ║                                ║
║  https://jamrock-api.up.railway  ║                                ║
║  .app/api/                       ║                                ║
║                                  ║                                ║
║  ┌─────────┐ ┌──────────────┐   ║                                ║
║  │PostgreSQL│ │ Cloudinary   │   ║                                ║
║  └─────────┘ └──────────────┘   ║                                ║
║  ┌─────────┐ ┌──────────────┐   ║                                ║
║  │MercadoPago│ │ Firebase    │   ║                                ║
║  └─────────┘ └──────────────┘   ║                                ║
╚══════════════════════════════════╝                                ║
                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Flujo de un Request Típico (ejemplo: cargar productos)

```
1. ProductListPage.vue monta
2. → products.store.ts → fetchProducts()
3. → products.service.ts → getProducts(params)
4. → apiClient.ts interceptor:
     a. invoke('get_access_token') → Rust lee secure store → retorna token
     b. Si token expira pronto → invoke('get_refresh_token') → refresh via API → invoke('store_tokens')
     c. Setea header Authorization: Bearer {token}
5. → axios.get('https://jamrock-api.up.railway.app/api/products/', { params, headers })
6. → Django procesa → responde JSON paginado
7. → apiClient.ts interceptor response → retorna data
8. → products.store.ts → actualiza state
9. → ProductListPage.vue → re-render reactivo
```

---

## 9. Arquitectura de Stores (Pinia)

### 9.1 `auth.store.ts`

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  loginError: string | null;
}

// Actions principales:
// login(credentials) → POST /auth/login/ → store_tokens (Rust) → verify admin
// logout() → clear_tokens (Rust) → $reset()
// checkAuth() → get_access_token (Rust) → verify-admin → actualizar state
// refreshToken() → get_refresh_token (Rust) → POST /auth/token/refresh/ → store_tokens (Rust)
```

**Diferencia con frontend web**: NO usa localStorage. Los tokens viven en el secure store de Tauri vía IPC commands.

### 9.2 `products.store.ts`

```typescript
interface ProductsState {
  products: PaginatedResponse<Product>;
  currentProduct: Product | null;
  categories: Category[];
  isLoading: boolean;
  filters: ProductFilters;
}

// Getters:
// filteredProducts — aplicación de filtros locales sobre results
// categoryTree — categorías organizadas jerárquicamente

// Actions:
// fetchProducts(params?) → GET /products/
// fetchProduct(id) → GET /products/{id}/
// createProduct(data) → POST /products/
// updateProduct(id, data) → PATCH /products/{id}/
// deleteProduct(id) → DELETE /products/{id}/
// fetchCategories() → GET /categories/hierarchical/
```

### 9.3 `orders.store.ts`

```typescript
interface OrdersState {
  orders: PaginatedResponse<Order>;
  currentOrder: Order | null;
  isLoading: boolean;
  filters: OrderFilters;       // search, status, dateRange, sort
  statistics: OrderStatistics; // counts por status
}

// Actions:
// fetchOrders(params?) → GET /orders/
// fetchOrder(id) → GET /orders/{id}/
// updateOrderStatus(id, status) → PATCH /orders/{id}/update_status/
// updateOrderItems(id, items) → PATCH /orders/{id}/items/
// notifyShipping(id) → POST /orders/{id}/notify_shipping/
// createManualOrder(data) → POST /orders/
```

### 9.4 `customers.store.ts`

```typescript
interface CustomersState {
  customers: PaginatedResponse<Customer>;
  currentCustomer: Customer | null;
  isLoading: boolean;
  searchQuery: string;
}

// Actions:
// fetchCustomers(params?) → GET /auth/customers/
// fetchCustomer(id) → GET /auth/customers/{id}/
// createCustomer(data) → POST /auth/customers/
// blockCustomer(id, notes?) → POST /auth/customers/{id}/block/
// unblockCustomer(id, notes?) → POST /auth/customers/{id}/unblock/
// deleteCustomer(id) → DELETE /auth/customers/{id}/
```

### 9.5 `dashboard.store.ts`

```typescript
interface DashboardState {
  statistics: DashboardStats | null;
  visitorStats: VisitorStats | null;
  recentOrders: Record<OrderStatus, Order[]>;
  period: PeriodFilter;
  isLoading: boolean;
}

// Actions:
// fetchDashboardData(period?) → paralelo: statistics + visitors + orders + users
// changePeriod(period) → re-fetch todo
```

### 9.6 `marketing.store.ts`

```typescript
interface MarketingState {
  coupons: PaginatedResponse<Coupon>;
  offers: PaginatedResponse<Offer>;
  bulkPromotions: PaginatedResponse<BulkPromotion>;
  scheduledDiscounts: PaginatedResponse<ScheduledDiscount>;
  isLoading: boolean;
}

// Sub-sections manejados con getters específicos.
// Cada CRUD type tiene sus propias actions.
```

### 9.7 `activity.store.ts`

```typescript
interface ActivityState {
  logs: ActivityLog[];
  stats: ActivityStats | null;
  filters: ActivityFilters;
  isLoading: boolean;
  hasMore: boolean;
}

// Actions:
// fetchLogs(filters?) → GET /activity-logs/
// fetchStats() → GET /activity-logs/stats/
// loadMore() → fetch siguiente página
```

### 9.8 `ui.store.ts`

```typescript
interface UIState {
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light' | 'system';
  activeToasts: Toast[];
  globalLoading: boolean;
  confirmDialog: ConfirmDialogState | null;
}

// Actions:
// toggleSidebar() → también persiste en config local
// setTheme(theme) → aplica + persiste
// showToast(toast) → agrega con auto-dismiss
// showConfirmDialog(options) → retorna Promise<boolean>
```

### 9.9 `config.store.ts`

```typescript
interface ConfigState {
  apiUrl: string;
  autoRefreshInterval: number;
  lastUsername: string;
  dollarRate: DollarRate | null;
  siteConfig: SiteConfig | null;
}

// Actions:
// loadConfig() → invoke('get_config') — carga desde filesystem
// saveConfig(partial) → invoke('set_config') — persiste
// testConnection() → GET /ping/
// fetchDollarRate() → GET /payments/dollar-rates/?is_active=true
// fetchSiteConfig() → GET /site-config/
```

### Diagrama de Dependencias entre Stores

```
                    config.store
                         │
                    ┌────┴────┐
                    ▼         ▼
              auth.store   ui.store
                    │
          ┌────────┼────────┬────────────┐
          ▼        ▼        ▼            ▼
    products   orders   customers   dashboard
    .store     .store   .store      .store
                                        │
                                        ▼
                                   marketing
                                   .store
                                        │
                                        ▼
                                   activity
                                   .store
```

`config.store` y `auth.store` son dependencias raíz — todos los demás stores dependen de tener un API URL configurado y un usuario autenticado.

---

## 10. Arquitectura de Servicios HTTP

### 10.1 `apiClient.ts` — Diferencias con el Frontend Web

| Aspecto | Frontend Web (`apiClient.js`) | Desktop (`apiClient.ts`) |
|---------|------------------------------|--------------------------|
| Language | JavaScript | **TypeScript** |
| Token storage | `localStorage` | **Tauri Secure Store** (vía `invoke()`) |
| Token access | Síncrono (`localStorage.getItem`) | **Asíncrono** (`await invoke('get_access_token')`) |
| Base URL | Hardcodeado a Railway | **Dinámico** desde config store |
| Admin route guard | Interceptor verifica `authState` local | **Interceptor verifica store Pinia** |
| Cache versioning | `localStorage.cacheVersion` | **No necesario** (cada release es clean install) |
| Error redirect | `router.push({ name: 'Login' })` | `router.push('/login')` + **notificación nativa** |
| Maintenance bypass | Complejo con cache | **No aplica** (admin siempre bypasea) |

### 10.2 Interceptor Architecture

```typescript
// Interceptor 1: Auth Header (ASYNC — diferencia clave)
apiClient.interceptors.request.use(async (config) => {
  if (!isAuthEndpoint(config.url)) {
    const token = await getValidToken(); // Involucra IPC con Rust
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  config.timeout = determineTimeout(config.url, config.method);
  return config;
});

// Interceptor 2: Response Error Handler
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await authStore.refreshToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(error.config);
      }
      await authStore.logout();
    }
    // Formatear error para UI
    throw normalizeApiError(error);
  }
);
```

### 10.3 Service Pattern

Cada service file sigue el patrón:

```typescript
// products.service.ts
import apiClient from './apiClient';
import type { Product, PaginatedResponse, ProductFilters } from '@/types';

export const productsService = {
  async getProducts(params?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const { data } = await apiClient.get('/products/', { params });
    return data;
  },

  async getProduct(id: number): Promise<Product> {
    const { data } = await apiClient.get(`/products/${id}/`);
    return data;
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const { data } = await apiClient.post('/products/', product);
    return data;
  },

  async updateProduct(id: number, product: Partial<Product>): Promise<Product> {
    const { data } = await apiClient.patch(`/products/${id}/`, product);
    return data;
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}/`);
  },
};
```

**Convención**: Cada servicio exporta un objeto con métodos (no funciones sueltas) para mejor organización y autocompletado.

---

## 11. Arquitectura de Routing

### 11.1 Definición de Rutas

```typescript
// router/routes.ts
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // ── Auth (sin sidebar) ──
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { layout: 'auth', requiresGuest: true },
  },

  // ── Admin (con sidebar) ──
  {
    path: '/',
    redirect: '/dashboard',
    meta: { layout: 'admin', requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
      },

      // Productos
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/pages/products/ProductListPage.vue'),
      },
      {
        path: 'products/new',
        name: 'ProductCreate',
        component: () => import('@/pages/products/ProductFormPage.vue'),
      },
      {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        component: () => import('@/pages/products/ProductFormPage.vue'),
        props: true,
      },

      // Pedidos
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/pages/orders/OrderListPage.vue'),
      },
      {
        path: 'orders/new-sale',
        name: 'NewSale',
        component: () => import('@/pages/orders/NewSalePage.vue'),
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/pages/orders/OrderDetailPage.vue'),
        props: true,
      },
      {
        path: 'orders/:id/print',
        name: 'PrintOrder',
        component: () => import('@/pages/orders/PrintOrderPage.vue'),
        props: true,
      },

      // Clientes
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/pages/customers/CustomerListPage.vue'),
      },
      {
        path: 'customers/new',
        name: 'CustomerCreate',
        component: () => import('@/pages/customers/CustomerCreatePage.vue'),
      },
      {
        path: 'customers/:id',
        name: 'CustomerDetail',
        component: () => import('@/pages/customers/CustomerDetailPage.vue'),
        props: true,
      },

      // Marketing
      {
        path: 'coupons',
        name: 'Coupons',
        component: () => import('@/pages/marketing/CouponsPage.vue'),
      },
      {
        path: 'offers',
        name: 'Offers',
        component: () => import('@/pages/marketing/OffersPage.vue'),
      },
      {
        path: 'promotions',
        name: 'BulkPromotions',
        component: () => import('@/pages/marketing/BulkPromotionsPage.vue'),
      },
      {
        path: 'scheduled-discounts',
        name: 'ScheduledDiscounts',
        component: () => import('@/pages/marketing/ScheduledDiscountsPage.vue'),
      },

      // Analytics
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/pages/analytics/StatsPage.vue'),
      },
      {
        path: 'activity',
        name: 'Activity',
        component: () => import('@/pages/analytics/ActivityPage.vue'),
      },

      // Gestión
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/pages/categories/CategoriesPage.vue'),
      },
      {
        path: 'reviews',
        name: 'Reviews',
        component: () => import('@/pages/reviews/ReviewsPage.vue'),
      },
      {
        path: 'abandoned-carts',
        name: 'AbandonedCarts',
        component: () => import('@/pages/abandoned-carts/AbandonedCartsPage.vue'),
      },

      // Settings
      {
        path: 'settings/store',
        name: 'StoreSettings',
        component: () => import('@/pages/settings/StoreSettingsPage.vue'),
      },
      {
        path: 'settings/app',
        name: 'AppSettings',
        component: () => import('@/pages/settings/AppSettingsPage.vue'),
      },
    ],
  },

  // ── Catch-all ──
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];
```

### 11.2 Navigation Guards

```typescript
// router/index.ts
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore();

  // 1. Si va al login y ya está autenticado → dashboard
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return '/dashboard';
  }

  // 2. Si requiere auth y no está autenticado → login
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Intentar restaurar sesión desde secure store
    const restored = await authStore.checkAuth();
    if (!restored) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }

  // 3. Si requiere admin y no es admin → login con error
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return '/login';
  }
});
```

### 11.3 Sidebar Navigation Map

```typescript
const sidebarSections = [
  {
    title: 'Principal',
    items: [
      { name: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard' },
    ]
  },
  {
    title: 'Ventas',
    items: [
      { name: 'Pedidos', icon: 'ShoppingBag', route: '/orders' },
      { name: 'Nueva Venta', icon: 'PlusCircle', route: '/orders/new-sale' },
      { name: 'Carritos Abandonados', icon: 'ShoppingCart', route: '/abandoned-carts' },
    ]
  },
  {
    title: 'Catálogo',
    items: [
      { name: 'Productos', icon: 'Package', route: '/products' },
      { name: 'Categorías', icon: 'FolderTree', route: '/categories' },
      { name: 'Reseñas', icon: 'Star', route: '/reviews' },
    ]
  },
  {
    title: 'Clientes',
    items: [
      { name: 'Lista de Clientes', icon: 'Users', route: '/customers' },
    ]
  },
  {
    title: 'Marketing',
    items: [
      { name: 'Cupones', icon: 'Ticket', route: '/coupons' },
      { name: 'Ofertas', icon: 'Percent', route: '/offers' },
      { name: 'Promociones', icon: 'Gift', route: '/promotions' },
      { name: 'Descuentos Programados', icon: 'Calendar', route: '/scheduled-discounts' },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Estadísticas', icon: 'BarChart3', route: '/stats' },
      { name: 'Actividad', icon: 'Activity', route: '/activity' },
    ]
  },
  {
    title: 'Configuración',
    items: [
      { name: 'Mi Tienda', icon: 'Store', route: '/settings/store' },
      { name: 'App Desktop', icon: 'Settings', route: '/settings/app' },
    ]
  },
];
```

---

## 12. Mapa de Componentes por Feature

### 12.1 Dashboard

```
DashboardPage.vue
├── PeriodSelector.vue          (compartido con StatsPage)
├── StatCard.vue × 6            (visitors, users, sales, billing, avg ticket, abandoned)
├── RevenueChart.vue            (Chart.js bar+line)
├── CustomersChart.vue          (Chart.js doughnut)
└── OrdersByStatusTable.vue × 4 (pending, paid, payment_pending, cancelled)
```

### 12.2 Productos

```
ProductListPage.vue
├── AppSearchInput.vue
├── AppSelect.vue × 4           (categoría, precio, stock, disponibilidad)
├── ProductTable.vue
│   ├── AppBadge.vue             (descuento, promo)
│   └── AppDropdown.vue          (acciones: editar, quick-edit, eliminar)
├── ProductQuickEdit.vue         (modal: precio + stock inline)
├── AppPagination.vue
└── AppConfirmDialog.vue         (confirmar eliminación)

ProductFormPage.vue
├── ProductFormFields.vue        (nombre, marca, descripción, categoría, volumen)
├── RichTextEditor.vue           (contenteditable con toolbar)
├── VariantEditor.vue            (categorías → opciones con precio/stock)
├── ImageUploader.vue            (Cloudinary upload + paste + preview)
└── AppButton.vue                (guardar, cancelar)
```

### 12.3 Pedidos

```
OrderListPage.vue
├── AppSearchInput.vue
├── OrderStatusTabs.vue          (tabs con contadores por status)
├── DateRangeSelector.vue        (presets + custom range)
├── OrderTable.vue
│   ├── OrderStatusBadge.vue
│   └── expandable row: OrderItemsList.vue
├── AppPagination.vue
└── ShippingNotifyDialog.vue

OrderDetailPage.vue
├── OrderTimeline.vue            (barra de progreso animada)
├── OrderItemsList.vue           (con badges de variante/promo)
├── CustomerInfoCard.vue
├── PaymentInfoCard.vue          (MercadoPago details)
├── OrderActionButtons.vue       (mark paid, ship, refund, cancel)
└── PrintableInvoice.vue         (componente de impresión)
```

### 12.4 Clientes

```
CustomerListPage.vue
├── AppSearchInput.vue
├── CustomerTable.vue
│   └── AppDropdown.vue          (ver, bloquear, contactar, eliminar)
├── AppPagination.vue
├── CustomerContactModal.vue
├── CustomerBlockDialog.vue      (con campo admin_notes)
└── AppConfirmDialog.vue         (eliminar)

CustomerDetailPage.vue
├── CustomerProfileCard.vue      (avatar, stats)
├── Tabs:
│   ├── CustomerInfoTab.vue
│   └── CustomerOrdersTab.vue
└── CustomerActionButtons.vue    (bloquear, desbloquear)
```

### 12.5 Marketing

```
CouponsPage.vue
├── CouponForm.vue               (modal crear/editar)
│   └── CategoryMultiSelect.vue
├── AppTable.vue                 (lista de cupones)
└── CouponUsageModal.vue         (tracking de uso)

OffersPage.vue
├── OfferForm.vue                (modal con product selector)
│   ├── ProductSearchSelect.vue  (búsqueda individual)
│   └── CategoryBatchSelect.vue  (selección por categoría)
└── AppTable.vue                 (lista de ofertas)

BulkPromotionsPage.vue
├── PromotionForm.vue
└── AppTable.vue

ScheduledDiscountsPage.vue
├── ScheduledDiscountForm.vue
│   └── DayOfWeekSelect.vue
├── AppTable.vue
└── CronjobPreview.vue           (preview del estado actual)
```

---

## 13. Configuración CORS del Backend Django

### Cambios Exactos Requeridos en `backend/core/settings.py`

#### Agregar orígenes Tauri a `CORS_ALLOWED_ORIGINS`:

```python
# Línea ~73 en settings.py — dentro de CORS_ALLOWED_ORIGINS:
CORS_ALLOWED_ORIGINS = [
    # ... orígenes existentes ...
    "https://jamrockgrowshop.com.ar",
    "https://blog.jamrockgrowshop.com.ar",

    # Tauri Desktop App (agregar estas 3 líneas):
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost",
]
```

#### Agregar a `CSRF_TRUSTED_ORIGINS`:

```python
# Línea ~108 en settings.py — dentro de CSRF_TRUSTED_ORIGINS:
CSRF_TRUSTED_ORIGINS = [
    # ... orígenes existentes ...

    # Tauri Desktop App (agregar estas 3 líneas):
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost",
]
```

#### Verificar que `CORS_ALLOW_CREDENTIALS` esté habilitado:
```python
CORS_ALLOW_CREDENTIALS = True  # Ya está configurado ✅
```

#### Verificar que los métodos HTTP necesarios estén permitidos:
```python
CORS_ALLOW_METHODS = [
    'DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT',
]  # Ya está configurado ✅
```

**Nota**: En desarrollo local (`DEBUG = True`), `CORS_ALLOW_ALL_ORIGINS = True` ya permite cualquier origen, por lo que no se necesitan cambios adicionales para dev.

---

## 14. Convenciones y Estándares

### 14.1 Nomenclatura de Archivos

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componentes Vue | PascalCase `.vue` | `ProductTable.vue`, `AppButton.vue` |
| Páginas | PascalCase + `Page` suffix | `ProductListPage.vue` |
| Layouts | PascalCase + `Layout` suffix | `AdminLayout.vue` |
| Stores Pinia | kebab-case + `.store.ts` | `products.store.ts` |
| Services | kebab-case + `.service.ts` | `products.service.ts` |
| Composables | camelCase `use` prefix | `usePagination.ts` |
| Types | kebab-case `.ts` | `products.ts`, `orders.ts` |
| Utils | kebab-case `.ts` | `format.ts`, `constants.ts` |

### 14.2 Componentes Vue

```vue
<!-- Plantilla estándar de componente -->
<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from 'vue';
import type { Product } from '@/types';

// 2. Props & Emits
const props = defineProps<{
  product: Product;
  editable?: boolean;
}>();

const emit = defineEmits<{
  update: [product: Product];
  delete: [id: number];
}>();

// 3. Composables
const { showToast } = useToast();

// 4. Reactive state
const isLoading = ref(false);

// 5. Computed
const displayPrice = computed(() => formatPrice(props.product.final_price));

// 6. Methods
async function handleSave() { /* ... */ }

// 7. Lifecycle
onMounted(() => { /* ... */ });
</script>

<template>
  <!-- Tailwind classes, sin Bootstrap -->
</template>
```

### 14.3 TypeScript Interfaces

```typescript
// types/products.ts
export interface Product {
  id: number;
  name: string;
  brand: string;
  description: string;
  category: number;
  category_name: string;
  price: number;
  final_price: number;
  discount: number;
  total_discount: number;
  stock: number;
  is_available: boolean;
  currency: 'ARS' | 'USD';
  image: string | null;
  image2: string | null;
  variants: Variant[];
  has_special_promotion: boolean;
  special_promotion_name: string | null;
  sku: string;
  volume: string | null;
  dimensions: string | null;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  variant_name: string;
  options: VariantOption[];
}

export interface VariantOption {
  name: string;
  stock: number;
  price_adjustment: number;
  sku?: string;
}

export interface Category {
  id: number;
  name: string;
  parent: number | null;
  children?: Category[];
  product_count?: number;
}
```

### 14.4 Manejo de Errores

```typescript
// types/api.ts
export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, string[]>;
  isTimeout?: boolean;
  isNetworkError?: boolean;
}

// En los services, normalizar errores:
function normalizeApiError(error: AxiosError): ApiError {
  if (error.code === 'ECONNABORTED') {
    return { status: 0, message: 'La solicitud tardó demasiado', isTimeout: true };
  }
  if (error.message === 'Network Error') {
    return { status: 0, message: 'Sin conexión al servidor', isNetworkError: true };
  }
  return {
    status: error.response?.status || 0,
    message: error.response?.data?.error || error.response?.data?.message || 'Error desconocido',
    details: error.response?.data?.details,
  };
}
```

### 14.5 Constants

```typescript
// utils/constants.ts
export const ORDER_STATUSES = {
  pending: { label: 'Pendiente', color: 'yellow', icon: 'Clock' },
  payment_pending: { label: 'Pago Pendiente', color: 'orange', icon: 'CreditCard' },
  paid: { label: 'Pagado', color: 'green', icon: 'CheckCircle' },
  shipped: { label: 'Enviado', color: 'blue', icon: 'Truck' },
  delivered: { label: 'Entregado', color: 'emerald', icon: 'Package' },
  completed: { label: 'Completado', color: 'green', icon: 'CheckCircle2' },
  cancelled: { label: 'Cancelado', color: 'red', icon: 'XCircle' },
} as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
] as const;

export const CURRENCIES = {
  ARS: { symbol: '$', name: 'Peso Argentino' },
  USD: { symbol: 'US$', name: 'Dólar Estadounidense' },
} as const;
```

---

## 15. Consideraciones de Performance

### 15.1 Startup Rápido

| Optimización | Cómo |
|-------------|------|
| Ventana visible rápido | Tauri muestra la ventana inmediatamente, Vue monta con skeleton |
| Auth check en paralelo | Mientras Vue monta, `invoke('get_access_token')` corre en paralelo |
| Lazy loading de rutas | Todas las páginas excepto Login y Dashboard son lazy |
| Pre-fetch de datos | Dashboard pre-carga estadísticas mientras se renderiza el layout |

### 15.2 Runtime

| Optimización | Cómo |
|-------------|------|
| Paginación server-side | Todos los listados usan `?page=N&page_size=M` |
| Debounce en búsquedas | 300ms debounce en todos los inputs de search |
| Virtual scrolling | Para listas muy largas (>100 items visibles), usar `vue-virtual-scroller` |
| Image optimization | URLs de Cloudinary con transformaciones (`w_100,h_100,c_thumb`) |
| Minimal re-renders | `shallowRef` para listas grandes, `computed` para datos derivados |

### 15.3 Memoria

| Optimización | Cómo |
|-------------|------|
| Cleanup de intervals | `onUnmounted` limpia todos los `setInterval` de auto-refresh |
| Store reset on logout | `$reset()` en todos los stores al hacer logout |
| Chart cleanup | `destroy()` en instancias Chart.js al desmontar |
| No memory leaks IPC | Tauri commands son fire-and-forget, no mantienen suscripciones |

### 15.4 Bundle Size Target

| Componente | Target |
|------------|--------|
| Rust binary (`.exe`) | ~8-12 MB |
| Frontend bundle (JS + CSS) | ~500 KB gzipped |
| Total installer (NSIS) | ~15-20 MB |

Comparativa: Electron app equivalente sería ~150-200 MB.

---

## Apéndice A — Mapping Frontend Web → Desktop

Referencia rápida de cómo mapean los componentes del frontend web existente a la nueva app desktop:

| Componente Web | Componente Desktop | Notas |
|----------------|-------------------|-------|
| `AdminPanel.vue` (layout) | `AdminLayout.vue` + `TheSidebar.vue` | Rediseñado con Tailwind |
| `AdminOverview.vue` | `DashboardPage.vue` | Misma data, nueva UI |
| `AdminProductList.vue` | `ProductListPage.vue` + `ProductTable.vue` | Descompuesto en componentes |
| `ProductForm.vue` | `ProductFormPage.vue` + sub-components | Formulario modularizado |
| `AdminSalesHistory.vue` | `OrderListPage.vue` + `OrderTable.vue` | Composable `useSales` → store |
| `OrderDetailsPage.vue` | `OrderDetailPage.vue` | Misma lógica, Tailwind UI |
| `AdminNewSale.vue` | `NewSalePage.vue` | Mismo flow POS |
| `AdminCustomersList.vue` | `CustomerListPage.vue` | Composable → store |
| `AdminCoupons.vue` | `CouponsPage.vue` + `CouponForm.vue` | Modal extraído a componente |
| `AdminOffers.vue` | `OffersPage.vue` + `OfferForm.vue` | Modal extraído |
| `AdminScheduledDiscounts.vue` | `ScheduledDiscountsPage.vue` | Misma lógica |
| `AdminStats.vue` | `StatsPage.vue` | Mismos Chart.js |
| `AdminActivity.vue` | `ActivityPage.vue` | Options API → Composition API |
| `AdminCategories.vue` | `CategoriesPage.vue` | Misma lógica |
| `AdminReviews.vue` + `ReviewsManager.vue` | `ReviewsPage.vue` | Unificados |
| `AbandonedCarts.vue` | `AbandonedCartsPage.vue` | Misma lógica |
| `StoreSettings.vue` + `UserSettings.vue` (admin parts) | `StoreSettingsPage.vue` | Unificados (solo admin) |
| `PrintOrder.vue` | `PrintableInvoice.vue` | Adaptado para export PDF |
| `CustomerProfile.vue` | `CustomerDetailPage.vue` | Mismo flow |
| `CreateCustomer.vue` | `CustomerCreatePage.vue` | Vuelidate → VeeValidate + Zod |
| Vuex store | Pinia stores (múltiples) | Descompuesto por dominio |
| `apiClient.js` | `apiClient.ts` | TypeScript + Tauri IPC para tokens |
| `localStorage` (tokens) | Tauri Secure Store | Encriptación a nivel de SO |
| Bootstrap 5 | Tailwind CSS | Rediseño completo de estilos |
| `js-cookie` (cart) | **No aplica** | Desktop no maneja carrito de clientes |
| `vue-toastification` | Custom `AppToast.vue` + composable | O seguir con vue-toastification |

## Apéndice B — Prioridades de Implementación

### Fase 1 — MVP (Prompts 4-8)
- ✅ Proyecto scaffolding (Tauri + Vue + TS + Tailwind + Pinia)
- ✅ Auth flow completo (login → secure store → admin verify)
- ✅ Layout (sidebar + topbar + routing)
- ✅ Dashboard con stats y gráficos
- ✅ CRUD Productos con variantes e imágenes

### Fase 2 — Core Admin (Prompts 9-11)
- ✅ Gestión de pedidos (listar, detalle, cambio de estado, imprimir)
- ✅ Venta manual (POS)
- ✅ Gestión de clientes
- ✅ Categorías

### Fase 3 — Marketing & Analytics (Prompts 12-14)
- ✅ Cupones, Ofertas, Bulk Promotions, Scheduled Discounts
- ✅ Estadísticas y gráficos
- ✅ Activity logs
- ✅ Reseñas y Carritos abandonados

### Fase 4 — Polish (Prompt 15)
- ✅ Store settings + App settings
- ✅ Export PDF/CSV
- ✅ Auto-update
- ✅ Notificaciones nativas
- ✅ Dark mode
- ✅ Testing y build final (.exe)
