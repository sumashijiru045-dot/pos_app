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

      // ★ここが重要：オフラインで画像を出す / 大きい画像でビルド落ちないようにする
      workbox: {
        // 2MiB超のアセットでビルドが止まらないように上限を引き上げ
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB まで許容

        // 配信中にキャッシュするパターン
        runtimeCaching: [
          // 同一オリジンの /images/ は Cache First（最初に取れたら以後はオフラインOK）
          {
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
          // アプリ本体は NetworkFirst（オンラインあれば最新、なければキャッシュ）
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && /\.(?:js|css|html)$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 4,
            },
          },
        ],

        // ビルド成果物のプリキャッシュ対象（拡張子）
        globPatterns: ['**/*.{js,css,html,ico,svg,png,jpg,jpeg,webp,avif}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})