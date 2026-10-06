// ============================================================
// DEED · SplitConfigStep — zdieľaná konfigurácia rozdelenia platby
// Vlastník (autor/influencer) si drží ZVYŠOK; k organizáciám/žiadostiam
// (z useRetazZiadosti) nastavíš % posuvníkom. Σ = 100 %.
// Pravidlá bežca (Split bežec, 6.7.2026): zaokrúhľovanie po 5 % VŠADE;
// mimo Viery min 5 % (pod 5 % hláška + disabled), vo Viere
// minPct=0 → 0 % povolené (kostolný podiel je dobrovoľný — nepridá sa).
// Používa: SplitQrSheet (osobný QR), tvorba príspevku (autorský split),
// správca QR (nový QR). Rodič vlastní `ciele`; owner % = 100 − Σ.
// ============================================================
import { Emo } from "@/components/icons";
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { Lupa, IkonaKriz } from "@/components/icons";
import { useRetazZiadosti } from "@/data";

export type SplitCiel = { id: string; komu: string; pct: number; pinned?: boolean };
export const SPLIT_MIN = 5;   // minimálny podiel mimo Viery (vo Viere minPct=0)
export const SPLIT_KROK = 5;  // bežec zaokrúhľuje po 5 % — všade

// prekryv textov/ikon pre nešpecifické varianty (napr. farársky „Rozdeliť dar":
// Rodine ↔ Kostolu namiesto influencer „cico / ide ďalej"). Prázdne = default.
export type SplitLabely = {
  ownerHead?: string;      // nadpis nad vlastníkom (default „{OWNER} — ZVYŠOK")
  ownerIcon?: string;      // ikona vlastníka (default 🎬)
  targetHead?: string;     // nadpis nad príjemcami (default „IDE ĎALEJ — KOMU KOĽKO")
  emptyText?: string;      // text keď nie sú príjemcovia
  addPlaceholder?: string; // placeholder hľadania (default „Pridať charitu / žiadosť…")
  pinnedBadge?: string;    // odznak pripnutého príjemcu (default „TENTO PRÍSPEVOK")
};

export const splitOwnerPct = (ciele: SplitCiel[]): number =>
  100 - ciele.reduce((s, c) => s + c.pct, 0);

// minPct = 0 (Viera): 0 % povolené, žiadna hláška — stačí, aby súčet nepresiahol 100 %.
// minPct > 0 (default): aspoň 1 príjemca a všetky podiely (aj owner) ≥ minPct.
export const splitValid = (ciele: SplitCiel[], minPct: number = SPLIT_MIN): boolean => {
  const owner = splitOwnerPct(ciele);
  if (minPct <= 0) return owner >= 0;
  return ciele.length >= 1 && owner >= minPct && ciele.every((c) => c.pct >= minPct);
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** ciele → payload pre qr_split_create (podiel 0..1, organizácie = fixny). 0 % sa nepridá.
 *  Zadanie 2 (0037): príjemca = účet autora prípadu (case_id); názov je len popis. Cieľ bez prípadu
 *  v DB (mock) server odmietne — podiel by nemal komu prísť. */
export const splitCielePayload = (ciele: SplitCiel[]) =>
  ciele.filter((c) => c.pct > 0).map((c) => ({ ...(UUID.test(c.id) ? { case_id: c.id } : {}), prijemca_text: c.komu, podiel: +(c.pct / 100).toFixed(5), fixny: true }));

/** split rozpis pre QrModal (vlastník + organizácie). 0 % sa nepridá. */
export const splitPreQrModal = (ownerLabel: string, ciele: SplitCiel[]) =>
  [{ komu: ownerLabel, pct: splitOwnerPct(ciele) }, ...ciele.filter((c) => c.pct > 0).map((c) => ({ komu: c.komu, pct: c.pct }))];

export function SplitConfigStep({ ownerLabel, ciele, onCiele, ownerColor = "var(--a-green)", labely, minPct = SPLIT_MIN }: {
  ownerLabel: string;
  ciele: SplitCiel[];
  onCiele: (c: SplitCiel[]) => void;
  ownerColor?: string;
  labely?: SplitLabely;
  minPct?: number; // 0 = Viera (0 % povolené), inak SPLIT_MIN
}) {
  const { data: ZIADOSTI = [] } = useRetazZiadosti();
  const [q, setQ] = useState("");
  const ownerPct = splitOwnerPct(ciele);
  const ownerIcon = labely?.ownerIcon ?? "🎬";

  const pridaj = (nazov: string) => {
    if (ciele.some((c) => c.komu === nazov)) return;
    // default 20 %, zaokrúhlené na krok 5 a obmedzené tým, čo ešte zostáva
    const zvysok = Math.floor(Math.max(0, ownerPct) / SPLIT_KROK) * SPLIT_KROK;
    onCiele([...ciele, { id: nazov, komu: nazov, pct: Math.max(minPct, Math.min(20, zvysok)) }]);
    setQ("");
  };
  const uprav = (id: string, pct: number) => onCiele(ciele.map((c) => (c.id === id ? { ...c, pct } : c)));
  const odober = (id: string) => onCiele(ciele.filter((c) => c.id !== id));
  const zoznam = (q ? ZIADOSTI.filter((z) => (z.nazov + " " + z.lok).toLowerCase().includes(q.toLowerCase())) : ZIADOSTI)
    .filter((z) => !ciele.some((c) => c.komu === z.nazov));

  const inpS: CSSProperties = { width: "100%", padding: `${SPACE.sm}px ${SPACE.sm}px ${SPACE.sm}px ${SPACE.xxl}px`, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };

  return (
    <div>
      {/* vlastník = zvyšok */}
      <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>{labely?.ownerHead ?? `${ownerLabel.toUpperCase()} — ZVYŠOK`}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: tint(ownerColor, .08), border: `1px solid ${tint(ownerColor, .3)}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ownerIcon} {ownerLabel}</span>
        <span style={{ flex: "none", fontSize: 20, fontWeight: 800, color: ownerPct < minPct ? "var(--a-danger)" : ownerColor }}>{ownerPct}%</span>
      </div>

      {/* organizácie / žiadosti */}
      <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>{labely?.targetHead ?? "IDE ĎALEJ — KOMU KOĽKO"}</div>
      {ciele.length === 0 && <div style={{ fontSize: 12, color: C.textTer, marginBottom: SPACE.xs }}>{labely?.emptyText ?? "Zatiaľ nikto — pridaj charitu/žiadosť nižšie."}</div>}
      {ciele.map((p) => (
        <div key={p.id} style={{ background: p.pinned ? tint(ownerColor, .07) : "rgba(var(--glass-rgb),.04)", border: `1px solid ${p.pinned ? tint(ownerColor, .32) : C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs }}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <span style={{ flex: "none", fontSize: 13.5 }}>{p.pinned ? "📌" : "→"}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.komu}</span>
            {p.pinned && <span style={{ flex: "none", fontSize: 9, fontWeight: 800, letterSpacing: ".3px", color: ownerColor, background: tint(ownerColor, .16), padding: "2px 6px", borderRadius: 999 }}>{labely?.pinnedBadge ?? "TENTO PRÍSPEVOK"}</span>}
            <span style={{ flex: "none", fontSize: 15, fontWeight: 800, color: ownerColor }}>{p.pct}%</span>
            {!p.pinned && <span onClick={() => odober(p.id)} title="Odobrať" style={{ flex: "none", cursor: "pointer", display: "flex" }}><IkonaKriz size={16} color={C.textTer} /></span>}
          </div>
          <input type="range" min={0} max={100} step={SPLIT_KROK} value={p.pct} onChange={(e) => uprav(p.id, +e.target.value)} style={{ width: "100%", marginTop: SPACE.xs, accentColor: ownerColor }} />
        </div>
      ))}

      {/* pridať príjemcu */}
      <div style={{ position: "relative", marginTop: SPACE.xs, marginBottom: SPACE.sm }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Lupa size={16} color={C.textTer} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labely?.addPlaceholder ?? "Pridať charitu / žiadosť…"} style={inpS} />
      </div>
      {q && (
        <div style={{ maxHeight: 168, overflowY: "auto", margin: "0 -2px" }}>
          {zoznam.map((z) => (
            <div key={z.id} onClick={() => pridaj(z.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, cursor: "pointer", background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}` }}>
              <span style={{ width: 32, height: 32, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: tint(z.col, .15) }}><Emo e={z.emoji} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{z.zdroj} · {z.lok}</div>
              </div>
              <span style={{ flex: "none", fontSize: 18, color: ownerColor }}>＋</span>
            </div>
          ))}
          {zoznam.length === 0 && <div style={{ textAlign: "center", color: C.textTer, fontSize: 12.5, padding: SPACE.md }}>Nič sa nenašlo.</div>}
        </div>
      )}

      {/* validácia + zámok — mimo Viery min 5 %, vo Viere (minPct=0) 0 % ok */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, color: ownerPct < 0 || (minPct > 0 && (ownerPct < minPct || ciele.some((c) => c.pct < minPct))) ? "var(--a-danger)" : C.gold, marginTop: SPACE.xs, lineHeight: 1.4 }}>
        {ownerPct < 0
          ? `⚠️ Súčet presahuje 100 % — zníž niektorý podiel.`
          : minPct > 0 && (ownerPct < minPct || ciele.some((c) => c.pct < minPct))
          ? `⚠️ Minimálny podiel je ${minPct} % — bežec zaokrúhľuje po 5 %.`
          : `🔒 % sa po vytvorení zafixujú — je to záväzok. Krok 5 %${minPct <= 0 ? " · 0 % = podiel sa jednoducho nepridá" : ` · min ${minPct} %`}.`}
      </div>
    </div>
  );
}
