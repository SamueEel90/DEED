import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useBadgeBind, useBadgeUnbind, useBadgeScan } from "@/data";
import { Sheet } from "@/components/sheet";
import { IkonaStit, IkonaFajka, Palec } from "@/components/icons";

// ============================================================
// ODZNAK (Fáza 5) — shift-binding. Otvorí sa po naskenovaní /badge/{slug}.
// Zamestnanec: prihlás/odhlás zo zmeny. Zákazník: pochvala/dar → aktuálne
// prihlásenému (NULL → pobočka). Firma vidí len AGREGÁT pochvál (počty), nie sumy.
// ============================================================
const SUMY = [10, 50, 100];

export function BadgeSheet({ badgeId, nazov, onClose, toast }: { badgeId: string; nazov?: string; onClose?: () => void; toast?: (t: string) => void }) {
  const { ucetId } = usePouzivatel();
  const bind = useBadgeBind();
  const unbind = useBadgeUnbind();
  const scan = useBadgeScan();
  const [suma, setSuma] = useState(0);

  const prihlasit = async () => {
    if (!ucetId) { toast?.("Prihlás sa do účtu, aby si sa nahlásil na zmenu"); return; }
    try { await bind.mutateAsync({ badgeId, employeeId: ucetId }); toast?.("Prihlásený na zmenu — pochvaly idú tebe"); onClose?.(); }
    catch { toast?.("Nepodarilo sa prihlásiť"); }
  };
  const odhlasit = async () => {
    try { await unbind.mutateAsync(badgeId); toast?.("Odhlásený zo zmeny"); onClose?.(); }
    catch { toast?.("Nepodarilo sa odhlásiť"); }
  };
  const poslat = async (s: number) => {
    try {
      const r = await scan.mutateAsync({ badgeId, zakaznik: ucetId ?? null, suma: s });
      const komu = r.prijemca === "employee" ? "zamestnancovi na zmene" : "pobočke (nikto na zmene)";
      toast?.(s > 0 ? `Dar ${s} DEED → ${komu}` : `Pochvala → ${komu}`);
      onClose?.();
    } catch { toast?.("Nepodarilo sa odoslať"); }
  };

  const btn = (grad = false): CSSProperties => ({ flex: 1, padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.md, border: grad ? "none" : `1px solid ${C.line}`, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: grad ? GRAD_ZELENY : C.surface2, color: grad ? "#fff" : C.text });
  const chip = (active: boolean): CSSProperties => ({ flex: 1, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, border: `1px solid ${active ? C.green : C.line}`, background: active ? tint(C.green, .1) : C.surface2, color: active ? C.green : C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" });
  const Label = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>{children}</div>;

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
        <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-info)", .16) }}><IkonaStit size={18} color="var(--a-info)" /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Odznak{nazov ? ` · ${nazov}` : ""}</div>
          <div style={{ fontSize: 11.5, color: C.textTer }}>Pochvala/dar ide práve prihlásenému</div>
        </div>
      </div>

      {/* ZÁKAZNÍK — poďakuj */}
      <Label>POĎAKUJ (zákazník)</Label>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <button onClick={() => poslat(0)} style={btn(false)}><Palec size={16} color={C.textSec} /> Pochvála</button>
      </div>
      <Label>ALEBO POŠLI DAR</Label>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {SUMY.map((s) => <button key={s} onClick={() => setSuma(s)} style={chip(suma === s)}>{s} DEED</button>)}
      </div>
      <button disabled={suma <= 0 || scan.isPending} onClick={() => poslat(suma)} style={{ ...btn(true), width: "100%", opacity: suma > 0 ? 1 : .5, cursor: suma > 0 ? "pointer" : "not-allowed" }}>{scan.isPending ? "Odosielam…" : suma > 0 ? `Poslať ${suma} DEED` : "Vyber sumu"}</button>

      {/* ZAMESTNANEC — zmena */}
      <Label>SOM ZAMESTNANEC — ZMENA</Label>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <button onClick={prihlasit} style={btn(false)}><IkonaFajka size={15} color="var(--a-green)" /> Prihlásiť na zmenu</button>
        <button onClick={odhlasit} style={btn(false)}>Odhlásiť</button>
      </div>
      <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.5 }}>Odznak patrí firme. Firma vidí len <b>počet pochvál</b> na zamestnanca, nie sumy.</div>
    </Sheet>
  );
}
