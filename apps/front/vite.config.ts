import path from 'node:path'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { ViteUserConfig } from 'vitest/config'

export default defineConfig(
  () =>
    ({
      plugins: [
        react(),
        TanStackRouterVite(),
        sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: 'ritchy-po',
          project: 'javascript-react',
        }),
      ],
      optimizeDeps: {
        include: [
          'lucide-react',
          '@tanstack/react-table',
          '@tanstack/react-query',
          '@tanstack/react-router',
          'react',
          'react-dom',
          'react-dom/client',
          'socket.io-client',
          'zustand',
        ],
        exclude: ['@ritchy/types'],
        // Vite 5.4+ has better esbuild handling, but we can add entries to prevent chunk issues
        entries: ['./src/main.tsx'],
      },
      server: {
        fs: {
          // Allow serving files from the monorepo root
          allow: ['../..'],
        },
        watch: {
          // Ignore node_modules to prevent unnecessary rebuilds
          ignored: ['**/node_modules/**', '**/.git/**'],
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
      build: {
        sourcemap: true,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
            },
          },
        },
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: false,
      },
    }) as ViteUserConfig,
)
