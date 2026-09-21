// ============================================================
// DEED · PLATOBNÝ MODUL — jedna anatómia pre celú appku.
// Poradie je záväzné (rovnaké v Good, Help, Charita, Viera, Aktivity,
// cudzom profile, rolovej podstránke aj v Split QR sheete):
//
//   1. Zdieľať + reakcia (palec/srdce) — bez nadpisu
//   2. DROBNÁ PODPORA           — 10 / 50 / 100 DEED
//   3. VLASTNÁ SUMA             — € EUR / DEED
//   4. Obľúbené + Podporiť DEED — rozdelený riadok pol na pol
//   5. Pravidelná podpora       — voliteľný riadok (charita/farnosť)
//   6. QR                       — voliteľný riadok (QR príspevku/zbierky)
//   7. Reťaz dobra              — voliteľný riadok (rozdelenie platby)
//
// Body 1–3 kreslí <PodporaSekcia> (components/platba.tsx), tento súbor
// je obal, ktorý k nim pridáva jednotné riadky 4–7. Nové obrazovky
// používajú TENTO komponent, nie PodporaSekciu priamo.
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { PodporaSekcia } from "@/components/platba";
import { OblubeneBtn } from "@/components/oblubene";
import { PodporitDeed } from "@/components/podporadeed";
import { IkonaOpakovat, IkonaRetaz } from "@/components/icons";
import type { Oblubeny } from "@/types";

/** Voliteľný riadok pod platobným modulom (Pravidelná podpora / QR / Reťaz dobra). */
export interface RiadokAkcie {
  label?: string;
  popis?: string;
  cta?: string;
  onClick: () => void;
}

export interface PlatobnyModulProps {
  /** dary v krypte rozbalené hneď */
  kryptoOtvorene?: boolean;
  /** rýchle sumy — sada, ktorú si vybral príjemca */
  sumyEur?: number[]; sumyEurc?: number[];
  // --- 1. ZADARMO ---
  onShare?: () => void;
  upvotes?: number;
  onUpvote?: () => void;
  reakcia?: "palec" | "srdce";
  // --- 2.–3. sumy a kanály ---
  onPodpor: (a: number) => void;
  onKanal: (k: string) => void;
  accent?: string;
  supLabel?: ReactNode;
  /** Bez darovania (ponuka pomoci, oznam bez zbierky) — ostane len Zdieľať + reakcia. */
  bezDaru?: boolean;
  /** Charita a farnosť: „Dary v eurách" (0,50 / 1 / 3 € len SEPA) a „Dary v krypte" sú zbalené. */
  zbalene?: boolean;
  /** komu idú peniaze — do hlavičky platby pri drobnom eurovom dare */
  komu?: ReactNode;
  onDarEur?: (suma: number, volba?: import("@/lib/darcovia").VolbaDaru) => void;
  /** rýchly dar v krypte (EURC) */
  onDarKrypto?: (eurc: number) => void;
  /** v čom príjemca berie krypto: EURC (charita, Viera) · DEED (ostatní) · „nie" */
  krypto?: "EURC" | "DEED" | "nie";
  // --- 4.–7. riadky ---
  /** Položka do „Môj DEED → Obľúbené". Bez nej má riadok len „Podporiť DEED". */
  oblubene?: Oblubeny;
  toast?: (m: string) => void;
  /** Skryje riadok Obľúbené + Podporiť DEED (napr. vnorený modul v Split QR sheete). */
  bezOblubenych?: boolean;
  opakovana?: RiadokAkcie;
  qr?: RiadokAkcie;
  retaz?: RiadokAkcie;
  style?: CSSProperties;
}

// riadok-karta: 52px náhľad · text · CTA. flexWrap = na úzkom mobile
// CTA spadne pod text namiesto toho, aby text zmizol do ellipsis.
const riadok = (bg: string, bd: string): CSSProperties => ({
  display: "flex", alignItems: "center", flexWrap: "wrap", gap: SPACE.gutter,
  background: bg, border: `1px solid ${bd}`, borderRadius: RADIUS.md,
  padding: SPACE.sm, marginTop: SPACE.sm, cursor: "pointer", boxSizing: "border-box",
});
const riadokText: CSSProperties = { flex: "1 1 140px", minWidth: 0 };
const riadokLabel: CSSProperties = { fontWeight: 700, fontSize: 12.5 };
const riadokPopis: CSSProperties = { fontSize: 12, color: C.textTer };
const ctaBase: CSSProperties = {
  marginLeft: "auto", flex: "none", fontWeight: 700, fontSize: 11,
  padding: `${SPACE.xs}px ${SPACE.md}px`, borderRadius: RADIUS.sm, cursor: "pointer",
};

/** Dekoratívny QR náhľad (skutočný kód je až v QrModal-e). */
function QrNahlad() {
  return (
    <div aria-hidden style={{ width: 52, height: 52, borderRadius: RADIUS.xs, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: SPACE.xxs }}>
      {[...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />)}
    </div>
  );
}

export function PlatobnyModul({
  onShare, upvotes = 0, onUpvote, reakcia = "palec",
  onPodpor, onKanal, accent = "var(--a-info)", supLabel, bezDaru = false, zbalene = false, komu, onDarEur, onDarKrypto, krypto,
  oblubene, toast, bezOblubenych = false, opakovana, qr, retaz, style, kryptoOtvorene, sumyEur, sumyEurc,
}: PlatobnyModulProps) {
  // Pravidelná podpora — zelená a výraznejšia; v zbalenom module sedí hneď pod darmi v eurách
  const pravidelnaEl = opakovana && (
    <div onClick={opakovana.onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opakovana.onClick(); } }}
      style={riadok("color-mix(in srgb, var(--a-green) 7%, transparent)", "color-mix(in srgb, var(--a-green) 40%, transparent)")}>
      <div style={{ width: 52, height: 52, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--a-green) 18%, transparent)" }}>
        <IkonaOpakovat size={26} color="var(--a-green)" />
      </div>
      <div style={riadokText}>
        <div style={{ ...riadokLabel, color: "var(--a-green)" }}>{opakovana.label ?? "Pravidelná podpora"}</div>
        <div style={riadokPopis}>{opakovana.popis ?? "Mesačne · kedykoľvek zrušíš"}</div>
      </div>
      <div style={{ ...ctaBase, background: "var(--a-green)", border: "1px solid var(--a-green)", color: "#fff" }}>
        {opakovana.cta ?? "Nastaviť"}
      </div>
    </div>
  );
  // Obľúbené + Podporiť DEED — rovnaká výška oboch tlačidiel
  const oblubeneEl = !bezOblubenych && (
        <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.gutter }}>
          {oblubene && <OblubeneBtn polozka={oblubene} toast={toast} style={{ flex: 1, minWidth: 0, height: 46 }} />}
          <PodporitDeed toast={toast} style={{ flex: 1, minWidth: 0, height: 46 }} />
        </div>
      );
  return (
    <div style={style}>
      <PodporaSekcia
        onShare={onShare} upvotes={upvotes} onUpvote={onUpvote} reakcia={reakcia}
        onPodpor={onPodpor} onKanal={onKanal} accent={accent} bezDaru={bezDaru}
        zbalene={zbalene} komu={komu} krypto={krypto} kryptoOtvorene={kryptoOtvorene} sumyEur={sumyEur} sumyEurc={sumyEurc} poEurach={zbalene ? <>{pravidelnaEl}{oblubeneEl}</> : undefined} onDarEur={onDarEur ?? ((sm) => toast?.(`Ďakujeme za dar ${sm.toLocaleString("sk")} €`))}
        onDarKrypto={onDarKrypto ?? ((v) => toast?.(`Ďakujeme za dar ${v.toLocaleString("sk", { minimumFractionDigits: 2 })} EURC`))}
        {...(supLabel ? { supLabel } : {})} />

      {/* nezbalený modul: pravidelná podpora a Obľúbené pod darmi (v zbalenom sú pred darmi v krypte) */}
      {!zbalene && pravidelnaEl}

      {!zbalene && oblubeneEl}

      {/* 6. QR */}
      {qr && (
        <div onClick={qr.onClick} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); qr.onClick(); } }}
          style={riadok(C.surface2, C.line)}>
          <QrNahlad />
          <div style={riadokText}>
            <div style={riadokLabel}>{qr.label ?? "QR tohto príspevku"}</div>
            <div style={riadokPopis}>{qr.popis ?? "Skenovať · kopírovať · zdieľať"}</div>
          </div>
          <div style={{ ...ctaBase, background: GRAD, color: "#fff", boxShadow: "0 5px 16px color-mix(in srgb, var(--a-green) 32%, transparent)" }}>
            {qr.cta ?? "Otvoriť QR"}
          </div>
        </div>
      )}

      {/* 7. Reťaz dobra */}
      {retaz && (
        <div onClick={retaz.onClick} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); retaz.onClick(); } }}
          style={riadok("rgba(31,191,143,.06)", "rgba(31,191,143,.25)")}>
          <div style={{ width: 52, height: 52, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,191,143,.12)" }}>
            <IkonaRetaz size={24} color="var(--a-green)" />
          </div>
          <div style={riadokText}>
            <div style={riadokLabel}>{retaz.label ?? "Reťaz dobra — rozdeliť platbu"}</div>
            <div style={riadokPopis}>{retaz.popis ?? "Nastav v QR, aká časť ide komu (tebe + charitám)"}</div>
          </div>
          <div style={{ ...ctaBase, background: GRAD_ZELENY, color: "#06281d", fontWeight: 800, boxShadow: "0 5px 16px rgba(31,191,143,.3)" }}>
            {retaz.cta ?? "Split QR"}
          </div>
        </div>
      )}
    </div>
  );
}
