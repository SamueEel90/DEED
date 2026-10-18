/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** verejná adresa appky pre odkazy (predvolene https://deedgood.eu, lib/adresa) */
  readonly VITE_VEREJNA_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
