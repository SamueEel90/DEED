// ============================================================
// KARTA 56D §4 · Náhľad profilu farnosti — vybraný vzhľad (Kronika · Nástenka · Moderné) len s tým,
// čo farár vyplnil (titulná fotka, logo alebo iniciály, názov, O nás, kontakt). Nikdy ukážkový profil.
// Prototyp „Sprava farnosti - prvy prichod" (Náhľad profilu). Ten istý pohľad otvára aj „Verejný profil".
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { cistyText, sanitizujHtml } from "@/lib/richtext";
import type { ProfilStranky } from "@/lib/profilStranky";
import { vzhladyPre, type Vzhlad } from "@/lib/vzhladStranky";
import { RAMY } from "./titulka";

const KONTAKT_T: CSSProperties = { fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" };

/** riadky kontaktu, ktoré farár vyplnil (adresa, telefóny, e-maily, web) */
function kontaktRiadky(p: ProfilStranky | null): string[] {
  const k = p?.kontakt;
  if (!k) return [];
  return [k.adresaVerejna, ...k.telefony.map((t) => t.cislo), ...k.emaily.map((e) => e.adresa), k.web].map((x) => (x ?? "").trim()).filter(Boolean);
}

export function NahladFarnosti({ profil, meno, vzhlad, mobil, hore }: {
  profil: ProfilStranky | null; meno: string; vzhlad: Vzhlad; mobil: boolean;
  /** riadok nad náhľadom: „‹ Späť na úpravu" a popis */
  hore: ReactNode;
}) {
  const cover = profil?.cover ? `url("${profil.cover.src}") center/cover no-repeat ${profil.cover.priemer}` : "linear-gradient(160deg,var(--card),var(--panel))";
  const onas = cistyText(profil?.onas) ? sanitizujHtml(profil?.onas ?? "") : "";
  const kont = kontaktRiadky(profil);
  const r = profil?.tvar === "kruh" ? "50%" : "22%";
  const ram = profil?.bezLoga && profil.ramLoga && profil.ramLoga !== "bez" ? RAMY.find((x) => x.k === profil.ramLoga)?.g : undefined;
  const logo = (px: number, fs: number, extra?: CSSProperties) => (
    <span style={{ flex: "none", width: px, height: px, borderRadius: r, overflow: "hidden", boxSizing: "border-box", border: "3px solid transparent",
      background: profil?.logo ? `url("${profil.logo}") center/${profil.logoRezim === "cele" ? "contain" : "cover"} no-repeat padding-box, #fff padding-box, #fff border-box` : `linear-gradient(#fff,#fff) padding-box, ${ram ?? "#fff"} border-box`,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 800, color: "#14110B", ...extra }}>
      {!profil?.logo && profil?.bezLoga ? (profil.inicialy ?? "").toUpperCase() : ""}
    </span>);
  const kontakt = kont.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={KONTAKT_T}>KONTAKT</span>
      {kont.map((k) => <span key={k} style={{ fontSize: 16, lineHeight: 1.45, color: "var(--ink2)", overflowWrap: "anywhere" }}>{k}</span>)}
    </div>);
  const text = (c: string, fs: number) => onas && <div style={{ fontSize: fs, lineHeight: 1.6, color: c, textWrap: "pretty" }} dangerouslySetInnerHTML={{ __html: onas }} />;
  const sledovat = (tmavy: boolean, h: number) => <span style={{ alignSelf: "flex-start", height: h, padding: "0 22px", borderRadius: 14, background: tmavy ? "var(--ink)" : "#fff", color: tmavy ? "var(--bg)" : "#14110B", fontSize: 16.5, fontWeight: 800, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Sledovať farnosť</span>;
  const ram0: CSSProperties = { borderRadius: 16, overflow: "hidden", border: "1px solid var(--cardBd)", background: "var(--bg)" };

  let telo: ReactNode;
  if (vzhlad === "kronika") telo = (
    <div style={{ ...ram0, display: "flex", flexDirection: mobil ? "column" : "row", alignItems: "stretch", minHeight: mobil ? undefined : 720 }}>
      <aside style={{ width: mobil ? "auto" : 400, flex: "none", background: "var(--panel)", borderRight: mobil ? "none" : "1px solid var(--cardBd)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 220, background: cover }} />
        <div style={{ height: 3, background: "var(--metal)" }} />
        <div style={{ padding: "0 26px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
          {logo(92, 28, { marginTop: -46 })}
          <b style={{ fontSize: 32, letterSpacing: "-.03em", lineHeight: 1.05 }}>{meno}</b>
          {text("var(--ink2)", 17)}
          {sledovat(true, 48)}
          {kontakt}
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }} />
    </div>);
  else if (vzhlad === "vyklad") telo = (
    <div style={{ ...ram0, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: mobil ? 300 : 400, background: `linear-gradient(180deg,rgba(10,8,5,.3) 0%,rgba(10,8,5,0) 35%,rgba(10,8,5,.88) 100%), ${cover}` }}>
        <div style={{ position: "absolute", left: mobil ? 20 : 48, right: mobil ? 20 : 48, bottom: mobil ? 20 : 32, display: "flex", alignItems: "flex-end", gap: mobil ? 14 : 22, flexWrap: mobil ? "wrap" : undefined }}>
          {logo(mobil ? 72 : 96, 28)}
          <b style={{ flex: 1, minWidth: 0, fontSize: mobil ? 32 : 48, lineHeight: 1.02, letterSpacing: "-.04em", color: "#fff" }}>{meno}</b>
          {sledovat(false, 52)}
        </div>
      </div>
      {(onas || kontakt) && <div style={{ padding: mobil ? "24px 20px 28px" : "36px 48px 44px", display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1.3fr) minmax(0,1fr)", gap: mobil ? 24 : 40, alignItems: "start" }}>
        {text("var(--ink2)", 19) || <span />}
        {kontakt}
      </div>}
    </div>);
  else telo = (
    <div style={{ ...ram0, display: "flex", flexDirection: "column" }}>
      <section style={{ position: "relative", minHeight: mobil ? 560 : 720, background: `linear-gradient(180deg,rgba(10,8,5,.5) 0%,rgba(10,8,5,.05) 30%,rgba(10,8,5,.94) 100%), ${cover}`, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: mobil ? 24 : 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 700 }}>
          {logo(100, 30)}
          <b style={{ fontSize: mobil ? 48 : 84, lineHeight: 0.92, letterSpacing: "-.05em" }}>{meno}</b>
          {text("#E8E1D3", 19)}
          {sledovat(false, 54)}
        </div>
      </section>
      {kontakt && <section style={{ padding: mobil ? "28px 24px" : "44px 48px", borderTop: "1px solid var(--cardBd)" }}>{kontakt}</section>}
    </div>);

  return (
    <section style={{ flex: "none", display: "flex", flexDirection: "column", gap: 14 }}>
      {hore}
      {telo}
    </section>);
}

/** „Náhľad · Kronika · zobrazené je len to, čo ste vyplnili" */
export const nahladPopis = (vzhlad: Vzhlad) => `Náhľad · ${vzhladyPre("farnost").find((z) => z.k === vzhlad)?.t ?? "Kronika"} · zobrazené je len to, čo ste vyplnili`;
