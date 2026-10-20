// ============================================================
// OPRAVY 431 · Detail oznamu / výzvy charity — ťuk na kartu vo feede Domov aj na profile charity.
// Hlavička: ‹ Späť · na stred dátum zverejnenia (výzva nemá protihodnotu → bez čísla, 428).
// Telo: štítok, nadpis, do kedy / kde, celý text, všetky fotky s popisom, Pozvať ľudí (Zúčastním sa /
// Prihlásiť sa → „Prihlásený ✓“ + počet), kto zodpovedá + Pozri profil.
// VyzvaKarta = karta výzvy vo feede Domov (FeedCard podľa 426, jantárový pás a štítok VÝZVA).
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import "@/styles/sprava.css";
import { BackChip, FeedCard, useGaleria } from "@/shared";
import type { StitLevel } from "@/components/stit";
import { casOd } from "@/components/feedcard";
import { zverejneneText } from "@/components/CisloObjektu";
import { sanitizujHtml } from "@/lib/richtext";
import { cistyText } from "./obsahZbierky";
import { Media } from "./obsahZbierky";
import { ucast, nacitajUcasti, prihlasNaOznam, pocetText, useZmenyUcasti } from "@/lib/oznamUcast";
import { druhF, druhT } from "@/lib/druhy";
import type { OznamCharity } from "@/lib/oznamyNove";

export interface OrgOznamu { nazov: string; logo?: string; ini: string; mesto?: string; stit?: string }

const fmtDo = (v?: string) => { if (!v) return ""; const [, m, d] = v.split("-"); return `${+d}. ${+m}.`; };
const fmtD = (v?: string) => { if (!v) return ""; const [y, m, d] = v.split("-"); return `${+d}. ${+m}. ${y}`; };
/** štítok podľa druhu oznamu */
export const stitokOznamu = (o: Pick<OznamCharity, "druh" | "kategoria">) => o.druh === "vyzva" ? "VÝZVA" : o.druh === "verejny" ? (o.kategoria ?? "Akcia").toLocaleUpperCase("sk-SK") : "OZNAM";
/** „do 21. 10.“ (výzva) · „21. 10. o 18:00“ (akcia) */
export const kedyKratko = (o: Pick<OznamCharity, "druh" | "datum" | "cas">) => o.druh === "vyzva" ? (o.datum ? `do ${fmtDo(o.datum)}` : "") : o.datum ? `${fmtDo(o.datum)}${o.cas ? ` o ${o.cas}` : ""}` : "";
/** prihlasovanie zavreté: zrušené, po dátume, plný limit */
const zavrete = (o: OznamCharity, pocet: number, dnes = new Date().toISOString().slice(0, 10)) =>
  !!o.zrusene || (o.druh !== "oznam" && !!o.datum && o.datum < dnes) || (o.pozvanie === "zavazne" && !!o.limit && pocet >= o.limit);

export function OznamDetail({ o, org, onBack, onProfil, toast }: { o: OznamCharity; org: OrgOznamu; onBack: () => void; onProfil?: () => void; toast?: (m: string) => void }) {
  useZmenyUcasti();
  useEffect(() => { void nacitajUcasti([o.id]); }, [o.id]);
  const otvorGaleriu = useGaleria();
  const [chyba, setChyba] = useState<string | null>(null);
  const [posiela, setPosiela] = useState(false);
  const { pocet, moja } = ucast(o.id);
  const vyzva = o.druh === "vyzva";
  const fotky = o.media.filter((m) => m.typ === "foto");
  const druhFarba = vyzva ? druhF("vyzva") : "var(--ink3)";
  const prihlas = async () => {
    if (posiela || moja) return;
    setPosiela(true); setChyba(null);
    const e = await prihlasNaOznam(o.id);
    setPosiela(false);
    if (e) setChyba(e); else toast?.(o.pozvanie === "zavazne" ? "Prihlásený ✓" : "Ďakujeme ✓");
  };
  const zatvorene = !moja && zavrete(o, pocet);
  const tl: CSSProperties = { minHeight: 50, padding: "0 22px", borderRadius: 14, border: "none", cursor: moja || zatvorene ? "default" : "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 };
  return (
    <div className="sc-tokeny" style={{ paddingBottom: 24, maxWidth: 760, margin: "0 auto", color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
        <BackChip onBack={onBack} />
        <span style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 13, color: "var(--ink3, var(--c-textTer))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Zverejnené {zverejneneText(o.zverejnene)}</span>
        <span aria-hidden="true" style={{ width: 64, flex: "none" }} />
      </div>
      <div style={{ padding: "6px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 9, background: vyzva ? druhFarba : "transparent", border: vyzva ? "none" : "1px solid var(--cardBd)", color: vyzva ? "#fff" : "var(--ink3)", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>{o.zrusene ? "ZRUŠENÉ" : stitokOznamu(o)}</span>
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.25, fontWeight: 800, textDecoration: o.zrusene ? "line-through" : "none", overflowWrap: "anywhere" }}>{o.nadpis}</h1>
        {(o.datum || o.miesto) && <span style={{ fontSize: 15, fontWeight: 700, color: vyzva ? druhT("vyzva") : "var(--ink2)" }}>
          {[vyzva ? (o.datum ? `Pomoc treba do ${fmtD(o.datum)}` : "") : o.datum ? `Koná sa ${fmtD(o.datum)}${o.cas ? ` o ${o.cas}` : ""}` : "", o.miesto].filter(Boolean).join(" · ")}</span>}
        {fotky.length > 0 && <div style={{ display: "grid", gridTemplateColumns: fotky.length > 1 ? "repeat(auto-fill,minmax(min(100%,300px),1fr))" : "minmax(0,1fr)", gap: 12 }}>
          {fotky.map((m, i) => (
            <figure key={m.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" onClick={() => otvorGaleriu(fotky.map((x) => x.src), i)} aria-label={`Fotka ${i + 1} z ${fotky.length}, zväčšiť`}
                style={{ display: "block", width: "100%", aspectRatio: "16 / 9", padding: 0, border: "none", borderRadius: 16, overflow: "hidden", background: "#1D211B", cursor: "zoom-in", boxShadow: "none" }}><Media m={m} /></button>
              {m.popis?.trim() && <figcaption style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink3)" }}>{m.popis}</figcaption>}
            </figure>))}
        </div>}
        {cistyText(o.text) && <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink2)", overflowWrap: "anywhere" }} dangerouslySetInnerHTML={{ __html: sanitizujHtml(o.text) }} />}
        {o.pozvanie !== "bez" && <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {moja ? <span role="status" style={{ ...tl, display: "inline-flex", alignItems: "center", background: "var(--gSoft)", color: "var(--gInk)" }}>{o.pozvanie === "zavazne" ? "Prihlásený ✓" : "Zúčastníte sa ✓"}</span>
              : zatvorene ? <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink3)" }}>{o.zrusene ? "Zrušené" : o.pozvanie === "zavazne" && o.limit && pocet >= o.limit ? "Prihlasovanie je plné" : "Už skončilo"}</span>
              : <button type="button" onClick={() => void prihlas()} disabled={posiela} style={{ ...tl, background: "#4B7A35", color: "#fff", opacity: posiela ? 0.6 : 1 }}>{posiela ? "Posiela sa…" : o.pozvanie === "zavazne" ? "Prihlásiť sa" : "Zúčastním sa"}</button>}
            <span style={{ fontSize: 14, color: "var(--ink3)" }}>{pocet > 0 ? pocetText(pocet, vyzva) : vyzva ? "Buďte prvý, kto pomôže" : "Zatiaľ nikto"}{o.pozvanie === "zavazne" && o.limit ? ` · najviac ${o.limit}` : ""}</span>
          </div>
          {chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cRed, #A34A2A)" }}>{chyba}</span>}
        </div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
          <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", background: org.logo ? `url('${org.logo}') center/cover no-repeat #fff` : "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{org.logo ? "" : org.ini}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{vyzva ? "ZA VÝZVU ZODPOVEDÁ" : "ZA OZNAM ZODPOVEDÁ"}</span>
            <b style={{ display: "block", fontSize: 14.5, overflowWrap: "anywhere" }}>{org.nazov}{org.mesto ? ` · ${org.mesto}` : ""}</b>
          </span>
          {onProfil && <button type="button" onClick={onProfil} style={{ flex: "none", minHeight: 44, padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>Pozri profil ›</button>}
        </div>
      </div>
    </div>);
}

/** karta výzvy vo feede Domov (426: tvorca pod fotkou, čas vpravo hore, riadok údajov „6 ľudí už pomáha · do 21. 10.“) */
export function VyzvaKarta({ o, org, wide, onClick, onProfil }: { o: OznamCharity; org: OrgOznamu; wide?: boolean; onClick: () => void; onProfil?: () => void }) {
  useZmenyUcasti();
  const { pocet } = ucast(o.id);
  const fotky = o.media.filter((m) => m.typ === "foto").map((m) => m.src);
  return (
    <FeedCard wide={wide} onClick={onClick} label={`Otvoriť výzvu: ${o.nadpis}`} typ="vyzva"
      media={fotky.length ? { fotky, h: 235 } : {}}
      cas={casOd(o.zverejnene)}
      tvorca={{ meno: org.nazov, logo: org.logo, ini: org.ini, mesto: org.mesto, stit: (org.stit as StitLevel | undefined), onProfil }}
      title={o.nadpis} text={cistyText(o.text)}
      udaje={[o.pozvanie !== "bez" && pocet > 0 ? pocetText(pocet, true) : "", kedyKratko(o)].filter(Boolean).join(" · ")} />);
}
