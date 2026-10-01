// OPRAVY 91 · štít appky (data-stit na koreni appky): v správe stránky = štít tej stránky, mimo správy = osobný štít usera.
import { useSyncExternalStore } from "react";
import { MOJ_HLAVNY } from "@/lib/stityOblasti";
import type { StitCharity } from "@/features/rola/stav";

const ZO_STITU: Record<string, StitCharity> = { Bronze: "bronze", Silver: "silver", Gold: "gold", Platinum: "platinum", Legend: "legend" };
let stitSpravy: StitCharity | null = null;
const posl = new Set<() => void>();
/** správa stránky ohlási svoj štít (null = správa sa zavrela) */
export function nastavStitSpravy(s: StitCharity | null) { if (s === stitSpravy) return; stitSpravy = s; posl.forEach((f) => f()); }
export function useStitAppky(): StitCharity {
  const s = useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => stitSpravy, () => null);
  return s ?? ZO_STITU[MOJ_HLAVNY] ?? "bronze";
}
