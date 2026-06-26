// ============================================================
// DEED · Motion — Framer Motion (cez `motion/react`).
// LazyMotion + `m` (nie `motion`) držia bundle malý; `strict` v App
// spraví z náhodného motion.* build-time chybu.
// Reduced-motion rieši <MotionConfig reducedMotion="user"> v App
// (+ CSS @media v index.css) — variants netreba ručne strážiť.
// ============================================================
import type { ReactNode } from "react";
import { m, AnimatePresence } from "motion/react";
import { DUR, EASE, TAP } from "@/theme";

export { m, AnimatePresence } from "motion/react";

// ---- VARIANTS ----

// prechod medzi obrazovkami modulu (home ↔ detail ↔ add)
export const pageV = {
  enter: { opacity: 0, x: 18 },
  center: { opacity: 1, x: 0, transition: { duration: DUR.base, ease: EASE.out } },
  exit: { opacity: 0, x: -18, transition: { duration: DUR.fast, ease: EASE.out } },
};

// generický vstup (náhrada @keyframes fadeUp)
export const fadeUpV = {
  hidden: { opacity: 0, y: 7 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
};

// stagger zoznamu — rodič `listV`, položky `itemV`
export const listV = { show: { transition: { staggerChildren: 0.04 } } };
export const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

// micro-interakcia: stlačenie
export const tapProps = { whileTap: TAP };

// prechod obrazoviek — IBA opacity (žiadny transform → neláme sticky
// hlavičky ani containing-block; bezpečné naprieč modulmi)
export const screenV = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: DUR.base, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE.out } },
};

// ---- SCREEN SWITCH ----
// Obalí skupinu screen-podmienok modulu; `k` = string zo screen-machine.
// `mode="wait"` → odchádzajúca obrazovka dohrá exit skôr, než sa zobrazí
// nová (žiadne prekrytie, čistý crossfade, pasuje k scrollHore).
export function ScreenSwitch({ k, children }: { k: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div key={k} variants={screenV} initial="enter" animate="center" exit="exit">
        {children}
      </m.div>
    </AnimatePresence>
  );
}
