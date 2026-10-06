import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { apiDevPlugin } from './scripts/apiDevPlugin'

// OPRAVY 147: testovacia verzia na Verceli aj bez ručnej premennej — vetva platby-modul a každý preview
// deploy dostanú VITE_TEST=1 (testovacie pásy a prepínače). Premenná VITE_TEST vo Verceli má prednosť.
// Ostrá produkcia (iná vetva, VERCEL_ENV=production) ostáva bez nich; ?dev v adrese ostáva ako záloha.
const VETVY_TEST = ['platby-modul']
const testNaVerceli = !process.env.VITE_TEST && (VETVY_TEST.includes(process.env.VERCEL_GIT_COMMIT_REF ?? '') || process.env.VERCEL_ENV === 'preview')

// https://vite.dev/config/
export default defineConfig({
  define: testNaVerceli ? { 'import.meta.env.VITE_TEST': JSON.stringify('1') } : {},
  plugins: [
    react(),
    // /api/score endpointy aj v dev/preview serveri (lokálne bez `vercel dev`;
    // bez ANTHROPIC_API_KEY beží hodnotenie v MOCK režime)
    apiDevPlugin(),
    // PWA: manifest + service worker (precache shellu, runtime cache obrázkov/dlaždíc/API).
    // TESTOVANIE: registerType "autoUpdate" — nová verzia sa načíta sama pri ďalšom otvorení
    // (s "prompt" čakala na ťuk Obnoviť v hláške na 12 s a testeri videli mix starého a nového).
    // PRED OSTRÝM SPUSTENÍM vrátiť na 'prompt' a z workboxu zmazať skipWaiting + clientsClaim
    // → update zase ohlási sonner toast s tlačidlom Obnoviť (src/lib/pwa.ts).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'DEED+ — platforma dobra',
        short_name: 'DEED+',
        description: 'Miesto, kde nerozhodujú slová, ale skutky — dobré skutky, darcovstvo a vzájomná pomoc.',
        lang: 'sk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F1ECE1', // svetlý motív je primárny (--c-bg)
        theme_color: '#F1ECE1',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // hlavný balík prerástol 2 MiB (preklady) — bez tohto build na Verceli padne
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // SPA fallback nechaj len na navigácie (deep-linky /m /c /r … dostanú shell)
        navigateFallbackDenylist: [/^\/assets\//, /^\/video\//, /^\/img\//, /^\/api\//, /^\/i\//], // /i/{id} = web stránka Iskry (api/iskra.ts)
        // TESTOVANIE (s autoUpdate): nový SW prevezme appku hneď, staré cache sa zmažú
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // content fotky (Unsplash) — cache-first s limitom, offline feed má obrázky
            urlPattern: /^https:\/\/images\.unsplash\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fotky', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // mapové dlaždice (CARTO) — obmedzený cache, nech mapa nezožerie úložisko
            urlPattern: /^https:\/\/[a-z]\.basemaps\.cartocdn\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'mapa-dlazdice', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Google Fonts (css + woff2)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonty', expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Supabase REST (len čítanie feedov) — network-first, offline padne na poslednú kópiu.
            // Auth/realtime sa NEcachujú (iný path/protokol).
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/rest\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 4, expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
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
        // Zadanie 5 · 5.6: supabase klient (auth + postgrest) samostatne; QR skener (@zxing) a mapa
        // (leaflet, d3-geo) sa načítavajú až dynamicky, preto tu nie sú — vznikne im vlastný chunk sám.
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['motion'],
          data: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
