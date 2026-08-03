// ============================================================
// DEED · „Ozvať sa" — mini formulár so správou pre organizáciu
// (Charita „Zapojiť sa", Help „Mám záujem", Viera dobrovoľníctvo).
// Mock v1: správa sa uloží lokálne (deed.spravy.v1) — až príde messaging
// backend, odošle sa reálne. UI je už finálne.
// ============================================================
import { useState } from "react";
import { C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { Sheet } from "@/components/sheet";
import { poslatSpravu, type OdoslanaSprava } from "@/lib/osobne";

export type { OdoslanaSprava };

export function OzvatSaSheet({ komu, refId, modul, uvod, onClose, toast }: {
  komu: string;
  refId?: string | number;
  modul?: string;
  uvod?: string;             // predvyplnený text (napr. „Rád pomôžem s…")
  onClose?: () => void;
  toast?: (m: string) => void;
}) {
  const [sprava, setSprava] = useState(uvod ?? "");
  const [posielam, setPosielam] = useState(false);
  const ok = sprava.trim().length >= 3;

  function posli() {
    if (!ok || posielam) return;
    setPosielam(true);
    // fire-and-forget: DB (ak je) alebo localStorage; UI nezdržiavame čakaním
    void poslatSpravu({ komu, refId, modul, sprava: sprava.trim(), kedy: new Date().toISOString() });
    toast?.(`Správa odoslaná — ${komu} ťa bude kontaktovať.`);
    onClose?.();
  }

  return (
    <Sheet onClose={onClose} label={`Ozvať sa — ${komu}`}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>✍️ Ozvať sa</div>
      <div style={{ fontSize: 12, color: C.textTer, marginTop: SPACE.xxs, marginBottom: SPACE.sm }}>
        {komu} dostane tvoju správu spolu s menom z profilu. Žiadny verejný komentár — súkromná správa.
      </div>
      <textarea
        value={sprava} onChange={(e) => setSprava(e.target.value)} autoFocus
        placeholder="Napíš, ako vieš pomôcť alebo čo ťa zaujíma…"
        aria-label="Správa pre organizáciu"
        style={{ width: "100%", minHeight: 96, resize: "vertical", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", outline: "none" }} />
      <button onClick={posli} disabled={!ok || posielam}
        style={{ width: "100%", height: 48, marginTop: SPACE.sm, borderRadius: RADIUS.sm, border: "none", cursor: ok ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 700, fontSize: 15, background: ok ? GRAD_ZELENY : tint("var(--a-green)", .12), color: ok ? "#06281d" : C.textTer }}>
        {posielam ? "Odosielam…" : "Odoslať správu"}
      </button>
    </Sheet>
  );
}
