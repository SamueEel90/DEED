// ============================================================
// DEED · Toast — globálny sonner namiesto duplikovaného useState+setTimeout
// v 8 moduloch. `toast("text")` má rovnaké API ako pôvodné lokálne toasty
// (string, ~2.3 s, mätová bodka). <DeedToaster> sa mountuje raz v App.
// Vizuál = pôvodný dark-glass mint snackbar (vždy tmavý, aj v light režime).
// ============================================================
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { GRAD_ZELENY } from "@/theme";
import { RADIUS, SHADOW, TYPE } from "@/tokens";

// mätová bodka — vizuálny podpis pôvodného toastu
function MintDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: GRAD_ZELENY,
      }}
    />
  );
}

/** Drop-in náhrada pôvodného lokálneho `toast(m)`. */
export const toast = (msg: string) => sonnerToast(msg, { duration: 2300, icon: <MintDot /> });
// pre prípadné budúce použitie (úspech/chyba/promise) re-exportujeme aj plný objekt
export { sonnerToast };

/** Mountuje sa raz v App (vnútri provider stromu). */
export function DeedToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={92}
      gap={8}
      toastOptions={{
        style: {
          background: "rgba(12,20,16,.93)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(92,230,184,.35)",
          color: "#C9F2E2",
          borderRadius: RADIUS.pill,
          padding: "11px 18px",
          width: "max-content",
          maxWidth: "88%",
          ...TYPE.caption,
          boxShadow: SHADOW.glowGreen,
        },
      }}
    />
  );
}
