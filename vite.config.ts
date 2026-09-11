import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/Dungeon-Mapper/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: false, // We provide public/manifest.webmanifest directly
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,webmanifest}'],
      },
    }),
  ],
})
