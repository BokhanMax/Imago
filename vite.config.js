import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appName = env.VITE_APP_NAME || 'Imago'

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'og-image.png'],
        workbox: {
          // Виключаємо великі WASM-файли @imgly/background-removal з прекешу SW
          globIgnores: ['**/*.wasm', '**/ort.*.mjs', '**/ort.*.js'],
        },
        manifest: {
          name: `${appName} — Онлайн фоторедактор`,
          short_name: appName,
          description: 'Безкоштовний онлайн фоторедактор: обрізка, зміна розміру, видалення фону (ШІ), корекція кольору.',
          theme_color: '#863bff',
          background_color: '#f0f0f5',
          display: 'standalone',
          start_url: '/',
          lang: 'uk',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['@imgly/background-removal'],
    },
  }
})
