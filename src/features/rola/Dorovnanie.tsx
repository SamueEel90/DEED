// ============================================================
// DOROVNANIE DARU — správa charity: kto dorovnáva, v akom stave a čo
// z toho vidia darci. Parametre nastavuje FIRMA (sú to jej peniaze),
// charita ich nedostáva na schválenie — súhlas dala pri zbierke.
// Kým firma nezaplatí, charita vie dorovnanie odmietnuť.
// V prototype je firmová strana DEV formulár na tom istom mieste.
// ============================================================
import { DeedZnacka } from "@/components/DeedZnacka";
import { Emo } from "@/components/icons";
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { FIRMY_ADRESAR } from "./mock";
import { pripniVyclenene } from "@/lib/podpory";
import { rovnakaFirma } from "@/lib/firma";
import { nacitajSegmenty } from "./segmenty";
import { CENTRALNA_ID, nacitajProfil } from "./vlastneZbierky";
import { PlatbaModal } from "@/components/platba";
import { Stit, naStitLevel } from "@/components/stit";
import {
  DOROVNANIE_CFG, useDorovnania, zapecat, potvrdPlatbu, odmietni, ukonci, pozastav, vysporiadaj,
  vycerpane, zostatok, popisPomeru, nazovPomeru, priklad, bezi, daSaZmazat, zmazDorovnanie,
  useDorovnaniaFirmy, beziaceDorovnanie, casAutomatu, platiPreMna, type Dorovnanie, type KanalDorovnania,
} from "@/lib/dorovnanie";

const ZLATA = "var(--a-gold)";
const ZELENA = "var(--a-green)";
const DEN = 86400000;
const karta: CSSProperties = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs };
const vstup: CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
const btnHlavny: CSSProperties = { width: "100%", height: 48, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 44, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, background: "transparent", color: C.textSec };
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
const naDatum = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const zDatumu = (s: string, zaloha: number) => (s ? new Date(`${s}T00:00:00`).getTime() : zaloha);

/**
 * Bežec pri zbierke — kto dorovnáva. Tvar je zámerne ten istý ako karta
 * „ŽIADATEĽ": logo vľavo, štít a „Profil" vpravo, čísla až po rozkliknutí.
 * Firma platí zo všetkých najviac, tak nech je aj vidieť ako partner,
 * nie ako mikro-riadok v platobnom module.
 */
export function DorovnaniePas({ d, onFirma }: { d: Dorovnanie; onFirma?: () => void }) {
  const [otvorene, setOtvorene] = useState(false);
  const zost = zostatok(d);
  const minute = zost <= 0;
  // štít firmy je v adresári (v produkcii príde s profilom firmy)
  const zaznam = FIRMY_ADRESAR.find((f) => rovnakaFirma(f.nazov, d.firma));
  const logo = d.firmaLogo ?? zaznam?.logo;
  const ram = tint(ZLATA, minute ? .25 : .45);

  return (
    <div style={{ background: tint(ZLATA, minute ? .07 : .13), border: `1px solid ${otvorene ? tint(ZLATA, .7) : ram}`,
      borderRadius: RADIUS.sm, marginBottom: SPACE.xxs }}>
      <div {...pressable(() => setOtvorene((o) => !o), `Dorovnáva ${d.firma}`)}
        style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.sm, cursor: "pointer" }}>
        {logo
          ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />
          : <span style={{ flex: "none", width: 40, height: 40, borderRadius: RADIUS.xs, background: tint(ZLATA, .25),
              display: "grid", placeItems: "center", fontSize: 18 }}>🤝</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", color: C.textTer }}>
            {minute ? "DOROVNÁVALA" : "DOROVNÁVA"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.firma}</div>
          <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 1 }}>
            {minute ? `spolu pridala ${eur(vycerpane(d))}`
              : !platiPreMna(d) ? "dorovnáva dary svojich zamestnancov"
              : <>k tvojmu daru pridá <b style={{ color: ZLATA }}>{popisPomeru(d.pomer)}</b></>}
          </div>
        </div>
        {zaznam && <Stit level={naStitLevel(zaznam.stit)} size={30} />}
        <span style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "var(--a-info)" }}>{otvorene ? "Zavrieť" : "Profil"}</span>
      </div>

      {otvorene && (
        <div style={{ borderTop: `1px solid ${ram}`, padding: SPACE.sm, fontSize: 12.5, color: C.textSec, lineHeight: 1.7 }}>
          {zaznam && <div>{zaznam.odvetvie} · {zaznam.mesto}</div>}
          {!minute && (<>
            <div>vyčlenila <b style={{ color: C.text }}>{eur(d.strop)}</b>, ostáva <b style={{ color: C.text }}>{eur(zost)}</b></div>
            <div>{d.doVycerpania ? "Darca prispieva, dokiaľ sa neminie celková suma" : `Darca prispieva do ${datum(d.do)}`}</div>
          </>)}
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>
            Je to dar firmy, nie sponzoring — peniaze sú na účte charity k čerpaniu.
          </div>
          {onFirma && (
            <div {...pressable(onFirma, `Stránka ${d.firma}`)}
              style={{ marginTop: SPACE.xs, fontSize: 12.5, fontWeight: 800, color: "var(--a-info)", cursor: "pointer" }}>
              Otvoriť stránku firmy ›
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- formulár firmy ----------
function Formular({ entita, cielFix, cielNazov, toast, onHotovo, onSpat }: {
  entita: string; cielFix?: string; cielNazov?: string; toast: (m: string) => void; onHotovo: () => void; onSpat: () => void;
}) {
  // ciele = len zbierky, ktoré sú naozaj na verejnom profile. Inak by firma
  // zaplatila dorovnanie a nikde by nesvietilo.
  const [ciele] = useState(() => [
    ...(nacitajProfil(CENTRALNA_ID) ? [{ id: CENTRALNA_ID, nazov: nacitajProfil(CENTRALNA_ID)!.nazov, emoji: "💛" }] : []),
    ...nacitajSegmenty().flatMap((sg) => {
      const pr = sg.zbierkaId ? nacitajProfil(sg.zbierkaId) : null;
      return pr ? [{ id: sg.zbierkaId!, nazov: `${sg.nazov} — ${pr.nazov}`, emoji: "🧩" }] : [];
    }),
  ]);
  const [ciel, setCiel] = useState(() => cielFix ?? (nacitajProfil(CENTRALNA_ID) ? CENTRALNA_ID : ""));
  const [firma, setFirma] = useState("");
  const [profil, setProfil] = useState("");
  const [logo, setLogo] = useState<string | undefined>();
  const [iban, setIban] = useState("");
  const [skener, setSkener] = useState(false);       // „načítaj QR firmy" — vyplní údaje za ňu
  const [doVycerpania, setDoVycerpania] = useState(false);
  const [platba, setPlatba] = useState(false);
  const [pomer, setPomer] = useState(DOROVNANIE_CFG.pomer);
  const [strop, setStrop] = useState("");
  // „od dnes" = od polnoci, nie od minúty vyplnenia — inak sa tesne po založení
  // tvári ako ešte nespustené
  const [od] = useState(() => new Date(new Date().toDateString()).getTime());
  const [doKedy, setDoKedy] = useState(() => Date.now() + 30 * DEN);
  const [zvysok, setZvysok] = useState<"zbierke" | "firme">("zbierke");
  const [lenZamestnanci, setLenZamestnanci] = useState(false);   // zamestnanecký matching
  const [potvrd, setPotvrd] = useState(false);
  const [uhradene, setUhradene] = useState(false);   // pečatí sa až po úhrade
  const [kanal, setKanal] = useState<KanalDorovnania | null>(null);   // ktorou rúrou → kedy nabehne

  const suma = Number(strop.replace(",", ".")) || 0;
  // pri pevnom cieli (vstup od zbierky) nemusí byť v zozname „vlastných" —
  // názov si vtedy vypýtame od volajúceho
  const zbierka = ciele.find((z) => z.id === ciel) ?? (cielFix ? { id: cielFix, nazov: cielNazov ?? "Táto zbierka", emoji: "🎯" } : undefined);
  const chyba = !ciel ? "Najprv spustite verejnú zbierku — dorovnanie musí byť kde zobraziť."
    : firma.trim().length < 2 ? "Načítajte QR firmy — z neho sa vyplnia údaje."
    : suma <= 0 ? "Zadajte, koľko celkom vyčleňujete."
    : !doVycerpania && doKedy <= od ? "Koniec musí byť neskôr než dnes."
    : null;

  // platobný modul je SESTRA panelu, nie jeho dieťa — vnorený panel by dostal
  // len výšku rodiča (~420 px) a človek by v ňom musel rolovať
  if (potvrd) return (<>
    <Sheet onClose={onSpat} label="Zapečatiť dorovnanie">
      <div style={{ fontSize: 16, fontWeight: 800 }}>Skontrolujte a zapečaťte</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
        Po zapečatení sa parametre nedajú zmeniť — ani vami, ani nami. Chcete iné čísla? Zrušíte a založíte nové.
      </div>
      <div style={{ ...karta, background: tint(ZLATA, .1), border: `1px solid ${tint(ZLATA, .4)}` }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{firma.trim()} pridá k daru {popisPomeru(pomer)}</div>
        <div style={{ fontSize: 12.5, color: C.textSec, marginTop: 4, lineHeight: 1.6 }}>
          zbierka: <b style={{ color: C.text }}>{zbierka?.nazov}</b><br />
          z daru 20 € bude: <b style={{ color: C.text }}>{eur(priklad(pomer))}</b><br />
          celkom vyčleňuje: <b style={{ color: C.text }}>{eur(suma)}</b><br />
          beží: <b style={{ color: C.text }}>{doVycerpania ? "od dnes, kým sa strop nevyčerpá" : `od dnes do ${datum(doKedy)}`}</b><br />
          nevyčerpaný zvyšok: <b style={{ color: C.text }}>{zvysok === "zbierke" ? "ostáva zbierke" : "vráti sa firme"}</b><br />
          dorovnávate: <b style={{ color: C.text }}>{lenZamestnanci ? "len dary vlastných zamestnancov" : "každý dar"}</b>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Najprv úhrada, až potom pečať. Darcom sa sľubuje len to, čo už leží na účte charity.
      </div>
      <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.5, background: tint(ZLATA, .08), border: `1px solid ${tint(ZLATA, .3)}`,
        borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
        <b style={{ color: C.text }}>Kedy dorovnanie nabehne</b><br />
        <b>Karta</b> — ide cez našu rúru, príjem vidíme hneď → beží <b>ihneď</b> po zapečatení.<br />
        <b>SEPA</b> — prevod ide priamo na účet charity, do jej výpisu nevidíme → charita potvrdí príjem;
        ak neklikne, beží <b>automaticky do 48 hodín</b>. Vaše peniaze nikde neležia nadarmo.
      </div>

      {!uhradene ? (
        <button style={btnHlavny} onClick={() => setPlatba(true)}>
          Uhradiť {eur(suma)} charite
        </button>
      ) : (
        <div style={{ fontSize: 12.5, fontWeight: 800, color: ZELENA, background: tint(ZELENA, .1), border: `1px solid ${tint(ZELENA, .35)}`,
          borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
          ✓ Uhradené {eur(suma)} · {datum(od)}
          <div style={{ fontWeight: 700, color: C.textSec, marginTop: 4 }}>
            {kanal === "sepa"
              ? "SEPA — charita potvrdí príjem; najneskôr o 48 h nabehne samo."
              : "Karta — po zapečatení beží okamžite."}
          </div>
        </div>
      )}

      <button disabled={!uhradene} style={{ ...btnHlavny, marginTop: uhradene ? 0 : SPACE.xs, opacity: uhradene ? 1 : .45, cursor: uhradene ? "pointer" : "not-allowed" }} onClick={() => {
        zapecat({ entita, ciel, cielNazov: zbierka?.nazov ?? ciel, firma: firma.trim(), firmaProfil: profil.trim() || undefined, firmaLogo: logo,
          pomer, strop: suma, od, do: doVycerpania ? od + 3650 * DEN : doKedy, doVycerpania, zvysok,
          lenZamestnanci, kanal: kanal ?? "sepa" });
        // strop je zaplatený vopred → zbierka sa firme pripína na podstránku už teraz
        pripniVyclenene(firma.trim(), ciel, suma);
        toast(kanal === "sepa"
          ? "Zapečatené — charita potvrdí príjem, najneskôr o 48 h beží samo"
          : "Zapečatené — dorovnanie beží");
        onHotovo();
      }}>{uhradene ? "Zapečatiť a poslať" : "Zapečatiť (najprv uhraďte)"}</button>
      <button style={{ ...btnDruhy, marginTop: SPACE.xs }} onClick={() => setPotvrd(false)}>Ešte upraviť</button>

    </Sheet>
    {platba && (
      <PlatbaModal kanal="EUR" suma={suma} komu={`dorovnanie zbierky ${zbierka?.nazov ?? ""}`}
        onClose={() => setPlatba(false)}
        onDone={(_sm, _v, metoda) => {
          setPlatba(false); setUhradene(true);
          setKanal(metoda === "karta" ? "karta" : metoda === "krypto" ? "krypto" : "sepa");
          toast(`Uhradené ${eur(suma)} — môžete zapečatiť`);
        }} />
    )}
  </>);

  return (
    <Sheet onClose={onSpat} label="Nové dorovnanie" pisanie>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Nové dorovnanie</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
        Toto vypĺňa firma — sú to jej peniaze a jej podmienky. (V prototype to vyplníte za ňu.)
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Ktorú zbierku dorovnávate?</div>
      {cielFix && (
        <div style={{ ...vstup, marginBottom: SPACE.sm, fontWeight: 700, background: C.surface }}>
          {zbierka?.nazov ?? "Táto zbierka"}
        </div>
      )}
      {ciele.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--a-clay)", background: tint("var(--a-clay)", .1), border: `1px solid ${tint("var(--a-clay)", .35)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
          Charita nemá spustenú žiadnu verejnú zbierku. Dorovnanie by nemalo kde svietiť — najprv spustite centrálnu alebo sektorovú zbierku.
        </div>
      )}
      {!cielFix && <select value={ciel} onChange={(e) => setCiel(e.target.value)} style={{ ...vstup, marginBottom: SPACE.sm }}>
        {ciele.map((z) => <option key={z.id} value={z.id}>{z.nazov}</option>)}
      </select>}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Firma</div>
      {!firma ? (
        <button onClick={() => setSkener(true)} style={{ ...btnDruhy, marginBottom: SPACE.sm }}>▦ Načítať QR firmy — vyplní údaje za vás</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
          {logo
            ? <img src={logo} alt="" style={{ width: 34, height: 34, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />
            : <span style={{ flex: "none", fontSize: 20 }}>🏢</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{firma}</div>
            <div style={{ fontSize: 11, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profil} · {iban}</div>
          </div>
          <span {...pressable(() => { setFirma(""); setProfil(""); setLogo(undefined); setIban(""); }, "Načítať inú firmu")}
            style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Zmeniť</span>
        </div>
      )}
      {skener && (
        <Sheet onClose={() => setSkener(false)} label="Načítať QR firmy">
          <div style={{ fontSize: 16, fontWeight: 800 }}>▦ Načítať QR firmy</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
            Z QR sa natiahne názov, logo, odkaz na profil aj platobné údaje — nič sa neprepisuje ručne.
            (V prototype vyberte firmu zo zoznamu namiesto skenovania.)
          </div>
          {FIRMY_ADRESAR.map((f) => (
            <div key={f.nazov} {...pressable(() => {
              setFirma(f.nazov);
              setProfil(`deed.app/f/${f.nazov.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`);
              setLogo(f.logo);
              setIban(`SK${String(12 + f.nazov.length)} 1100 0000 0026 ${String(1000 + f.nazov.length * 7)}`);
              setSkener(false);
              toast(`Načítané z QR — ${f.nazov}`);
            }, f.nazov)} style={{ ...karta, display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer" }}>
              {f.logo
                ? <img src={f.logo} alt="" style={{ width: 34, height: 34, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />
                : <span style={{ width: 34, height: 34, flex: "none", borderRadius: RADIUS.xs, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.textSec }}>{f.iniciacky}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{f.odvetvie} · {f.mesto}</div>
              </div>
            </div>
          ))}
        </Sheet>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Koľko pridáte ku každému daru?</div>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm, flexWrap: "wrap" }}>
        {DOROVNANIE_CFG.pomery.map((x) => (
          <span key={x} {...pressable(() => setPomer(x), `${x}× dar`)}
            style={{ flex: "1 1 calc(50% - 6px)", textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: pomer === x ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm,
              background: pomer === x ? tint(ZLATA, .14) : C.surface, border: `1px solid ${pomer === x ? tint(ZLATA, .5) : C.line}`, color: pomer === x ? ZLATA : C.textSec }}>
            {nazovPomeru(x)}
            <div style={{ fontWeight: 400, fontSize: 10.5, color: C.textTer, marginTop: 1 }}>z 20 € bude {eur(priklad(x))}</div>
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Koľko celkom vyčleňujete? <span style={{ fontWeight: 400, color: C.textTer }}>— pošlete to vopred</span></div>
      <input value={strop} onChange={(e) => setStrop(e.target.value)} inputMode="decimal" placeholder="napr. 5000" style={{ ...vstup, marginBottom: SPACE.sm }} />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Dokedy to beží?</div>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xs }}>
        {([[false, "Do dátumu"], [true, "Kým sa minie"]] as const).map(([k, l]) => (
          <span key={String(k)} {...pressable(() => setDoVycerpania(k), l)}
            style={{ flex: 1, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: doVycerpania === k ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm,
              background: doVycerpania === k ? tint(ZELENA, .12) : C.surface, border: `1px solid ${doVycerpania === k ? tint(ZELENA, .45) : C.line}`, color: doVycerpania === k ? ZELENA : C.textSec }}>
            {l}
          </span>
        ))}
      </div>
      {!doVycerpania && (
        <input type="date" value={naDatum(doKedy)} onChange={(e) => setDoKedy(zDatumu(e.target.value, doKedy))} style={{ ...vstup, marginBottom: SPACE.sm }} />
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Čo s nevyčerpaným zvyškom?</div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        {([["zbierke", "Ostáva zbierke"], ["firme", "Vráti sa nám"]] as const).map(([k, l]) => (
          <span key={k} {...pressable(() => setZvysok(k), l)}
            style={{ flex: 1, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: zvysok === k ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm,
              background: zvysok === k ? tint(ZELENA, .12) : C.surface, border: `1px solid ${zvysok === k ? tint(ZELENA, .45) : C.line}`, color: zvysok === k ? ZELENA : C.textSec }}>
            {l}
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 4px` }}>Komu dorovnávate?</div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        {([[false, "Každému darcovi"], [true, "Len našim zamestnancom"]] as const).map(([k, l]) => (
          <span key={l} {...pressable(() => setLenZamestnanci(k), l)}
            style={{ flex: 1, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: lenZamestnanci === k ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm,
              background: lenZamestnanci === k ? tint(ZELENA, .12) : C.surface, border: `1px solid ${lenZamestnanci === k ? tint(ZELENA, .45) : C.line}`, color: lenZamestnanci === k ? ZELENA : C.textSec }}>
            {l}
          </span>
        ))}
      </div>
      {lenZamestnanci && (
        <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.45, marginTop: SPACE.xs }}>
          Dorovnáte len dary ľudí, ktorí sú k vám v <DeedZnacka /> pripojení a vy ste ich potvrdili.
          Ostatní darcovia o dorovnaní nebudú vôbec informovaní — nesľubuje sa im nič.
        </div>
      )}

      <button style={{ ...btnHlavny, marginTop: SPACE.md }} onClick={() => (chyba ? toast(chyba) : setPotvrd(true))}>Skontrolovať a zapečatiť</button>
      <button style={{ ...btnDruhy, marginTop: SPACE.xs }} onClick={onSpat}>Zrušiť</button>
    </Sheet>
  );
}

/** jeden krok sprievodcu — číslo, názov, a obsah len pri kroku, na ktorom stojíme */
function KrokKarty({ c, krok, nazov, hotovo, deti }: { c: number; krok: number; nazov: string; hotovo: boolean; deti?: React.ReactNode }) {
  return (
    <div style={{ ...karta, opacity: c > krok ? .45 : 1, border: `1px solid ${c === krok ? tint(ZELENA, .45) : C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
        <span style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11.5, fontWeight: 800, background: hotovo ? ZELENA : C.surface, color: hotovo ? "#06281d" : C.textSec, border: `1px solid ${hotovo ? ZELENA : C.line}` }}>
          {hotovo ? "✓" : c}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>{nazov}</span>
      </div>
      {c === krok && deti && <div style={{ marginTop: SPACE.xs }}>{deti}</div>}
    </div>
  );
}

/** Ukončenie zbierky s bežiacim dorovnaním — tri kroky, nedá sa preskočiť:
 *  ste si istí? → pozastaviť → vrátiť firme zvyšok (reálnym prevodom) → ukončiť.
 *  Ukončenie býva aj omyl, preto sa naň pýtame a hovoríme rovno cenu. */
function Ukoncenie({ entita, d, toast, onClose }: {
  entita: string; d: Dorovnanie; toast: (m: string) => void; onClose: () => void;
}) {
  const [platba, setPlatba] = useState(false);
  const zost = zostatok(d);
  const krok = d.stav !== "pozastavene" ? 1 : !d.vysporiadane ? 2 : 3;

  return (<>
    <Sheet onClose={onClose} label="Ukončiť zbierku">
      <div style={{ fontSize: 16, fontWeight: 800 }}>Ukončiť zbierku s dorovnaním</div>
      <div style={{ fontSize: 12, color: C.textSec, marginTop: 4, marginBottom: SPACE.sm, lineHeight: 1.5 }}>
        Na zbierke beží dorovnanie od <b style={{ color: C.text }}>{d.firma}</b>. Ak ju ukončíte, musíte firme vrátiť
        celý nevyčerpaný zvyšok — <b style={{ color: C.text }}>{eur(zost)}</b>. Firma si kupovala dorovnanie darov, nie dar pre vás.
      </div>

      <KrokKarty krok={krok} c={1} nazov="Pozastaviť zbierku" hotovo={krok > 1} deti={
        <>
          <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.xs, lineHeight: 1.45 }}>
            Zbierka prestane prijímať dary, takže sa už nič nedorovná. Ešte nič nevraciate a dá sa to rozmyslieť.
          </div>
          <button style={btnHlavny} onClick={() => { pozastav(entita, d.id); toast("Zbierka pozastavená — dary sa neprijímajú"); }}>
            Áno, pozastaviť zbierku
          </button>
        </>
      } />

      <KrokKarty krok={krok} c={2} nazov={`Vrátiť firme ${eur(zost)}`} hotovo={krok > 2} deti={
        <>
          <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.xs, lineHeight: 1.45 }}>
            Prevod ide z vášho účtu na účet firmy. Bez neho sa zbierka ukončiť nedá.
          </div>
          <button style={btnHlavny} onClick={() => setPlatba(true)}>Uhradiť {eur(zost)} firme</button>
        </>
      } />

      <KrokKarty krok={krok} c={3} nazov="Ukončiť zbierku a dorovnanie" hotovo={d.stav === "ukoncene"} deti={
        <button style={btnHlavny} onClick={() => {
          if (!ukonci(entita, d.id)) { toast("Najprv vráťte zvyšok"); return; }
          toast("Zbierka aj dorovnanie sú ukončené");
          onClose();
        }}>Ukončiť</button>
      } />

      {d.vysporiadane && (
        <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.45 }}>
          Vrátené {eur(d.vysporiadane.suma)} · {datum(d.vysporiadane.kedy)}
          {d.vysporiadane.referencia ? ` · ${d.vysporiadane.referencia}` : ""}
        </div>
      )}

      <button style={{ ...btnDruhy, marginTop: SPACE.md }} onClick={onClose}>
        {krok === 1 ? "Nie, nechať zbierku bežať" : "Zavrieť"}
      </button>
    </Sheet>

    {platba && (
      <PlatbaModal kanal="EUR" lenSepa suma={zost} komu={`vrátenie zvyšku · ${d.firma}`}
        onClose={() => setPlatba(false)}
        onDone={() => {
          setPlatba(false);
          vysporiadaj(entita, d.id, true, `TX-VRAT-${d.id.slice(-4).toUpperCase()}`);
          toast(`Vrátené firme ${eur(zost)} — teraz môžete ukončiť`);
        }} />
    )}
  </>);
}

/** vstup pre firmu priamo pri zbierke — cieľ je daný, firma vypĺňa len svoje podmienky */
export function NoveDorovnanieSheet({ entita, cielId, cielNazov, toast, onClose }: {
  entita: string; cielId: string; cielNazov?: string; toast: (m: string) => void; onClose: () => void;
}) {
  return <Formular entita={entita} cielFix={cielId} cielNazov={cielNazov} toast={toast} onHotovo={onClose} onSpat={onClose} />;
}

/** Správa FIRMY — čo moja firma dorovnáva, koľko z toho ostáva a kde to beží.
 *  Nové dorovnanie firma zakladá pri zbierke (tam vidí, komu dáva), preto tu
 *  ponúkame cestu na profil charity, nie ďalší formulár naslepo. */
export function DorovnanieFirmySheet({ firma, toast, onClose }: {
  firma: string; toast: (m: string) => void; onClose: () => void;
}) {
  const moje = useDorovnaniaFirmy(firma);
  const [teraz] = useState(() => Date.now());
  const [vyber, setVyber] = useState(false);
  const [nova, setNova] = useState<{ entita: string; ciel: string } | null>(null);
  // zbierky, ktoré sú na profile a nikto ich práve nedorovnáva
  const volne = [
    ...(nacitajProfil(CENTRALNA_ID) ? [{ entita: "charita", id: CENTRALNA_ID, nazov: nacitajProfil(CENTRALNA_ID)!.nazov, emoji: "💛" }] : []),
    ...nacitajSegmenty().flatMap((sg) => {
      const pr = sg.zbierkaId ? nacitajProfil(sg.zbierkaId) : null;
      return pr ? [{ entita: "charita", id: sg.zbierkaId!, nazov: `${sg.nazov} — ${pr.nazov}`, emoji: "🧩" }] : [];
    }),
  ].filter((z) => !beziaceDorovnanie(z.entita, z.id, teraz));
  const beziace = moje.filter((d) => bezi(d, teraz));
  const vyclenene = moje.filter((d) => d.stav === "aktivne" || d.stav === "zapecatene" || d.stav === "pozastavene")
    .reduce((s, d) => s + zostatok(d), 0);
  const rozdane = moje.reduce((s, d) => s + vycerpane(d), 0);

  const stavText = (d: Dorovnanie) =>
    d.stav === "zapecatene" ? `SEPA · charita potvrdzuje príjem — beží najneskôr ${casAutomatu(d, teraz)}`
    : d.stav === "aktivne" ? (bezi(d, teraz) ? `beží · ostáva ${eur(zostatok(d))}` : "mimo obdobia")
    : d.stav === "pozastavene" ? (d.vysporiadane ? "zbierka sa ukončuje · zvyšok vrátený" : `zbierka pozastavená · čaká sa na vrátenie ${eur(zostatok(d))}`)
    : d.stav === "vycerpane" ? "strop vyčerpaný"
    : d.stav === "ukoncene" ? `ukončené${d.vysporiadane?.kam === "firme" ? ` · vrátené ${eur(d.vysporiadane.suma)}` : ""}`
    : d.stav === "odmietnute" ? "charita odmietla"
    : "zrušené";

  if (nova) return (
    <Formular entita={nova.entita} cielFix={nova.ciel} toast={toast}
      onHotovo={() => setNova(null)} onSpat={() => setNova(null)} />
  );

  if (vyber) return (
    <Sheet onClose={() => setVyber(false)} label="Vybrať zbierku">
      <div style={{ fontSize: 16, fontWeight: 800 }}>Ktorú zbierku dorovnáte?</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
        Zbierky, ktoré práve nikto nedorovnáva. Radšej si ich najprv pozrite na profile charity — uvidíte, na čo sa zbiera.
      </div>
      {volne.map((z) => (
        <div key={z.id} {...pressable(() => setNova({ entita: z.entita, ciel: z.id }), z.nazov)}
          style={{ ...karta, display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer" }}>
          <span style={{ fontSize: 20 }}><Emo e={z.emoji} /></span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>{z.nazov}</div>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: ZLATA }}>Dorovnať ›</span>
        </div>
      ))}
      {!volne.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Všetky zbierky už niekto dorovnáva.<br />Skúste neskôr alebo si nájdite inú charitu.
        </div>
      )}
      <button onClick={() => setVyber(false)} style={{ ...btnDruhy, marginTop: SPACE.sm }}>Späť</button>
    </Sheet>
  );

  return (
    <Sheet onClose={onClose} label="Dorovnanie darov">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🤝 Dorovnanie darov</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Pridávate k darom ľudí svoj diel, kým sa nevyčerpá váš strop. Právne je to dar — žiadne protiplnenie,
        žiadna faktúra, žiadny odpočet. Karmu dostávate ako každý darca.
      </div>

      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {[["Beží", String(beziace.length)], ["Vyčlenené", eur(vyclenene)], ["Rozdané", eur(rozdane)]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 1 }}>{k}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setVyber(true)} style={{ ...btnHlavny, marginBottom: SPACE.sm }}>Dorovnať ďalšiu zbierku</button>
      <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Dá sa to aj opačne: otvoriť profil charity a pri jej zbierke kliknúť na „Chcem dorovnávať" — tam vidíte, na čo sa zbiera.
      </div>

      {moje.map((d) => (
        <div key={d.id} style={karta}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>{d.cielNazov}</div>
            <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: ZLATA }}>{popisPomeru(d.pomer)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2 }}>{stavText(d)}</div>
          <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 2 }}>
            strop {eur(d.strop)} · rozdané {eur(vycerpane(d))} · {d.zaznamy.length} dorovnaných darov
            {d.doVycerpania ? " · kým sa minie" : ` · do ${datum(d.do)}`}
          </div>
        </div>
      ))}

      {!moje.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ nedorovnávate žiadnu zbierku.<br />Nájdite si charitu a pri jej zbierke kliknite „Chcem dorovnávať".
        </div>
      )}

    </Sheet>
  );
}

// ---------- zoznam v správe ----------
export function DorovnanieSheet({ entita, toast, onClose }: {
  entita: string; toast: (m: string) => void; onClose: () => void;
}) {
  const dorovnania = useDorovnania(entita);
  const [koniec, setKoniec] = useState<string | null>(null);
  const [pisem, setPisem] = useState(false);
  const [teraz] = useState(() => Date.now());

  if (pisem) return <Formular entita={entita} toast={toast} onHotovo={() => setPisem(false)} onSpat={() => setPisem(false)} />;

  const stavText = (d: Dorovnanie) =>
    d.stav === "zapecatene" ? `firma uhradila SEPA — potvrďte príjem na účte (inak sa spustí samo ${casAutomatu(d, teraz)})`
    : d.stav === "aktivne" ? (bezi(d, teraz) ? `beží · ostáva ${eur(zostatok(d))}` : "beží, ale mimo obdobia")
    : d.stav === "pozastavene" ? (d.vysporiadane
        ? "pozastavené · zvyšok vrátený — môžete ukončiť"
        : `pozastavené · treba vrátiť firme ${eur(zostatok(d))}`)
    : d.stav === "vycerpane" ? `strop vyčerpaný · pridané ${eur(vycerpane(d))}`
    : d.stav === "ukoncene" ? `ukončené · pridané ${eur(vycerpane(d))}`
    : d.stav === "odmietnute" ? "odmietnuté charitou"
    : "zrušené firmou";

  const koniecD = koniec ? dorovnania.find((x) => x.id === koniec) : null;
  if (koniecD) return <Ukoncenie entita={entita} d={koniecD} toast={toast} onClose={() => setKoniec(null)} />;

  return (
    <Sheet onClose={onClose} label="Dorovnanie daru">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🤝 Dorovnanie daru</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Firma pridá k daru ľudí svoj diel, kým sa nevyčerpá jej strop. Je to dar ako každý iný — žiadne protiplnenie, žiadna faktúra.
        Peniaze idú priamo na váš účet, my sa ich nedotkneme.
      </div>

      <button onClick={() => setPisem(true)} style={btnHlavny}>Nové dorovnanie (za firmu · DEV)</button>

      {dorovnania.map((d) => (
        <div key={d.id} style={{ ...karta, marginTop: SPACE.sm }}>
          <DorovnaniePas d={d} />
          <div style={{ fontSize: 11.5, color: C.textSec, marginTop: SPACE.xs }}>
            {d.cielNazov} · {stavText(d)}
          </div>
          <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 2 }}>
            zapečatené {datum(d.zapecatene)}{d.zaplatene ? ` · ${d.automaticky ? "spustené automaticky" : "príjem potvrdený"} ${datum(d.zaplatene)}` : ""}
            {d.kanal === "karta" ? " · karta" : d.kanal === "krypto" ? " · EURC" : ""}
            {d.zaznamy.length > 0 ? ` · ${d.zaznamy.length} dorovnaných darov` : ""}
            {d.vysporiadane ? ` · zvyšok ${eur(d.vysporiadane.suma)} ${d.vysporiadane.kam === "firme" ? "vrátený firme" : "ostal zbierke"} ${datum(d.vysporiadane.kedy)}` : ""}
          </div>
          <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs, flexWrap: "wrap" }}>
            {d.stav === "zapecatene" && (<>
              <span {...pressable(() => { potvrdPlatbu(entita, d.id); toast("Peniaze potvrdené — dorovnanie beží"); }, "Potvrdiť platbu")}
                style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>✓ Peniaze sú na účte — spustiť</span>
              <span {...pressable(() => { odmietni(entita, d.id); toast("Peniaze neprišli — dorovnanie odmietnuté"); }, "Odmietnuť")}
                style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Peniaze neprišli — odmietnuť</span>
            </>)}
            {daSaZmazat(d) && (
              <span {...pressable(() => {
                zmazDorovnanie(entita, d.id);
                toast("Dorovnanie zmazané zo zoznamu");
              }, "Zmazať")} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Zmazať</span>
            )}
            {(d.stav === "aktivne" || d.stav === "pozastavene") && (
              <span {...pressable(() => setKoniec(d.id), "Ukončiť zbierku")}
                style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>
                {d.stav === "aktivne" ? "Ukončiť zbierku…" : "Dokončiť ukončenie…"}
              </span>
            )}
          </div>
        </div>
      ))}

      {!dorovnania.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ žiadne dorovnanie.<br />Firma si vyberie zbierku, nastaví podmienky a zapečatí ich — vy len potvrdíte, že peniaze prišli.
        </div>
      )}
    </Sheet>
  );
}
