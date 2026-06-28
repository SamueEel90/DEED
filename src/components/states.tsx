// ============================================================
// DEED · Stavové komponenty — loading (skeleton) / prázdne / chyba.
// Jednotný vzhľad naprieč modulmi. Shimmer využíva @keyframes lesk (index.css).
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, SPACE, RADIUS } from "@/theme";

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
        margin: `${SPACE.sm}px ${SPACE.sm}px`,
        border: `1px solid ${C.line}`,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        background: "rgba(var(--glass-rgb),.03)",
      }}
    >
      <Skeleton h={140} radius={0} />
      <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
          <Skeleton w={34} h={34} radius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton w="55%" h={12} style={{ marginBottom: SPACE.xs }} />
            <Skeleton w="35%" h={10} />
          </div>
        </div>
        <Skeleton w="92%" h={13} style={{ marginBottom: SPACE.xs }} />
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
    <div aria-busy="true" aria-label="Načítavam…" style={{ padding: `${SPACE.xxs}px ${SPACE.gutter}px` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px 0`, borderBottom: `1px solid ${C.line2}` }}>
          <Skeleton w={38} h={38} radius={11} />
          <div style={{ flex: 1 }}>
            <Skeleton w="60%" h={12} style={{ marginBottom: SPACE.xs }} />
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
        gap: SPACE.xs,
      }}
    >
      <div style={{ fontSize: 38, opacity: 0.9, marginBottom: SPACE.xxs }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: C.textTer, lineHeight: 1.5, maxWidth: 320 }}>{text}</div>}
      {action && <div style={{ marginTop: SPACE.sm }}>{action}</div>}
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
        gap: SPACE.sm,
      }}
    >
      <div style={{ fontSize: 38, marginBottom: SPACE.xxs }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textTer, lineHeight: 1.5, maxWidth: 320 }}>{text}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: SPACE.xs,
            padding: `${SPACE.sm}px ${SPACE.lg}px`,
            borderRadius: RADIUS.sm,
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
