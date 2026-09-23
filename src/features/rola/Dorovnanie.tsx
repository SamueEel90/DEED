// ============================================================
// DOROVNANIE DARU — správa charity: kto dorovnáva, v akom stave a čo
// z toho vidia darci. Parametre nastavuje FIRMA (sú to jej peniaze),
// charita ich nedostáva na schválenie — súhlas dala pri zbierke.
// Kým firma nezaplatí, charita vie dorovnanie odmietnuť.
// V prototype je firmová strana DEV formulár na tom istom mieste.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { ORG_ZBIERKY } from "./mock";
import {
  DOROVNANIE_CFG, useDorovnania, zapecat, potvrdPlatbu, odmietni, ukonci,
  vycerpane, zostatok, popisPomeru, bezi, type Dorovnanie,
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

/** bežec pri zbierke — čo dorovnanie dáva, koľko ostáva a dokedy */
export function DorovnaniePas({ d, onFirma }: { d: Dorovnanie; onFirma?: () => void }) {
  const zost = zostatok(d);
  const minute = zost <= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: tint(ZLATA, minute ? .07 : .13),
      border: `1px solid ${tint(ZLATA, minute ? .25 : .45)}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
      {d.firmaLogo
        ? <img src={d.firmaLogo} alt="" style={{ width: 30, height: 30, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />
        : <span style={{ flex: "none", fontSize: 18 }}>🤝</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>
          {minute ? `${d.firma} — strop vyčerpaný, ďakujeme` : <>{d.firma} dorovnáva <span style={{ color: ZLATA }}>{popisPomeru(d.pomer)}</span></>}
        </div>
        <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 1 }}>
          {minute
            ? `spolu pridala ${eur(vycerpane(d))}`
            : <>z {eur(d.strop)} ostáva <b style={{ color: C.text }}>{eur(zost)}</b> · do {datum(d.do)}</>}
        </div>
      </div>
      {onFirma && (
        <span {...pressable(onFirma, `Profil ${d.firma}`)} style={{ flex: "none", fontSize: 11.5, fontWeight: 800, color: "var(--a-info)", cursor: "pointer" }}>Profil ›</span>
      )}
    </div>
  );
}

// ---------- formulár firmy ----------
function Formular({ entita, toast, onHotovo, onSpat }: {
  entita: string; toast: (m: string) => void; onHotovo: () => void; onSpat: () => void;
}) {
  const [ciel, setCiel] = useState(ORG_ZBIERKY[0]?.id ?? "");
  const [firma, setFirma] = useState("");
  const [pomer, setPomer] = useState(DOROVNANIE_CFG.pomer);
  const [strop, setStrop] = useState("");
  // „od dnes" = od polnoci, nie od minúty vyplnenia — inak sa tesne po založení
  // tvári ako ešte nespustené
  const [od] = useState(() => new Date(new Date().toDateString()).getTime());
  const [doKedy, setDoKedy] = useState(() => Date.now() + 30 * DEN);
  const [zvysok, setZvysok] = useState<"zbierke" | "firme">("zbierke");
  const [potvrd, setPotvrd] = useState(false);

  const suma = Number(strop.replace(",", ".")) || 0;
  const zbierka = ORG_ZBIERKY.find((z) => z.id === ciel);
  const chyba = firma.trim().length < 2 ? "Napíšte názov firmy."
    : suma <= 0 ? "Zadajte, koľko celkom vyčleňujete."
    : doKedy <= od ? "Koniec musí byť neskôr než dnes."
    : null;

  if (potvrd) return (
    <Sheet onClose={onSpat} label="Zapečatiť dorovnanie">
      <div style={{ fontSize: 16, fontWeight: 800 }}>Skontrolujte a zapečaťte</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
        Po zapečatení sa parametre nedajú zmeniť — ani vami, ani nami. Chcete iné čísla? Zrušíte a založíte nové.
      </div>
      <div style={{ ...karta, background: tint(ZLATA, .1), border: `1px solid ${tint(ZLATA, .4)}` }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{firma.trim()} dorovnáva {popisPomeru(pomer)}</div>
        <div style={{ fontSize: 12.5, color: C.textSec, marginTop: 4, lineHeight: 1.6 }}>
          zbierka: <b style={{ color: C.text }}>{zbierka?.nazov}</b><br />
          k daru pridá: <b style={{ color: C.text }}>{pomer}× dar</b><br />
          celkom vyčleňuje: <b style={{ color: C.text }}>{eur(suma)}</b><br />
          beží: <b style={{ color: C.text }}>od dnes do {datum(doKedy)}</b><br />
          nevyčerpaný zvyšok: <b style={{ color: C.text }}>{zvysok === "zbierke" ? "ostáva zbierke" : "vráti sa firme"}</b>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Dorovnanie sa darcom ukáže až vtedy, keď peniaze prídu na účet charity. Sľubujeme len to, čo už tam leží.
      </div>
      <button style={btnHlavny} onClick={() => {
        zapecat({ entita, ciel, cielNazov: zbierka?.nazov ?? ciel, firma: firma.trim(), pomer, strop: suma, od, do: doKedy, zvysok });
        toast("Dorovnanie zapečatené — čaká sa na platbu");
        onHotovo();
      }}>Zapečatiť a poslať</button>
      <button style={{ ...btnDruhy, marginTop: SPACE.xs }} onClick={() => setPotvrd(false)}>Ešte upraviť</button>
    </Sheet>
  );

  return (
    <Sheet onClose={onSpat} label="Nové dorovnanie" pisanie>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Nové dorovnanie</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, marginBottom: SPACE.sm, lineHeight: 1.45 }}>
        Toto vypĺňa firma — sú to jej peniaze a jej podmienky. (V prototype to vyplníte za ňu.)
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Ktorú zbierku dorovnávate?</div>
      <select value={ciel} onChange={(e) => setCiel(e.target.value)} style={{ ...vstup, marginBottom: SPACE.sm }}>
        {ORG_ZBIERKY.map((z) => <option key={z.id} value={z.id}>{z.emoji} {z.nazov}</option>)}
      </select>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Firma</div>
      <input value={firma} onChange={(e) => setFirma(e.target.value)} placeholder="Napríklad: Pekáreň Kováč" style={{ ...vstup, marginBottom: SPACE.sm }} />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Koľko pridáte ku každému daru?</div>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {DOROVNANIE_CFG.pomery.map((x) => (
          <span key={x} {...pressable(() => setPomer(x), `${x}× dar`)}
            style={{ flex: 1, textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: pomer === x ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm,
              background: pomer === x ? tint(ZLATA, .14) : C.surface, border: `1px solid ${pomer === x ? tint(ZLATA, .5) : C.line}`, color: pomer === x ? ZLATA : C.textSec }}>
            {x}× dar <span style={{ fontWeight: 400, fontSize: 11 }}>({popisPomeru(x)})</span>
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Koľko celkom vyčleňujete? <span style={{ fontWeight: 400, color: C.textTer }}>— pošlete to vopred</span></div>
      <input value={strop} onChange={(e) => setStrop(e.target.value)} inputMode="decimal" placeholder="napr. 5000" style={{ ...vstup, marginBottom: SPACE.sm }} />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Dokedy to beží?</div>
      <input type="date" value={naDatum(doKedy)} onChange={(e) => setDoKedy(zDatumu(e.target.value, doKedy))} style={{ ...vstup, marginBottom: SPACE.sm }} />

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

      <button style={{ ...btnHlavny, marginTop: SPACE.md }} onClick={() => (chyba ? toast(chyba) : setPotvrd(true))}>Skontrolovať a zapečatiť</button>
      <button style={{ ...btnDruhy, marginTop: SPACE.xs }} onClick={onSpat}>Zrušiť</button>
    </Sheet>
  );
}

// ---------- zoznam v správe ----------
export function DorovnanieSheet({ entita, toast, onClose }: {
  entita: string; toast: (m: string) => void; onClose: () => void;
}) {
  const dorovnania = useDorovnania(entita);
  const [pisem, setPisem] = useState(false);
  const [teraz] = useState(() => Date.now());

  if (pisem) return <Formular entita={entita} toast={toast} onHotovo={() => setPisem(false)} onSpat={() => setPisem(false)} />;

  const stavText = (d: Dorovnanie) =>
    d.stav === "zapecatene" ? "čaká na platbu firmy"
    : d.stav === "aktivne" ? (bezi(d, teraz) ? `beží · ostáva ${eur(zostatok(d))}` : "beží, ale mimo obdobia")
    : d.stav === "vycerpane" ? `strop vyčerpaný · pridané ${eur(vycerpane(d))}`
    : d.stav === "ukoncene" ? `ukončené · pridané ${eur(vycerpane(d))}`
    : d.stav === "odmietnute" ? "odmietnuté charitou"
    : "zrušené firmou";

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
            zapečatené {datum(d.zapecatene)}{d.zaplatene ? ` · zaplatené ${datum(d.zaplatene)}` : ""}
            {d.zaznamy.length > 0 ? ` · ${d.zaznamy.length} dorovnaných darov` : ""}
          </div>
          <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs, flexWrap: "wrap" }}>
            {d.stav === "zapecatene" && (<>
              <span {...pressable(() => { potvrdPlatbu(entita, d.id); toast("Peniaze potvrdené — dorovnanie beží"); }, "Potvrdiť platbu")}
                style={{ fontSize: 11.5, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>✓ Peniaze prišli — spustiť</span>
              <span {...pressable(() => { odmietni(entita, d.id); toast("Dorovnanie odmietnuté"); }, "Odmietnuť")}
                style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Odmietnuť</span>
            </>)}
            {d.stav === "aktivne" && (
              <span {...pressable(() => { ukonci(entita, d.id); toast("Dorovnanie ukončené"); }, "Ukončiť")}
                style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Ukončiť</span>
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
