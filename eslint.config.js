// ESLint 10 · flat config
// Zámer: chytať skutočné chyby (nepoužité premenné, zlé hooky, zabudnuté
// awaity), NIE formátovanie — to rieši Prettier. Preto je eslint-config-prettier
// posledný v poradí a vypína všetky štýlové pravidlá.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "public/**", ".vercel/**", "supabase/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- appka (browser) ---
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly", document: "readonly", navigator: "readonly",
        localStorage: "readonly", sessionStorage: "readonly", location: "readonly",
        fetch: "readonly", console: "readonly", crypto: "readonly", history: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly",
        clearInterval: "readonly", requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly", matchMedia: "readonly", alert: "readonly",
        URL: "readonly", URLSearchParams: "readonly", Blob: "readonly", File: "readonly",
        FileReader: "readonly", FormData: "readonly", Image: "readonly", Audio: "readonly",
        AbortController: "readonly", IntersectionObserver: "readonly",
        ResizeObserver: "readonly", MutationObserver: "readonly", performance: "readonly",
        structuredClone: "readonly", queueMicrotask: "readonly", btoa: "readonly",
        atob: "readonly", TextEncoder: "readonly", TextDecoder: "readonly",
        HTMLElement: "readonly", HTMLInputElement: "readonly", HTMLDivElement: "readonly",
        HTMLCanvasElement: "readonly", HTMLImageElement: "readonly", HTMLVideoElement: "readonly",
        HTMLTextAreaElement: "readonly", HTMLSelectElement: "readonly", HTMLAnchorElement: "readonly",
        Element: "readonly", Node: "readonly", Event: "readonly", KeyboardEvent: "readonly",
        MouseEvent: "readonly", TouchEvent: "readonly", CustomEvent: "readonly",
        MediaQueryListEvent: "readonly", ServiceWorkerRegistration: "readonly",
        NodeJS: "readonly", RequestInit: "readonly", ScrollBehavior: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Klasické Rules of Hooks ostávajú tvrdé — ich porušenie appku reálne rozbije.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Nová generácia pravidiel z React Compilera (react-hooks v7). Sú to
      // odporúčania na výkon a budúcu kompatibilitu, nie chyby v bežiacej
      // appke — preto warn. Postupné dočisťovanie je v ROADMAP-e ako backlog.
      // Po dočistení prepni na "error" a zmaž tento blok.
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/incompatible-library": "warn",

      // Vite HMR: appka zámerne exportuje pomocné funkcie vedľa komponentov.
      "react-refresh/only-export-components": "off",

      // console.log v UI je skoro vždy zabudnutý debug; warn/error/info sú
      // v appke zámerné (diagnostika konfigurácie) a ostávajú povolené.
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },

  // --- serverless API + build skripty (node) ---
  {
    files: ["api/**/*.ts", "scripts/**/*.{ts,mjs}", "vite.config.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly", console: "readonly", Buffer: "readonly",
        __dirname: "readonly", fetch: "readonly", URL: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", crypto: "readonly",
      },
    },
  },

  // --- spoločné doladenie ---
  {
    files: ["**/*.{ts,tsx,mjs}"],
    rules: {
      // Projekt beží s noImplicitAny:false a `any` je vedomý kompromis na
      // hraniciach k Supabase/3rd-party. Warn = viditeľné, neblokuje build.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  prettier,
);
