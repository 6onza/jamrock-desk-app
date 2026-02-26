# JamRock Admin — Aplicación de Escritorio

Aplicación de escritorio para la gestión integral de **JamRock GrowShop**: pedidos, productos, clientes, marketing, estadísticas y más. Construida con **Tauri 2** (Rust) + **Vue 3** (TypeScript) + **Tailwind CSS**.

---

## Requisitos del Sistema

| Componente    | Versión mínima                  |
| ------------- | ------------------------------- |
| **OS**        | Windows 10 (64-bit) o superior  |
| **Node.js**   | 18.0+                           |
| **Rust**      | 1.70+                           |
| **WebView2**  | Incluido en Windows 10/11       |

### Instalar Rust (si no está instalado)

```powershell
winget install Rustlang.Rustup
# o descargar desde https://rustup.rs
rustup default stable
```

---

## Setup Inicial

```powershell
cd tauri-app

# 1. Instalar dependencias de Node
npm install

# 2. Configurar entorno
#    - .env.development  → http://localhost:8000/api  (ya configurado)
#    - .env.production   → https://jamrock-api.up.railway.app/api
```

---

## Desarrollo

```powershell
# Inicia Vite dev server + ventana Tauri con hot-reload
npm run tauri:dev
```

Esto compila el frontend Vite en el puerto `1420` y abre la aplicación nativa con live-reload.

### Comandos útiles

| Comando                | Descripción                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run tauri:dev`    | Desarrollo con hot-reload                      |
| `npm run dev`          | Solo frontend Vite (sin Tauri)                 |
| `npm run type-check`   | Verificar tipos TypeScript                     |
| `npm run lint`         | Linter ESLint                                  |
| `npm run format`       | Formatear con Prettier                         |

---

## Build de Producción

```powershell
# Build completo: compila frontend + binario Rust + instaladores
npm run build
```

### Artefactos generados

Los instaladores se generan en:

```
src-tauri/target/release/bundle/
├── nsis/
│   └── JamRock Admin_0.1.0_x64-setup.exe    ← Instalador NSIS (.exe)
└── msi/
    └── JamRock Admin_0.1.0_x64_en-US.msi    ← Instalador MSI
```

### Build de debug

```powershell
npm run build:debug
```

Genera binarios sin optimizaciones, con sourcemaps y consola de DevTools habilitada.

---

## Generación de Íconos

Si necesitás regenerar los íconos a partir de una imagen fuente:

```powershell
npx tauri icon src-tauri/icons/icon.png
# o desde un SVG:
npx tauri icon src-tauri/icons/icon.svg
```

Esto genera automáticamente todos los tamaños necesarios en `src-tauri/icons/`.

---

## Auto-Updater

La app incluye soporte para actualizaciones automáticas vía GitHub Releases.

### Configurar signing keys (requerido para updater)

```powershell
# Generar par de claves
npx tauri signer generate -w ~/.tauri/jamrock-admin.key

# La clave pública se agrega en tauri.conf.json → plugins.updater.pubkey
# La clave privada se usa como secret en GitHub Actions:
#   TAURI_SIGNING_PRIVATE_KEY = contenido del archivo .key
#   TAURI_SIGNING_PRIVATE_KEY_PASSWORD = contraseña elegida
```

### Flujo de release

1. Actualizar `version` en `package.json` y `src-tauri/tauri.conf.json`
2. Crear tag: `git tag v0.2.0 && git push --tags`
3. GitHub Actions genera los instaladores + `latest.json`
4. Las apps instaladas detectan la actualización automáticamente

---

## Configuración del Backend (CORS)

El backend Django debe permitir las conexiones desde la app Tauri. Ya se agregaron los orígenes:

```python
# backend/core/settings.py
CORS_ALLOWED_ORIGINS = [
    # ... otros orígenes ...
    "tauri://localhost",
    "https://tauri.localhost",
]
```

---

## Estructura del Proyecto

```
tauri-app/
├── src/                          # Frontend Vue 3 + TypeScript
│   ├── assets/css/               # Tailwind + tema oscuro
│   ├── components/               # Componentes reutilizables (UI, admin)
│   ├── composables/              # Composables Vue (shortcuts, etc.)
│   ├── layouts/                  # AdminLayout con sidebar
│   ├── pages/                    # Páginas por módulo
│   ├── router/                   # Vue Router con guards
│   ├── services/                 # API clients + Tauri services
│   ├── stores/                   # Pinia stores
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # Utilidades (shell, formatters)
├── src-tauri/                    # Backend Rust (Tauri)
│   ├── src/
│   │   ├── commands/             # Comandos IPC (auth, config, export, window)
│   │   ├── lib.rs                # Setup: plugins, tray, window management
│   │   └── main.rs               # Entry point
│   ├── icons/                    # Íconos de la app
│   ├── capabilities/             # Permisos de Tauri APIs
│   ├── Cargo.toml                # Dependencias Rust
│   └── tauri.conf.json           # Configuración de Tauri
├── .env.development              # Variables de entorno (dev)
├── .env.production               # Variables de entorno (prod)
├── .github/workflows/            # CI/CD GitHub Actions
├── package.json                  # Dependencias Node + scripts
├── vite.config.ts                # Configuración de Vite
├── tailwind.config.js            # Configuración de Tailwind
└── tsconfig.json                 # Configuración de TypeScript
```

---

## Troubleshooting

### Error: "cargo not found"
Asegurate de que Rust esté instalado y en el PATH:
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","Machine")
cargo --version
```

### Error: WebView2 not found
Windows 10/11 incluye WebView2 preinstalado. Si falta, el instalador NSIS lo descarga automáticamente (configurado con `downloadBootstrapper`).

### Error: Port 1420 already in use
```powershell
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Build lento la primera vez
El primer `cargo build` descarga y compila todas las dependencias de Rust. Las builds subsiguientes son incrementales y mucho más rápidas.

### Error: "failed to get cargo metadata"
```powershell
cd src-tauri
cargo update
cd ..
npm run build
```

### Error de CORS con el backend
Verificá que `tauri://localhost` y `https://tauri.localhost` estén en `CORS_ALLOWED_ORIGINS` en el backend Django.

---

## Checklist Pre-Distribución

- [ ] API URL de producción configurada en `.env.production`
- [ ] CORS del backend actualizado con orígenes Tauri
- [ ] Íconos generados (`npx tauri icon`)
- [ ] Version number actualizado en `package.json` + `tauri.conf.json`
- [ ] Build exitoso sin errores (`npm run build`)
- [ ] Testear: login, dashboard, CRUD productos, gestión pedidos
- [ ] Testear: impresión, export CSV, notificaciones nativas
- [ ] Testear: system tray, keyboard shortcuts, window state persistence
- [ ] Generar signing keys para auto-updater
- [ ] Configurar GitHub Secrets para CI/CD
- [ ] Firmar el ejecutable (opcional, reduce warnings de SmartScreen)
- [ ] Testear auto-updater con release de prueba

---

## Licencia

Propietario — © 2026 JamRock GrowShop. Todos los derechos reservados.
