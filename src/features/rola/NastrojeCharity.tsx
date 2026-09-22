// ============================================================
// NÁSTROJE CHARITY (ZADARMO) — Video · Prehľad darcov · QR nástroje · Viditeľnosť súm
// Dáta sú tie isté ako na verejnom profile (zbierkyOrg, videá, dary).
// ============================================================
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, Switch, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { QrModal } from "@/components/qr";
import { DeedQr, stiahniDeedQr, type DeedOdznak, type DeedQrVariant } from "@/components/deedqr";
import { usePouzivatel } from "@/lib/pouzivatel";
import { darcoviaPre, useZmenyDarov, identitaDarcu, relCas } from "@/lib/darcovia";
import { najdiZbierku, odznakZbierky } from "@/lib/zbierky";
import { qrUrl, qrResolveUrl } from "@/lib/qr";
import { ulozVideoInfo, zmazVideo } from "@/lib/videoUloz";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { MediaNahlad } from "./DokazBlok";
import { zbierkyOrg } from "./obsah";
import { SUBJEKTY, type OrgZbierka } from "./mock";
import { useVidea, ulozVidea, videiTentoMesiac, VIDEO_ORG_CFG, type VideoOrg } from "./videa";
import { useSegmenty, ulozSegmenty, overIban, formatujIban, SEKTOR_ROZSIRENIE_OD_TIERU, type SegmentOrg } from "./segmenty";
import { KONFIG, TIER_LABEL, nacitajCentralnu, nacitajOrgExtra, ulozOrgExtra, nacitajViditelnost, ulozViditelnost, type Tier, type Viditelnost } from "./stav";

const ZELENA = "var(--a-green)";
const eur = (n: number) => `${n.toLocaleString("sk", { maximumFractionDigits: 2 })} €`;
const input: CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" };
const btnHlavny: CSSProperties = { width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 42, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: "transparent", color: C.textSec };

function Hlavicka({ nadpis, popis }: { nadpis: string; popis: ReactNode }) {
  return (
    <div style={{ marginBottom: SPACE.sm }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{nadpis}</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45 }}>{popis}</div>
    </div>
  );
}
function Cip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <span {...pressable(onClick, String(children))} aria-pressed={on}
      style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: on ? 800 : 600, padding: `${SPACE.xs}px ${SPACE.xxs}px`, borderRadius: RADIUS.pill, cursor: "pointer", background: on ? tint(ZELENA, .12) : C.surface, border: `1px solid ${on ? tint(ZELENA, .45) : C.line}`, color: on ? ZELENA : C.textSec }}>{children}</span>
  );
}
const karta: CSSProperties = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs };

/** zbierky charity pre nástroje (+ centrálna od T1, ak je spustená) */
function zbierkyNastroje(tier: Tier) {
  const z = zbierkyOrg("charita", tier);
  const centralna = tier >= 1 && nacitajCentralnu("charita")
    ? [{ id: "z-centralna", nazov: "Centrálna zbierka organizácie", emoji: "💛", ciel: 12000, vyzbierane: 0, stav: "aktivna" as const, darcovia: 0 }] : [];
  return [...centralna, ...z];
}

// ===================== VIDEO =====================
export function VideoSheet({ tier, toast, onClose }: { tier: Tier; toast: (m: string) => void; onClose: () => void }) {
  const videa = useVidea();
  const [teraz] = useState(() => Date.now());
  const [titul, setTitul] = useState("");
  const [zbierkaId, setZbierkaId] = useState<string>("");
  const [nove, setNove] = useState<{ ref: string; sekundy: number } | null>(null);
  const [platit, setPlatit] = useState(false);
  const zbierky = zbierkyOrg("charita", tier).filter((z) => z.stav === "aktivna");
  const tentoMesiac = videiTentoMesiac(videa, teraz);
  const vCene = VIDEO_ORG_CFG.zaMesiac[tier];
  const zaplatene = tentoMesiac >= vCene;
  const naProfileMax = VIDEO_ORG_CFG.naProfile[tier];
  const naProfile = videa.filter((v) => v.naProfile);

  const nahraj = async (files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try { setNove(await ulozVideoInfo(f, VIDEO_ORG_CFG.maxSekund)); } catch (e) { toast((e as Error).message); }
  };
  const zverejni = () => {
    if (!nove) { toast("Najprv vyber video"); return; }
    if (!titul.trim()) { toast("Napíš názov videa"); return; }
    if (zaplatene && !platit) { setPlatit(true); return; }
    const dlzka = nove.sekundy > 0 ? `${Math.floor(nove.sekundy / 60)}:${String(nove.sekundy % 60).padStart(2, "0")}` : "video";
    const v: VideoOrg = { id: `v${Date.now()}`, titul: titul.trim(), popis: zbierkaId ? "k zbierke" : "video organizácie", src: nove.ref, dlzka, zbierkaId: zbierkaId || undefined, datum: new Date().toISOString(), naProfile: true };
    // v ZADARMO je na profile 1 video → nové ide navrch, staršie ostávajú v správe
    ulozVidea([v, ...videa.map((x) => (naProfileMax <= 1 ? { ...x, naProfile: false } : x))]);
    toast(zaplatene ? `Video zverejnené · ${VIDEO_ORG_CFG.cenaDalsie} € (demo platba)` : "Video zverejnené na profile");
    setNove(null); setTitul(""); setZbierkaId(""); setPlatit(false);
  };
  const [zmazat, setZmazat] = useState<string | null>(null);
  const zmaz = (v: VideoOrg) => {
    void zmazVideo(v.src);
    const zvysok = videa.filter((x) => x.id !== v.id);
    // nech profil neostane bez videa — navrch ide najnovšie zvyšné
    ulozVidea(zvysok.some((x) => x.naProfile) || !zvysok.length ? zvysok : zvysok.map((x, i) => (i === 0 ? { ...x, naProfile: true } : x)));
    setZmazat(null); toast("Video zmazané");
  };
  const dolu = (id: string) => ulozVidea(videa.map((x) => (x.id === id ? { ...x, naProfile: false } : x)));
  const naProfil = (id: string) => {
    ulozVidea(videa.map((x) => (x.id === id ? { ...x, naProfile: true } : naProfileMax <= 1 ? { ...x, naProfile: false } : x)));
  };

  return (
    <Sheet onClose={onClose} label="Video organizácie">
      <Hlavicka nadpis="Mám talent — video" popis={<>Video do {VIDEO_ORG_CFG.maxSekund} s. Keď ho spojíš so zbierkou, pod videom je rovno platobný modul. V programe {TIER_LABEL.charita[tier]}: {vCene} {vCene === 1 ? "video" : "videá"} mesačne v cene, každé ďalšie {VIDEO_ORG_CFG.cenaDalsie} €{naProfileMax <= 1 ? " · na profile je vidieť 1 video, ostatné ostávajú tu v správe" : ""}.</>} />

      <div style={{ ...karta, borderStyle: "dashed" }}>
        <div style={{ fontSize: 12, color: C.textSec, marginBottom: SPACE.xs }}>Tento mesiac: <b style={{ color: C.text }}>{tentoMesiac} / {vCene}</b> v cene</div>
        {nove ? (
          <div style={{ borderRadius: RADIUS.sm, overflow: "hidden", marginBottom: SPACE.xs }}>
            <MediaNahlad src={nove.ref} popis="nové video" ovladanie style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
          </div>
        ) : (
          <label style={{ ...btnDruhy, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", height: 70, marginBottom: SPACE.xs, color: ZELENA, borderColor: tint(ZELENA, .4), borderStyle: "dashed" }}>
            🎬 Vybrať video (do {VIDEO_ORG_CFG.maxSekund} s)
            <input type="file" accept="video/*" hidden onChange={(e) => { void nahraj(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        <input value={titul} onChange={(e) => setTitul(e.target.value)} placeholder="Názov videa (napr. Pani Anna — prečo zbierame)" style={{ ...input, marginBottom: SPACE.xs }} />
        <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.xxs }}>Spojiť so zbierkou (platobný modul pod videom):</div>
        <div style={{ display: "flex", gap: SPACE.xxs, flexWrap: "wrap", marginBottom: SPACE.sm }}>
          <Cip on={!zbierkaId} onClick={() => setZbierkaId("")}>Bez zbierky</Cip>
          {zbierky.map((z) => <Cip key={z.id} on={zbierkaId === z.id} onClick={() => setZbierkaId(z.id)}>{z.nazov.length > 24 ? z.nazov.slice(0, 23) + "…" : z.nazov}</Cip>)}
        </div>
        <button onClick={zverejni} style={btnHlavny}>
          {platit ? `Zaplatiť ${VIDEO_ORG_CFG.cenaDalsie} € a zverejniť` : zaplatene ? `Zverejniť · ${VIDEO_ORG_CFG.cenaDalsie} €` : "Zverejniť video"}
        </button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.sm}px 0 ${SPACE.xxs}px` }}>VIDEÁ ORGANIZÁCIE ({videa.length})</div>
      {videa.map((v) => {
        const vidno = naProfile.slice(0, naProfileMax).some((x) => x.id === v.id);
        return (
          <div key={v.id} style={{ ...karta, display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <span style={{ width: 64, height: 40, flex: "none", borderRadius: RADIUS.xs, overflow: "hidden", position: "relative", background: "#000" }}>
              {v.src ? <MediaNahlad src={v.src} popis={v.titul} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : <img src={v.nahlad} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>▶</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.titul}</div>
              <div style={{ fontSize: 10.5, color: C.textTer }}>{v.dlzka}{v.zbierkaId ? ` · ${najdiZbierku(v.zbierkaId)?.nazov ?? "zbierka"}` : ""}</div>
            </div>
            <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              {vidno
                ? <span {...pressable(() => dolu(v.id), "Stiahnuť z profilu")} style={{ fontSize: 10.5, fontWeight: 800, color: ZELENA, background: tint(ZELENA, .12), borderRadius: RADIUS.xs, padding: `2px ${SPACE.xs}px`, cursor: "pointer" }}>Na profile ✕</span>
                : <span {...pressable(() => naProfil(v.id), "Dať na profil")} style={{ fontSize: 11, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>Dať na profil</span>}
              {zmazat === v.id
                ? <span style={{ display: "flex", gap: SPACE.xs }}>
                    <span {...pressable(() => zmaz(v), "Naozaj zmazať")} style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-danger)", cursor: "pointer" }}>Naozaj zmazať</span>
                    <span {...pressable(() => setZmazat(null), "Späť")} style={{ fontSize: 10.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Späť</span>
                  </span>
                : <span {...pressable(() => setZmazat(v.id), "Zmazať video")} style={{ fontSize: 10.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Zmazať</span>}
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}

// ===================== PREHĽAD DARCOV =====================
export function DarcoviaSheet({ tier, toast, onClose }: { tier: Tier; toast: (m: string) => void; onClose: () => void }) {
  useZmenyDarov();
  const ja = usePouzivatel();
  const zbierky = zbierkyNastroje(tier);
  // z.vyzbierane / z.darcovia = história pred ukážkou (bez mien) + dary cez DEED
  const riadky = zbierky.map((z) => ({ z, dary: darcoviaPre(z.id) }));
  const sumaZbierky = (r: typeof riadky[number]) => r.z.vyzbierane + r.dary.reduce((b, d) => b + d.suma, 0);
  const spolu = riadky.reduce((a, r) => a + sumaZbierky(r), 0);
  const pocetDarov = riadky.reduce((a, r) => a + r.z.darcovia + r.dary.length, 0);
  const [otvorena, setOtvorena] = useState<string | null>(null);
  const [komu, setKomu] = useState<string>("vsetci");
  const [text, setText] = useState("");

  const podakuj = () => {
    if (text.trim().length < 10) { toast("Napíš aspoň krátku vetu poďakovania"); return; }
    const ciele = riadky.filter((r) => (r.dary.length || r.z.darcovia) && (komu === "vsetci" || r.z.id === komu));
    if (!ciele.length) { toast("Zatiaľ tu nie sú darcovia, ktorým by prišlo poďakovanie"); return; }
    ciele.forEach((r) => pridajOznamDarcom({ zbierkaId: r.z.id, typ: "sprava", text: text.trim() }));
    setText(""); toast(`Poďakovanie odoslané darcom (${ciele.reduce((a, r) => a + r.dary.length + r.z.darcovia, 0)} darov) 🔔`);
  };

  return (
    <Sheet onClose={onClose} label="Prehľad darcov">
      <Hlavicka nadpis="Prehľad darcov a vyzbieraných súm" popis="Kto a koľko daroval na tvoje zbierky. Mená sa zobrazujú tak, ako si to darca zvolil — anonym ostáva anonym." />
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {[[eur(spolu), "vyzbierané"], [String(pocetDarov), "darov"], [String(zbierky.length), "zbierok"]].map(([h, l]) => (
          <div key={l} style={{ ...karta, flex: 1, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: l === "vyzbierané" ? ZELENA : C.text }}>{h}</div>
            <div style={{ fontSize: 10.5, color: C.textTer }}>{l}</div>
          </div>
        ))}
      </div>

      {riadky.map((r) => {
        const { z, dary } = r;
        const suma = sumaZbierky(r);
        const n = z.darcovia + dary.length;
        const open = otvorena === z.id;
        return (
          <div key={z.id} style={karta}>
            <div {...pressable(() => setOtvorena(open ? null : z.id), z.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer" }}>
              <span style={{ fontSize: 17 }}>{z.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.nazov}</div>
                <div style={{ fontSize: 10.5, color: C.textTer }}>{n} {n === 1 ? "dar" : n < 5 && n > 0 ? "dary" : "darov"}{z.stav === "ukoncena" ? " · ukončená" : ""}</div>
              </div>
              <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: ZELENA }}>{eur(suma)}</span>
              <span style={{ color: C.textTer, transform: open ? "rotate(90deg)" : "none" }}>›</span>
            </div>
            {open && (
              <div style={{ marginTop: SPACE.xs }}>
                {z.darcovia > 0 && <div style={{ fontSize: 11.5, color: C.textTer, padding: `${SPACE.xxs}px 0` }}>{z.darcovia} starších darov ({eur(z.vyzbierane)}) — pred spustením v DEED, bez mien</div>}
                {dary.length === 0 ? (z.darcovia ? null : <div style={{ fontSize: 12, color: C.textTer, padding: `${SPACE.xs}px 0` }}>Zatiaľ bez darov.</div>)
                  : dary.map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "baseline", gap: SPACE.xs, fontSize: 12.5, padding: `${SPACE.xxs}px 0`, borderTop: `1px solid ${C.line2}` }}>
                      <b style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{identitaDarcu(d, ja)}</b>
                      <span style={{ fontWeight: 800, color: ZELENA }}>{eur(d.suma)}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.textTer, flex: "none" }}>{d.kanal === "deed" ? "DEED" : d.kanal === "sepa" ? "SEPA" : "karta"} · {relCas(d.cas)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ ...karta, marginTop: SPACE.sm }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: SPACE.xxs }}>Hromadné poďakovanie</div>
        <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.xs }}>Príde darcom do Oznámení.</div>
        <div style={{ display: "flex", gap: SPACE.xxs, flexWrap: "wrap", marginBottom: SPACE.xs }}>
          <Cip on={komu === "vsetci"} onClick={() => setKomu("vsetci")}>Všetkým darcom</Cip>
          {zbierky.map((z) => <Cip key={z.id} on={komu === z.id} onClick={() => setKomu(z.id)}>{z.nazov.length > 22 ? z.nazov.slice(0, 21) + "…" : z.nazov}</Cip>)}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Ďakujeme, že ste s nami. Vďaka vám…" style={{ ...input, resize: "vertical", marginBottom: SPACE.xs }} />
        <button onClick={podakuj} style={btnHlavny}>Poslať poďakovanie</button>
      </div>
    </Sheet>
  );
}

// ===================== QR NÁSTROJE =====================
export function QrNastrojeSheet({ tier, toast, onClose }: { tier: Tier; toast: (m: string) => void; onClose: () => void }) {
  const [variant, setVariant] = useState<DeedQrVariant>("svetly");
  const [otvor, setOtvor] = useState<null | { titul: string; odkaz: string; odznak: DeedOdznak }>(null);
  const s = SUBJEKTY.charita;
  const polozky: { id: string; titul: string; popis: string; odkaz: string; odznak: DeedOdznak }[] = [
    { id: "profil", titul: s.nazov, popis: "QR overenej organizácie — vedie na profil", odkaz: qrUrl("handle", s.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-")), odznak: "D+" },
    ...zbierkyNastroje(tier).filter((z) => z.stav === "aktivna").map((z) => ({
      id: z.id, titul: z.nazov, popis: "QR zbierky — sken otvorí zbierku a dar", odkaz: qrUrl("case", z.id), odznak: odznakZbierky(z.id),
    })),
  ];
  const stiahni = async (p: typeof polozky[number]) => {
    try { await stiahniDeedQr({ data: p.odkaz, odznak: p.odznak, variant, nazov: `QR ${p.titul}` }); toast("QR stiahnuté (PNG na tlač)"); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <Sheet onClose={onClose} label="QR nástroje">
      <Hlavicka nadpis="QR nástroje" popis="QR na plagát, pokladničku alebo leták. Na tlač stačí aspoň 3 × 3 cm." />
      <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.xxs }}>Vzhľad pri stiahnutí:</div>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        <Cip on={variant === "svetly"} onClick={() => setVariant("svetly")}>Svetlý (originál)</Cip>
        <Cip on={variant === "inverzny"} onClick={() => setVariant("inverzny")}>Tmavý</Cip>
      </div>
      {polozky.map((p) => (
        <div key={p.id} style={{ ...karta, display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span style={{ flex: "none", borderRadius: RADIUS.xs, overflow: "hidden" }}><DeedQr data={p.odkaz} odznak={p.odznak} variant={variant} size={64} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.titul}</div>
            <div style={{ fontSize: 10.5, color: C.textTer }}>{p.popis}</div>
            <div style={{ display: "flex", gap: SPACE.sm, marginTop: 4 }}>
              <span {...pressable(() => setOtvor({ titul: p.titul, odkaz: p.odkaz, odznak: p.odznak }), "Zobraziť QR")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>Zobraziť</span>
              <span {...pressable(() => void stiahni(p), "Stiahnuť PNG")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>⬇ Stiahnuť PNG</span>
            </div>
          </div>
        </div>
      ))}
      {otvor && <QrModal odznak={otvor.odznak} typ="skutok" titul={`QR — ${otvor.titul}`} odkaz={otvor.odkaz} onClose={() => setOtvor(null)} toast={toast} />}
    </Sheet>
  );
}

// ===================== VIDITEĽNOSŤ SÚM =====================
export function ViditelnostSheet({ toast, onClose }: { toast: (m: string) => void; onClose: () => void }) {
  const [v, setV] = useState<Viditelnost>(() => nacitajViditelnost("charita"));
  const zmen = (patch: Partial<Viditelnost>) => { const n = { ...v, ...patch }; setV(n); ulozViditelnost("charita", n); toast("Uložené — platí na verejnom profile"); };
  const riadok = (nazov: string, popis: string, on: boolean, onChange: (x: boolean) => void) => (
    <div style={{ ...karta, display: "flex", alignItems: "center", gap: SPACE.sm }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{nazov}</div>
        <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.4 }}>{popis}</div>
      </div>
      <Switch on={on} onChange={onChange} ariaLabel={nazov} />
    </div>
  );
  return (
    <Sheet onClose={onClose} label="Viditeľnosť súm">
      <Hlavicka nadpis="Viditeľnosť súm" popis="Čo vidia návštevníci tvojho profilu." />
      {riadok("Celková vyzbieraná suma", "Číslo „Vyzbierané“ v hlavičke profilu. Keď ho vypneš, ukáže sa počet zbierok.", v.hlavicka, (x) => zmen({ hlavicka: x }))}
      {riadok("Sumy darov v zozname darcov", "Pri mene darcu suma daru — len ak ju darca sám povolil. Vypnuté = len „daroval“.", v.sumyDarov, (x) => zmen({ sumyDarov: x }))}
      <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.5, background: tint(ZELENA, .08), border: `1px solid ${tint(ZELENA, .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.xs }}>
        Stav každej zbierky (koľko z cieľa je vyzbierané) je vždy verejný — na tom stojí dôvera darcov.
      </div>
    </Sheet>
  );
}

// ===================== SEGMENTY PRE DARCOV =====================
export function SegmentySheet({ tier, toast, onPaywall, onClose }: {
  tier: Tier; toast: (m: string) => void;
  onPaywall: (p: { tierMin: Tier; nazov: string; dovod?: string }) => void; onClose: () => void;
}) {
  const segmenty = useSegmenty();
  const [novy, setNovy] = useState("");
  const [qr, setQr] = useState<null | { titul: string; odkaz: string; odznak: DeedOdznak }>(null);
  const [extra, setExtra] = useState<OrgZbierka[]>(nacitajOrgExtra);
  const aktivne = segmenty.filter((x) => x.aktivny);
  const rozsirenie = tier >= SEKTOR_ROZSIRENIE_OD_TIERU;
  const limit = KONFIG.limitZbierok[tier];
  const aktivnychZbierok = useMemo(
    () => zbierkyNastroje(tier).filter((z) => z.stav === "aktivna").length + extra.filter((z) => z.stav === "aktivna").length,
    [extra, tier],
  );

  const zmen = (id: string, patch: Partial<SegmentOrg>) => ulozSegmenty(segmenty.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const pridaj = () => {
    const n = novy.trim();
    if (n.length < 3) { toast("Napíš názov sektora"); return; }
    if (segmenty.some((x) => x.nazov.toLowerCase() === n.toLowerCase())) { toast("Taký sektor už máš"); return; }
    ulozSegmenty([...segmenty, { id: `s${Date.now()}`, nazov: n, popis: "", aktivny: true }]);
    setNovy(""); toast("Sektor činnosti pridaný");
  };
  const zmaz = (s2: SegmentOrg) => { ulozSegmenty(segmenty.filter((x) => x.id !== s2.id)); toast("Sektor činnosti odstránený"); };

  // ---- AKCIA (T2): vlastný QR · vlastná zbierka · vlastný účet ----
  const odkazSektora = (sg: SegmentOrg) =>
    sg.zbierkaId ? qrUrl("case", sg.zbierkaId)
      : qrResolveUrl(`${SUBJEKTY.charita.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${sg.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  const odznakSektora = (sg: SegmentOrg): DeedOdznak => odznakZbierky(sg.zbierkaId);
  const stiahni = async (sg: SegmentOrg) => {
    try { await stiahniDeedQr({ data: odkazSektora(sg), odznak: odznakSektora(sg), variant: "svetly", nazov: `QR ${sg.nazov}` }); toast("QR sektora stiahnuté (PNG na tlač)"); }
    catch (e) { toast((e as Error).message); }
  };
  const vytvorZbierku = (sg: SegmentOrg) => {
    if (aktivnychZbierok >= limit) {
      if (tier < 4) onPaywall({ tierMin: (tier + 1) as Tier, nazov: "Ďalšia súbežná zbierka", dovod: `Na úrovni ${TIER_LABEL.charita[tier]} máš limit ${limit} súbežných zbierok (${aktivnychZbierok} aktívnych).` });
      else toast(`Dosiahnutý limit súbežných zbierok: ${limit}`);
      return;
    }
    const n: OrgZbierka = { id: `org-sekt-${sg.id}`, nazov: sg.nazov, emoji: "🎯", ciel: 1000, vyzbierane: 0, stav: "aktivna", darcovia: 0 };
    const nove = [...extra.filter((z) => z.id !== n.id), n];
    setExtra(nove); ulozOrgExtra(nove);
    zmen(sg.id, { zbierkaId: n.id });
    toast("Zbierka sektora vytvorená — spravuješ ju v Zbierkach organizácie");
  };
  const ulozIban = (sg: SegmentOrg, el: HTMLInputElement) => {
    const x = el.value.trim();
    if (!x) { if (sg.iban) { zmen(sg.id, { iban: undefined }); toast("Účet zmazaný — dary idú na hlavný účet"); } return; }
    const ok = overIban(x);
    if (!ok) { toast("Neplatný IBAN — skontroluj číslo"); return; }
    el.value = formatujIban(ok);
    if (ok !== sg.iban) { zmen(sg.id, { iban: ok }); toast("Účet sektora uložený"); }
  };

  return (
    <Sheet onClose={onClose} label="Sektory činnosti">
      <Hlavicka nadpis="Sektory činnosti" popis="Oblasti vašej práce, ktoré si darca vyberie pri pravidelnej podpore, keď nechce podporiť jednu zbierku. Základ je z registrácie." />

      {!rozsirenie && (
        <div style={{ ...karta, borderStyle: "dashed", background: tint(ZELENA, .06), borderColor: tint(ZELENA, .3) }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 2 }}>🔒 Vlastný QR, zbierka a účet pre každý sektor</div>
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.45, marginBottom: SPACE.xs }}>
            Od programu {TIER_LABEL.charita[SEKTOR_ROZSIRENIE_OD_TIERU as Tier]} dostane každý sektor vlastný QR kód na plagát, vlastnú zbierku a vlastný účet (IBAN), na ktorý idú jeho dary.
          </div>
          <button onClick={() => onPaywall({ tierMin: SEKTOR_ROZSIRENIE_OD_TIERU as Tier, nazov: "Sektor: vlastný QR, zbierka a účet", dovod: "Každý sektor činnosti dostane svoj QR kód, samostatnú zbierku a vlastný účet." })} style={btnHlavny}>
            Odomknúť v {TIER_LABEL.charita[SEKTOR_ROZSIRENIE_OD_TIERU as Tier]}
          </button>
        </div>
      )}

      {segmenty.map((sg) => (
        <div key={sg.id} style={karta}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: sg.aktivny ? C.text : C.textTer }}>{sg.nazov}</div>
              <div style={{ fontSize: 10.5, color: C.textTer }}>{sg.zRegistracie ? "z registrácie" : "vlastný"} · pravidelná podpora: zatiaľ žiadna</div>
            </div>
            <Switch on={sg.aktivny} onChange={(v) => zmen(sg.id, { aktivny: v })} ariaLabel={`Ponúkať darcom — ${sg.nazov}`} />
          </div>
          <input defaultValue={sg.popis} onBlur={(e) => zmen(sg.id, { popis: e.target.value })} maxLength={90}
            placeholder="Jedna veta pre darcu (napr. Potraviny a lieky pre rodiny v núdzi)" style={{ ...input, marginTop: SPACE.xs }} />

          {rozsirenie && (
            <div style={{ marginTop: SPACE.xs, paddingTop: SPACE.xs, borderTop: `1px solid ${C.line2}` }}>
              {/* QR sektora */}
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
                <span style={{ flex: "none", borderRadius: RADIUS.xs, overflow: "hidden" }}><DeedQr data={odkazSektora(sg)} odznak={odznakSektora(sg)} size={56} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>QR sektora</div>
                  <div style={{ fontSize: 10.5, color: C.textTer }}>{sg.zbierkaId ? "Sken otvorí zbierku sektora a dar" : "Sken otvorí tento sektor na vašom profile"}</div>
                  <div style={{ display: "flex", gap: SPACE.sm, marginTop: 4 }}>
                    <span {...pressable(() => setQr({ titul: sg.nazov, odkaz: odkazSektora(sg), odznak: odznakSektora(sg) }), "Zobraziť QR")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>Zobraziť</span>
                    <span {...pressable(() => void stiahni(sg), "Stiahnuť PNG")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>⬇ Stiahnuť PNG</span>
                  </div>
                </div>
              </div>

              {/* samostatná zbierka sektora */}
              <div style={{ marginTop: SPACE.xs }}>
                {sg.zbierkaId ? (
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: ZELENA, background: tint(ZELENA, .1), border: `1px solid ${tint(ZELENA, .3)}`, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>
                    ✓ Samostatná zbierka sektora — spravuješ ju v Zbierkach organizácie
                  </div>
                ) : (
                  <button onClick={() => vytvorZbierku(sg)} style={btnDruhy}>Vytvoriť zbierku pre sektor</button>
                )}
              </div>

              {/* účet zbierky sektora */}
              <div style={{ marginTop: SPACE.xs }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSec, marginBottom: 2 }}>Účet zbierky (IBAN)</div>
                <input defaultValue={sg.iban ? formatujIban(sg.iban) : ""} onBlur={(e) => ulozIban(sg, e.target)}
                  placeholder="SK00 0000 0000 0000 0000 0000" autoComplete="off" spellCheck={false} style={input} />
                <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 2, lineHeight: 1.4 }}>
                  Dary z tohto sektora idú na tento účet. Prázdne = hlavný účet organizácie.
                </div>
              </div>
            </div>
          )}

          {!sg.zRegistracie && (
            <span {...pressable(() => zmaz(sg), `Odstrániť ${sg.nazov}`)} style={{ display: "inline-block", marginTop: SPACE.xxs, fontSize: 11, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Odstrániť</span>
          )}
        </div>
      ))}

      <div style={{ ...karta, borderStyle: "dashed" }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: SPACE.xxs }}>Pridať vlastný sektor</div>
        <div style={{ display: "flex", gap: SPACE.xs }}>
          <input value={novy} onChange={(e) => setNovy(e.target.value)} placeholder="Napr. Seniori · rozvoz obedov" style={{ ...input, flex: 1 }} />
          <button onClick={pridaj} style={{ ...btnHlavny, width: 110, height: 42 }}>Pridať</button>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.sm}px 0 ${SPACE.xxs}px` }}>ČO VIDÍ DARCA</div>
      <div style={{ ...karta, background: tint(ZELENA, .07), border: `1px solid ${tint(ZELENA, .3)}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: SPACE.xs }}>Pravidelná podpora — čo chceš podporovať</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.pill, background: C.surface, border: `1px solid ${C.line}`, color: C.textSec }}>Túto zbierku</span>
          {aktivne.map((sg) => (
            <span key={sg.id} style={{ fontSize: 11.5, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.pill, background: tint(ZELENA, .12), border: `1px solid ${tint(ZELENA, .4)}`, color: ZELENA }}>{sg.nazov}</span>
          ))}
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.pill, background: C.surface, border: `1px solid ${C.line}`, color: C.textSec }}>Celú organizáciu</span>
        </div>
        {!aktivne.length && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.xs }}>Žiadny zapnutý sektor — darca si bude vyberať len zbierku alebo celú organizáciu.</div>}
      </div>

      {qr && <QrModal odznak={qr.odznak} typ="skutok" titul={`QR — ${qr.titul}`} odkaz={qr.odkaz} onClose={() => setQr(null)} toast={toast} />}
    </Sheet>
  );
}
