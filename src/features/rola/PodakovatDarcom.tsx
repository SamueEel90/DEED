// ============================================================
// OPRAVY 349 · Ľudia → Darcovia: Poďakovať darcom (ako charita · Hromadné poďakovanie).
// Komu: Všetkým darcom · Hlavná zbierka · každá zbierka farnosti (zbierky rodiny nie). Text → Oznámenia darcov (server 0106).
// ============================================================
import { useState, type CSSProperties } from "react";
import { TextovePolia, cistyText } from "./obsahZbierky";
import { podakujDarcomFarnosti } from "@/lib/podakovanieFarnosti";
import { nacitajStav, ulozStavIsto } from "@/features/viera/stav";

// odpovede 18. 10.: pod tlačidlom posledné poslanie (kedy · komu), uložené pri stránke
type Posledne = { cas: string; komu: string };

export function PodakovatDarcom({ strankaId, mobil, ciele }: { strankaId: string; mobil: boolean; /** [kľúč, názov] — vsetci, hlavna, id zbierky */ ciele: [string, string][] }) {
  const [otv, setOtv] = useState(false);
  const [komu, setKomu] = useState("vsetci");
  const [txt, setTxt] = useState("");
  const [st, setSt] = useState<{ k: "busy" } | { k: "ok"; n: number } | { k: "err"; e: string } | null>(null);
  const text = cistyText(txt);
  const [posledne, setPosledne] = useState<Posledne | null>(() => nacitajStav<Posledne | null>("podakovanieDarcom", strankaId, null));
  const posli = async () => {
    if (!text || st?.k === "busy") return;
    setSt({ k: "busy" });
    const v = await podakujDarcomFarnosti(strankaId, komu, text.slice(0, 1500));
    setSt("e" in v ? { k: "err", e: v.e } : { k: "ok", n: v.n });
    if (!("e" in v)) { const p = { cas: new Date().toISOString(), komu: ciele.find(([k]) => k === komu)?.[1] ?? "" }; setPosledne(p); void ulozStavIsto("podakovanieDarcom", strankaId, p); }
  };
  const karta: CSSProperties = { flex: "none", borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? 16 : "18px 20px", display: "flex", flexDirection: "column", gap: 12 };
  if (!otv) return <button type="button" onClick={() => setOtv(true)} style={{ alignSelf: "flex-start", minHeight: 52, padding: "0 22px", border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, boxShadow: "none" }}>Poďakovať darcom</button>;
  const tl = !text ? { t: "Najprv napíšte poďakovanie", bg: "var(--btn)", c: "var(--ink3)", bd: "none" }
    : st?.k === "busy" ? { t: "Posielam …", bg: "#4B7A35", c: "#fff", bd: "none" }
    : st?.k === "ok" ? { t: "Poslané ✓ · príde im do Oznámení", bg: "var(--gSoft)", c: "var(--gInk)", bd: "none" }
    : st?.k === "err" ? { t: "Nepodarilo sa · Skúsiť znova", bg: "var(--rBg)", c: "var(--cRed)", bd: "1.5px solid var(--rBd)" }
    : { t: "Poslať poďakovanie", bg: "#4B7A35", c: "#fff", bd: "none" };
  return (
    <section style={karta}>
      <b style={{ fontSize: 18 }}>Poďakovať darcom</b>
      <div role="radiogroup" aria-label="Komu" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ciele.map(([k, t]) => { const on = komu === k; return <button key={k} type="button" role="radio" aria-checked={on} onClick={() => { setKomu(k); setSt(null); }} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: on ? "2px solid var(--green)" : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", color: on ? "var(--gInk)" : "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, boxShadow: "none", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</button>; })}
      </div>
      <TextovePolia popis={txt} popis2="" onPopis={(h) => { setTxt(h); if (st?.k !== "busy") setSt(null); }} onPopis2={() => undefined} ph={mobil} bezPokracovania
        popisHlavneho="Napíšte darcom pár viet poďakovania." placeholder="Ďakujeme, že ste s nami. Vďaka vašim darom…" />
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Príde darcom do Oznámení od farnosti.</span>
      <button type="button" aria-busy={st?.k === "busy"} onClick={() => void posli()} style={{ minHeight: 52, padding: "0 20px", border: tl.bd, borderRadius: 14, background: tl.bg, color: tl.c, cursor: text ? "pointer" : "default", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" }}>{tl.t}</button>
      {st?.k === "ok" && <span role="status" style={{ fontSize: 13.5, color: "var(--gInk)", fontWeight: 700 }}>{st.n === 1 ? "Dostane ho 1 darca." : st.n > 1 && st.n < 5 ? `Dostanú ho ${st.n} darcovia.` : `Dostane ho ${st.n} darcov.`}</span>}
      {st?.k === "err" && <span role="alert" style={{ fontSize: 13.5, color: "var(--cRed)", fontWeight: 700 }}>{st.e}</span>}
      {posledne && <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Naposledy poslané {(() => { const d = new Date(posledne.cas); return `${d.getDate()}. ${d.getMonth() + 1}.`; })()} · {posledne.komu}</span>}
      <button type="button" onClick={() => { setOtv(false); setSt(null); }} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 16px", border: "1.5px solid var(--cardBd)", borderRadius: 12, background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>Zavrieť</button>
    </section>);
}
