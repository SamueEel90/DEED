// ============================================================
// SEKTOROVÉ ZBIERKY (charita, od programu AKCIA) — samostatná zbierka,
// vlastný transparentný účet a vlastný QR pre každý sektor činnosti.
// Charita zbiera na VLASTNÚ overenú činnosť (odznak D+), sektor je overený
// už pri registrácii → žiadna AI kontrola žiadosti, zbierka je hneď live.
// Bez cieľovej sumy → dokladovanie po každých 3 000 € (MilnikBar).
// ============================================================
import { useMemo, useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { QrModal } from "@/components/qr";
import { DeedQr, stiahniDeedQr } from "@/components/deedqr";
import { qrUrl } from "@/lib/qr";
import { sucetDarov } from "@/lib/darcovia";
import { KartaZbierkyForm, NahladKarty, vstup } from "./KartaZbierky";
import { useSegmenty, ulozSegmenty, overIban, formatujIban, type SegmentOrg } from "./segmenty";
import { Switch } from "@/shared";
import { nacitajProfil, ulozProfil, sektorZbierkaId, VLASTNA_ZBIERKA_CFG, useZmenyProfilov, type ProfilZbierky } from "./vlastneZbierky";
import { zbierkyOrg } from "./obsah";
import { SUBJEKTY, type OrgZbierka } from "./mock";
import { KONFIG, TIER_LABEL, nacitajOrgExtra, ulozOrgExtra, nacitajLogo, type Tier } from "./stav";

const ZELENA = "var(--a-green)";
const karta: CSSProperties = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs };
const btnHlavny: CSSProperties = { width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 42, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: "transparent", color: C.textSec };

export function SektoroveZbierkySheet({ tier, toast, onPaywall, onClose }: {
  tier: Tier; toast: (m: string) => void;
  onPaywall: (p: { tierMin: Tier; nazov: string; dovod?: string }) => void; onClose: () => void;
}) {
  const segmenty = useSegmenty();
  useZmenyProfilov();
  const [uprava, setUprava] = useState<SegmentOrg | null>(null);
  const [qr, setQr] = useState<null | { titul: string; odkaz: string }>(null);
  const [extra, setExtra] = useState<OrgZbierka[]>(nacitajOrgExtra);
  const odomknute = tier >= VLASTNA_ZBIERKA_CFG.sektoroveOdTieru;
  const limit = KONFIG.limitZbierok[tier];
  const logo = nacitajLogo("charita") ?? SUBJEKTY.charita.foto;
  const aktivnych = useMemo(
    () => zbierkyOrg("charita", tier).filter((z) => z.stav === "aktivna").length + extra.filter((z) => z.stav === "aktivna").length,
    [extra, tier],
  );

  const zmenSektor = (id: string, patch: Partial<SegmentOrg>) =>
    ulozSegmenty(segmenty.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const [novy, setNovy] = useState("");
  const pridajSektor = () => {
    const n = novy.trim();
    if (n.length < 3) { toast("Napíš názov sektora"); return; }
    if (segmenty.some((x) => x.nazov.toLowerCase() === n.toLowerCase())) { toast("Taký sektor už máš"); return; }
    ulozSegmenty([...segmenty, { id: `s${Date.now()}`, nazov: n, popis: "", aktivny: true }]);
    setNovy(""); toast("Sektor činnosti pridaný");
  };
  const zmazSektor = (sg: SegmentOrg) => { ulozSegmenty(segmenty.filter((x) => x.id !== sg.id)); toast("Sektor činnosti odstránený"); };

  const zaloz = (sg: SegmentOrg) => {
    if (!odomknute) {
      onPaywall({ tierMin: VLASTNA_ZBIERKA_CFG.sektoroveOdTieru as Tier, nazov: "Sektorové zbierky", dovod: "Každý sektor činnosti dostane samostatnú zbierku, vlastný účet a vlastný QR kód." });
      return;
    }
    if (aktivnych >= limit) {
      if (tier < 4) onPaywall({ tierMin: (tier + 1) as Tier, nazov: "Ďalšia súbežná zbierka", dovod: `Na úrovni ${TIER_LABEL.charita[tier]} máš limit ${limit} súbežných zbierok (${aktivnych} aktívnych).` });
      else toast(`Dosiahnutý limit súbežných zbierok: ${limit}`);
      return;
    }
    setUprava(sg);
  };

  if (uprava) return <FormularSektora sektor={uprava} logo={logo} toast={toast}
    onUloz={(p, iban) => {
      const id = sektorZbierkaId(uprava.id);
      ulozProfil(id, { ...p, iban, spustena: true, vytvorena: nacitajProfil(id)?.vytvorena ?? new Date().toISOString() });
      if (!segmenty.find((x) => x.id === uprava.id)?.zbierkaId) {
        const n: OrgZbierka = { id, nazov: p.nazov, emoji: "🧩", ciel: 0, vyzbierane: 0, stav: "aktivna", darcovia: 0 };
        const nove = [...extra.filter((z) => z.id !== id), n];
        setExtra(nove); ulozOrgExtra(nove);
        toast("Zbierka sektora spustená");
      } else {
        const nove = extra.map((z) => (z.id === id ? { ...z, nazov: p.nazov } : z));
        setExtra(nove); ulozOrgExtra(nove);
        toast("Zbierka sektora upravená");
      }
      zmenSektor(uprava.id, { zbierkaId: id, iban });
      setUprava(null);
    }}
    onSpat={() => setUprava(null)} />;

  return (
    <Sheet onClose={onClose} label="Sektorové zbierky a činnosti">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🧩 Sektorové zbierky a činnosti</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Oblasti vašej práce zo registrácie. Darca si ich vyberie pri pravidelnej podpore. Od programu {TIER_LABEL.charita[VLASTNA_ZBIERKA_CFG.sektoroveOdTieru as Tier]} môže mať každý sektor aj samostatnú zbierku s vlastným účtom a QR.
      </div>

      {!odomknute && (
        <div style={{ ...karta, borderStyle: "dashed", background: tint(ZELENA, .06), borderColor: tint(ZELENA, .3) }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 2 }}>🔒 Od programu {TIER_LABEL.charita[VLASTNA_ZBIERKA_CFG.sektoroveOdTieru as Tier]}</div>
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.45, marginBottom: SPACE.xs }}>
            V nižšom programe je sektor len téma pravidelnej podpory — dary idú na hlavný účet a použitie negarantujeme. So samostatnou zbierkou a účtom ho vieme doložiť.
          </div>
          <button onClick={() => onPaywall({ tierMin: VLASTNA_ZBIERKA_CFG.sektoroveOdTieru as Tier, nazov: "Sektorové zbierky", dovod: "Každý sektor dostane samostatnú zbierku, vlastný účet a vlastný QR kód." })} style={btnHlavny}>
            Odomknúť v {TIER_LABEL.charita[VLASTNA_ZBIERKA_CFG.sektoroveOdTieru as Tier]}
          </button>
        </div>
      )}

      {segmenty.map((sg) => {
        const id = sektorZbierkaId(sg.id);
        const p = sg.zbierkaId ? nacitajProfil(id) : null;
        const vyz = p ? sucetDarov(id).suma : 0;
        const odkaz = qrUrl("case", id);
        return (
          <div key={sg.id} style={karta}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: sg.aktivny ? C.text : C.textTer }}>{sg.nazov}</div>
                <div style={{ fontSize: 10.5, color: p ? ZELENA : C.textTer }}>
                  {p ? `vlastná zbierka · účet ${sg.iban ? formatujIban(sg.iban).slice(0, 14) + "…" : "nedoplnený"}` : "zatiaľ len téma — dary idú na hlavný účet"}
                </div>
              </div>
              {p && <span style={{ flex: "none", borderRadius: RADIUS.xs, overflow: "hidden" }}><DeedQr data={odkaz} odznak="D+" size={44} /></span>}
              <Switch on={sg.aktivny} onChange={(v) => zmenSektor(sg.id, { aktivny: v })} ariaLabel={`Ponúkať darcom — ${sg.nazov}`} />
            </div>
            <input defaultValue={sg.popis} onBlur={(e) => zmenSektor(sg.id, { popis: e.target.value })} maxLength={90}
              placeholder="Jedna veta pre darcu (napr. Potraviny a lieky pre rodiny v núdzi)"
              style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.xs, color: C.text, fontSize: 12.5, fontFamily: "inherit", outline: "none", marginTop: SPACE.xs }} />

            {p ? (
              <>
                <div style={{ marginTop: SPACE.xs }}><NahladKarty profil={p} logo={logo} vyzbierane={vyz} dolozene={0} /></div>
                <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs }}>
                  <span {...pressable(() => setUprava(sg), "Upraviť zbierku")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>Upraviť</span>
                  <span {...pressable(() => setQr({ titul: sg.nazov, odkaz }), "Zobraziť QR")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>QR sektora</span>
                  <span {...pressable(async () => {
                    try { await stiahniDeedQr({ data: odkaz, odznak: "D+", variant: "svetly", nazov: `QR ${sg.nazov}` }); toast("QR stiahnuté (PNG na tlač)"); }
                    catch (e) { toast((e as Error).message); }
                  }, "Stiahnuť PNG")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>⬇ PNG</span>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => zaloz(sg)} style={{ ...btnDruhy, marginTop: SPACE.xs }}>
                  {odomknute ? "Vytvoriť zbierku pre sektor" : "🔒 Vytvoriť zbierku pre sektor"}
                </button>
                {!sg.zRegistracie && (
                  <span {...pressable(() => zmazSektor(sg), `Odstrániť ${sg.nazov}`)} style={{ display: "inline-block", marginTop: SPACE.xxs, fontSize: 11, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Odstrániť sektor</span>
                )}
              </>
            )}
          </div>
        );
      })}

      <div style={{ ...karta, borderStyle: "dashed" }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: SPACE.xxs }}>Pridať vlastný sektor</div>
        <div style={{ display: "flex", gap: SPACE.xs }}>
          <input value={novy} onChange={(e) => setNovy(e.target.value)} placeholder="Napr. Seniori · rozvoz obedov"
            style={{ flex: 1, minWidth: 0, boxSizing: "border-box", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.xs, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          <button onClick={pridajSektor} style={{ ...btnHlavny, width: 110, height: 42 }}>Pridať</button>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.sm}px 0 ${SPACE.xxs}px` }}>ČO VIDÍ DARCA PRI PRAVIDELNEJ PODPORE</div>
      <div style={{ ...karta, background: tint(ZELENA, .07), border: `1px solid ${tint(ZELENA, .3)}` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.pill, background: C.surface, border: `1px solid ${C.line}`, color: C.textSec }}>Túto zbierku</span>
          {segmenty.filter((x) => x.aktivny).map((sg) => (
            <span key={sg.id} style={{ fontSize: 11.5, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.pill, background: tint(ZELENA, .12), border: `1px solid ${tint(ZELENA, .4)}`, color: ZELENA }}>{sg.nazov}</span>
          ))}
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.pill, background: C.surface, border: `1px solid ${C.line}`, color: C.textSec }}>Celú organizáciu</span>
        </div>
      </div>
      {qr && <QrModal odznak="D+" typ="skutok" titul={`QR — ${qr.titul}`} odkaz={qr.odkaz} onClose={() => setQr(null)} toast={toast} />}
    </Sheet>
  );
}

// ---------- formulár zbierky sektora ----------
function FormularSektora({ sektor, logo, toast, onUloz, onSpat }: {
  sektor: SegmentOrg; logo?: string; toast: (m: string) => void;
  onUloz: (p: ProfilZbierky, iban: string) => void; onSpat: () => void;
}) {
  const id = sektorZbierkaId(sektor.id);
  const [profil, setProfil] = useState<ProfilZbierky>(() => nacitajProfil(id) ?? {
    nazov: sektor.nazov,
    popis: sektor.popis || "",
  });
  const [iban, setIban] = useState(sektor.iban ? formatujIban(sektor.iban) : "");
  const zmen = (patch: Partial<ProfilZbierky>) => setProfil((x) => ({ ...x, ...patch }));

  const uloz = () => {
    if (profil.nazov.trim().length < 3) { toast("Napíš názov zbierky"); return; }
    if (profil.popis.trim().length < 20) { toast("Napíš aspoň dve vety, na čo peniaze idú"); return; }
    const ok = iban.trim() ? overIban(iban) : null;
    if (iban.trim() && !ok) { toast("Neplatný IBAN — skontroluj číslo"); return; }
    onUloz({ ...profil, nazov: profil.nazov.trim(), popis: profil.popis.trim() }, ok ?? "");
  };

  return (
    <Sheet onClose={onSpat} label={`Zbierka sektora — ${sektor.nazov}`}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Zbierka sektora</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm }}>{sektor.nazov}</div>

      <KartaZbierkyForm profil={profil} zmen={zmen} logo={logo} toast={toast} deti={
        <div style={{ marginTop: SPACE.sm }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSec, marginBottom: 2 }}>Transparentný účet zbierky (IBAN)</div>
          <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="SK00 0000 0000 0000 0000 0000"
            autoComplete="off" spellCheck={false} style={vstup} />
          <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 2, lineHeight: 1.4 }}>
            Dary z tohto sektora idú sem. Bez vlastného účtu ostáva sektor len témou — dary padnú na hlavný účet a použitie negarantujeme.
          </div>
        </div>
      } />

      <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.5, background: tint(ZELENA, .08), border: `1px solid ${tint(ZELENA, .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.sm }}>
        Zbierka nemá cieľovú sumu — beží ďalej, kým ju neukončíš. Po každých {VLASTNA_ZBIERKA_CFG.milnik.toLocaleString("sk")} € doložíš použitie do {VLASTNA_ZBIERKA_CFG.dniNaDolozenie} dní.
      </div>

      <button onClick={uloz} style={{ ...btnHlavny, marginTop: SPACE.sm }}>
        {sektor.zbierkaId ? "Uložiť zmeny" : "Spustiť zbierku sektora"}
      </button>
      <button onClick={onSpat} style={{ ...btnDruhy, marginTop: SPACE.xs }}>Späť</button>
    </Sheet>
  );
}
