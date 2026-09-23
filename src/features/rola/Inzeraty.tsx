// ============================================================
// PRACOVNÉ PONUKY SUBJEKTU (správa) — „hľadáme človeka". Beží na tom istom engine
// ako oznamy (kategória „inzerat"), ale navyše: limit podľa programu,
// záujemcovia a jedno tlačidlo „Obsadené".
// Pravidlo ako pri oznamoch: musí to zvládnuť človek, čo v živote nič
// nepublikoval — dve otázky, náhľad, hotovo.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { spracujFotku } from "@/lib/obrazok";
import { FotkaObsahu, Miniatura, PrehliadacFotiek } from "@/components/fotka";
import { EditorTextu, cistyText, naBezpecneHtml } from "@/components/textformat";
import {
  OZNAM_CFG, INZERAT_CFG, useOznamy, pridajOznam, upravOznam, zmazOznam, obsadInzerat,
  otvorInzeratZnova, beziaceInzeraty, limitInzeratov, dniDoKonca, type Oznam,
} from "@/lib/oznamy";
import type { Tier } from "./stav";

const ZELENA = "var(--a-green)";
const karta: CSSProperties = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs };
const vstup: CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
const btnHlavny: CSSProperties = { width: "100%", height: 48, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 44, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, background: "transparent", color: C.textSec };
const odkaz: CSSProperties = { fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" };

/** karta pracovnej ponuky tak, ako ju uvidia ľudia — rovnaká v náhľade aj na profile */
export function InzeratKarta({ o, autor, logo, deti }: { o: Oznam; autor: string; logo?: string; deti?: React.ReactNode }) {
  const [fotka, setFotka] = useState<number | null>(null);
  const fotky = o.fotky ?? [];
  const bezTextu = cistyText(o.text).length === 0;
  return (<>
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, overflow: "hidden" }}>
      {fotky[0] && (
        <span {...pressable(() => setFotka(0), "Otvoriť fotku")} style={{ display: "block", cursor: "pointer" }}>
          {/* v ozname/ponuke sa fotka nikdy neoreže — býva to plagát a text v ňom musí byť vidieť */}
          <FotkaObsahu src={fotky[0]} maxVyska={380} cela />
        </span>
      )}
      <div style={{ padding: SPACE.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: SPACE.xxs }}>
          {logo && <img src={logo} alt="" style={{ width: 22, height: 22, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />}
          <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{autor}</span>
          <span style={{ flex: "none", fontSize: 10, fontWeight: 800, color: "var(--a-info)", background: tint("var(--a-info)", .12), borderRadius: RADIUS.pill, padding: `1px ${SPACE.xs}px` }}>HĽADÁME</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{o.nadpis}</div>
        {!bezTextu && (
          <div className="deed-text" style={{ fontSize: 13.5, color: C.textSec, lineHeight: 1.5, marginTop: 4 }}
            dangerouslySetInnerHTML={{ __html: naBezpecneHtml(o.text) }} />
        )}
        {fotky.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, marginTop: SPACE.xs, overflowX: "auto" }}>
            {fotky.slice(1).map((f, i) => <Miniatura key={i} src={f} onClick={() => setFotka(i + 1)} />)}
            <span style={{ flex: "none", fontSize: 11, color: C.textTer, paddingLeft: 2 }}>{fotky.length} fotky — klikni</span>
          </div>
        )}
        {deti}
      </div>
    </div>
    {fotka !== null && <PrehliadacFotiek fotky={fotky} start={fotka} onClose={() => setFotka(null)} />}
  </>);
}

// ---------- formulár ----------
function Formular({ entita, autor, logo, uprava, toast, onHotovo, onSpat }: {
  entita: string; autor: string; logo?: string; uprava?: Oznam;
  toast: (m: string) => void; onHotovo: () => void; onSpat: () => void;
}) {
  const [nadpis, setNadpis] = useState(uprava?.nadpis ?? "");
  const [text, setText] = useState(uprava?.text ?? "");
  const [fotky, setFotky] = useState<string[]>(uprava?.fotky ?? []);
  const [dni, setDni] = useState(uprava?.platnostDni ?? INZERAT_CFG.platnostDni);
  const [nahlad, setNahlad] = useState(false);
  const [teraz] = useState(() => Date.now());

  const pridajFotky = async (files: FileList | null) => {
    if (!files?.length) return;
    const volne = OZNAM_CFG.maxFotiek - fotky.length;
    if (volne <= 0) { toast(`Viac než ${OZNAM_CFG.maxFotiek} fotky nejdú`); return; }
    const nove: string[] = [];
    for (const f of Array.from(files).slice(0, volne)) {
      try { nove.push(await spracujFotku(f, { pomer: null, maxSirka: 1400 })); }
      catch (e) { toast((e as Error).message); }
    }
    if (nove.length) setFotky([...fotky, ...nove]);
  };

  const dlzka = cistyText(text).length;
  const chyba = nadpis.trim().length < 3 ? "Napíšte, koho hľadáte — stačí pár slov."
    : dlzka < 10 && fotky.length === 0 ? "Napíšte aspoň vetu — čo treba robiť, kedy a kde. Alebo nahrajte hotový plagát ako fotku."
    : dlzka > OZNAM_CFG.maxText ? `Text je dlhší, než sa do ponuky zmestí — skráťte ho o ${dlzka - OZNAM_CFG.maxText} znakov.`
    : null;

  const zverejni = () => {
    if (chyba) { toast(chyba); return; }
    if (uprava) {
      upravOznam(entita, uprava.id, { nadpis: nadpis.trim(), text, fotky, platnostDni: dni });
      toast("Ponuka upravená");
    } else {
      pridajOznam({ entita, kategoria: "inzerat", nadpis: nadpis.trim(), text, fotky, platnostDni: dni });
      toast("Ponuka je na vašom profile");
    }
    onHotovo();
  };

  const ukazka: Oznam = { id: "nahlad", entita, kategoria: "inzerat", nadpis: nadpis.trim() || "Bez nadpisu", text, fotky, platnostDni: dni, vytvorene: teraz };

  return (
    <Sheet onClose={onSpat} label={uprava ? "Upraviť ponuku" : "Nová pracovná ponuka"} pisanie>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{uprava ? "Upraviť ponuku" : "Nová pracovná ponuka"}</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm }}>
        Uvidia ju ľudia na vašom profile. Kto má záujem, klikne — a vy uvidíte jeho meno a kontakt.
      </div>

      {nahlad ? (<>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, textAlign: "center", border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.xxs, marginBottom: SPACE.xs }}>
          TAKTO TO UVIDIA ĽUDIA
        </div>
        <InzeratKarta o={ukazka} autor={autor} logo={logo} />
        <button onClick={zverejni} style={{ ...btnHlavny, marginTop: SPACE.sm }}>{uprava ? "Uložiť zmeny" : "Zverejniť"}</button>
        <button onClick={() => setNahlad(false)} style={{ ...btnDruhy, marginTop: SPACE.xs }}>Ešte upraviť</button>
      </>) : (<>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Koho hľadáte?</div>
        <input value={nadpis} onChange={(e) => setNadpis(e.target.value)} maxLength={OZNAM_CFG.maxNadpis}
          placeholder="Napríklad: Brigádnik na triedenie šatstva" style={{ ...vstup, fontWeight: 700 }} />

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 4px` }}>Čo treba robiť, kedy a kde? <span style={{ fontWeight: 400, color: C.textTer }}>— netreba, ak dáte hotový plagát</span></div>
        <EditorTextu hodnota={text} onZmena={setText} placeholder="Píšte, ako by ste to povedali susedovi. Kedy, kde, na ako dlho, či treba niečo vedieť." />
        <div style={{ fontSize: 10.5, color: C.textTer, textAlign: "right", marginTop: 2 }}>{dlzka} / {OZNAM_CFG.maxText}</div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.xs}px 0 4px` }}>Fotka alebo hotový plagát <span style={{ fontWeight: 400, color: C.textTer }}>— plagát sa ukáže celý, nič sa z neho neoreže</span></div>
        <div style={{ display: "flex", gap: SPACE.xxs, flexWrap: "wrap", alignItems: "center" }}>
          {fotky.map((f, i) => (
            <span key={i} style={{ position: "relative", display: "block" }}>
              <Miniatura src={f} />
              <button type="button" onClick={() => setFotky(fotky.filter((_, x) => x !== i))} aria-label={`Odstrániť fotku ${i + 1}`}
                style={{ position: "absolute", right: 2, top: 2, width: 18, height: 18, lineHeight: "16px", borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 12, padding: 0 }}>×</button>
            </span>
          ))}
          {fotky.length < OZNAM_CFG.maxFotiek && (
            <label style={{ width: 92, height: 58, borderRadius: RADIUS.xs, border: `1px dashed ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: C.textSec }}>
              + Fotka
              <input type="file" accept="image/*" multiple hidden onChange={(e) => void pridajFotky(e.target.files)} />
            </label>
          )}
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 4px` }}>Ako dlho má visieť na profile?</div>
        <div style={{ display: "flex", gap: SPACE.xs }}>
          {INZERAT_CFG.platnosti.map((d) => (
            <span key={d} {...pressable(() => setDni(d), `${d} dní`)}
              style={{ flex: 1, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: dni === d ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, background: dni === d ? tint(ZELENA, .12) : C.surface, border: `1px solid ${dni === d ? tint(ZELENA, .45) : C.line}`, color: dni === d ? ZELENA : C.textSec }}>
              {d} dní
            </span>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 4 }}>Keď miesto obsadíte, ponuku zavriete jedným klikom — ostatným sa poďakujeme.</div>

        <button onClick={() => (chyba ? toast(chyba) : setNahlad(true))} style={{ ...btnHlavny, marginTop: SPACE.md }}>Ukázať, ako to bude vyzerať</button>
        <button onClick={onSpat} style={{ ...btnDruhy, marginTop: SPACE.xs }}>Zrušiť</button>
      </>)}
    </Sheet>
  );
}

// ---------- záujemcovia jednej ponuky ----------
function Zaujemcovia({ inzerat, onSpat }: { inzerat: Oznam; onSpat: () => void }) {
  const ludia = inzerat.zaujemcovia ?? [];
  return (
    <Sheet onClose={onSpat} label="Záujemcovia">
      <div style={{ fontSize: 16, fontWeight: 800 }}>Záujemcovia</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm }}>{inzerat.nadpis}</div>
      {ludia.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ sa nikto neozval.<br />Ponuku vidia ľudia na vašom profile a tí, čo vás sledujú.
        </div>
      ) : ludia.map((z) => (
        <div key={z.id} style={karta}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>{z.meno}</div>
            {z.stit && <span style={{ flex: "none", fontSize: 10, fontWeight: 800, color: "var(--a-gold)", background: tint("var(--a-gold)", .14), borderRadius: RADIUS.pill, padding: `1px ${SPACE.xs}px` }}>🛡 {z.stit}</span>}
            {typeof z.karma === "number" && <span style={{ flex: "none", fontSize: 10.5, color: C.textTer }}>karma {z.karma}</span>}
          </div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
            {[z.telefon, z.email].filter(Boolean).join(" · ") || "kontakt neuviedol"}
          </div>
          {z.poznamka && <div style={{ fontSize: 12, color: C.textSec, marginTop: 4, lineHeight: 1.45 }}>{z.poznamka}</div>}
          <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 4 }}>ozval sa {new Date(z.kedy).toLocaleDateString("sk-SK")}</div>
        </div>
      ))}
      <button onClick={onSpat} style={{ ...btnDruhy, marginTop: SPACE.md }}>Späť</button>
    </Sheet>
  );
}

// ---------- zoznam v správe ----------
export function InzeratySheet({ entita, autor, logo, tier, toast, onPaywall, onClose }: {
  entita: string; autor: string; logo?: string; tier: Tier;
  toast: (m: string) => void; onPaywall: (p: { tierMin: Tier; nazov: string; dovod?: string }) => void; onClose: () => void;
}) {
  const inzeraty = useOznamy(entita, "inzerat");
  const [pisem, setPisem] = useState(false);
  const [uprava, setUprava] = useState<Oznam | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [teraz] = useState(() => Date.now());

  if (pisem || uprava) return (
    <Formular entita={entita} autor={autor} logo={logo} uprava={uprava ?? undefined} toast={toast}
      onHotovo={() => { setPisem(false); setUprava(null); }}
      onSpat={() => { setPisem(false); setUprava(null); }} />
  );
  const otvoreny = detail ? inzeraty.find((o) => o.id === detail) : null;
  if (otvoreny) return <Zaujemcovia inzerat={otvoreny} onSpat={() => setDetail(null)} />;

  const limit = limitInzeratov(tier);
  const bezi = beziaceInzeraty(entita, teraz);
  const zavrete = inzeraty.filter((o) => !bezi.some((b) => b.id === o.id));

  const novy = () => {
    if (limit <= 0) {
      onPaywall({ tierMin: 1 as Tier, nazov: "Pracovné ponuky", dovod: "Hľadanie brigádnika, zamestnanca alebo dobrovoľníka priamo na profile." });
      return;
    }
    if (bezi.length >= limit) {
      onPaywall({ tierMin: Math.min(tier + 1, 3) as Tier, nazov: "Ďalšia súbežná ponuka", dovod: `Vo vašom programe ${limit === 1 ? "môže" : "môžu"} bežať ${limit === 1 ? "naraz jedna ponuka" : `naraz ${limit} ponuky`}. Zavrite niektorú, alebo si pridajte kapacitu.` });
      return;
    }
    setPisem(true);
  };

  const riadok = (o: Oznam, beziaci: boolean) => {
    const pocet = (o.zaujemcovia ?? []).length;
    return (
      <div key={o.id} style={karta}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.sm }}>
          {o.fotky?.[0] && <Miniatura src={o.fotky[0]} sirka={54} vyska={40} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.nadpis}</div>
            <div style={{ fontSize: 10.5, color: beziaci ? ZELENA : C.textTer, marginTop: 2 }}>
              {beziaci ? `na profile ešte ${dniDoKonca(o, teraz)} dní` : o.obsadene ? "obsadené — na profile nie je" : "skončil — na profile nie je"}
              {pocet > 0 && ` · ${pocet} ${pocet === 1 ? "záujemca" : pocet < 5 ? "záujemcovia" : "záujemcov"}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs, flexWrap: "wrap" }}>
          <span {...pressable(() => setDetail(o.id), "Záujemcovia")} style={odkaz}>Záujemcovia ({pocet})</span>
          <span {...pressable(() => setUprava(o), "Upraviť")} style={odkaz}>Upraviť</span>
          {beziaci
            ? <span {...pressable(() => { obsadInzerat(entita, o.id); toast("Ponuka je zavretá — záujemcom sa poďakujeme"); }, "Obsadené")} style={odkaz}>✓ Obsadené — zavrieť</span>
            : <span {...pressable(() => {
                if (bezi.length >= limit) { toast(`Naraz ${limit === 1 ? "môže" : "môžu"} bežať ${limit} ${limit === 1 ? "ponuka" : limit < 5 ? "ponuky" : "ponúk"} — najprv niektorú zavrite`); return; }
                otvorInzeratZnova(entita, o.id, o.platnostDni);
                toast("Ponuka je zase na profile");
              }, "Pustiť znova")} style={odkaz}>Pustiť znova</span>}
          <span {...pressable(() => { zmazOznam(entita, o.id); toast("Ponuka zmazaná"); }, "Zmazať")} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Zmazať</span>
        </div>
      </div>
    );
  };

  return (
    <Sheet onClose={onClose} label="Pracovné ponuky">
      <div style={{ fontSize: 16, fontWeight: 800 }}>📌 Pracovné ponuky</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Hľadáte brigádnika, zamestnanca alebo pomoc? Dajte to na profil. Kto má záujem, klikne — a vy uvidíte jeho meno a kontakt. Žiadne dopisovanie.
      </div>

      <div style={{ fontSize: 11.5, color: C.textSec, marginBottom: SPACE.xs }}>
        {limit >= 9999
          ? <>Naraz môže bežať <b style={{ color: C.text }}>neobmedzene</b> ponúk</>
          : <>Naraz {limit === 1 ? "môže" : "môžu"} bežať <b style={{ color: C.text }}>{limit}</b>{limit === 1 ? " ponuka" : limit < 5 ? " ponuky" : " ponúk"}</>}
        {" · "}teraz {bezi.length === 1 ? "beží" : "bežia"} <b style={{ color: C.text }}>{bezi.length}</b>
      </div>

      <button onClick={novy} style={btnHlavny}>Nová pracovná ponuka</button>

      {bezi.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>NA PROFILE</div>
        {bezi.map((o) => riadok(o, true))}
      </>)}

      {zavrete.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>ZAVRETÉ</div>
        {zavrete.map((o) => riadok(o, false))}
      </>)}

      {!inzeraty.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ ste nedali žiadnu pracovnú ponuku.<br />Skúste napríklad: „Hľadáme brigádnika do skladu na sobotu."
        </div>
      )}
      <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.45 }}>
        Kontakty záujemcov sa {INZERAT_CFG.dniDoZmazaniaKontaktov} dní po zavretí ponuky zmažú.
      </div>
    </Sheet>
  );
}
