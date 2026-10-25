import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Solar EPC CRM',
        short_name: 'SolarCRM',
        description: 'Mobile-first Solar EPC pipeline, quotations, surveys, and payments',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
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
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
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
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('node_modules')) {
            return undefined;
          }

          // Core React & DOM runtime
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }

          // React Router SPA navigation
          if (
            normalizedId.includes('/node_modules/react-router/') ||
            normalizedId.includes('/node_modules/react-router-dom/') ||
            normalizedId.includes('/node_modules/@remix-run/router/')
          ) {
            return 'vendor-router';
          }

          // TanStack React Query cache engine
          if (normalizedId.includes('/node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          // Lucide icons
          if (normalizedId.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          // Charts Math & Animation Engine (D3, Victory, React-Smooth, Lodash)
          if (
            normalizedId.includes('/node_modules/d3-') ||
            normalizedId.includes('/node_modules/victory-vendor/') ||
            normalizedId.includes('/node_modules/react-smooth/') ||
            normalizedId.includes('/node_modules/lodash/') ||
            normalizedId.includes('/node_modules/recharts-scale/')
          ) {
            return 'vendor-charts-engine';
          }
          if (normalizedId.includes('/node_modules/recharts/')) {
            return 'vendor-recharts';
          }

          // Form validation & schemas (Zod, React Hook Form)
          if (
            normalizedId.includes('/node_modules/zod/') ||
            normalizedId.includes('/node_modules/react-hook-form/') ||
            normalizedId.includes('/node_modules/@hookform/')
          ) {
            return 'vendor-forms';
          }

          // Supabase client & IndexedDB keyval cache
          if (
            normalizedId.includes('/node_modules/@supabase/') ||
            normalizedId.includes('/node_modules/idb-keyval/')
          ) {
            return 'vendor-storage';
          }

          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
});
