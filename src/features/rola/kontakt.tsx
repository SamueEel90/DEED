// ============================================================
// Kontakt subjektu — dáta, kontrola odkazov a zobrazenie (správa aj verejný profil).
// Predvyplnené z registrácie; sídlo je overené cez IČO a v profile sa nemení.
// ============================================================
import type { ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { MenuSkupina, KontaktPolozka } from "@/components/entity";
import { IkonaPin, IkonaObalka, IkonaOdkaz } from "@/components/icons";
import { SUBJEKTY } from "./mock";
import type { Pozicia } from "./stav";
import { sieteZRegistracie } from "./registracia";

export type Siet = "facebook" | "instagram" | "youtube" | "tiktok" | "linkedin" | "x";
export const SIETE: { k: Siet; label: string; domeny: string[] }[] = [
  { k: "facebook", label: "Facebook", domeny: ["facebook.com", "fb.com"] },
  { k: "instagram", label: "Instagram", domeny: ["instagram.com"] },
  { k: "youtube", label: "YouTube", domeny: ["youtube.com", "youtu.be"] },
  { k: "tiktok", label: "TikTok", domeny: ["tiktok.com"] },
  { k: "linkedin", label: "LinkedIn", domeny: ["linkedin.com"] },
  { k: "x", label: "X", domeny: ["x.com", "twitter.com"] }, // KARTA 33
];
export const MAX_TEL = 3;
export const MAX_EMAIL = 5;

export interface Kontakt {
  /** sídlo z registrácie (overené cez IČO) — needituje sa */
  sidlo: string;
  /** kde ich ľudia nájdu, ak to nie je sídlo (výdajňa, kancelária) */
  adresaVerejna: string;
  telefony: { cislo: string; popis: string }[];
  emaily: { adresa: string; popis: string }[];
  web: string;
  siete: Partial<Record<Siet, string>>;
}

const kluc = (p: Pozicia) => `deed.rola.kontakt.${p}`;

/** z registrácie (mock = SUBJEKTY) + uložené úpravy */
export function nacitajKontakt(p: Pozicia): Kontakt {
  const k = SUBJEKTY[p].kontakt;
  const zaklad: Kontakt = {
    sidlo: k.adresa, adresaVerejna: "",
    telefony: [{ cislo: k.tel, popis: "Kancelária" }],
    emaily: [{ adresa: k.email, popis: "" }],
    web: k.web ?? "", siete: p === "charita" ? sieteZRegistracie() : {},
  };
  try {
    const s = localStorage.getItem(kluc(p));
    return s ? { ...zaklad, ...(JSON.parse(s) as Partial<Kontakt>), sidlo: zaklad.sidlo } : zaklad;
  } catch { return zaklad; }
}
export function ulozKontakt(p: Pozicia, k: Kontakt) {
  try { localStorage.setItem(kluc(p), JSON.stringify(k)); } catch { /* LS nedostupné */ }
}

const bezProtokolu = (u: string) => u.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
export const naUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

/** chyba odkazu na sieť (null = v poriadku alebo prázdne) */
export function chybaSiete(s: Siet, u: string): string | null {
  if (!u.trim()) return null;
  const host = bezProtokolu(u).split("/")[0].toLowerCase();
  const def = SIETE.find((x) => x.k === s)!;
  if (!def.domeny.some((d) => host === d || host.endsWith(`.${d}`))) return `Toto nie je odkaz na ${def.label}`;
  if (!bezProtokolu(u).includes("/")) return "Chýba názov stránky/profilu za lomkou";
  return null;
}
export function chybaWebu(u: string): string | null {
  if (!u.trim()) return null;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(bezProtokolu(u)) ? null : "Neplatná adresa webu";
}
export const chybaEmailu = (e: string) => (!e.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? null : "Neplatný e-mail");
export const chybaTel = (t: string) => (!t.trim() || /^\+?[0-9 ]{9,16}$/.test(t.trim()) ? null : "Neplatné číslo (napr. +421 901 234 567)");

/** sekcia KONTAKT — rovnaká v správe aj na verejnom profile */
export function KontaktBlok({ k, zbalitelna, vodorovne }: { k: Kontakt; zbalitelna?: string;
  /** na širokej ploche: kontakt dole na celú šírku, položky vedľa seba (nie stĺpec vpravo) */
  vodorovne?: boolean }) {
  const riadky: ReactNode[] = [];
  riadky.push(<KontaktPolozka key="adr" ikona={<IkonaPin size={15} />} label={k.adresaVerejna ? "Adresa pre verejnosť" : "Adresa"} hodnota={k.adresaVerejna || k.sidlo} />);
  k.telefony.filter((t) => t.cislo.trim()).forEach((t, i) => riadky.push(
    <KontaktPolozka key={`t${i}`} ikona={<span style={{ fontSize: 13 }}>📞</span>} label={t.popis || "Telefón"} hodnota={t.cislo} href={`tel:${t.cislo.replace(/\s/g, "")}`} />));
  k.emaily.filter((e) => e.adresa.trim()).forEach((e, i) => riadky.push(
    <KontaktPolozka key={`e${i}`} ikona={<IkonaObalka size={15} />} label={i === 0 ? "Hlavný e-mail" : e.popis || "E-mail"} hodnota={e.adresa} href={`mailto:${e.adresa}`} />));
  if (k.web.trim()) riadky.push(<KontaktPolozka key="web" ikona={<IkonaOdkaz size={15} />} label="Web" hodnota={bezProtokolu(k.web)} href={naUrl(k.web)} />);
  const siete = SIETE.filter((s) => k.siete[s.k]?.trim());
  if (vodorovne) return (
    <div style={{ marginTop: SPACE.lg }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>KONTAKT</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: SPACE.xs }}>
        {riadky.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px` }}>{r}</div>
        ))}
      </div>
      {siete.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, marginTop: SPACE.xs }}>
          {siete.map((s) => (
            <a key={s.k} href={naUrl(k.siete[s.k]!)} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, fontWeight: 700, color: "var(--a-info)", textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: RADIUS.pill, padding: `4px ${SPACE.sm}px` }}>
              {s.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <MenuSkupina zbalitelna={zbalitelna} nadpis="KONTAKT">
      {riadky}
      {siete.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          {siete.map((s) => (
            <a key={s.k} href={naUrl(k.siete[s.k]!)} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, fontWeight: 700, color: "var(--a-info)", textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: RADIUS.pill, padding: `4px ${SPACE.sm}px` }}>
              {s.label}
            </a>
          ))}
        </div>
      )}
    </MenuSkupina>
  );
}
