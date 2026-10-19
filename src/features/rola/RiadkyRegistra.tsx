// ============================================================
// OPRAVY 400 · zamknuté riadky „Z REGISTRA“ (Nastavenia → Údaje organizácie aj Upraviť profil hore pod Názvom)
// Názov · Právna forma · IČO · Registrácia · Sídlo · Dátum vzniku · Štatutár. Prázdne = „doplniť ›“ (nič vymyslené).
// Testovacia verzia: aj vyplnené sa dajú prepísať („upraviť (test)“), kým nebude modul charity hotový.
// ============================================================
import { useState, type CSSProperties } from "react";
import { TESTOVACIA } from "@/lib/testovacia";
import { premenujStranku } from "@/lib/mojeStranky";
import { useRegistra, ulozRegistra, useStatutar, ulozStatutara, icoText, vznikText, type UdajeRegistra } from "@/lib/udajeRegistra";

type Kluc = keyof UdajeRegistra | "statutar";
const RIADKY: [Kluc, string, string][] = [
  ["nazov", "Názov", "napr. Pod korunami, o. z."], ["forma", "Právna forma", "napr. občianske združenie"], ["ico", "IČO", "8 číslic"],
  ["registracia", "Registrácia", "napr. MV SR, reg. č. VVS/1-900/90-57412"], ["sidlo", "Sídlo", "ulica, PSČ, mesto"],
  ["vznik", "Dátum vzniku", "napr. 14. 3. 2017"], ["statutar", "Štatutár", "meno a priezvisko"],
];
const Zamok = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none" }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const odkaz: CSSProperties = { flex: "none", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--green)", boxShadow: "none" };
const pole: CSSProperties = { flex: 1, minWidth: 0, height: 46, padding: "0 12px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", boxSizing: "border-box" };

export function RiadkyRegistra({ strankaId, bezNazvu }: { strankaId: string; /** Upraviť profil: názov je nad riadkami */ bezNazvu?: boolean }) {
  const r = useRegistra(strankaId);
  const st = useStatutar();
  const [uprav, setUprav] = useState<Kluc | null>(null);
  const [text, setText] = useState("");
  const [hlaska, setHlaska] = useState<{ k: Kluc; t: string; chyba?: boolean } | null>(null);
  const hodnota = (k: Kluc) => (k === "statutar" ? st.meno : k === "ico" ? icoText(r.ico) : k === "vznik" ? vznikText(r.vznik) : r[k]);
  const zacni = (k: Kluc) => { setUprav(k); setText(k === "statutar" ? st.meno : r[k as keyof UdajeRegistra] ?? ""); setHlaska(null); };
  const uloz = async (k: Kluc) => {
    const v = text.trim().slice(0, 160);
    try {
      if (k === "statutar") ulozStatutara({ meno: v });
      else await ulozRegistra(strankaId, { [k]: k === "ico" ? v.replace(/\D/g, "").slice(0, 8) : v });
      if (k === "nazov" && v) await premenujStranku(strankaId, v); // OPRAVY 414 (3): názov všade (Moje stránky, Správa, verejný profil)
      setUprav(null); setHlaska({ k, t: "Uložené ✓" });
    } catch { setHlaska({ k, t: "Neuložilo sa · skúste znova", chyba: true }); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {RIADKY.filter(([k]) => !(bezNazvu && k === "nazov")).map(([k, t, ph], i) => {
        const v = hodnota(k);
        return (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}<span style={{ fontWeight: 400 }}>{` · ${ph}`}</span></span>{/* OPRAVY 414 (7): čo kam patrí */}
                {v ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, color: "var(--ink)", overflowWrap: "anywhere" }}><Zamok />{v}</span>
                  : <span style={{ fontSize: 14, color: "var(--ink3)" }}>nevyplnené</span>}
              </span>
              {uprav !== k && (!v ? <button type="button" onClick={() => zacni(k)} style={odkaz}>doplniť ›</button>
                : TESTOVACIA ? <button type="button" onClick={() => zacni(k)} style={{ ...odkaz, color: "var(--ink3)", fontWeight: 700 }}>upraviť (test)</button> : null)}
            </div>
            {uprav === k && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={ph} aria-label={t} inputMode={k === "ico" ? "numeric" : undefined}
                onKeyDown={(e) => { if (e.key === "Enter") void uloz(k); if (e.key === "Escape") setUprav(null); }} style={pole} />
              <button type="button" onClick={() => void uloz(k)} style={{ ...odkaz, minWidth: 72, height: 46, borderRadius: 12, background: "var(--green)", color: "#fff", padding: "0 14px" }}>Uložiť</button>
              <button type="button" onClick={() => setUprav(null)} style={{ ...odkaz, color: "var(--ink2)" }}>Zrušiť</button>
            </div>}
            {hlaska?.k === k && <span role={hlaska.chyba ? "alert" : "status"} style={{ fontSize: 13.5, fontWeight: 700, color: hlaska.chyba ? "#A34A2A" : "var(--gInk)" }}>{hlaska.t}</span>}
          </div>);
      })}
    </div>);
}
