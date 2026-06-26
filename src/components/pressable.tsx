// ============================================================
// DEED · Pressable — spraví z klikateľného <div>/<span> skutočné
// tlačidlo: role="button", tabIndex, klávesnica (Enter/Space) + press
// feedback (whileTap). Rieši ~50 klikateľných divov bez a11y.
//
// Dva nástroje:
//  • pressable(onPress, label) — spread na existujúci element (min. zmena)
//  • <Pressable> — motion wrapper s vstavaným whileTap
// ============================================================
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { m } from "motion/react";
import { TAP } from "@/tokens";

type PressHandler = (e: React.MouseEvent | React.KeyboardEvent) => void;

/** Spread na ľubovoľný element → správa sa ako tlačidlo (klik + klávesnica). */
export function pressable(onPress?: PressHandler, label?: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPress?.(e);
      }
    },
  };
}

/** Motion wrapper: klikateľné + prístupné + press feedback (scale .97). */
export function Pressable({
  onPress,
  label,
  children,
  style,
  className,
}: {
  onPress?: PressHandler;
  label?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <m.div
      {...pressable(onPress, label)}
      whileTap={TAP}
      className={className}
      style={{ cursor: "pointer", ...style }}
    >
      {children}
    </m.div>
  );
}
