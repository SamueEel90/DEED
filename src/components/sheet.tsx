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
import { glassTmavy, SIRKA } from "@/theme";
import { RADIUS, SHADOW } from "@/tokens";
import { useLayout } from "@/components/context";

export function Sheet({
  children,
  onClose,
  dismissible = true,
  direction = "bottom",
  label = "Panel",
}: {
  children?: ReactNode;
  onClose?: () => void;
  /** false = nedá sa zavrieť ťahom/ESC/tapom mimo (napr. počas spracovania platby) */
  dismissible?: boolean;
  /** top = sheet sa rozbalí zhora (menu „Viac", notifikačný panel) */
  direction?: "bottom" | "top";
  /** názov panelu pre čítačky (Radix Dialog Title, vizuálne skrytý) */
  label?: string;
}) {
  const zhora = direction === "top";
  const { desktop } = useLayout();
  // desktop: sheet nedržíme na celú šírku plochy (roztiahnutý panel pôsobí lacno) —
  // capneme na čitateľnú šírku a vycentrujeme (left:0/right:0 + auto marginy = stred)
  const cap = desktop ? { maxWidth: SIRKA.citanie, marginLeft: "auto", marginRight: "auto" } : {};
  const grabber = (
    <div
      aria-hidden
      style={{
        flex: "0 0 auto",
        width: 42,
        height: 4,
        borderRadius: 3,
        background: "rgba(var(--glass-rgb),.22)",
        margin: zhora ? "12px auto 10px" : "10px auto 14px",
      }}
    />
  );
  return (
    <Drawer.Root
      open
      dismissible={dismissible}
      direction={direction}
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
          ...cap,
          ...(zhora ? { top: 0, maxHeight: "88%" } : { bottom: 0 }),
          zIndex: 56,
          outline: "none",
          display: "flex",
          flexDirection: "column",
          ...glassTmavy(26, 0.8),
          ...(zhora
            ? { borderTop: "none", borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl }
            : { borderBottom: "none", borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl }),
          boxShadow: SHADOW.lg,
        }}
      >
        {/* grabber pill — vizuálny ťah (Vaul ho spraví funkčným); pri top sheete je dole */}
        {!zhora && grabber}
        {/* Vaul/Radix vyžaduje Title pre a11y — vizuálne skrytý */}
        <Drawer.Title style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
          {label}
        </Drawer.Title>
        {/* obsah — scrolluje, ak je privysoký; spodok rešpektuje home indicator (safe-area).
            TOP sheet (menu „Viac"/notifikácie): scroll obsahom = ťah prstom NAHOR, čo Vaul
            u top-drawera číta ako drag-to-dismiss → zavrelo by sa pri scrollovaní. `data-vaul-no-drag`
            vypne drag z obsahu (zatvorí sa len grabberom/tapom mimo), takže sa dá pokojne scrollovať. */}
        <div {...(zhora ? { "data-vaul-no-drag": true } : {})} style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: zhora ? "14px 20px 4px" : "0 20px calc(22px + env(safe-area-inset-bottom, 0px))" }}>
          {children}
        </div>
        {zhora && grabber}
      </Drawer.Content>
    </Drawer.Root>
  );
}
