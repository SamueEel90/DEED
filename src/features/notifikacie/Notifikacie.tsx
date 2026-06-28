import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { C, GRAD, glassTmavy } from "@/theme";
import { Zvon, IkonaNastavenia, IkonaSipVlavo, IkonaKriz, tint, usePortalEl, useLayout, pressable, SkeletonRiadky, EmptyState, ErrorState } from "@/shared";
import type { Notifikacia, VypnuteMapa } from "@/types";
import { useNotifikacie } from "@/data";
import { KATEGORIE, VYPNUTE_DEF } from "./mock";

/*
  ============================================================
  NOTIFIKÁCIE (§8) — zvonček (zoznam) + nastavenia
  ============================================================
  Zvonček je konštanta hore vo všetkých moduloch. Klik → zoznam
  agregovaných oznámení (1240 podpor = 1 súhrn) s badge počtom
  neprečítaných. Gear → nastavenia: prepínače po kategóriách +
  MASTER vypínač + tiché hodiny.

  Agregácia je POVINNÁ — nikdy 1 notifikácia za každú mikro-platbu.
  ============================================================
*/

export { NOTIFY } from "./mock";

// ---- prepínač (prístupný: role="switch" + klávesnica) ----
function Toggle({ on, dim, onClick, label }: { on?: boolean; dim?: boolean; onClick?: () => void; label?: string }) {
  return (
    <span role="switch" aria-checked={!!on} aria-label={label} aria-disabled={dim || undefined} tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
      style={{ width: 42, height: 25, borderRadius: 20, flex: "none", cursor: "pointer", padding: 3, opacity: dim ? .4 : 1,
      background: on ? GRAD : "rgba(var(--glass-rgb),.14)", transition: "background .2s ease" }}>
      <span style={{ display: "block", width: 19, height: 19, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.35)", transform: on ? "translateX(17px)" : "none", transition: "transform .2s ease" }} />
    </span>
  );
}

// ============================================================
// ZVONČEK — tlačidlo s badge + overlay (zoznam / nastavenia)
// ============================================================
export function Zvoncek({ color = "#C4CCDB", toast }: { color?: string; toast?: (msg: string) => void }) {
  const { data: NOTIFY = [] } = useNotifikacie();
  const portalEl = usePortalEl();
  const { desktop } = useLayout();
  const [otvor, setOtvor] = useState(false);
  const [view, setView] = useState<"zoznam" | "nastavenia">("zoznam");
  const [precitane, setPrecitane] = useState(false);
  const neprecitane = precitane ? 0 : NOTIFY.filter((n) => n.nove).length;

  // Escape zatvorí overlay (klávesnica) — custom overlay nemá Vaul focus-trap
  useEffect(() => {
    if (!otvor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOtvor(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [otvor]);

  // Overlay sa renderuje do vycentrovaného stĺpca appky (portál), nie do hlavičky —
  // inak by ho „position: sticky" hlavička orezala na svoju výšku (panel sa nerozbalil).
  // Na desktope: 2 stĺpce naraz (zoznam | nastavenia), bez prepínania.
  const overlay = (
    <div onClick={() => setOtvor(false)} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", flexDirection: "column", zIndex: 90, animation: "fadeUp .18s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...glassTmavy(26, .92), borderTop: "none", borderLeft: "none", borderRight: "none", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: "12px 14px 16px", boxShadow: "0 18px 50px rgba(0,0,0,.45)", maxHeight: "88%", display: "flex", flexDirection: "column", width: "100%", maxWidth: desktop ? 900 : undefined, margin: desktop ? "0 auto" : undefined }}>
        {desktop ? (
          <div style={{ display: "flex", gap: 18, flex: "1 1 auto", minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <Zoznam onClose={() => setOtvor(false)} onPrecitaj={() => setPrecitane(true)} toast={toast} hideSettings />
            </div>
            <div style={{ width: 330, flex: "0 0 330px", borderLeft: `1px solid ${C.line}`, paddingLeft: 18, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <Nastavenia embedded toast={toast} />
            </div>
          </div>
        ) : view === "zoznam" ? (
          <Zoznam onSettings={() => setView("nastavenia")} onClose={() => setOtvor(false)} onPrecitaj={() => setPrecitane(true)} toast={toast} />
        ) : (
          <Nastavenia onBack={() => setView("zoznam")} toast={toast} />
        )}
      </div>
    </div>
  );

  return (
    <>
      <span {...pressable(() => { setOtvor(true); setView("zoznam"); }, neprecitane > 0 ? `Oznámenia — ${neprecitane} neprečítané` : "Oznámenia")} style={{ position: "relative", display: "flex", alignItems: "center", cursor: "pointer" }}>
        <Zvon size={20} color={color} />
        {neprecitane > 0 && (
          <span style={{ position: "absolute", top: -5, right: -6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9, background: "var(--a-danger)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px var(--c-bg)" }}>{neprecitane}</span>
        )}
      </span>

      {otvor && (portalEl ? createPortal(overlay, portalEl) : overlay)}
    </>
  );
}

// ---- ZOZNAM oznámení ----
function Zoznam({ onSettings, onClose, onPrecitaj, toast, hideSettings }: { onSettings?: () => void; onClose?: () => void; onPrecitaj?: () => void; toast?: (msg: string) => void; hideSettings?: boolean }) {
  const { data: NOTIFY = [], isLoading, isError, refetch } = useNotifikacie();
  const neprecitane = NOTIFY.filter((n) => n.nove).length;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto", paddingBottom: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>Oznámenia</span>
        {neprecitane > 0 && <span {...pressable(onPrecitaj, "Označiť všetky prečítané")} style={{ fontSize: 11, fontWeight: 700, color: "var(--a-green)", cursor: "pointer" }}>Označiť prečítané</span>}
        {!hideSettings && <span {...pressable(onSettings, "Nastavenia notifikácií")} title="Nastavenia notifikácií" style={{ marginLeft: "auto", display: "flex", cursor: "pointer", color: C.textSec }}><IkonaNastavenia size={19} color={C.textSec} /></span>}
        <span {...pressable(onClose, "Zavrieť oznámenia")} style={{ marginLeft: hideSettings ? "auto" : undefined, display: "flex", cursor: "pointer", color: C.textSec }}><IkonaKriz size={19} color={C.textSec} /></span>
      </div>
      <div style={{ fontSize: 11, color: C.textTer, paddingBottom: 8, flex: "0 0 auto" }}>{neprecitane} neprečítané · mikro-podpory agregované do súhrnu</div>
      <div style={{ overflowY: "auto", margin: "0 -4px", flex: "1 1 auto" }}>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <SkeletonRiadky count={5} />
        ) : NOTIFY.length === 0 ? (
          <EmptyState emoji="🔔" title="Žiadne notifikácie" text="Tu sa zobrazia tvoje oznámenia." />
        ) : (
          <>
        {NOTIFY.map((n: Notifikacia) => (
          <div key={n.id} {...pressable(() => toast?.(n.titul), n.titul)} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 8px", borderRadius: 12, cursor: "pointer", borderBottom: `1px solid ${C.line2}`, background: n.nove ? tint("var(--a-green)", .06) : "transparent" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: tint(n.col, .15), color: n.col }}>{n.ic}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {n.nove && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--a-green)", flex: "none" }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.titul}</span>
                {n.agg && <span style={{ flex: "none", fontSize: 10, fontWeight: 800, color: C.textTer, border: `1px solid ${C.line}`, borderRadius: 6, padding: "1px 5px" }}>SÚHRN</span>}
              </div>
              <div style={{ fontSize: 12, color: C.textTer, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.text}</div>
            </div>
            <span style={{ fontSize: 11, color: C.textTer, flex: "none" }}>{n.cas}</span>
          </div>
        ))}
        <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, padding: "14px 0 4px" }}>To je všetko · staršie sa archivujú</div>
          </>
        )}
      </div>
    </>
  );
}

// ---- NASTAVENIA notifikácií (kategórie + master + tiché hodiny) ----
export function Nastavenia({ onBack, embedded, toast }: { onBack?: () => void; embedded?: boolean; toast?: (msg: string) => void }) {
  const [master, setMaster] = useState(true);
  const [tiche, setTiche] = useState(true);
  const [vyp, setVyp] = useState<VypnuteMapa>(VYPNUTE_DEF); // mapka vypnutých prepínačov
  const je = (k: string) => !vyp[k];
  const prepni = (k: string) => setVyp((v) => ({ ...v, [k]: !v[k] }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto", paddingBottom: 4 }}>
        {!embedded && <span {...pressable(onBack, "Späť na zoznam")} style={{ display: "flex", cursor: "pointer", color: C.textSec }}><IkonaSipVlavo size={20} color={C.textSec} /></span>}
        <span style={{ fontSize: 16, fontWeight: 800 }}>Notifikácie</span>
      </div>

      <div style={{ overflowY: "auto", flex: "1 1 auto", margin: "0 -2px", paddingRight: 2 }}>
        {/* MASTER */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: tint("var(--a-green)", .08), border: `1px solid ${tint("var(--a-green)", .28)}`, borderRadius: 14, padding: "13px 14px", margin: "8px 0 4px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Všetky notifikácie</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>Hlavný vypínač · prebíja kategórie</div>
          </div>
          <Toggle on={master} onClick={() => setMaster((m) => !m)} label="Všetky notifikácie" />
        </div>

        {/* kategórie */}
        {KATEGORIE.map((kat) => (
          <div key={kat.hl}>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "16px 0 6px" }}>{kat.hl}</div>
            {kat.polozky.map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", marginBottom: 7 }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{p}</span>
                <Toggle on={master && je(p)} dim={!master} onClick={() => master && prepni(p)} label={p} />
              </div>
            ))}
          </div>
        ))}

        {/* tiché hodiny */}
        <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "16px 0 6px" }}>TICHÉ HODINY</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5 }}>Nočný pokoj</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>22:00 – 7:00 · push vždy ticho</div>
          </div>
          <Toggle on={tiche} onClick={() => setTiche((t) => !t)} label="Nočný pokoj" />
        </div>

        {/* push default vysvetlenie */}
        <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 14, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 13px" }}>
          <b style={{ color: C.textSec }}>Push štandard:</b> mini dary nepushujú (vidno v appke ticho), podpora nad 100 DEED a euro (FIAT) áno, akčné (priateľstvo, pripomienka, vyhodnotenie) áno. Všetko nastaviteľné.
        </div>
      </div>
    </>
  );
}
