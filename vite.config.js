import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Minnano POS',
        short_name: 'POS',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },

      // 画像はプリキャッシュせず、ランタイムで Cache First
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            // /images/（同一オリジン）の画像をキャッシュ優先
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-same-origin',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90日
              },
            },
          },
          {
            // アプリ本体は NetworkFirst
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && /\.(?:js|css|html)$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 4,
            },
          },
        ],

        // ★ここを画像を含まない拡張子にする（プリキャッシュから画像除外）
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})