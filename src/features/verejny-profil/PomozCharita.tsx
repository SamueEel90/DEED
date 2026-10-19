// ============================================================
// OPRAVY 406 (charita) · blok Pomôž na verejnej stránke charity = Pomôž z Viery (KARTA 61 §2, OPRAVY 397).
// Karta: druh · kedy · názov · text · Kde · Kedy; Prídem pomôcť / Prihlásiť sa; „Prihlásení · N“ + mená (Mária K.),
// len pre registrovaných a keď charita nechala Ukázať; prihlásený vidí „Vy ✓ · Zrušiť účasť (podržať)“.
// Dáta: brigády stránky (lib/brigady) a reakcie (ucast). Deň po termíne brigáda zo stránky zmizne.
// ============================================================
import { useState, type CSSProperties } from "react";
import { useBrigady, skoncila } from "@/lib/brigady";
import { reakcieF, prepniReakciuF, useReakcieF, useCerstveReakcieF } from "@/lib/reakcieFarnosti";
import { usePouzivatel } from "@/lib/pouzivatel";
import { klucJa } from "./FarnikPridava";
import { PomozKarta } from "./KronikaFarnosti";
import { kedyBrigady } from "@/features/rola/BrigadyFarnosti";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { toast } from "@/shared";
import { cistyText } from "@/lib/richtext";

const ludi = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;
const kratkeMeno = (m?: string) => { const c = (m ?? "").trim().split(/\s+/).filter(Boolean); return !c.length ? "Dobrovoľník" : c.length === 1 ? c[0] : `${c[0]} ${c[c.length - 1][0].toLocaleUpperCase("sk-SK")}.`; };
const tl = (ja: boolean, plne: boolean): CSSProperties => ({ minHeight: 48, padding: "0 18px", borderRadius: 13, border: ja ? "2px solid #fff" : "none", background: plne ? "rgba(255,255,255,.35)" : ja ? "transparent" : "#fff", color: ja ? "#fff" : "#2F5E8E", cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "none" });

export function PomozCharita({ strankaId, pad }: { strankaId: string; pad?: string }) {
  useReakcieF(); useCerstveReakcieF(strankaId);
  const L = useBrigady(strankaId);
  const ja = usePouzivatel();
  const kto = klucJa(ja), reg = ja.typ !== "pasivny", mojeMeno = ja.celeMeno?.trim() || "Dobrovoľník";
  const [zoz, setZoz] = useState<string | null>(null);
  const teraz = Date.now();
  const bezi = L.filter((b) => !skoncila(b, teraz)).sort((a, b) => a.dat.localeCompare(b.dat));
  if (!bezi.length) return null;
  return (
    <section data-blok="pom" style={{ padding: pad, display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>
      <b style={{ fontSize: 26, letterSpacing: "-.01em" }}>Pomôž</b>
      {bezi.map((b) => {
        const r = reakcieF(strankaId, b.id), zoznam = r.ucast ?? [], mena = r.mena ?? {};
        const jaV = zoznam.includes(kto), n = zoznam.length, zav = b.pz === 2;
        const plne = !jaV && zav && b.limit > 0 && n >= b.limit;
        const t = plne ? "Plné · ďakujeme" : jaV ? (zav ? "Prihlásený ✓" : "Prídem pomôcť ✓") : zav ? "Prihlásiť sa" : "Prídem pomôcť";
        const poc = n ? (zav ? `prihlásení ${n}${b.limit ? ` z ${b.limit}` : ""}` : `${ludi(n)} príde`) : b.limit ? `miesta: ${b.limit}` : "";
        const ukaz = reg && b.menaVer !== false && n > 0, zozOn = zoz === b.id;
        const ini = zoznam.filter((x) => x !== kto).map((x) => kratkeMeno(mena[x]));
        const ukazka = ini.slice(0, 3).join(", ") + (ini.length > 3 ? ` a ďalší ${ini.length - 3}` : "");
        const prepni = () => prepniReakciuF(strankaId, b.id, "ucast", kto, mojeMeno);
        const akcia = b.pz > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 6 }}>
            <button type="button" aria-pressed={jaV} disabled={plne} onClick={() => { if (jaV) return; if (zav && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED+."); return; } prepni(); }} style={tl(jaV, plne)}>{t}</button>
            {poc && !ukaz && <span style={{ fontSize: 16, fontWeight: 700 }}>{poc}</span>}
          </span>
          {jaV && <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: 15.5 }}>Vy ✓</b>
            <DrzTlacidlo ms={1200} plnenie="rgba(255,255,255,.3)" styl={{ flex: "none", minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1.5px solid #fff", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 800 }} onHotovo={prepni}>Zrušiť účasť (podržať)</DrzTlacidlo>
          </span>}
          {ukaz && <>
            <button type="button" aria-expanded={zozOn} onClick={() => setZoz(zozOn ? null : b.id)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "#fff", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer", textAlign: "left", boxShadow: "none" }}>
              {`${zav ? "Prihlásení" : "Prídu"} · ${n}${b.limit ? ` z ${b.limit}` : ""}`}{ukazka && !zozOn ? <span style={{ fontWeight: 600 }}>{` · ${ukazka}`}</span> : null} {zozOn ? "⌃" : "⌄"}</button>
            {zozOn && <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,.25)" }}>
              {zoznam.map((x, i) => <span key={i} style={{ padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.25)", fontSize: 16, fontWeight: x === kto ? 800 : 400 }}>{x === kto ? "Vy ✓" : kratkeMeno(mena[x])}</span>)}</div>}
          </>}
        </div> : undefined;
        return <PomozKarta key={b.id} stitok={b.druh.toLocaleUpperCase("sk-SK")} kedy={b.dat ? kedyBrigady(b.dat, "") : undefined} t={b.t} txt={cistyText(b.txt).trim() || undefined} kde={b.kde || undefined} cas={b.cas || undefined} akcia={akcia} />;
      })}
    </section>);
}
