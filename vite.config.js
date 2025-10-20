import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',           // ← 自動更新
      devOptions: { enabled: true },        // 開発中でもPWA動く
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'mask-icon.svg',
      ],
      manifest: {
        name: 'Minnano POS',
        short_name: 'POS',
        start_url: '/',                     // ルートから起動
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },

      // ★ここを追加：画像をオフラインでも表示できるようにキャッシュ
      workbox: {
        // ビルド成果物と一緒にプリキャッシュする拡張子
        globPatterns: ['**/*.{js,css,html,ico,svg,png,jpg,jpeg,webp,avif}'],

        // ランタイムキャッシュ（アクセスされたらキャッシュ、以降はキャッシュ優先）
        runtimeCaching: [
          // /images/ 配下（同一オリジン）の画像を Cache First
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-same-origin',
              expiration: {
                maxEntries: 200,                 // 画像最大200枚
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30日
              }
            }
          },
          // 失敗時でもUIが動くようにアプリ本体は NetworkFirst
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /\.(?:js|css|html)$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 4
            }
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
