// ============================================================
// DEED · Tip — jednotný tooltip (Radix) pre vysvetlenie žargónu
// (karma úroveň, pásma sumy, escrow, Overujem/Namietam…).
// Desktop: hover/focus. Mobil: tooltipy sa nespúšťajú tapom —
// tam žargón vysvetľuje sprievodca „Ako DEED funguje" (intro.tsx).
//
// <TipProvider> je zapojený raz v App; <Tip label="…"> obalí
// ľubovoľný element (asChild — nemení DOM/vizuál triggeru).
// ============================================================
import type { ReactNode } from "react";
import * as RT from "@radix-ui/react-tooltip";
import { C, glassTmavy } from "@/theme";
import { RADIUS, SPACE } from "@/tokens";

export function TipProvider({ children }: { children: ReactNode }) {
  return <RT.Provider delayDuration={350} skipDelayDuration={200}>{children}</RT.Provider>;
}

export function Tip({ label, children, side = "top" }: { label: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content side={side} sideOffset={6} collisionPadding={10} style={{
          ...glassTmavy(14, .92), borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`,
          fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: C.text, maxWidth: 260,
          boxShadow: "0 10px 30px rgba(0,0,0,.3)", zIndex: 1200,
          fontFamily: "'Plus Jakarta Sans', -apple-system, 'Segoe UI', Arial, sans-serif",
        }}>
          {label}
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
