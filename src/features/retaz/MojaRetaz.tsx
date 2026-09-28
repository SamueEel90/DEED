// ============================================================
// DEED · Moja reťaz (FRONTA) — §5.1 správca + §5.2 picker príjemcov
// Tvorca si zoradí zbierky do FRONTY, ku každej si zvolí % z honoráru.
// DRAFT: edituje voľne (poradie, %, pridať/zmazať, zmazať celú reťaz).
// PUBLIKOVANÁ: kompletne zamknutá — „vyber, zafixuj, vytvor, koniec".
// Nahrádza paralelný split viacerých zbierok pre tvorcu (ten sa RUŠÍ).
// Mock: stav drží komponent; routing (dorovnanie/prehod) cez fronta.ts.
// ============================================================
import { useState, type CSSProperties } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { qrUrl } from "@/lib/qr";
import { Sheet, QrModal, Lupa, IkonaFajka, IkonaZamok, IkonaKriz, IkonaHviezda } from "@/shared";
import { usePouzivatel } from "@/lib/pouzivatel";
import {
  PCT_MIN, PCT_KROK, PCT_MAX, naKrok, prečísluj, aktivnaPolozka, chainValid, mozeGenerovatQr,
  smerujDar, type CreatorChain, type ChainQueueItem,
} from "./fronta";
import { ZIADOSTI, mockDraftChain, ziadostNaPolozku, FALLBACK_KANDIDATI } from "./mock";
import { RetazPodstranka } from "./RetazPodstranka";
import type { RetazZiadost } from "@/types";

const GREEN = "var(--a-green)";
const norm = (s?: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const datumSk = (iso?: string) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString("sk", { day: "numeric", month: "short" }); } catch { return ""; } };

export function MojaRetaz({ onClose, toast }: { onClose?: () => void; toast?: (m: string) => void }) {
  const { ucetId } = usePouzivatel();
  const [chain, setChain] = useState<CreatorChain>(() => mockDraftChain(ucetId ?? "ja"));
  const [picker, setPicker] = useState(false);
  const [qr, setQr] = useState(false);
  const [nahlad, setNahlad] = useState(false);
  const draft = chain.chainStatus === "draft";

  // ---- draft mutácie (immutable) ----
  const setQueue = (fn: (q: ChainQueueItem[]) => ChainQueueItem[]) =>
    setChain((c) => ({ ...c, queue: prečísluj(fn(c.queue)) }));
  const uprav = (id: string, percent: number) => setQueue((q) => q.map((it) => (it.id === id ? { ...it, percent: naKrok(percent) } : it)));
  const odober = (id: string) => setQueue((q) => q.filter((it) => it.id !== id));
  const presun = (id: string, smer: -1 | 1) => setQueue((q) => {
    const i = q.findIndex((it) => it.id === id); const j = i + smer;
    if (i < 0 || j < 0 || j >= q.length) return q;
    const cp = [...q]; [cp[i], cp[j]] = [cp[j], cp[i]]; return cp;
  });
  const rovnakePreVsetky = () => setQueue((q) => q.length ? q.map((it) => ({ ...it, percent: q[0].percent })) : q);
  const pridaj = (z: RetazZiadost) => {
    setPicker(false);
    if (chain.queue.some((it) => it.collectionId === z.id)) { toast?.("Táto zbierka už je vo fronte"); return; }
    setQueue((q) => [...q, ziadostNaPolozku(z, 10)]);
  };
  const zmazCeluRetaz = () => { setChain(mockDraftChain(ucetId ?? "ja")); toast?.("Reťaz vymazaná — postav ju nanovo"); };
  const zverejni = () => {
    if (!chainValid(chain)) return;
    setChain((c) => ({ ...c, chainStatus: "published", publishedAt: new Date().toISOString(), queue: prečísluj(c.queue) }));
    toast?.("Reťaz zverejnená · zamknutá — QR je pripravený");
  };
  const novaRetaz = () => { setChain(mockDraftChain(ucetId ?? "ja")); toast?.("Nová reťaz — draft otvorený"); };

  // ---- demo: simulácia daru (ukáže dorovnanie + prehod aktívnej) ----
  const DAR = 2000;
  const simulujDar = () => {
    const r = smerujDar(chain, DAR, { fallbackKandidati: FALLBACK_KANDIDATI });
    setChain(r.chain);
    const zavrete = r.rozdelenia.filter((x) => x.naplnila).map((x) => x.nazov);
    if (zavrete.length) toast?.(`Dar ${DAR} · cieľ naplnený: ${zavrete.join(" + ")}${r.prehodenaNa ? ` → teraz: ${r.prehodenaNa.nazov}` : ""}`);
    else if (r.doPoolu > 0) toast?.(`Dar ${DAR} · fronta vyschla → ${r.doPoolu} do community poolu`);
    else toast?.(`Dar ${DAR} · ${r.retazoPodiel} do „${r.prehodenaNa?.nazov ?? "—"}"`);
  };

  const aktiv = aktivnaPolozka(chain);
  const zoradene = [...chain.queue].sort((a, b) => a.position - b.position);

  return (
    <>
      <Sheet onClose={onClose} label="Moja reťaz">
        {/* hlavička */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
          <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(GREEN, .16), color: GREEN, fontSize: 18 }}>⛓</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Moja reťaz</div>
            <div style={{ fontSize: 11.5, color: C.textTer }}>{draft ? "Fronta zbierok · % z honoráru ku každej" : "Zverejnená · zamknutá"}</div>
          </div>
          <span style={{ flex: "none", fontSize: 10, fontWeight: 800, letterSpacing: ".3px", padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, background: draft ? tint(C.gold, .16) : tint(GREEN, .16), color: draft ? C.gold : GREEN }}>
            {draft ? "DRAFT" : "🔒 PUBLIKOVANÁ"}
          </span>
        </div>

        {/* vysvetlenie princípu */}
        <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.5, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
          Aktívna je <b style={{ color: C.text }}>vždy prvá nenaplnená</b> zbierka — QR na ňu smeruje. Po naplnení sa automaticky prehodí na ďalšiu. Peniaze nikdy netečú do prázdna.
        </div>

        {/* zoznam fronty */}
        {zoradene.map((it, i) => {
          const je = aktiv?.id === it.id;
          const filled = it.status === "filled";
          const pct = Math.round((it.vyzbierane / it.ciel) * 100);
          return (
            <div key={it.id} style={{
              background: je ? tint(GREEN, .08) : "rgba(var(--glass-rgb),.04)",
              border: `1px solid ${je ? tint(GREEN, .4) : C.line}`, borderRadius: RADIUS.md,
              padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, opacity: filled ? .72 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
                <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: tint(it.col || GREEN, .15) }}>{it.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</span>
                    {je && !filled && <span style={{ flex: "none", fontSize: 9, fontWeight: 800, color: GREEN, background: tint(GREEN, .16), padding: "1px 6px", borderRadius: 999 }}>TERAZ</span>}
                    {it.addedBy === "system" && <span style={{ flex: "none", fontSize: 9, fontWeight: 800, color: C.blue, background: tint(C.blue, .16), padding: "1px 6px", borderRadius: 999 }}>SYSTÉM</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 1 }}>
                    {it.zdroj} · {it.lok} · cieľ {it.ciel.toLocaleString("sk")}
                  </div>
                </div>
                {/* stav položky vpravo */}
                <div style={{ flex: "none", textAlign: "right" }}>
                  {filled
                    ? <span style={{ fontSize: 12, fontWeight: 800, color: GREEN, display: "flex", alignItems: "center", gap: 3 }}><IkonaFajka size={13} color={GREEN} />{datumSk(it.filledAt)}</span>
                    : <span style={{ fontSize: 17, fontWeight: 800, color: je ? GREEN : C.textSec, display: "flex", alignItems: "center", gap: 3 }}>{!draft && !je && <IkonaZamok size={12} color={C.textTer} />}{it.percent}%</span>}
                </div>
              </div>

              {/* progres zbierky (vždy) */}
              <div style={{ height: 5, borderRadius: 999, background: "rgba(var(--glass-rgb),.1)", overflow: "hidden", marginTop: SPACE.xs }}>
                <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: filled ? GREEN : GRAD_ZELENY, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 10, color: C.textTer, marginTop: 2 }}>{it.vyzbierane.toLocaleString("sk")} / {it.ciel.toLocaleString("sk")} ({Math.min(100, pct)}%)</div>

              {/* DRAFT: editácia % + poradie + odobrať */}
              {draft && (
                <>
                  <input type="range" min={PCT_MIN} max={PCT_MAX} step={PCT_KROK} value={it.percent}
                    onChange={(e) => uprav(it.id, +e.target.value)} aria-label={`Percento pre ${it.nazov}`}
                    style={{ width: "100%", marginTop: SPACE.xs, accentColor: GREEN }} />
                  <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.xxs }}>
                    <span style={{ fontSize: 10, color: C.textTer, flex: 1 }}>{PCT_MIN}% min · krok {PCT_KROK}%</span>
                    <IconBtn label="Vyššie vo fronte" disabled={i === 0} onClick={() => presun(it.id, -1)}>▲</IconBtn>
                    <IconBtn label="Nižšie vo fronte" disabled={i === zoradene.length - 1} onClick={() => presun(it.id, 1)}>▼</IconBtn>
                    <span onClick={() => odober(it.id)} title="Odobrať" role="button" aria-label={`Odobrať ${it.nazov}`} style={{ cursor: "pointer", display: "flex", padding: 4 }}><IkonaKriz size={15} color={C.textTer} /></span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {chain.queue.length === 0 && (
          <div style={{ padding: `${SPACE.md}px`, textAlign: "center", color: C.textTer, fontSize: 12.5 }}>Fronta je prázdna — pridaj prvú zbierku.</div>
        )}

        {/* DRAFT ovládanie */}
        {draft ? (
          <>
            <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.xs }}>
              <button onClick={() => setPicker(true)} style={{ flex: 1, height: 44, borderRadius: RADIUS.sm, border: `1px solid ${tint(GREEN, .4)}`, background: tint(GREEN, .08), color: GREEN, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>＋ Pridať zbierku</button>
              {chain.queue.length > 1 && (
                <button onClick={rovnakePreVsetky} title="Nastav prvé % všetkým" style={{ flex: "none", height: 44, padding: `0 ${SPACE.gutter}px`, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.textSec, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>＝ Rovnaké %</button>
              )}
            </div>

            {/* systémové doparovanie */}
            <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.sm, cursor: "pointer", fontSize: 12.5, color: C.textSec }}>
              <input type="checkbox" checked={chain.systemFallbackEnabled} onChange={(e) => setChain((c) => ({ ...c, systemFallbackEnabled: e.target.checked }))} style={{ accentColor: GREEN, width: 16, height: 16 }} />
              <span>Systémové doparovanie keď fronta vyschne <span style={{ color: C.textTer }}>(nastaviteľné len v drafte)</span></span>
            </label>

            {/* zámok upozornenie */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.xs, fontSize: 11, color: C.gold, marginTop: SPACE.sm, lineHeight: 1.45 }}>
              🔒 Po zverejnení sa reťaz <b>už NEDÁ meniť</b> — položky, %, poradie. Fanúšik videl sľub, sľub je zamknutý.
            </div>

            <button onClick={zverejni} disabled={!chainValid(chain)}
              style={{ width: "100%", height: 50, borderRadius: RADIUS.md, border: "none", marginTop: SPACE.gutter, fontWeight: 700, fontSize: 15, fontFamily: "inherit",
                background: chainValid(chain) ? GRAD_ZELENY : "rgba(var(--glass-rgb),.06)", color: chainValid(chain) ? "#fff" : C.textTer, cursor: chainValid(chain) ? "pointer" : "not-allowed",
                boxShadow: chainValid(chain) ? "0 8px 26px rgba(78,122,62,.3)" : "none" }}>
              Zverejniť reťaz · zamknúť
            </button>
            {!mozeGenerovatQr(chain) && chain.queue.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--a-danger)", textAlign: "center", marginTop: SPACE.xs }}>Aktívna zbierka má 0 % — QR sa nedá vygenerovať. Zvýš aspoň na {PCT_MIN} %.</div>
            )}
            <button onClick={zmazCeluRetaz} style={{ width: "100%", height: 40, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "transparent", color: C.textTer, fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", marginTop: SPACE.xs }}>Zmazať celú reťaz</button>
          </>
        ) : (
          /* PUBLIKOVANÁ ovládanie */
          <>
            <button onClick={() => setQr(true)} disabled={!mozeGenerovatQr(chain)}
              style={{ width: "100%", height: 50, borderRadius: RADIUS.md, border: "none", marginTop: SPACE.sm, fontWeight: 700, fontSize: 15, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
                background: mozeGenerovatQr(chain) ? GRAD : "rgba(var(--glass-rgb),.06)", color: mozeGenerovatQr(chain) ? "#fff" : C.textTer, cursor: mozeGenerovatQr(chain) ? "pointer" : "not-allowed" }}>
              ⛓ Vygenerovať / zdieľať QR reťaze
            </button>
            <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.xs }}>
              <button onClick={() => setNahlad(true)} style={{ flex: 1, height: 42, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>👁 Verejná podstránka</button>
              <button onClick={simulujDar} title="Demo: príde dar 400" style={{ flex: 1, height: 42, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>▶ Simulovať dar 400</button>
            </div>
            <button onClick={novaRetaz} style={{ width: "100%", height: 44, borderRadius: RADIUS.sm, border: `1px solid ${tint(GREEN, .4)}`, background: tint(GREEN, .08), color: GREEN, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", marginTop: SPACE.xs }}>＋ Vytvoriť novú reťaz (ďalšie video)</button>
          </>
        )}
      </Sheet>

      {picker && <PickerPrijemcov voFronte={chain.queue.map((it) => it.collectionId)} onVyber={pridaj} onClose={() => setPicker(false)} toast={toast} />}
      {qr && <QrModal typ="rozdelenie" titul={`Reťaz · ${aktiv?.nazov ?? "tvorca"}`} popis={`Teraz podporuje: ${aktiv?.nazov ?? "—"} · ${aktiv?.percent ?? 0}% z honoráru`}
        odkaz={qrUrl("chain", chain.id)} split={[{ komu: aktiv?.nazov ?? "aktívna zbierka", pct: aktiv?.percent ?? 0 }]} onClose={() => setQr(false)} toast={toast} />}
      {nahlad && <RetazPodstranka chain={chain} onClose={() => setNahlad(false)} toast={toast} />}
    </>
  );
}

function IconBtn({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{ width: 30, height: 30, borderRadius: RADIUS.xs, border: `1px solid ${C.line}`, background: C.surface2, color: disabled ? C.textTer : C.textSec, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 11, opacity: disabled ? .45 : 1 }}>
      {children}
    </button>
  );
}

// ============================================================
// §5.2 Picker príjemcov — bottom-sheet, karty bez odchodu z procesu
// Obľúbené · Nedávne · Odporúčané · Vyhľadávanie · Sken QR
// ============================================================
type PickTab = "oblubene" | "nedavne" | "odporucane" | "hladat";
const TABY: { id: PickTab; label: string }[] = [
  { id: "oblubene", label: "⭐ Obľúbené" },
  { id: "odporucane", label: "Odporúčané" },
  { id: "nedavne", label: "Nedávne" },
  { id: "hladat", label: "Hľadať" },
];

function PickerPrijemcov({ voFronte, onVyber, onClose, toast }: {
  voFronte: string[]; onVyber: (z: RetazZiadost) => void; onClose?: () => void; toast?: (m: string) => void;
}) {
  const [tab, setTab] = useState<PickTab>("oblubene");
  const [q, setQ] = useState("");
  const jeVoFronte = (id: string) => voFronte.includes(id);

  // rozdelenie mock zdroja do košov (obľúbené = odpor; odporúčané = overené; nedávne = zvyšok)
  const oblubene = ZIADOSTI.filter((z) => z.odpor);
  const odporucane = ZIADOSTI.filter((z) => z.overena);
  const nedavne = [...ZIADOSTI].slice(2, 6);
  const najdene = q ? ZIADOSTI.filter((z) => norm(z.nazov + " " + z.lok + " " + z.zdroj).includes(norm(q))) : [];
  const zoznam = tab === "oblubene" ? oblubene : tab === "odporucane" ? odporucane : tab === "nedavne" ? nedavne : najdene;

  const inpS: CSSProperties = { width: "100%", padding: `${SPACE.sm}px ${SPACE.sm}px ${SPACE.sm}px ${SPACE.xxl}px`, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };

  return (
    <Sheet onClose={onClose} label="Pridať zbierku do reťaze">
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <SpatTlacidlo onClick={() => onClose?.()} />
        <div style={{ fontSize: 16, fontWeight: 800 }}>Pridať zbierku</div>
      </div>

      {/* taby */}
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm, overflowX: "auto", paddingBottom: 2 }}>
        {TABY.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: "none", padding: `${SPACE.xs}px ${SPACE.gutter}px`, borderRadius: 999, fontFamily: "inherit", fontWeight: 700, fontSize: 12, cursor: "pointer",
            border: `1px solid ${tab === t.id ? tint(GREEN, .5) : C.line}`, background: tab === t.id ? tint(GREEN, .12) : "transparent", color: tab === t.id ? GREEN : C.textSec, whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
        <button onClick={() => toast?.("Sken QR zbierky z plagátu")} style={{ flex: "none", padding: `${SPACE.xs}px ${SPACE.gutter}px`, borderRadius: 999, fontFamily: "inherit", fontWeight: 700, fontSize: 12, cursor: "pointer", border: `1px dashed ${C.line}`, background: "transparent", color: C.textSec, whiteSpace: "nowrap" }}>⛶ Sken QR</button>
      </div>

      {/* vyhľadávanie */}
      {tab === "hladat" && (
        <div style={{ position: "relative", marginBottom: SPACE.sm }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Lupa size={16} color={C.textTer} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vyhľadať zbierku (Help / Charita)…" style={inpS} autoFocus />
        </div>
      )}

      {/* zoznam */}
      <div style={{ maxHeight: 320, overflowY: "auto", margin: "0 -2px" }}>
        {zoznam.map((z) => {
          const on = jeVoFronte(z.id);
          return (
            <div key={z.id} onClick={() => !on && onVyber(z)} role="button" aria-disabled={on}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, cursor: on ? "default" : "pointer", opacity: on ? .5 : 1, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}` }}>
              <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: tint(z.col, .15) }}>{z.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.nazov}</span>
                  {z.overena && <span style={{ flex: "none", fontSize: 9.5, fontWeight: 800, color: "var(--a-info)", background: "color-mix(in srgb, var(--a-info) 14%, transparent)", borderRadius: RADIUS.xs, padding: "1px 5px" }}>✓ OVERENÁ</span>}
                </div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{z.zdroj} · {z.lok}</div>
              </div>
              {on ? <span style={{ flex: "none", fontSize: 10.5, color: C.textTer, fontWeight: 700 }}>vo fronte</span>
                : z.odpor ? <IkonaHviezda size={16} color={C.gold} /> : <span style={{ flex: "none", fontSize: 18, color: GREEN }}>＋</span>}
            </div>
          );
        })}
        {zoznam.length === 0 && (
          <div style={{ textAlign: "center", color: C.textTer, fontSize: 12.5, padding: SPACE.md }}>
            {tab === "hladat" ? (q ? "Nič sa nenašlo." : "Začni písať názov zbierky…") : "Nič tu zatiaľ nie je."}
          </div>
        )}
      </div>
    </Sheet>
  );
}
