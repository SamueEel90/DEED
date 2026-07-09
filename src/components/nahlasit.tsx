// ============================================================
// DEED · Nahlásenie obsahu — sheet s dôvodom (vlajka 🚩 v detailoch).
// §11: na zriedkavý podvod stačí nahlásiť, nie verejné hlasovanie.
// Mock v1: nahlásenie sa uloží lokálne (deed.nahlasenia.v1) — backend
// moderácie príde s Fázou 5. UX je už finálne.
// ============================================================
import { useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { Sheet } from "@/components/sheet";
import { nahlasit as nahlasitDB, type NahlasDovod } from "@/lib/osobne";

const DOVODY = [
  { id: "podvod", label: "Podvod alebo klamstvo", desc: "Zbierka/skutok nie je pravdivý" },
  { id: "urazlive", label: "Urážlivý obsah", desc: "Nenávisť, obťažovanie, nevhodné fotky" },
  { id: "spam", label: "Spam alebo reklama", desc: "Nepatrí sem, opakuje sa, predáva" },
  { id: "ine", label: "Iné", desc: "Popíš v poznámke nižšie" },
] as const;

export function NahlasitSheet({ co, refId, modul, onClose, toast }: {
  co: string;                 // názov nahlasovaného obsahu (do potvrdenia)
  refId?: string | number;
  modul?: string;
  onClose?: () => void;
  toast?: (m: string) => void;
}) {
  const [dovod, setDovod] = useState<string | null>(null);
  const [poznamka, setPoznamka] = useState("");

  function posli() {
    if (!dovod) return;
    // fire-and-forget: DB (ak je) alebo localStorage
    void nahlasitDB({ co, refId, modul, dovod: dovod as NahlasDovod, poznamka: poznamka.trim() || undefined, kedy: new Date().toISOString() });
    toast?.("Nahlásené — pozrieme sa na to. Ďakujeme za ochranu komunity.");
    onClose?.();
  }

  return (
    <Sheet onClose={onClose} label={`Nahlásiť — ${co}`}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>🚩 Nahlásiť obsah</div>
      <div style={{ fontSize: 12, color: C.textTer, marginTop: SPACE.xxs, marginBottom: SPACE.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{co}</div>

      {DOVODY.map((d) => (
        <button key={d.id} onClick={() => setDovod(d.id)}
          style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: SPACE.sm, textAlign: "left", padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", background: dovod === d.id ? tint("#E0524B", .08) : C.surface2, border: `1px solid ${dovod === d.id ? "#E0524B" : C.line}`, color: C.text }}>
          <span style={{ width: 18, height: 18, marginTop: 1, borderRadius: RADIUS.round, flex: "none", border: `2px solid ${dovod === d.id ? "#E0524B" : C.line}`, background: dovod === d.id ? "#E0524B" : "transparent" }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{d.label}</span>
            <span style={{ display: "block", fontSize: 11.5, color: C.textTer, marginTop: SPACE.xxs }}>{d.desc}</span>
          </span>
        </button>
      ))}

      <textarea value={poznamka} onChange={(e) => setPoznamka(e.target.value)}
        placeholder="Poznámka (nepovinné) — čo presne je zle?"
        aria-label="Poznámka k nahláseniu"
        style={{ width: "100%", minHeight: 64, resize: "vertical", boxSizing: "border-box", marginTop: SPACE.xs, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 13.5, lineHeight: 1.5, fontFamily: "inherit", outline: "none" }} />

      <button onClick={posli} disabled={!dovod}
        style={{ width: "100%", height: 48, marginTop: SPACE.sm, borderRadius: RADIUS.sm, border: "none", cursor: dovod ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 700, fontSize: 15, background: dovod ? "#E0524B" : tint("#E0524B", .12), color: dovod ? "#fff" : C.textTer }}>
        Nahlásiť
      </button>
      <div style={{ fontSize: 10.5, color: C.textTer, textAlign: "center", marginTop: SPACE.sm, lineHeight: 1.5 }}>
        Nahlásenie je anonymné voči autorovi. Opakované krivé nahlásenia znižujú tvoju dôveryhodnosť.
      </div>
    </Sheet>
  );
}
