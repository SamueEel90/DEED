// ============================================================
// DEED · SplitConfigStep — zdieľaná konfigurácia rozdelenia platby
// Vlastník (autor/influencer) si drží ZVYŠOK; k organizáciám/žiadostiam
// (z useRetazZiadosti) nastavíš % posuvníkom 3–100. Σ = 100 %.
// Používa: SplitQrSheet (osobný QR), tvorba príspevku (autorský split),
// správca QR (nový QR). Rodič vlastní `ciele`; owner % = 100 − Σ.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { Lupa, IkonaKriz } from "@/components/icons";
import { useRetazZiadosti } from "@/data";

export type SplitCiel = { id: string; komu: string; pct: number; pinned?: boolean };
export const SPLIT_MIN = 3;

export const splitOwnerPct = (ciele: SplitCiel[]): number =>
  100 - ciele.reduce((s, c) => s + c.pct, 0);

export const splitValid = (ciele: SplitCiel[]): boolean => {
  const owner = splitOwnerPct(ciele);
  return ciele.length >= 1 && owner >= SPLIT_MIN && ciele.every((c) => c.pct >= SPLIT_MIN);
};

/** ciele → payload pre qr_split_create (podiel 0..1, organizácie = fixny). */
export const splitCielePayload = (ciele: SplitCiel[]) =>
  ciele.map((c) => ({ prijemca_text: c.komu, podiel: +(c.pct / 100).toFixed(5), fixny: true }));

/** split rozpis pre QrModal (vlastník + organizácie). */
export const splitPreQrModal = (ownerLabel: string, ciele: SplitCiel[]) =>
  [{ komu: ownerLabel, pct: splitOwnerPct(ciele) }, ...ciele.map((c) => ({ komu: c.komu, pct: c.pct }))];

export function SplitConfigStep({ ownerLabel, ciele, onCiele, ownerColor = "var(--a-green)" }: {
  ownerLabel: string;
  ciele: SplitCiel[];
  onCiele: (c: SplitCiel[]) => void;
  ownerColor?: string;
}) {
  const { data: ZIADOSTI = [] } = useRetazZiadosti();
  const [q, setQ] = useState("");
  const ownerPct = splitOwnerPct(ciele);

  const pridaj = (nazov: string) => {
    if (ciele.some((c) => c.komu === nazov)) return;
    onCiele([...ciele, { id: nazov, komu: nazov, pct: Math.min(20, Math.max(SPLIT_MIN, ownerPct)) }]);
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
      <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>{ownerLabel.toUpperCase()} — ZVYŠOK</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: tint(ownerColor, .08), border: `1px solid ${tint(ownerColor, .3)}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🎬 {ownerLabel}</span>
        <span style={{ flex: "none", fontSize: 20, fontWeight: 800, color: ownerPct < SPLIT_MIN ? "var(--a-danger)" : ownerColor }}>{ownerPct}%</span>
      </div>

      {/* organizácie / žiadosti */}
      <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>IDE ĎALEJ — KOMU KOĽKO</div>
      {ciele.length === 0 && <div style={{ fontSize: 12, color: C.textTer, marginBottom: SPACE.xs }}>Zatiaľ nikto — pridaj charitu/žiadosť nižšie.</div>}
      {ciele.map((p) => (
        <div key={p.id} style={{ background: p.pinned ? tint(ownerColor, .07) : "rgba(var(--glass-rgb),.04)", border: `1px solid ${p.pinned ? tint(ownerColor, .32) : C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs }}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <span style={{ flex: "none", fontSize: 13.5 }}>{p.pinned ? "📌" : "→"}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.komu}</span>
            {p.pinned && <span style={{ flex: "none", fontSize: 9, fontWeight: 800, letterSpacing: ".3px", color: ownerColor, background: tint(ownerColor, .16), padding: "2px 6px", borderRadius: 999 }}>TENTO PRÍSPEVOK</span>}
            <span style={{ flex: "none", fontSize: 15, fontWeight: 800, color: ownerColor }}>{p.pct}%</span>
            {!p.pinned && <span onClick={() => odober(p.id)} title="Odobrať" style={{ flex: "none", cursor: "pointer", display: "flex" }}><IkonaKriz size={16} color={C.textTer} /></span>}
          </div>
          <input type="range" min={SPLIT_MIN} max={100} step={1} value={p.pct} onChange={(e) => uprav(p.id, +e.target.value)} style={{ width: "100%", marginTop: SPACE.xs, accentColor: ownerColor }} />
        </div>
      ))}

      {/* pridať príjemcu */}
      <div style={{ position: "relative", marginTop: SPACE.xs, marginBottom: SPACE.sm }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Lupa size={16} color={C.textTer} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pridať charitu / žiadosť…" style={inpS} />
      </div>
      {q && (
        <div style={{ maxHeight: 168, overflowY: "auto", margin: "0 -2px" }}>
          {zoznam.map((z) => (
            <div key={z.id} onClick={() => pridaj(z.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, cursor: "pointer", background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}` }}>
              <span style={{ width: 32, height: 32, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: tint(z.col, .15) }}>{z.emoji}</span>
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

      {/* validácia + zámok */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, color: ownerPct < SPLIT_MIN ? "var(--a-danger)" : C.gold, marginTop: SPACE.xs, lineHeight: 1.4 }}>
        {ownerPct < SPLIT_MIN
          ? `⚠️ Zostáva ti len ${ownerPct}% — zníž niektorý podiel (min ${SPLIT_MIN}%).`
          : `🔒 % sa po vytvorení zafixujú — je to záväzok. Rozsah 3–100 %.`}
      </div>
    </div>
  );
}
