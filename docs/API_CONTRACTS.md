# API Contracts — JamRock GrowShop Backend

> **Generado automáticamente** a partir del análisis del backend Django REST.
> Base URL: `https://jamrock-api.up.railway.app` (prod) / `http://localhost:8000` (dev)
> Todas las rutas tienen prefijo `/api/` salvo que se indique lo contrario.

---

## Índice

1. [Autenticación & JWT](#1-autenticación--jwt)
2. [Usuarios / Clientes (Admin)](#2-usuarios--clientes-admin)
3. [Productos](#3-productos)
4. [Categorías](#4-categorías)
5. [Reseñas de Productos](#5-reseñas-de-productos)
6. [Órdenes](#6-órdenes)
7. [Carritos Abandonados (Nuevo Sistema)](#7-carritos-abandonados-nuevo-sistema)
8. [Pagos (MercadoPago)](#8-pagos-mercadopago)
9. [Marketing — Cupones](#9-marketing--cupones)
10. [Marketing — Ofertas](#10-marketing--ofertas)
11. [Marketing — Promociones por Cantidad (Bulk)](#11-marketing--promociones-por-cantidad-bulk)
12. [Marketing — Descuentos Programados](#12-marketing--descuentos-programados)
13. [Notificaciones Push (Firebase)](#13-notificaciones-push-firebase)
14. [Estadísticas & Analytics](#14-estadísticas--analytics)
15. [Configuración del Sitio](#15-configuración-del-sitio)
16. [Actividad & Logs](#16-actividad--logs)
17. [Visitantes](#17-visitantes)
18. [Dólar / Tasa de Cambio](#18-dólar--tasa-de-cambio)
19. [Centros de Distribución](#19-centros-de-distribución)
20. [Sincronización Google Sheets](#20-sincronización-google-sheets)
21. [Mantenimiento](#21-mantenimiento)
22. [Email](#22-email)
23. [Health & CronJobs](#23-health--cronjobs)
24. [Modelos de Datos (Schemas)](#24-modelos-de-datos-schemas)
25. [Flujos de Negocio Críticos](#25-flujos-de-negocio-críticos)

---

## Convenciones Globales

### Autenticación JWT

| Concepto | Valor |
|---|---|
| Tipo | Bearer Token (SimpleJWT) |
| Header | `Authorization: Bearer <access_token>` |
| Access Token TTL | 1 hora |
| Refresh Token TTL | 7 días |
| Rotación | Sí (`ROTATE_REFRESH_TOKENS: true`) |
| Blacklist | Sí (`BLACKLIST_AFTER_ROTATION: true`) |
| Algoritmo | HS256 |

### Paginación por defecto

```json
{
  "count": 100,
  "next": "https://…?page=2",
  "previous": null,
  "results": [...]
}
```

- `page_size` por defecto: 24 (productos), 10 (órdenes), 6 (activity-logs)
- Parámetro: `?page=N&page_size=M`

### Throttling

| Scope | Límite |
|---|---|
| `anon` | 100/hour |
| `user` | 1000/hour |
| `register` | 5/hour |
| `login` | 10/minute |
| `change_password` | 5/hour |
| `profile_update` | 30/hour |
| `product_create` | 100/day |
| `order_create` | 50/day |

### Permisos Reutilizables

| Permiso | Descripción |
|---|---|
| `IsAdminOrReadOnly` | GET para todos, escritura solo admin/staff |
| `IsAdminOrOwner` | Admin ve todo, usuario solo sus propios objetos |
| `ReadOnlyOrAuthenticated` | GET público, otros métodos requieren auth |

---

## 1. Autenticación & JWT

### POST `/api/auth/register/`
> Registro de nuevo usuario. El usuario se crea inactivo hasta verificar email.

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |
| Throttle | `register` (5/hour) |

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "password2": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string"
}
```

**Response 201:**
```json
{
  "message": "Usuario registrado. Por favor verifica tu email para activar tu cuenta.",
  "user_id": 1,
  "email": "user@example.com"
}
```

**Response 200 (usuario inactivo existente):**
```json
{
  "message": "Ya existe una cuenta con este email o usuario sin validar. Te reenviamos el código de verificación.",
  "user_id": 1,
  "email": "user@example.com",
  "resend": true
}
```

**Response 400:**
```json
{ "error": ["Este email ya está registrado"] }
```

---

### POST `/api/auth/login/`
> Login con username o email. Soporta vinculación de carrito anónimo.

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |
| Throttle | `login` (10/min) |

**Request Body:**
```json
{
  "username": "string (username o email)",
  "password": "string",
  "anonymous_cart_id": "string (opcional, UUID del carrito anónimo)"
}
```

**Response 200:**
```json
{
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "is_staff": false,
    "is_superuser": false
  },
  "refresh": "string",
  "access": "string",
  "is_staff": false,
  "is_admin": false,
  "cart_linked": true,
  "cart_id": 5
}
```

**Response 401:** `{ "error": "Credenciales inválidas" }`

**Response 403 (email no verificado):**
```json
{ "error": "email_not_verified", "email": "user@example.com" }
```

---

### POST `/api/token/`
> Obtener par de tokens JWT (SimpleJWT TokenObtainPairView).

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |

**Request Body:**
```json
{ "username": "string", "password": "string" }
```

**Response 200:**
```json
{ "access": "string", "refresh": "string" }
```

---

### POST `/api/auth/token/refresh/`
> Refrescar access token usando refresh token.

**Request Body:**
```json
{ "refresh": "string" }
```

**Response 200:**
```json
{ "access": "string", "refresh": "string (nuevo, por rotación)" }
```

---

### GET `/api/auth/me/`
> Obtener perfil del usuario autenticado.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Response 200:**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "is_staff": true,
  "is_superuser": false
}
```

---

### PUT `/api/auth/me/`
> Actualizar perfil. Cambio de email requiere código de verificación.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |
| Throttle | `profile_update` (30/hour) |

**Request Body:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "new@email.com",
  "verification_code": "123456"
}
```

---

### POST `/api/auth/change-password/`
> Cambiar contraseña. Devuelve nuevos tokens.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |
| Throttle | `change_password` (5/hour) |

**Request Body:**
```json
{ "old_password": "string", "new_password": "string" }
```

**Response 200:**
```json
{
  "message": "Contraseña actualizada correctamente",
  "access": "string",
  "refresh": "string"
}
```

---

### POST `/api/auth/verify-email/`
> Verificar email con código de 6 dígitos. Activa la cuenta y devuelve tokens.

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |

**Request Body:**
```json
{
  "code": "123456",
  "email": "user@example.com",
  "anonymous_cart_id": "string (opcional)"
}
```

**Response 200:**
```json
{
  "message": "Email verificado exitosamente",
  "token": "string (access)",
  "refresh": "string",
  "cart_linked": true,
  "cart_id": 5
}
```

---

### POST `/api/auth/resend-verification/`
> Reenviar código de verificación.

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |

**Request Body:**
```json
{ "email": "user@example.com" }
```

---

### POST `/api/auth/verify-change/`
> Solicitar código de verificación para cambio de email o contraseña.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{
  "type": "EMAIL_CHANGE | PASSWORD_CHANGE",
  "new_email": "new@email.com",
  "password": "current_password"
}
```

---

### POST `/api/auth/request-password-reset/`
> Solicitar restablecimiento de contraseña por email.

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |

**Request Body:**
```json
{ "email": "user@example.com" }
```

---

### POST `/api/auth/verify-password-reset/`
> Verificar código y establecer nueva contraseña. Devuelve tokens.

| Campo | Valor |
|---|---|
| Auth | ❌ No requerida |

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "string"
}
```

**Response 200:**
```json
{
  "message": "Contraseña actualizada correctamente",
  "access": "string",
  "refresh": "string"
}
```

---

### GET `/api/auth/verify-admin/`
> Verificar si el usuario actual es administrador.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Response 200 (admin):**
```json
{ "is_admin": true, "is_staff": true, "username": "string", "message": "User has admin permissions" }
```

**Response 403 (no admin):**
```json
{ "is_admin": false, "is_staff": false, "message": "User is not an administrator" }
```

---

## 2. Usuarios / Clientes (Admin)

> Router: `/api/auth/customers/` — Solo accesible por `IsAdminUser`.

### GET `/api/auth/customers/`
> Listar todos los clientes con estadísticas de compra.

| Campo | Valor |
|---|---|
| Auth | ✅ Admin |
| Filtros | `?search=texto` (busca en username, email, first_name, last_name, dni) |

**Response Item:**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "dni": "string",
  "name": "First Last",
  "date_joined": "2024-01-01T00:00:00Z",
  "total_orders": 5,
  "total_spent": "15000.00",
  "last_purchase": "2024-06-01T00:00:00Z",
  "is_active": true,
  "admin_notes": "string"
}
```

### POST `/api/auth/customers/`
> Crear cliente desde panel admin (sin verificación de email).

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "dni": "string (opcional)"
}
```

### GET `/api/auth/customers/{id}/`
> Detalle de un cliente.

### DELETE `/api/auth/customers/{id}/`
> Eliminar un cliente (no permite eliminar admins ni a sí mismo).

### GET `/api/auth/customers/{id}/orders/`
> Obtener todas las órdenes de un cliente específico.

### POST `/api/auth/customers/{id}/block/`
> Bloquear un cliente.

**Request Body:**
```json
{ "admin_notes": "Razón del bloqueo (máx 40 chars)" }
```

### POST `/api/auth/customers/{id}/unblock/`
> Desbloquear un cliente.

---

## 3. Productos

> Router: `/api/products/` — Lectura pública, escritura admin.
> Permiso: `IsAdminOrReadOnly`

### GET `/api/products/`
> Listar productos con paginación y filtros.

| Campo | Valor |
|---|---|
| Auth | ❌ Pública (admin ve todos incluso no disponibles) |
| Paginación | 24 por página (12 si filtro categoría) |
| Serializer | `ProductListSerializer` (optimizado) |

**Query Params:**

| Param | Tipo | Descripción |
|---|---|---|
| `category_name` | string | Filtrar por nombre de categoría (case insensitive) |
| `search` | string | Búsqueda accent-insensitive en name, brand, category |
| `is_available` | bool | Solo para staff |
| `stock_filter` | enum | `in_stock`, `low_stock`, `out_of_stock` |
| `price_filter` | enum | `with_price`, `without_price`, `on_sale` |
| `on_sale` | bool | Productos con descuento, oferta activa o promoción especial |
| `page` | int | Página |
| `page_size` | int | Tamaño de página (máx 100) |

**Response Item (ProductList):**
```json
{
  "id": 1,
  "name": "string",
  "brand": "string",
  "price": "1500.00",
  "currency": "ARS",
  "stock": 10,
  "image": "https://res.cloudinary.com/...",
  "is_available": true,
  "discount": 10,
  "category_name": "Fertilizantes",
  "has_variants": true,
  "variants": [
    {
      "variant_name": "Color",
      "options": [
        { "name": "Rojo", "stock": 5, "price_adjustment": "100.00" }
      ]
    }
  ],
  "final_price": "1350.00",
  "total_discount": 10,
  "has_special_promotion": false,
  "special_promotion_name": null
}
```

---

### GET `/api/products/{id}/`
> Detalle completo de un producto.

| Campo | Valor |
|---|---|
| Auth | ❌ Pública (verifica disponibilidad para no-staff) |
| Serializer | `ProductSerializer` (completo) |

**Response (ProductDetail):**
```json
{
  "id": 1,
  "name": "string",
  "brand": "string",
  "description": "string",
  "category": { "id": 1, "name": "string", "parent": null, "slug": "string" },
  "category_name": "string",
  "price": "1500.00",
  "currency": "ARS",
  "discount": 10,
  "final_price": "1350.00",
  "total_discount": 10,
  "stock": 10,
  "total_stock": 15,
  "has_variants": true,
  "variants": [...],
  "volume": "1L",
  "dimensions": "10x20x30",
  "image": "https://...",
  "image_2": "https://...",
  "is_available": true,
  "active_offers": [...],
  "has_special_promotion": false,
  "special_promotion_name": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-06-01T00:00:00Z"
}
```

---

### POST `/api/products/`
> Crear producto (admin).

| Campo | Valor |
|---|---|
| Auth | ✅ Admin |
| Throttle | `product_create` (100/day) |
| Content-Type | `multipart/form-data` (para imágenes) |

**Request Body:** Mismos campos que ProductDetail (sin `id`, `final_price`, `total_discount`, `active_offers`).

---

### PUT/PATCH `/api/products/{id}/`
> Actualizar producto (admin). Soporta actualización parcial con PATCH.

| Campo | Valor |
|---|---|
| Auth | ✅ Admin |

---

### DELETE `/api/products/{id}/`
> Eliminar producto (admin).

| Campo | Valor |
|---|---|
| Auth | ✅ Admin (is_staff o is_superuser) |

**Response 204:**
```json
{ "message": "Producto 'Nombre' eliminado exitosamente" }
```

---

### GET `/api/products/on-sale/`
> Productos en oferta (con descuento directo, oferta activa o promoción especial). Paginado.

### GET `/api/products/on-sale-fast/`
> Versión optimizada con caché (5 minutos). Sin paginación.

### GET `/api/products/on-sale-simple/`
> Solo productos con descuento directo (sin ofertas de marketing). Paginado.

### GET `/api/products/by-category/`
> Filtrado optimizado por categoría con índices.

| Param | Tipo | Requerido |
|---|---|---|
| `category_name` | string | ✅ |
| `search` | string | ❌ |

### GET `/api/products/{id}/related/`
> Productos relacionados (misma categoría + misma marca, hasta 8).

### GET `/api/products/categories/`
> Lista simple de todas las categorías.

### GET `/api/products/hierarchical/`
> Categorías jerárquicas con conteo de productos. Cacheado 10 minutos.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Fertilizantes",
    "product_count": 45,
    "children": [
      { "id": 2, "name": "Orgánicos", "product_count": 20 }
    ]
  }
]
```

---

### Sincronización con Google Sheets (bajo `/api/products/`)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| POST | `/api/products/sync/` | Admin | Sincronizar un producto |
| POST | `/api/products/sync/bulk/` | Admin | Sincronización masiva |
| POST | `/api/products/sync/pull/` | Admin | Pull desde Sheets |
| GET | `/api/products/sync/status/` | Admin | Estado de sincronización |
| GET | `/api/products/sync/validate/` | Admin | Validar integridad |
| DELETE | `/api/products/sync/{product_id}/` | Admin | Eliminar sync de producto |

---

## 4. Categorías

> Router: `/api/categories/` — Lectura pública, escritura admin.

### GET `/api/categories/`
> Listar todas las categorías (sin paginación).

**Response Item:**
```json
{ "id": 1, "name": "string", "parent": null, "slug": "string" }
```

### POST `/api/categories/`
> Crear categoría (admin). Invalida caché.

### PUT/PATCH `/api/categories/{id}/`
> Actualizar categoría (admin). Invalida caché.

### DELETE `/api/categories/{id}/`
> Eliminar categoría (admin). Falla si tiene productos asociados.

### GET `/api/categories/hierarchical/`
> Categorías jerárquicas con conteo y slugs. Cacheado.

**Response:**
```json
[
  {
    "id": 1,
    "name": "string",
    "slug": "string",
    "product_count": 45,
    "children": [
      { "id": 2, "name": "string", "slug": "string", "product_count": 20 }
    ]
  }
]
```

---

## 5. Reseñas de Productos

> Router: `/api/reviews/` — Lectura pública (solo aprobadas), escritura autenticado.

### GET `/api/reviews/`
> Listar reseñas aprobadas (admin ve todas).

### POST `/api/reviews/`
> Crear reseña (usuario autenticado, se asigna auto).

**Request Body:**
```json
{
  "product": 1,
  "rating": 5,
  "comment": "Excelente producto"
}
```

### GET `/api/reviews/for_product/?product_id=1`
> Reseñas de un producto específico.

### GET `/api/reviews/my_reviews/`
> Reseñas del usuario autenticado.

### GET `/api/reviews/has_reviewed/?product_id=1`
> Verificar si el usuario ya reseñó un producto.

**Response:**
```json
{ "exists": true, "review": {...} }
```

### GET `/api/reviews/pending/` *(Admin)*
> Reseñas pendientes de aprobación.

### PATCH `/api/reviews/{id}/approve/` *(Admin)*
> Aprobar reseña.

### PATCH `/api/reviews/{id}/reject/` *(Admin)*
> Rechazar reseña.

---

## 6. Órdenes

> Router: `/api/orders/` — Auth requerida. Admin ve todas, usuario ve las suyas.
> Paginación: 10 por página.

### GET `/api/orders/`
> Listar órdenes con filtros.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token (admin ve todas, user solo las suyas) |

**Query Params:**

| Param | Tipo | Descripción |
|---|---|---|
| `status` | enum | `pending`, `payment_pending`, `paid`, `shipped`, `cancelled`, `archived`, `abandoned` |
| `search` | string | Busca en recipient_name, customer_email, id |
| `customer_id` | int | Solo admin: filtrar por cliente |
| `start_date` | date | Fecha inicio |
| `end_date` | date | Fecha fin |
| `exclude_temporary` | bool | Default `true`: excluye carritos temporales |

**Response Item (Order):**
```json
{
  "id": 1,
  "user": 1,
  "recipient_name": "string",
  "customer_dni_cuit": "string",
  "shipping_address": "string",
  "shipping_street": "string",
  "shipping_number": "string",
  "shipping_neighborhood": "string",
  "shipping_city": "string",
  "shipping_postal_code": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "delivery_type": "delivery | pickup",
  "status": "pending",
  "subtotal": "5000.00",
  "discount": "500.00",
  "bulk_promotion_discount": "0.00",
  "total": "4500.00",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "products": [
    {
      "id": 1,
      "product_details": {
        "id": 1,
        "name": "string",
        "image": "https://...",
        "volume": "1L",
        "dimensions": "10x20",
        "currency": "ARS",
        "has_special_promotion": false,
        "special_promotion_name": null
      },
      "quantity": 2,
      "price_at_time": "1500.00",
      "variants": {},
      "variants_label": "Color: Rojo"
    }
  ],
  "shipping_notification_sent": false,
  "coupon": 1,
  "coupon_details": {...},
  "is_temporary": false,
  "anonymous_id": null,
  "last_activity": "2024-01-01T00:00:00Z",
  "payment_method": "cash | online"
}
```

---

### POST `/api/orders/`
> Crear orden. Valida monto mínimo de compra. Envía notificaciones push y emails.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{
  "recipient_name": "string",
  "customer_dni_cuit": "string",
  "shipping_address": "string",
  "shipping_street": "string",
  "shipping_number": "string",
  "shipping_neighborhood": "string",
  "shipping_city": "string",
  "shipping_postal_code": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "delivery_type": "delivery | pickup",
  "payment_method": "cash | online",
  "coupon_code": "string (opcional)",
  "anonymous_id": "string (opcional, para vincular carrito temporal)",
  "products_data": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": "1500.00 (opcional)",
      "variants": {},
      "variants_label": "Color: Rojo"
    }
  ]
}
```

---

### GET `/api/orders/{id}/`
> Detalle de orden.

### PUT/PATCH `/api/orders/{id}/`
> Actualizar orden.

### POST `/api/orders/{id}/cancel/`
> Cancelar orden (solo si status=pending).

### PATCH `/api/orders/{id}/update_status/` *(Admin)*
> Cambiar estado con validación de transiciones permitidas.

**Request Body:**
```json
{ "status": "paid" }
```

**Transiciones válidas:**
- `pending` → `payment_pending`, `paid`, `shipped`, `cancelled`, `archived`
- `payment_pending` → `paid`, `cancelled`
- `paid` → `shipped`, `cancelled`, `archived`
- `shipped` → `archived`
- `cancelled` → `archived`
- `abandoned` → `pending`, `archived`

---

### PATCH `/api/orders/{id}/items/` *(Admin)*
> Actualizar items de una orden (cantidades, eliminar items).

**Request Body:**
```json
{
  "items": [
    { "id": 1, "quantity": 3 }
  ]
}
```

---

### GET `/api/orders/my-orders/`
> Órdenes del usuario autenticado. Paginado.

### GET `/api/orders/statistics/`
> Estadísticas de órdenes por estado.

**Response:**
```json
{
  "total_orders": 100,
  "pending_orders": 5,
  "payment_pending_orders": 3,
  "paid_orders": 50,
  "shipped_orders": 30,
  "completed_orders": 10,
  "cancelled_orders": 2,
  "archived_orders": 0,
  "abandoned_orders": 5,
  "recovered_carts": 3
}
```

### GET `/api/orders/stats/` *(Admin)*
> Conteo por estado con filtros de búsqueda.

**Response:**
```json
{ "counts": { "pending": 5, "paid": 50 }, "total": 100 }
```

### GET `/api/orders/pending/` *(Admin)*
> Órdenes pendientes.

### GET `/api/orders/archived/` *(Admin)*
> Órdenes archivadas.

### POST `/api/orders/{id}/archive/` *(Admin)*
> Archivar orden.

### POST `/api/orders/{id}/unarchive/` *(Admin)*
> Desarchivar orden.

**Request Body (opcional):**
```json
{ "status": "pending" }
```

### POST `/api/orders/{id}/notify_shipping/` *(Admin)*
> Enviar notificación de envío por email.

### POST `/api/orders/{id}/recover_cart/` *(Admin)*
> Recuperar carrito abandonado (orden).

### GET `/api/orders/abandoned_carts/` *(Admin)*
> Listar carritos abandonados (legacy, basado en órdenes).

### POST `/api/orders/mark_abandoned/` *(Admin)*
> Ejecutar identificación manual de carritos abandonados.

### GET `/api/orders/abandoned_statistics/` *(Admin)*
> Estadísticas de abandono.

| Param | Tipo | Descripción |
|---|---|---|
| `period` | enum | `week`, `month`, `quarter`, `year` |

### POST `/api/orders/run_system_update/` *(Admin)*
> Ejecutar actualización del sistema (dólar + carritos abandonados).

**Request Body:**
```json
{
  "skip_dollar": false,
  "skip_carts": false,
  "minutes": 300,
  "dry_run": false
}
```

---

## 7. Carritos Abandonados (Nuevo Sistema)

> Modelo independiente `AbandonedCart`. Endpoints bajo `/api/orders/abandoned-carts/`.

### Endpoints Públicos (sin autenticación)

#### POST `/api/orders/abandoned-carts/public/cart/`
> Crear/actualizar carrito temporal anónimo.

**Request Body (AbandonedCartCreateSerializer):**
```json
{
  "anonymous_id": "uuid-string",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": "1500.00",
      "variants": {},
      "variants_label": "string"
    }
  ],
  "customer_info": {
    "name": "string",
    "email": "string",
    "phone": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "anonymous_id": "uuid",
  "cart_id": 1,
  "message": "Carrito temporal actualizado",
  "status": "success"
}
```

#### GET `/api/orders/abandoned-carts/public/cart/{anonymous_id}/`
> Obtener carrito por anonymous_id.

#### POST `/api/orders/abandoned-carts/public/generate-id/`
> Generar un UUID para carrito anónimo.

**Response:**
```json
{ "success": true, "anonymous_id": "uuid", "status": "success" }
```

---

### Endpoints Admin

> Requieren `IsAdminUser`.

#### GET `/api/orders/abandoned-carts/`
> Listar carritos abandonados.

| Param | Tipo | Descripción |
|---|---|---|
| `user_id` | int | Filtrar por usuario |
| `status` | enum | `active`, `abandoned`, `recovered`, `converted`, `expired` |
| `days` | int | Últimos N días |

**Response Item (AbandonedCart):**
```json
{
  "id": 1,
  "user": 1,
  "anonymous_id": "uuid",
  "status": "abandoned",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "subtotal": "5000.00",
  "discount": "500.00",
  "total": "4500.00",
  "created_at": "2024-01-01T00:00:00Z",
  "last_activity": "2024-01-01T00:00:00Z",
  "abandoned_at": "2024-01-01T05:00:00Z",
  "recovered_at": null,
  "products": [...],
  "coupon_details": null,
  "customer": "Nombre (email)",
  "items_count": 3,
  "time_abandoned": "5 horas"
}
```

#### GET `/api/orders/abandoned-carts/statistics/`
> Estadísticas de carritos abandonados.

| Param | Tipo |
|---|---|
| `period` | `week`, `month`, `quarter`, `year` |
| `start_date` | date |
| `end_date` | date |

**Response (AbandonedCartStatistics):**
```json
{
  "total_count": 100,
  "recovered_count": 15,
  "converted_count": 10,
  "abandoned_count": 60,
  "active_count": 15,
  "average_value": "3500.00",
  "abandonment_rate": 60.0,
  "recovery_rate": 25.0,
  "average_time_to_recovery": "2 hours",
  "most_abandoned_products": [...],
  "period": "month"
}
```

#### POST `/api/orders/abandoned-carts/identify/`
> Ejecutar identificación manual de carritos abandonados.

#### POST `/api/orders/abandoned-carts/{id}/recover/`
> Recuperar carrito abandonado (status → recovered).

#### POST `/api/orders/abandoned-carts/{id}/convert_to_order/`
> Convertir carrito en orden.

#### POST `/api/orders/abandoned-carts/migrate_from_orders/`
> Migrar órdenes abandonadas al nuevo sistema.

---

## 8. Pagos (MercadoPago)

> Prefijo: `/api/payments/`

### POST `/api/payments/create/`
> Crear preferencia de pago en MercadoPago.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{ "order_id": 1 }
```

**Response 200:**
```json
{
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/...",
  "payment_id": 1
}
```

---

### POST `/api/payments/`
> Webhook de MercadoPago (sin autenticación, verificación HMAC).

---

### GET `/api/payments/status/{order_id}/`
> Estado de pago de una orden.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Response:**
```json
{
  "order_id": 1,
  "status": "approved | pending | rejected | refunded",
  "amount": "4500.00",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### POST `/api/payments/refund/` *(Admin)*
> Procesar reembolso vía MercadoPago.

**Request Body:**
```json
{ "order_id": 1 }
```

### POST `/api/payments/check-status/`
> Verificar estado de pago en MercadoPago y actualizar localmente.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{ "order_id": 1 }
```

---

## 9. Marketing — Cupones

> Router: `/api/marketing/coupons/` — Solo Admin.

### GET `/api/marketing/coupons/`
> Listar cupones.

| Param | Tipo |
|---|---|
| `active` | bool |

**Response Item:**
```json
{
  "id": "uuid",
  "code": "DESCUENTO20",
  "type": "percentage | fixed",
  "value": "20.00",
  "max_amount": "5000.00",
  "min_purchase": "1000.00",
  "max_uses": 100,
  "used": 15,
  "expires_at": "2024-12-31T23:59:59Z",
  "active": true,
  "categories": [1, 2],
  "created_at": "...",
  "updated_at": "...",
  "is_expired": false,
  "is_valid": true,
  "usages": [...]
}
```

### POST `/api/marketing/coupons/`
> Crear cupón (admin).

### PUT/PATCH `/api/marketing/coupons/{id}/`
> Actualizar cupón.

### DELETE `/api/marketing/coupons/{id}/`
> Eliminar cupón.

### POST `/api/marketing/coupons/validate/`
> Validar un cupón para una compra. **Auth: Authenticated (no admin).**

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token (cualquier usuario autenticado) |

**Request Body:**
```json
{
  "code": "DESCUENTO20",
  "purchase_amount": "5000.00",
  "products": [
    { "product_id": 1, "quantity": 2 }
  ]
}
```

**Response 200:**
```json
{
  "valid": true,
  "coupon": {...},
  "calculated_discount": 1000.0,
  "eligible_products": [...],
  "discount_base": 5000.0
}
```

### POST `/api/marketing/coupons/{id}/apply/`
> Registrar uso de cupón.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{
  "purchase_amount": "5000.00",
  "order_id": 1,
  "discount_amount": "1000.00"
}
```

### GET `/api/marketing/coupons/{id}/usages/` *(Admin)*
> Historial de usos de un cupón.

---

## 10. Marketing — Ofertas

> Router: `/api/marketing/offers/` — Solo Admin.

### GET `/api/marketing/offers/`
> Listar ofertas.

| Param | Tipo |
|---|---|
| `status` | `active`, `pending`, `expired` |

**Response Item:**
```json
{
  "id": "uuid",
  "name": "Oferta Verano",
  "discount": 25,
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-03-31T23:59:59Z",
  "products": [1, 2, 3],
  "created_at": "...",
  "updated_at": "...",
  "status": "active | pending | expired"
}
```

### POST `/api/marketing/offers/`
> Crear oferta (admin). Aplica descuentos automáticamente si la oferta está activa.

### PUT/PATCH `/api/marketing/offers/{id}/`
> Actualizar oferta.

### DELETE `/api/marketing/offers/{id}/`
> Eliminar oferta.

### GET `/api/marketing/offers/active/` *(Admin)*
> Solo ofertas activas actualmente.

### POST `/api/marketing/offers/check_expired/` *(Admin)*
> Verificar y procesar ofertas expiradas.

---

## 11. Marketing — Promociones por Cantidad (Bulk)

> Router: `/api/marketing/bulk-promotions/` — Lectura pública, escritura admin.

### GET `/api/marketing/bulk-promotions/`
> Listar promociones.

| Param | Tipo |
|---|---|
| `active` | bool |
| `type` | `3x2`, `2x1`, `4x3`, `5x4`, `custom` |

**Response Item (lista):**
```json
{
  "id": "uuid",
  "name": "3x2 en Fertilizantes",
  "description": "string",
  "promotion_type": "3x2",
  "buy_quantity": 3,
  "pay_quantity": 2,
  "start_date": "...",
  "end_date": "...",
  "active": true,
  "priority": 1,
  "max_applications": 1,
  "status": "active",
  "product_count": 10,
  "category_count": 2
}
```

**Response Item (detalle) agrega:**
```json
{
  "products": [1, 2, 3],
  "categories": [1, 2]
}
```

### POST `/api/marketing/bulk-promotions/`
> Crear promoción (admin).

### GET `/api/marketing/bulk-promotions/active/`
> Promociones activas actualmente (público).

### POST `/api/marketing/bulk-promotions/check_product/`
> Verificar si un producto tiene promociones aplicables (público).

**Request Body:**
```json
{ "product_id": 1, "quantity": 3 }
```

**Response:**
```json
{
  "product_id": 1,
  "product_name": "string",
  "quantity": 3,
  "applicable_promotions": [
    {
      "promotion": {...},
      "discount_info": { "discount_amount": 1500, "free_items": 1, "total_before": 4500, "total_after": 3000 },
      "can_apply": true
    }
  ]
}
```

---

## 12. Marketing — Descuentos Programados

> Router: `/api/marketing/scheduled-discounts/` — Solo Admin.

### GET `/api/marketing/scheduled-discounts/`
> Listar descuentos programados por día de la semana.

| Param | Tipo |
|---|---|
| `active` | bool |
| `day` | int (0=Lunes ... 6=Domingo) |
| `category` | int (category_id) |

**Response Item:**
```json
{
  "id": "uuid",
  "name": "Sábados de Sustratos",
  "description": "string",
  "category": 1,
  "category_name": "Sustratos",
  "day_of_week": 5,
  "day_name": "Sábado",
  "discount": "15.00",
  "start_time": "00:00:00",
  "end_time": "23:59:59",
  "active": true,
  "valid_from": "2024-01-01",
  "valid_until": "2024-12-31",
  "last_applied": "2024-06-01T00:00:00Z",
  "last_removed": "2024-06-01T23:59:59Z",
  "is_active_now": true,
  "affected_products_count": 20
}
```

### GET `/api/marketing/scheduled-discounts/today/`
> Promociones activas hoy.

### GET `/api/marketing/scheduled-discounts/by_day/`
> Todas las promociones agrupadas por día.

### POST `/api/marketing/scheduled-discounts/{id}/apply_now/`
> Aplicar descuento manualmente.

### POST `/api/marketing/scheduled-discounts/{id}/remove_now/`
> Remover descuento manualmente.

### POST `/api/marketing/scheduled-discounts/preview_apply/`
> Preview de qué pasaría si se ejecutara el cronjob ahora.

---

## 13. Notificaciones Push (Firebase)

> Prefijo: `/api/notifications/`

### POST `/api/notifications/register-token/`
> Registrar token FCM. Permite registro sin autenticación.

| Campo | Valor |
|---|---|
| Auth | ❌ Opcional (asocia usuario si autenticado) |

**Request Body:**
```json
{
  "token": "fcm_token_string",
  "platform": "android | ios | web",
  "device_info": {}
}
```

### DELETE `/api/notifications/remove-token/`
> Desactivar token FCM.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{ "token": "fcm_token_string" }
```

### POST `/api/notifications/toggle/`
> Activar/desactivar notificaciones.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{ "enabled": true }
```

### GET `/api/notifications/settings/`
> Obtener configuración de notificaciones (staff: personal, otros: global).

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Response:**
```json
{
  "success": true,
  "settings": {
    "new_order_notifications": true,
    "order_status_notifications": true,
    "payment_notifications": true,
    "low_stock_notifications": true,
    "email_notifications": true,
    "notification_start_hour": "08:00",
    "notification_end_hour": "22:00",
    "notification_sound": true
  }
}
```

### PUT `/api/notifications/settings/`
> Actualizar configuración de notificaciones (solo staff).

### POST `/api/notifications/send-test/`
> Enviar notificación de prueba al usuario actual.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Request Body:**
```json
{ "title": "string", "body": "string" }
```

### GET `/api/notifications/history/`
> Historial de notificaciones del usuario (últimas 50).

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

### GET `/api/notifications/devices/`
> Dispositivos registrados del usuario.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

### POST `/api/notifications/trigger-order/`
> Disparar notificación de nueva orden.

### GET `/api/notifications/latest-order-info/`
> Info de la última orden para notificación.

### GET `/api/notifications/debug/`
> Estado de debug de notificaciones.

### POST `/api/notifications/webhook/firebase/`
> Webhook de Firebase (opcional).

---

## 14. Estadísticas & Analytics

> Prefijo: `/api/statistics/` — Solo Admin.

### GET `/api/statistics/analytics/`
> Estadísticas de órdenes y facturación.

| Param | Tipo | Descripción |
|---|---|---|
| `period` | enum | `day`, `week`, `month` (default), `year` |
| `start_date` | date | YYYY-MM-DD |
| `end_date` | date | YYYY-MM-DD |

**Response:**
```json
{
  "stats": {
    "ventas": 100,
    "ventas_pagadas": 80,
    "facturacion": 500000.0,
    "ticketPromedio": 6250.0,
    "visitas": 50,
    "changes": {
      "ventas": 15.5,
      "facturacion": 22.3
    },
    "customers": {
      "new": 50,
      "total": 50
    },
    "timeline": [
      { "date": "2024-01-01", "value": 50000.0, "orders": 10 }
    ]
  },
  "period": "month",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

### GET `/api/statistics/users/`
> Estadísticas de usuarios registrados.

| Param | Tipo |
|---|---|
| `period` | `day`, `week`, `month`, `year` |
| `start_date` | date |
| `end_date` | date |

**Response:**
```json
{
  "stats": {
    "period_customers": 50,
    "total_customers": 500,
    "timeline": [
      { "date": "2024-01-01", "count": 5 }
    ]
  }
}
```

---

## 15. Configuración del Sitio

### GET `/api/config/`
> Configuración pública del sitio.

| Campo | Valor |
|---|---|
| Auth | ✅ Bearer Token |

**Response:**
```json
{
  "id": 1,
  "min_purchase_amount": "5000.00",
  "maintenance_mode": false,
  "maintenance_message": "string",
  "created_at": "...",
  "updated_at": "..."
}
```

### GET `/api/site-config/public/`
> Alias de `/api/config/`.

### GET/PUT `/api/site-config/` *(Admin)*
> Gestión de configuración del sitio (singleton).

| Campo | Valor |
|---|---|
| Auth | ✅ Admin |

**Request Body (PUT):**
```json
{
  "min_purchase_amount": "5000.00",
  "maintenance_mode": false,
  "maintenance_message": "string",
  "bypass_password": "string (write-only)"
}
```

---

## 16. Actividad & Logs

> Router: `/api/activity-logs/` — Solo Admin. ReadOnly.
> Paginación: 6 por página.

### GET `/api/activity-logs/`
> Listar logs de actividad.

| Param | Tipo | Descripción |
|---|---|---|
| `action` | string | `create`, `update`, `delete`, `register`, `login`, `order`, `status_change` |
| `user_id` | int | Filtrar por usuario |
| `date_from` | date | Desde |
| `date_to` | date | Hasta |
| `content_type` | string | Modelo (e.g., `product`, `order`) |
| `object_id` | int | ID del objeto |
| `description` | string | Búsqueda en descripción |

**Response Item:**
```json
{
  "id": 1,
  "user": 1,
  "user_username": "admin",
  "action": "create",
  "description": "Nuevo producto creado: ...",
  "content_type": 10,
  "content_type_name": "product",
  "object_id": "1",
  "changes": {},
  "timestamp": "2024-01-01T00:00:00Z",
  "ip_address": "192.168.1.1"
}
```

### GET `/api/activity-logs/stats/`
> Estadísticas de actividad.

### GET `/api/activity-logs/product_activity/`
> Logs solo de productos.

### GET `/api/activity-logs/order_activity/`
> Logs solo de órdenes.

---

## 17. Visitantes

> Router: `/api/visitors/` — Solo Admin. ReadOnly.

### GET `/api/visitors/`
> Listar visitantes.

| Param | Tipo |
|---|---|
| `ip_address` | string |
| `is_active` | bool |
| `date_from` | date |
| `date_to` | date |
| `country` | string |
| `city` | string |

### GET `/api/visitors/stats/`
> Estadísticas de visitantes.

| Param | Tipo |
|---|---|
| `period` | string |
| `start_date` | date |
| `end_date` | date |

**Response:**
```json
{
  "total_visitors": 500,
  "visitors_today": 20,
  "visitors_yesterday": 18,
  "visitors_last_week": 120,
  "visitors_last_month": 450,
  "new_visitors_today": 5,
  "new_visitors_yesterday": 4,
  "new_visitors_in_period": 100
}
```

### GET `/api/visitors/recent_visitors/?limit=10`
> Visitantes más recientes.

### GET `/api/visitors/top_visitors/?limit=10`
> Visitantes con más visitas.

### POST `/api/register-visit/`
> Registrar visita (público, sin autenticación).

---

## 18. Dólar / Tasa de Cambio

> Router: `/api/payments/dollar-rates/` — Lectura pública, escritura admin.

### GET `/api/payments/dollar-rates/`
> Listar tasas de cambio.

**Response Item:**
```json
{
  "id": 1,
  "value": "1200.00",
  "rate_type": "blue",
  "rate_type_display": "Dólar Blue",
  "auto_update": true,
  "is_active": true,
  "update_date": "2024-01-01T00:00:00Z",
  "updated_by": 1,
  "updated_by_name": "admin",
  "created_at": "...",
  "updated_at": "..."
}
```

### POST `/api/payments/dollar-rates/` *(Admin)*
> Crear tasa de cambio.

### GET `/api/payments/update-dollar-rate/`
> Actualizar tasa automáticamente desde API externa (requiere API key en producción).

| Param | Tipo |
|---|---|
| `rate_type` | `blue` (default), `official` |
| `api_key` | string (requerido en producción) |

---

## 19. Centros de Distribución

> Router: `/api/payments/distribution-centers/` — Solo Admin.

### GET `/api/payments/distribution-centers/`
### POST `/api/payments/distribution-centers/`
### GET `/api/payments/distribution-centers/{id}/`
### PUT/PATCH `/api/payments/distribution-centers/{id}/`
### DELETE `/api/payments/distribution-centers/{id}/`

**Response Item:**
```json
{
  "id": 1,
  "name": "Depósito Central",
  "address": "Calle 123",
  "phone": "+54...",
  "is_active": true,
  "created_by": 1,
  "created_by_name": "admin",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## 20. Sincronización Google Sheets

### POST `/api/sync-sheets/`
> Sincronización bidireccional con Google Sheets (requiere `auth_key`).

| Campo | Valor |
|---|---|
| Auth | `auth_key` en body (CRONJOB_AUTH_KEY) |

**Request Body:**
```json
{
  "auth_key": "string",
  "direction": "bidirectional | to-sheets | from-sheets",
  "force": false,
  "async": true
}
```

### POST `/api/sync/pull/`
> Pull de datos desde Sheets.

### GET `/api/sync-status/`
### GET `/api/sync-status/{sync_id}/`
> Estado de sincronización.

### POST `/api/cronjob-sync/`
> Endpoint para cronjob incremental.

### GET `/api/cronjob-sync/status/`
> Estado del cronjob de sincronización.

---

## 21. Mantenimiento

### GET `/api/maintenance/status/`
> Estado del modo mantenimiento (público).

### POST `/api/maintenance/toggle/` *(Admin)*
> Activar/desactivar modo mantenimiento.

### POST `/api/maintenance/validate-bypass/`
> Validar contraseña de bypass para modo mantenimiento.

---

## 22. Email

### GET `/api/email/config-check/` *(Admin)*
> Verificar configuración de email.

### POST `/api/email/test/` *(Admin)*
> Enviar email de prueba.

**Request Body:**
```json
{ "email": "test@example.com" }
```

---

## 23. Health & CronJobs

### GET `/api/health/`
> Health check (público).

**Response:**
```json
{ "status": "healthy", "timestamp": "...", "version": "1.0.0" }
```

### CronJob Endpoints (`/api/cronjob/`)

> Requieren header `Authorization: <CRONJOB_AUTH_KEY>`.

| Método | Path | Descripción |
|---|---|---|
| POST | `/api/cronjob/update_dollar_rate/` | Actualizar cotización dólar |
| POST | `/api/cronjob/sync_sheets_pull_command/` | Sync desde Google Sheets |
| POST | `/api/cronjob/apply_scheduled_discounts/` | Aplicar/remover descuentos programados |
| GET | `/api/cronjob/cronjob_status/` | Estado del sistema |
| POST | `/api/cronjob/test_connection/` | Probar conexión con Google Sheets |

---

## 24. Modelos de Datos (Schemas)

### User
```
id: int (PK)
username: string (unique)
email: string (unique)
first_name: string
last_name: string
dni: string (blank)
admin_notes: string (max 40 chars)
is_staff: bool
is_superuser: bool
is_active: bool
date_joined: datetime
```

### Product
```
id: int (PK, auto)
name: string (200)
sku: string (unique, auto-generated)
brand: string (100, blank)
description: text (blank)
category: FK → Category (PROTECT)
price: Decimal (10,2)
stock: int (default 0)
has_variants: bool (default false)
currency: enum (ARS|USD, default ARS)
variants: JSON → [{variant_name, options: [{name, stock, price_adjustment}]}]
discount: Decimal (0-100, default 0)
has_special_promotion: bool
special_promotion_name: string (blank)
volume: string (50, blank)
dimensions: string (100, blank)
image: CloudinaryField
image_2: CloudinaryField (blank)
is_available: bool (default true)
created_at: datetime (auto)
updated_at: datetime (auto)
sheets_last_sync: datetime (null)
sheets_row_number: int (null)

@property final_price → price * (1 - total_discount/100)
@property total_discount → max(product.discount, max_active_offer_discount)
```

### Category
```
id: int (PK)
name: string (100, unique)
slug: string (auto from name)
parent: FK → self (null, CASCADE) — hierarchical
```

### Order
```
id: int (PK)
user: FK → User (SET_NULL, null)
recipient_name: string (100)
customer_dni_cuit: string (20, blank)
shipping_address: string (200, blank)
shipping_street: string (200, blank)
shipping_number: string (20, blank)
shipping_neighborhood: string (100, blank)
shipping_city: string (100, blank)
shipping_postal_code: string (10, blank)
customer_email: string (email)
customer_phone: string (20, blank)
delivery_type: enum (delivery|pickup, default delivery)
payment_method: enum (cash|online, default cash)
status: enum (pending|payment_pending|paid|shipped|cancelled|archived|abandoned)
total: Decimal (10,2, default 0)
subtotal: Decimal (10,2, default 0)
discount: Decimal (10,2, default 0)
bulk_promotion_discount: Decimal (10,2, default 0)
coupon: FK → Coupon (SET_NULL, null)
shipping_notification_sent: bool (default false)
abandoned_at: datetime (null)
abandoned_cart_recovered: bool (default false)
is_temporary: bool (default false)
anonymous_id: string (null)
last_activity: datetime (null)
created_at: datetime (auto)
updated_at: datetime (auto)
```

### OrderItem
```
id: int (PK)
order: FK → Order (CASCADE)
product: FK → Product (SET_NULL, null)
quantity: int (default 1)
price: Decimal (10,2)
variants: JSON (null)
variants_label: string (blank)
```

### AbandonedCart
```
id: int (PK)
user: FK → User (SET_NULL, null)
anonymous_id: string (unique, null)
status: enum (active|abandoned|recovered|converted|expired)
customer_name/email/phone: string
shipping_address/street/number/neighborhood/city/postal_code: string
delivery_type: enum (delivery|pickup)
coupon: FK → Coupon (SET_NULL, null)
subtotal/discount/total: Decimal
created_at/last_activity/abandoned_at/recovered_at: datetime
reminder_emails_sent: int
last_reminder_sent_at: datetime (null)
converted_order_id: int (null)
```

### Payment
```
id: int (PK)
user: FK → User
order: OneToOne → Order
mercadopago_id: string (blank)
status: enum (pending|approved|rejected|refunded)
amount: Decimal (10,2)
created_at: datetime (auto)
updated_at: datetime (auto)
```

### DollarRate
```
id: int (PK)
value: Decimal (10,2)
rate_type: enum (manual|blue|official)
auto_update: bool
updated_by: FK → User (null)
is_active: bool
update_date: datetime
created_at/updated_at: datetime
```

### Coupon
```
id: UUID (PK)
code: string (unique)
type: enum (percentage|fixed)
value: Decimal (10,2)
max_amount: Decimal (null)
min_purchase: Decimal (default 0)
categories: M2M → Category (blank)
max_uses: int (null)
used: int (default 0)
expires_at: datetime (null)
active: bool (default true)

@property is_expired → bool
@property is_valid → active && !is_expired && (max_uses is null || used < max_uses)
```

### Offer
```
id: UUID (PK)
name: string (200)
discount: Decimal (0-100)
start_date: datetime
end_date: datetime
products: M2M → Product

@property status → pending|active|expired
@property is_active → bool
```

### BulkPromotion
```
id: UUID (PK)
name: string (200)
description: text (blank)
promotion_type: enum (3x2|2x1|4x3|5x4|custom)
buy_quantity: int
pay_quantity: int
products: M2M → Product (blank)
categories: M2M → Category (blank)
start_date: datetime
end_date: datetime
active: bool
priority: int (default 0)
max_applications: int (default 1)
```

### ScheduledCategoryDiscount
```
id: UUID (PK)
name: string (200)
description: text (blank)
category: FK → Category
day_of_week: int (0=Mon..6=Sun)
discount: Decimal (0-100)
start_time/end_time: time
active: bool
valid_from/valid_until: date (null)
last_applied/last_removed: datetime (null)
unique_together: (category, day_of_week)
```

### DeviceToken
```
id: int (PK)
user: FK → User (null)
token: string (unique)
platform: enum (android|ios|web)
device_info: JSON (blank)
is_active: bool
created_at/updated_at/last_used: datetime
```

### NotificationLog
```
id: int (PK)
device_token: FK → DeviceToken
notification_type: enum (new_order|order_update|order|payment_received|order_shipped|general)
title/body: string
data: JSON (blank)
status: enum (pending|sent|failed|delivered)
fcm_message_id: string (blank)
error_message: text (blank)
created_at/sent_at: datetime
```

### ActivityLog
```
id: int (PK)
user: FK → User
action: enum (create|update|delete|register|login|order|status_change|...)
description: text
content_type: FK → ContentType (GenericFK)
object_id: string
changes: JSON (blank)
timestamp: datetime (auto)
ip_address: GenericIPAddressField (blank)
```

### SiteConfig (Singleton)
```
id: int (PK)
min_purchase_amount: Decimal (default 0)
maintenance_mode: bool (default false)
maintenance_message: text (blank)
bypass_password: string (blank)
created_at/updated_at: datetime
```

### Visitor
```
id: int (PK)
ip_address: GenericIPAddress (unique)
user_agent: text (blank)
first_visit/last_visit: datetime
visit_count: int (default 1)
is_active: bool (default true)
country/city/referrer: string (blank)
```

### DistributionCenter
```
id: int (PK)
name: string
address: text
phone: string (blank)
created_by: FK → User (null)
is_active: bool
created_at/updated_at: datetime
```

### ProductReview
```
id: int (PK)
product: FK → Product (CASCADE)
user: FK → User (CASCADE)
rating: int (1-5)
comment: text (blank)
is_approved: bool (default false)
created_at: datetime (auto)
unique_together: (product, user)
```

---

## 25. Flujos de Negocio Críticos

### Flujo de Registro y Verificación
```
1. POST /api/auth/register/ → usuario creado inactivo, email con código 6 dígitos
2. POST /api/auth/verify-email/ {code, email} → activa usuario, devuelve tokens JWT
3. (opcional) POST /api/auth/login/ con anonymous_cart_id → vincula carrito existente
```

### Flujo de Compra Completo
```
1. (Anónimo) POST /api/orders/abandoned-carts/public/cart/ → trackear carrito
2. POST /api/auth/login/ con anonymous_cart_id → vincular carrito
3. POST /api/marketing/coupons/validate/ → verificar cupón
4. POST /api/orders/ → crear orden (valida min_purchase, envía notif push + email)
5a. (efectivo) Orden queda en status "pending"
5b. (online) POST /api/payments/create/ → obtener init_point MercadoPago
6. Webhook MercadoPago → actualiza payment y order status a "paid"
7. (Admin) PATCH /api/orders/{id}/update_status/ {status: "shipped"} → email de envío
8. (Admin) POST /api/orders/{id}/archive/
```

### Flujo de Cálculo de Precio
```
1. product.price (base)
2. + variant.price_adjustment (si tiene variantes seleccionadas)
3. product.get_total_discount() = max(product.discount, max(active_offer.discount))
4. final_price = price * (1 - total_discount / 100)
5. En carrito: aplicar BulkPromotion (3x2, 2x1, etc.)
6. En carrito: aplicar Coupon (porcentaje o fijo, con restricciones por categoría)
7. Orden final: subtotal - bulk_promotion_discount - coupon_discount = total
```

### Flujo de Carritos Abandonados
```
1. POST /api/orders/abandoned-carts/public/cart/ → crea/actualiza con last_activity
2. Si no hay actividad por 5 horas → AbandonedCart.status = "abandoned"
3. (Admin) GET /api/orders/abandoned-carts/?status=abandoned → ver carritos
4. (Admin) POST /api/orders/abandoned-carts/{id}/recover/ → status = "recovered"
5. (Admin) POST /api/orders/abandoned-carts/{id}/convert_to_order/ → crea Order
```

### Flujo de Descuentos Programados (CronJob)
```
1. Admin crea ScheduledCategoryDiscount (ej: "Sábados de Sustratos", day=5, discount=15%)
2. CronJob ejecuta POST /api/cronjob/apply_scheduled_discounts/
3. Sistema verifica should_be_active_now() para cada promoción
4. Si activa y no aplicada hoy → aplica descuento a productos de la categoría
5. Si no activa y fue aplicada → remueve descuento de productos
```

### Transiciones de Estado de Orden
```
pending ──→ payment_pending ──→ paid ──→ shipped ──→ archived
  │              │                │                      ↑
  ├──→ cancelled ←──→ cancelled   ├──→ cancelled        │
  │                               ├──→ archived ────────┘
  ├──→ shipped
  ├──→ paid
  └──→ archived

abandoned ──→ pending
           └──→ archived
```

---

> **Nota:** Los endpoints de Blog (`/api/blog/`) y Carousel/Hero han sido excluidos de este documento según especificación.
