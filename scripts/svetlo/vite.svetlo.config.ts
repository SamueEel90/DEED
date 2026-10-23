import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
// Svetlo pomoci · ukážka (stav pred OPRAVY 403, 19. 10.) — bez servera, bez service workera
export default defineConfig({
  base: '/svetlo/',
  publicDir: false,
  define: { 'import.meta.env.VITE_TEST': JSON.stringify('1'), 'import.meta.env.VITE_USE_MOCK': JSON.stringify('1') },
  plugins: [react(), {
    name: 'bez-pwa',
    resolveId(id) { return id === 'virtual:pwa-register' ? '\0bez-pwa' : null },
    load(id) { return id === '\0bez-pwa' ? 'export function registerSW(){ return () => Promise.resolve() }' : null },
  }],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'out/svetlo', emptyOutDir: true, chunkSizeWarningLimit: 99999 },
})
