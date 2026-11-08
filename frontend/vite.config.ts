import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'robots.txt',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-192x192.svg',
        'pwa-512x512.svg',
      ],
      manifest: {
        name: 'PennyPilot — AI Financial Intelligence',
        short_name: 'PennyPilot',
        description: 'AI-Powered Expense Tracker & Financial Intelligence Platform for India',
        theme_color: '#0F766E',
        background_color: '#F7F5F0',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  preview: {
    port: Number(process.env.VITE_PREVIEW_PORT || 5174),
    host: '127.0.0.1',
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
