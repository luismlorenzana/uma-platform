// Adapted from uma-quest at 47ca16d (apps/web/vite.config.ts): React, Tailwind with uma-kit's theme, the PWA's update
// prompt and the sign-in config check; without the game's chunk and size reports.
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const buildId = (process.env.VITE_APP_BUILD_ID ?? process.env.GITHUB_SHA ?? 'local').slice(0, 12)

export default defineConfig(({ mode }) => {
  // A production build without the Firebase web config would run signed out and every API call would get a 401
  // (uma-rpg D42). Fail the build instead: apps/web/.env.production is committed.
  if (mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID'].filter((k) => !env[k])
    if (missing.length > 0) throw new Error(`Production build is missing ${missing.join(', ')} (apps/web/.env.production)`)
  }
  return {
    define: { __APP_BUILD_ID__: JSON.stringify(buildId) },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // The kit's "Update ready · Restart" prompt instead of a silent reload (watchAppUpdates in main.tsx).
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['icons/icon-64.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Uma Platform',
          short_name: 'Uma Platform',
          description: 'The Uma Platform: ranking, character art and the platform tools',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          background_color: '#16302f',
          theme_color: '#16302f',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          // /__/ is Firebase Hosting's reserved space (the sign-in handler): never answer it with the app shell.
          navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
          runtimeCaching: [
            {
              // Master data files are named by hash: cache forever on the device once downloaded.
              urlPattern: ({ url }) => url.pathname.startsWith('/api/master/files/') || url.pathname.startsWith('/api/master/manifests/'),
              handler: 'CacheFirst',
              options: { cacheName: 'platform-master-files', expiration: { maxEntries: 4000 } },
            },
            {
              // The channel pointer changes with each release: prefer the network, fall back to the last one offline.
              urlPattern: ({ url }) => url.pathname.startsWith('/api/master/channels/'),
              handler: 'NetworkFirst',
              options: { cacheName: 'platform-master-channel', networkTimeoutSeconds: 4 },
            },
          ],
        },
      }),
    ],
    resolve: {
      // uma-kit's peers resolve to this app's copies.
      dedupe: ['react', 'react-dom', 'react-router', 'motion'],
    },
    build: { target: 'es2022', manifest: true },
    server: { port: 5204, strictPort: true, host: true, proxy: { '/api': 'http://localhost:8111' } },
    preview: { port: 5204 },
    // uma-kit goes through Vite in tests, so it shares this app's react-router instance (and its context).
    test: { environment: 'node', server: { deps: { inline: ['@luismlorenzana/uma-kit'] } } },
  }
})
