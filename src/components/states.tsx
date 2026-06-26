// ============================================================
// DEED · Stavové komponenty — loading (skeleton) / prázdne / chyba.
// Jednotný vzhľad naprieč modulmi. Shimmer využíva @keyframes lesk (index.css).
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD } from "@/theme";

// ---- SKELETON (shimmer blok) ----
export function Skeleton({
  w = "100%",
  h = 16,
  radius = 9,
  style,
}: {
  w?: number | string;
  h?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(var(--glass-rgb),.05) 25%, rgba(var(--glass-rgb),.12) 37%, rgba(var(--glass-rgb),.05) 63%)",
        backgroundSize: "400% 100%",
        animation: "lesk 1.4s ease infinite",
        ...style,
      }}
    />
  );
}

// ---- SKELETON KARTA (tvar feed karty) ----
export function SkeletonKarta() {
  return (
    <div
      style={{
        margin: "12px 13px",
        border: `1px solid ${C.line}`,
        borderRadius: 17,
        overflow: "hidden",
        background: "rgba(var(--glass-rgb),.03)",
      }}
    >
      <Skeleton h={140} radius={0} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Skeleton w={34} h={34} radius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton w="55%" h={12} style={{ marginBottom: 6 }} />
            <Skeleton w="35%" h={10} />
          </div>
        </div>
        <Skeleton w="92%" h={13} style={{ marginBottom: 7 }} />
        <Skeleton w="74%" h={13} />
      </div>
    </div>
  );
}

// ---- FEED SKELETON (N kariet) ----
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam…">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonKarta key={i} />
      ))}
    </div>
  );
}

// ---- RIADKOVÝ SKELETON (zoznamy — notifikácie, prevody) ----
export function SkeletonRiadky({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Načítavam…" style={{ padding: "4px 14px" }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.line2}` }}>
          <Skeleton w={38} h={38} radius={11} />
          <div style={{ flex: 1 }}>
            <Skeleton w="60%" h={12} style={{ marginBottom: 7 }} />
            <Skeleton w="40%" h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- PRÁZDNY STAV ----
export function EmptyState({
  emoji = "🍃",
  title,
  text,
  action,
}: {
  emoji?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "44px 28px",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 38, opacity: 0.9, marginBottom: 2 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: C.textTer, lineHeight: 1.5, maxWidth: 320 }}>{text}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

// ---- CHYBOVÝ STAV (+ retry) ----
export function ErrorState({
  title = "Niečo sa pokazilo",
  text = "Dáta sa nepodarilo načítať. Skús to znova.",
  onRetry,
}: {
  title?: string;
  text?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "44px 28px",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 38, marginBottom: 2 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textTer, lineHeight: 1.5, maxWidth: 320 }}>{text}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 6,
            padding: "10px 22px",
            borderRadius: 13,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: GRAD,
            boxShadow: "0 8px 22px rgba(99,134,255,.3)",
          }}
        >
          Skúsiť znova
        </button>
      )}
    </div>
  );
}

// ---- SPINNER (drobný, na inline načítanie) ----
export function Spinner({ size = 22, color = C.blueL }: { size?: number; color?: string }) {
  return (
    <span
      aria-label="Načítavam…"
      role="status"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid rgba(var(--glass-rgb),.18)`,
        borderTopColor: color,
        display: "inline-block",
        animation: "tocenie 0.8s linear infinite",
      }}
    />
  );
}
