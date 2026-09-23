// ============================================================
// OZNAMY SUBJEKTU (správa) — napísať oznam, vidieť ho tak, ako ho uvidia
// ľudia, a spravovať staré. Pravidlo: musí to zvládnuť človek, ktorý v
// živote nič nepublikoval — jedno tlačidlo, tri polia, žiadny žargón.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { spracujFotku } from "@/lib/obrazok";
import { FotkaObsahu, Miniatura, PrehliadacFotiek } from "@/components/fotka";
import { RichTextInput } from "@/components/richtext";
import { FormatovanyText } from "@/components/formattext";
import { cistyText } from "@/lib/richtext";
import {
  OZNAM_CFG, useOznamy, pridajOznam, upravOznam, zmazOznam, pripniOznam,
  oznamAktivny, dniDoKonca, type Oznam,
} from "@/lib/oznamy";

const ZELENA = "var(--a-green)";
const karta: CSSProperties = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs };
const vstup: CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
const btnHlavny: CSSProperties = { width: "100%", height: 48, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 44, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, background: "transparent", color: C.textSec };

/** karta oznamu tak, ako ju uvidia ľudia — ten istý vzhľad v náhľade aj na profile */
export function OznamKarta({ o, autor, logo }: { o: Oznam; autor: string; logo?: string }) {
  const [fotka, setFotka] = useState<number | null>(null);
  const fotky = o.fotky ?? [];
  const bezTextu = cistyText(o.text).length === 0;
  return (<>
    <div style={{ background: C.surface, border: `1px solid ${o.pripnute ? tint(ZELENA, .4) : C.line}`, borderRadius: RADIUS.md, overflow: "hidden" }}>
      {fotky[0] && (
        <span {...pressable(() => setFotka(0), "Otvoriť fotku")} style={{ display: "block", cursor: "pointer" }}>
          {/* v ozname/inzeráte sa fotka nikdy neoreže — býva to plagát a text v ňom musí byť vidieť */}
          <FotkaObsahu src={fotky[0]} maxVyska={380} cela />
        </span>
      )}
      <div style={{ padding: SPACE.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: SPACE.xxs }}>
          {logo && <img src={logo} alt="" style={{ width: 22, height: 22, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />}
          <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{autor}</span>
          {o.pripnute && <span style={{ flex: "none", fontSize: 10, fontWeight: 800, color: ZELENA, background: tint(ZELENA, .12), borderRadius: RADIUS.pill, padding: `1px ${SPACE.xs}px` }}>📌 Pripnuté</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{o.nadpis}</div>
        {!bezTextu && (
          <FormatovanyText text={o.text} style={{ fontSize: 13.5, color: C.textSec, lineHeight: 1.5, marginTop: 4 }} />
        )}
        {fotky.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, marginTop: SPACE.xs, overflowX: "auto" }}>
            {fotky.slice(1).map((f, i) => <Miniatura key={i} src={f} onClick={() => setFotka(i + 1)} />)}
            <span style={{ flex: "none", fontSize: 11, color: C.textTer, paddingLeft: 2 }}>{fotky.length} fotky — klikni</span>
          </div>
        )}
      </div>
    </div>
    {fotka !== null && <PrehliadacFotiek fotky={fotky} start={fotka} onClose={() => setFotka(null)} />}
  </>);
}

// ---------- formulár: tri polia, zvyšok predvolené ----------
function Formular({ entita, autor, logo, uprava, toast, onHotovo, onSpat }: {
  entita: string; autor: string; logo?: string; uprava?: Oznam;
  toast: (m: string) => void; onHotovo: () => void; onSpat: () => void;
}) {
  const [nadpis, setNadpis] = useState(uprava?.nadpis ?? "");
  const [text, setText] = useState(uprava?.text ?? "");
  const [fotky, setFotky] = useState<string[]>(uprava?.fotky ?? []);
  const [dni, setDni] = useState(uprava?.platnostDni ?? OZNAM_CFG.platnostDni);
  const [nahlad, setNahlad] = useState(false);
  const [teraz] = useState(() => Date.now());   // náhľad nesmie „blikať" pri každom prekreslení

  const pridajFotky = async (files: FileList | null) => {
    if (!files?.length) return;
    const volne = OZNAM_CFG.maxFotiek - fotky.length;
    if (volne <= 0) { toast(`Viac než ${OZNAM_CFG.maxFotiek} fotky nejdú`); return; }
    const nove: string[] = [];
    for (const f of Array.from(files).slice(0, volne)) {
      try { nove.push(await spracujFotku(f, { pomer: null, maxSirka: 1400 })); }  // bez orezu — nevieme, čo charita nahrá
      catch (e) { toast((e as Error).message); }
    }
    if (nove.length) setFotky([...fotky, ...nove]);
  };

  const dlzka = cistyText(text).length;
  const chyba = nadpis.trim().length < 3 ? "Napíš, o čo ide — stačí pár slov."
    : dlzka < 10 && fotky.length === 0 ? "Napíš aspoň vetu, nech ľudia vedia, o čom to je. Alebo nahraj hotový plagát ako fotku."
    : dlzka > OZNAM_CFG.maxText ? `Text je dlhší, než sa do oznamu zmestí — skráťte ho o ${dlzka - OZNAM_CFG.maxText} znakov.`
    : null;

  const zverejni = () => {
    if (chyba) { toast(chyba); return; }
    if (uprava) {
      upravOznam(entita, uprava.id, { nadpis: nadpis.trim(), text: text.trim(), fotky, platnostDni: dni });
      toast("Oznam upravený");
    } else {
      pridajOznam({ entita, kategoria: "oznam", nadpis: nadpis.trim(), text: text.trim(), fotky, platnostDni: dni });
      toast("Oznam je na vašom profile");
    }
    onHotovo();
  };

  const ukazka: Oznam = { id: "nahlad", entita, kategoria: "oznam", nadpis: nadpis.trim() || "Bez nadpisu", text: text.trim(), fotky, platnostDni: dni, vytvorene: teraz };

  return (
    <Sheet onClose={onSpat} label={uprava ? "Upraviť oznam" : "Napísať oznam"} pisanie>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{uprava ? "Upraviť oznam" : "Napísať oznam"}</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm }}>
        Uvidia ho ľudia na vašom profile a tí, čo vás sledujú.
      </div>

      {nahlad ? (<>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, textAlign: "center", border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.xxs, marginBottom: SPACE.xs }}>
          TAKTO TO UVIDIA ĽUDIA
        </div>
        <OznamKarta o={ukazka} autor={autor} logo={logo} />
        <button onClick={zverejni} style={{ ...btnHlavny, marginTop: SPACE.sm }}>{uprava ? "Uložiť zmeny" : "Zverejniť"}</button>
        <button onClick={() => setNahlad(false)} style={{ ...btnDruhy, marginTop: SPACE.xs }}>Ešte upraviť</button>
      </>) : (<>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>O čo ide?</div>
        <input value={nadpis} onChange={(e) => setNadpis(e.target.value)} maxLength={OZNAM_CFG.maxNadpis}
          placeholder="Napríklad: Zbierka šatstva pokračuje do konca mesiaca" style={{ ...vstup, fontWeight: 700 }} />

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 4px` }}>Čo chcete ľuďom povedať? <span style={{ fontWeight: 400, color: C.textTer }}>— netreba, ak dáte hotový plagát</span></div>
        <RichTextInput value={text} onChange={setText} minH={130} maxZnakov={OZNAM_CFG.maxText}
          placeholder="Píšte, ako by ste to povedali susedovi. Kedy, kde, čo treba priniesť." />
        <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 2 }}>Text skopírovaný z Wordu, Facebooku či Instagramu si tučné, kurzívu aj odrážky ponechá.</div>

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
          {OZNAM_CFG.platnosti.map((d) => (
            <span key={d} {...pressable(() => setDni(d), `${d} dní`)}
              style={{ flex: 1, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: dni === d ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, background: dni === d ? tint(ZELENA, .12) : C.surface, border: `1px solid ${dni === d ? tint(ZELENA, .45) : C.line}`, color: dni === d ? ZELENA : C.textSec }}>
              {d} dní
            </span>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 4 }}>Potom zmizne z profilu sám. Nájdete ho v Oznamoch a viete ho znova pustiť.</div>

        <button onClick={() => (chyba ? toast(chyba) : setNahlad(true))} style={{ ...btnHlavny, marginTop: SPACE.md }}>Ukázať, ako to bude vyzerať</button>
        <button onClick={onSpat} style={{ ...btnDruhy, marginTop: SPACE.xs }}>Zrušiť</button>
      </>)}
    </Sheet>
  );
}

// ---------- zoznam v správe ----------
export function OznamySheet({ entita, autor, logo, toast, onClose }: {
  entita: string; autor: string; logo?: string; toast: (m: string) => void; onClose: () => void;
}) {
  const oznamy = useOznamy(entita);
  const [pisem, setPisem] = useState(false);
  const [uprava, setUprava] = useState<Oznam | null>(null);
  const [teraz] = useState(() => Date.now());

  if (pisem || uprava) return (
    <Formular entita={entita} autor={autor} logo={logo} uprava={uprava ?? undefined} toast={toast}
      onHotovo={() => { setPisem(false); setUprava(null); }}
      onSpat={() => { setPisem(false); setUprava(null); }} />
  );

  const aktivne = oznamy.filter((o) => oznamAktivny(o, teraz));
  const skoncene = oznamy.filter((o) => !oznamAktivny(o, teraz));

  const riadok = (o: Oznam, beziaci: boolean) => (
    <div key={o.id} style={karta}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.sm }}>
        {o.fotky?.[0] && <Miniatura src={o.fotky[0]} sirka={54} vyska={40} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.nadpis}</div>
          <div style={{ fontSize: 10.5, color: beziaci ? ZELENA : C.textTer, marginTop: 2 }}>
            {o.pripnute ? "📌 pripnuté · " : ""}{beziaci ? `na profile ešte ${dniDoKonca(o, teraz)} dní` : "skončil — na profile nie je"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs, flexWrap: "wrap" }}>
        <span {...pressable(() => setUprava(o), "Upraviť")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>Upraviť</span>
        {beziaci
          ? <span {...pressable(() => { pripniOznam(entita, o.id, !o.pripnute); toast(o.pripnute ? "Odopnuté" : "Pripnuté navrch"); }, "Pripnúť")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>{o.pripnute ? "Odopnúť" : "📌 Pripnúť navrch"}</span>
          : <span {...pressable(() => { upravOznam(entita, o.id, { vytvorene: Date.now() }); toast("Oznam je zase na profile"); }, "Pustiť znova")} style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>Pustiť znova</span>}
        <span {...pressable(() => { zmazOznam(entita, o.id); toast("Oznam zmazaný"); }, "Zmazať")} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Zmazať</span>
      </div>
    </div>
  );

  return (
    <Sheet onClose={onClose} label="Oznamy">
      <div style={{ fontSize: 16, fontWeight: 800 }}>📣 Oznamy</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Krátka správa na váš profil — čo je nové, na čo nezabudnúť, komu ďakujete. Uvidia ju ľudia, čo vás sledujú.
      </div>

      <button onClick={() => setPisem(true)} style={btnHlavny}>Napísať oznam</button>

      {aktivne.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>NA PROFILE</div>
        {aktivne.map((o) => riadok(o, true))}
      </>)}

      {skoncene.length > 0 && (<>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>SKONČENÉ</div>
        {skoncene.map((o) => riadok(o, false))}
      </>)}

      {!oznamy.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ ste nenapísali žiadny oznam.<br />Skúste napríklad: „Vo štvrtok varíme na námestí, príďte pomôcť."
        </div>
      )}
    </Sheet>
  );
}
