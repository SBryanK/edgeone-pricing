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
    // Relative asset URLs: the same build works at a domain root (Vercel,
    // Docker/nginx) and under a sub-path such as GitHub Pages' /<repo>/.
    // The app has no client-side router, so './' is safe.
    base: './',
    plugins: [react(), tailwindcss()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [],
      // Only pick up colocated tests under src/; avoids scanning node_modules.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
    build: {
      // ExcelJS (~940 kB) is lazy-loaded on first export, so it lives in its
      // own async chunk and never blocks first paint.
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split large vendor libs so initial bundle stays small and long-term
          // caching works when only app code changes.
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client'],
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
            ui: ['@headlessui/react', 'lucide-react'],
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