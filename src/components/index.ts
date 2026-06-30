// ============================================================
// DEED · zdieľané komponenty — BARREL
// Re-exportuje všetko, čo pôvodne exportoval src/shared.jsx.
// ============================================================
export * from "@/components/icons";
export * from "@/components/context";
export * from "@/components/visual";
export * from "@/components/feedback";
export * from "@/components/media";
export * from "@/components/layout";
export * from "@/components/qr";
// qrskener (@zxing/browser, ~200kB) sa NEexportuje eagerly — QrModal ho lazy-loaduje
// až pri otvorení skenera (drží initial bundle malý, viď ROADMAP code-splitting).
export * from "@/components/platba";
export * from "@/components/hladanie";
export * from "@/components/states";
export * from "@/components/motion";
export * from "@/components/sheet";
export * from "@/components/upgrade";
export * from "@/components/pressable";
export * from "@/components/segtabs";
export * from "@/components/virtuallist";
export * from "@/components/toast";
export { tint } from "@/lib/ui";
