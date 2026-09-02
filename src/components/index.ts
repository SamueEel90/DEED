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
export * from "@/components/splitconfig";
export * from "@/components/splitqr";
// qrskener (@zxing/browser, ~200kB) sa NEexportuje eagerly — QrModal ho lazy-loaduje
// až pri otvorení skenera (drží initial bundle malý, viď ROADMAP code-splitting).
export * from "@/components/platba";
export * from "@/components/platobnymodul";
export * from "@/components/recurring";
export * from "@/components/badge";
export * from "@/components/oblubene";
export * from "@/components/hladanie";
export * from "@/components/states";
export * from "@/components/ui";
export * from "@/components/entity";
export * from "@/components/podporadeed";
export * from "@/components/feedcard";
export * from "@/components/obnova";
export * from "@/components/swipeback";
export * from "@/components/motion";
export * from "@/components/sheet";
export * from "@/components/znacka";
export * from "@/components/stit";
export * from "@/components/upgrade";
export * from "@/components/pressable";
export * from "@/components/segtabs";
export * from "@/components/virtuallist";
export * from "@/components/toast";
export * from "@/components/tooltip";
export * from "@/components/intro";
export * from "@/components/ozvatsa";
export * from "@/components/nahlasit";
export * from "@/components/fotovyber";
export * from "@/components/zoznamdarcov";
export * from "@/components/formattext";
export * from "@/components/richtext";
export * from "@/components/fotoupload";
export * from "@/components/fotoprofilu";
export { tint } from "@/lib/ui";
