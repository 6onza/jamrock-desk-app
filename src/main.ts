import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast, { type PluginOptions, POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

import App from './App.vue'
import router from './router'
import './assets/css/main.css'

// ── Disable right-click context menu (always) ──
// document.addEventListener('contextmenu', (e) => {
//   e.preventDefault()
// })

// ── Disable DevTools & Inspect in Production ──
if (import.meta.env.PROD) {

  // Disable devtools keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault()
      return false
    }
    // Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      return false
    }
    // Ctrl+Shift+C (Element selector)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault()
      return false
    }
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault()
      return false
    }
    // Ctrl+U (View source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault()
      return false
    }
  })
}

const toastOptions: PluginOptions = {
  position: POSITION.TOP_RIGHT,
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  transition: 'Vue-Toastification__fade',
  maxToasts: 5,
  newestOnTop: true,
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Toast, toastOptions)

app.mount('#app')
