/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from .env / .env.local. Note: we intentionally do NOT prefix
  // these with VITE_ so the values stay on the dev server and never end up
  // in the client bundle.
  loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [],
      // Only pick up colocated tests under src/; avoids scanning node_modules.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
    build: {
      // Keep the client bundle analyzable; warn at 600 kB (raised from Vite's default 500)
      // because our pricing table + i18n strings are sizeable but still well within budget.
      chunkSizeWarningLimit: 600,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split large vendor libs so initial bundle stays small and long-term
          // caching works when only app code changes.
          manualChunks: {
            react: ['react', 'react-dom'],
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
            ui: ['@headlessui/react', 'lucide-react'],
            // SheetJS is ~600 kB minified; split it into its own chunk so the
            // main app bundle stays small and xlsx is only loaded on first export.
            xlsx: ['xlsx'],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
      cors: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 5175,
      cors: true,
    },
  }
})