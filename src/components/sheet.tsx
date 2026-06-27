// ============================================================
// DEED · Sheet — bottom-sheet drawer (Vaul). Drop-in náhrada za Modal:
// rovnaké API { children, onClose }. Oproti ručnému Modalu pridáva
// drag-to-dismiss + výstupnú animáciu (slide-down) + focus-trap +
// scroll-lock + ARIA (cez Radix Dialog, na ktorom Vaul stojí).
//
// Renderujeme INLINE (bez Drawer.Portal) s position:absolute — presne
// ako pôvodný Modal — aby sheet ostal vo vycentrovanom stĺpci appky a
// na desktope „neušiel" cez celý viewport (čo by spravil position:fixed).
// ============================================================
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { glassTmavy } from "@/theme";
import { RADIUS, SHADOW } from "@/tokens";

export function Sheet({
  children,
  onClose,
  dismissible = true,
}: {
  children?: ReactNode;
  onClose?: () => void;
  /** false = nedá sa zavrieť ťahom/ESC/tapom mimo (napr. počas spracovania platby) */
  dismissible?: boolean;
}) {
  return (
    <Drawer.Root
      open
      dismissible={dismissible}
      onOpenChange={(o) => {
        if (!o) onClose?.();
      }}
      shouldScaleBackground={false}
    >
      <Drawer.Overlay
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4,6,12,.5)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          zIndex: 55,
        }}
      />
      <Drawer.Content
        aria-describedby={undefined}
        className="deed-sheet"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 56,
          outline: "none",
          display: "flex",
          flexDirection: "column",
          ...glassTmavy(26, 0.8),
          borderBottom: "none",
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          boxShadow: SHADOW.lg,
        }}
      >
        {/* grabber pill — vizuálny ťah dole (Vaul ho spraví funkčným) */}
        <div
          aria-hidden
          style={{
            flex: "0 0 auto",
            width: 42,
            height: 4,
            borderRadius: 3,
            background: "rgba(var(--glass-rgb),.22)",
            margin: "10px auto 14px",
          }}
        />
        {/* Vaul/Radix vyžaduje Title pre a11y — vizuálne skrytý */}
        <Drawer.Title style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
          Panel
        </Drawer.Title>
        {/* obsah — scrolluje, ak je privysoký; spodok rešpektuje home indicator (safe-area) */}
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "0 20px calc(22px + env(safe-area-inset-bottom, 0px))" }}>
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
