import { useState } from "react";
import { SIRKA, C, SPACE, RADIUS } from "@/theme";
import { ModulHlavicka, toast, useScrollHore, useLayout, useTvorbaGate, obalSiroky, SkeletonRiadky, ErrorState, IkonaStit, IkonaKorunka, IkonaHviezda, IkonaUsmev, IkonaKompas, IkonaInstitucia } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { FunZona } from "@/features/fun/FunZona";
import { useLokalita } from "@/lib/lokalita";
import { vzdialenostKm, FEED_CFG } from "@/lib/feed";
import { tagChip } from "@/lib/ui";
import { useTopRebricky } from "@/data";
import type { RebricekKluc } from "@/features/top/mock";
import type { RebricekRozsah, Subjekt, WideProps } from "@/types";

/*
  ============================================================
  MODUL TOP (§14) — rebríčky darcov, hrdinov a B2B partnerov
  ============================================================
  Zjednotené rebríčky z celej platformy (predtým roztrúsené po
  feedoch Domov/Help/Charita/Aktivity). Štvrť · mesto · celé SR.
  Klik na osobu → cudzí profil (§6). FUN → Fun zóna (§13.2).
  ============================================================
*/

// rozsahy rebríčka + ich dosah v km (z FEED_CFG — jednotný so feedom/Mapou)
const ROZSAHY: RebricekRozsah[] = ["Štvrť", "Mesto", "Celá SR"];
const ROZSAH_KM: Record<RebricekRozsah, number> = {
  "Štvrť": FEED_CFG.radiusy.stvrt.km,    // ~5 km
  "Mesto": FEED_CFG.radiusy.mesto.km,    // ~15 km
  "Celá SR": FEED_CFG.radiusy.krajina.km, // ~9000 km (prakticky celé SR)
};

// kategórie ocenení (chrome) — `polozky` prichádzajú z repo (mock | Supabase) cez useTopRebricky.
// Vo Fáze C sú darcovia/hrdinovia/charity ŽIVÝ agregát z DB; aktivity/b2b kurátorské.
type CatMeta = { key: RebricekKluc; hl: string; ic: React.ReactNode; col: string };
const CATS: CatMeta[] = [
  { key: "b2b",       hl: "B2B PARTNERI",  ic: <IkonaStit />,        col: "var(--a-info)" },
  { key: "darcovia",  hl: "TOP DARCOVIA",  ic: <IkonaKorunka />,     col: "var(--a-gold)" },
  { key: "hrdinovia", hl: "TOP HRDINOVIA", ic: <IkonaHviezda />,     col: "var(--a-clay)" },
  { key: "aktivity",  hl: "TOP AKTIVITY",  ic: <IkonaKompas />,      col: "var(--a-teal)" },
  { key: "charity",   hl: "TOP CHARITY",   ic: <IkonaInstitucia />,  col: "var(--a-plum)" },
];

export default function ModulTop({ wide }: WideProps) {
  const [screen, setScreen] = useState<"top" | "fun" | "profil">("top");
  const [subjekt, setSubjekt] = useState<Subjekt | null>(null);
  const [rozsah, setRozsah] = useState<RebricekRozsah>("Štvrť");

  const { data: rebricky, isLoading, isError, refetch } = useTopRebricky();
  useTvorbaGate(); // pasívny nesmie tvoriť (overovanie skutku = create)
  const scrollHore = useScrollHore();
  const { desktop } = useLayout();
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.plocha });

  const otvorProfil = (s: Subjekt) => { setSubjekt(s); setScreen("profil"); scrollHore(); };

  // FILTER PODĽA OKRUHU (haversine ako feed/Mapa). Pravidlo zhodné s feedom:
  // národné/bez-geo položky prah okruhu PREBÍJAJÚ (celoslovenské rebríčky — darcovia,
  // charity, B2B…), geo-tagované (hrdinovia) sa filtrujú vzdialenosťou.
  const km = ROZSAH_KM[rozsah];
  const lok = useLokalita(); // stred rebríčkov = aktívne mesto
  const vOkruhu = <T extends { lat?: number; lng?: number; narodne?: boolean }>(items: T[]): T[] =>
    items.filter((x) => x.narodne || x.lat == null || vzdialenostKm(lok, x) <= km);

  if (screen === "fun") return <div style={{ minHeight: "100%" }}>{obal(<FunZona onBack={() => setScreen("top")} toast={toast} />)}</div>;
  if (screen === "profil" && subjekt) return <div style={{ minHeight: "100%" }}>{obal(<CudziProfil subjekt={subjekt as any} toast={toast} onBack={() => setScreen("top")} />)}</div>;

  return (
    <div style={{ minHeight: "100%", paddingBottom: SPACE.gutter }}>
      <ModulHlavicka title="Top" karma="Gold" right={<Zvoncek color={C.textSec} toast={toast} />} />
      {obal(
        <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px` }}>
          {/* rozsah rebríčka */}
          <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xxs }}>
            {ROZSAHY.map((r) => {
              const on = rozsah === r;
              return <span key={r} onClick={() => setRozsah(r)} style={{ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                background: on ? "color-mix(in srgb, var(--a-info) 16%, transparent)" : C.surface2, border: `1px solid ${on ? "color-mix(in srgb, var(--a-info) 50%, transparent)" : C.line}`, color: on ? "var(--a-info)" : C.textSec }}>{r}</span>;
            })}
          </div>

          {/* FUN zóna — vedľa rebríčka lídrov (§13.2) */}
          <div onClick={() => setScreen("fun")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.3)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px`, margin: `${SPACE.sm}px 0 ${SPACE.xxs}px`, cursor: "pointer" }}>
            <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(240,199,90,.16)" }}>😄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Fun zóna · AI omyly</div>
              <div style={{ fontSize: 11.5, color: C.textTer }}>Najväčšie prešľapy AI v hodnotení</div>
            </div>
            <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
          </div>

          {/* rebríčky po kategóriách — na desktope mriežka (všetkých 5 naraz) */}
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !rebricky ? (
            <SkeletonRiadky count={6} />
          ) : (
          <div style={desktop ? { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: `0 ${SPACE.lg}px`, alignItems: "start" } : undefined}>
          {CATS.map((kat) => (
            <div key={kat.hl}>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>
                <span style={{ display: "flex", color: kat.col }}>{kat.ic}</span>
                <span style={{ fontSize: 11, letterSpacing: ".4px", color: C.textTer, fontWeight: 700 }}>{kat.hl}</span>
              </div>
              {vOkruhu(rebricky[kat.key] || []).map((p, i) => (
                <div key={p.meno} onClick={() => otvorProfil(p.subjekt)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
                  <span style={{ width: 26, fontSize: 14, fontWeight: 800, color: i === 0 ? kat.col : C.textTer, textAlign: "center", flex: "none" }}>{i + 1}.</span>
                  <div style={{ width: 36, height: 36, borderRadius: RADIUS.round, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", background: kat.col }}>{p.subjekt.emoji || p.meno[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{p.meno}</span>
                      {kat.key === "hrdinovia" && <span style={tagChip(kat.col)}>Hrdina</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textTer }}>{p.info}</div>
                  </div>
                  {i === 0 && <span style={{ flex: "none", fontSize: 16 }}>🏆</span>}
                </div>
              ))}
            </div>
          ))}
          </div>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.md }}>Karma sa nedá kúpiť — len zaslúžiť konaním. Rebríčky sú verejné; súkromné osoby v nich nefigurujú.</div>
        </div>
      )}
    </div>
  );
}
