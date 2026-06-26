import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // eager vendor knižnice do samostatných chunkov — menia sa zriedka,
        // ostávajú v cache aj po deployi app kódu. vaul/radix NEcháme prirodzene
        // splitnúť so sheetmi (lazy), nech nezaťažujú initial load.
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['motion'],
          data: ['@tanstack/react-query'],
        },
      },
    },
  },
})
