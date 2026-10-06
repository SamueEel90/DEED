// ============================================================
// NAŠE ZBIERKY (správa firmy) — JEDNO miesto, kde firma pracuje so zbierkou.
// Zoznam je len rozcestník: každý riadok sa otvorí do detailu, kde je všetko
// k tej jednej zbierke — parametre dorovnania, naši ľudia, ESG čísla a archív.
// Preto tu nie je samostatná položka „Dorovnanie darov": dorovnanie nie je vec
// sama o sebe, vždy patrí ku konkrétnej zbierke.
//
// Čo firma smie: založiť dorovnanie (a pri ňom si zvoliť režim), doliať strop,
// stiahnuť zbierku zo svojej stránky. Nič viac — peniaze sú predplatené a ležia
// na účte charity. Pozastaviť a vrátiť zvyšok vie len charita.
//
// Režim (verejné / len naši ľudia) sa volí pri zakladaní a platí do konca behu.
// Nedá sa prepínať za pochodu: strop je zaplatený a rozdelený medzi darcov,
// ktorým bol sľúbený. Ďalší beh môže byť v inom režime.
// ============================================================
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { PlatbaModal } from "@/components/platba";
import { najdiZbierku } from "@/lib/zbierky";
import { najdiKampan } from "@/features/cudzi-profil/orgy";
import { usePodporyFirmy, archivuj, vratZArchivu, type Podpora } from "@/lib/podpory";
import { zamestnanci as zamestnanciFirmy } from "@/lib/zamestnanci";
import {
  useDorovnaniaFirmy, dolejStrop, vycerpane, zostatok, popisPomeru, casAutomatu,
  bezi as beziDorovnanie, type Dorovnanie,
} from "@/lib/dorovnanie";
import { DorovnanieFirmyHarok } from "@/features/zbierka/DorovnanieFirmy";

const ZLATA = "var(--a-gold)";
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.sm,
};
const cip = (farba: string): CSSProperties => ({
  flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em",
  color: farba, background: tint(farba, .14), borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px`,
});
const btnHlavny: CSSProperties = {
  width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer",
  fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "var(--a-green)", color: "#06281d",
};
const vstupPole: CSSProperties = {
  width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`,
  borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 16, fontFamily: "inherit", outline: "none",
};
const nadpisSekcie: CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer,
  margin: `${SPACE.md}px 0 ${SPACE.xs}px`,
};

/** názov a stav zbierky — naša (register) aj cudzia (profil organizácie v module Charita) */
function oZbierke(id: string) {
  const z = najdiZbierku(id);
  // `nasa` = zbierka z registra DEED, ktorú vieme spravovať (dorovnanie sa dá
  // založiť len k nej); cudzie kampane z profilov organizácií vieme len pomenovať
  if (z) return { nazov: z.nazov, komu: z.komu, emoji: z.emoji, aktivna: z.stav === "aktivna", nasa: true };
  const k = najdiKampan(id);
  if (k) return { nazov: k.kampan.nazov, komu: k.org, emoji: k.kampan.emoji, aktivna: true, nasa: false };
  return null;
}

/** dorovnanie, ktoré na zbierke práve žije (beží alebo čaká na potvrdenie charity) */
const zivé = (d: Dorovnanie, teraz: number) =>
  beziDorovnanie(d, teraz) || d.stav === "zapecatene" || d.stav === "vycerpane";

// ============================================================
// DETAIL ZBIERKY — pracovná plocha jednej zbierky
// ============================================================
function DetailZbierky({ firma, podpora, dorovnanie, toast, onSpat }: {
  firma: string; podpora: Podpora; dorovnanie?: Dorovnanie;
  toast: (m: string) => void; onSpat: () => void;
}) {
  const [teraz] = useState(() => Date.now());
  const [nove, setNove] = useState(false);
  const [doliatie, setDoliatie] = useState("");
  const [platba, setPlatba] = useState(0);
  const z = oZbierke(podpora.zbierkaId);
  const d = dorovnanie;
  const archiv = !!podpora.archivovane;

  // ---- naši ľudia: Zadanie 1 · Blok 1 — zoskupené podľa ČÍSLA ÚČTU darcu, meno je len popis
  //      (dvaja „Jozef Novák" sú dva riadky; staré záznamy bez čísla účtu ostávajú každý zvlášť) ----
  const nasi = zamestnanciFirmy(firma);
  const podlaLudi = new Map<string, { meno: string; suma: number; dorovnane: number; pocet: number }>();
  (d?.zaznamy ?? []).forEach((zz) => {
    const kluc = zz.darcaUcet || `zaznam:${zz.id}`;
    const p = podlaLudi.get(kluc) ?? { meno: zz.darca?.trim() || "Darca bez mena", suma: 0, dorovnane: 0, pocet: 0 };
    podlaLudi.set(kluc, { ...p, suma: p.suma + zz.dar, dorovnane: p.dorovnane + zz.dorovnane, pocet: p.pocet + 1 });
  });
  const ludia = [...podlaLudi.values()].map((p) => [p.meno, p] as const).sort((a, b) => b[1].suma - a[1].suma);
  const daliLudia = (d?.zaznamy ?? []).reduce((s, zz) => s + zz.dar, 0);
  const daliMy = podpora.suma;
  const vycleneneNerozdane = d ? zostatok(d) : 0;

  const stavRiadok = !d ? "Dorovnávanie tu nebeží."
    : d.stav === "zapecatene" ? `Čaká na potvrdenie charity — spustí sa samo ${casAutomatu(d, teraz)}`
    : d.stav === "vycerpane" ? "Strop je vyčerpaný — doliatím sa dorovnávanie znova rozbehne"
    : d.stav === "pozastavene" ? "Charita zbierku pozastavila — vyrovnáva sa zvyšok"
    : d.stav === "ukoncene" ? "Ukončené" : beziDorovnanie(d, teraz) ? "Beží" : "Mimo obdobia";

  const dlazdica = (k: string, v: string, farba?: string) => (
    <div key={k} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: farba ?? C.text }}>{v}</div>
      <div style={{ fontSize: 10, color: C.textTer, marginTop: 1, lineHeight: 1.3 }}>{k}</div>
    </div>
  );

  if (nove && z) return (
    <DorovnanieFirmyHarok zbierkaId={podpora.zbierkaId} zbierkaNazov={z.nazov} firma={firma} onClose={() => setNove(false)} />
  );

  return (<>
    <Sheet onClose={onSpat} label={z?.nazov ?? "Zbierka"} pisanie>
      <div {...pressable(onSpat, "Späť na zoznam")}
        style={{ fontSize: 12.5, fontWeight: 700, color: C.textTer, cursor: "pointer", marginBottom: SPACE.xs }}>
        ‹ Naše zbierky
      </div>

      {/* ---- hlavička ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
        <span style={{ fontSize: 22, flex: "none" }}>{z?.emoji ?? "🤝"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>{z?.nazov ?? "Zbierka"}</div>
          {z?.komu && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 1 }}>{z.komu}</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm, flexWrap: "wrap" }}>
        {d && (
          <span style={cip(d.lenZamestnanci ? "var(--a-plum)" : ZLATA)}>
            {d.lenZamestnanci ? "LEN NAŠI ĽUDIA" : "VEREJNÉ DOROVNANIE"}
          </span>
        )}
        {archiv && <span style={cip("var(--a-clay)")}>STIAHNUTÁ ZO STRÁNKY</span>}
        {!archiv && <span style={cip(z?.aktivna ? "var(--a-green)" : C.textTer)}>{z?.aktivna ? "ZBIERKA BEŽÍ" : "ZBIERKA UKONČENÁ"}</span>}
      </div>

      {/* ---- 1) DOROVNANIE ---- */}
      <div style={nadpisSekcie}>DOROVNANIE</div>
      {d ? (
        <div style={karta}>
          <div style={{ fontSize: 13, fontWeight: 800, color: ZLATA }}>
            🤝 dorovnávame {popisPomeru(d.pomer)}
          </div>
          <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2 }}>{stavRiadok}</div>
          <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm }}>
            {dlazdica("Strop", eur(d.strop))}
            {dlazdica("Rozdané darcom", eur(vycerpane(d)), ZLATA)}
            {dlazdica("Ostáva", eur(zostatok(d)))}
          </div>
          <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.5 }}>
            {d.doVycerpania ? "Beží, kým sa strop neminie — bez dátumu konca." : `Do ${datum(d.do)}.`}
            {" "}
            {d.lenZamestnanci
              ? "Rátajú sa len dary vašich pripojených ľudí."
              : "Dorovnáva sa každý dar, nech ho dá ktokoľvek."}
          </div>

          {/* doliatie stropu — jediná zmena, ktorú firma smie urobiť */}
          {(d.stav === "aktivne" || d.stav === "zapecatene" || d.stav === "vycerpane") && (
            <div style={{ marginTop: SPACE.sm, paddingTop: SPACE.sm, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Doliať strop</div>
              <div style={{ fontSize: 10.5, color: C.textTer, lineHeight: 1.45, marginBottom: SPACE.xs }}>
                Pridá sa navrch k tomu, čo tu ešte ostáva. Znížiť strop ani dorovnanie zrušiť sa nedá —
                peniaze sú už na účte charity a darcom bol dorovnaný dar sľúbený.
              </div>
              <div style={{ display: "flex", gap: SPACE.xs }}>
                <input value={doliatie} onChange={(e) => setDoliatie(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal" placeholder="napr. 300" style={{ ...vstupPole, flex: 1 }} />
                <button style={{ ...btnHlavny, width: 120, opacity: Number(doliatie) > 0 ? 1 : .45 }}
                  onClick={() => {
                    const suma = Math.round(Number(doliatie) * 100) / 100;
                    if (!(suma > 0)) { toast("Zadajte sumu"); return; }
                    setPlatba(suma);
                  }}>Uhradiť</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={karta}>
          <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.55 }}>
            Na tejto zbierke nedorovnávate — je podporená len vaším darom.
          </div>
          {z?.nasa && z?.aktivna && !archiv ? (
            <button style={{ ...btnHlavny, marginTop: SPACE.sm }} onClick={() => setNove(true)}>
              Založiť dorovnanie
            </button>
          ) : (
            <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.45 }}>
              Dorovnanie sa dá založiť len pri bežiacej zbierke z <DeedZnacka />.
            </div>
          )}
          {z?.nasa && z?.aktivna && !archiv && (
            <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.45 }}>
              Pri zakladaní si zvolíte režim — verejné dorovnanie, alebo len pre vašich ľudí.
              Režim potom platí do konca behu.
            </div>
          )}
        </div>
      )}

      {/* ---- 2) NAŠI ĽUDIA ---- */}
      <div style={nadpisSekcie}>NAŠI ĽUDIA V TEJTO ZBIERKE</div>
      {ludia.length > 0 ? (
        <div style={karta}>
          {ludia.map(([kto, s], i) => (
            <div key={kto} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xs}px 0`,
              borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
                background: tint("var(--a-info)", .16), color: "var(--a-info)", fontSize: 12, fontWeight: 800 }}>
                {kto[0]?.toUpperCase() ?? "?"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kto}</div>
                <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 1 }}>
                  {s.pocet} {s.pocet === 1 ? "dar" : s.pocet < 5 ? "dary" : "darov"}
                </div>
              </div>
              <div style={{ flex: "none", textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{eur(s.suma)}</div>
                <div style={{ fontSize: 10.5, color: ZLATA, fontWeight: 700 }}>+{eur(s.dorovnane)} od nás</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...karta, fontSize: 11.5, color: C.textTer, lineHeight: 1.5 }}>
          {!d ? "Bez dorovnania sa dary ľudí k firme nerátajú — nevieme, kto z vašich do zbierky dal."
            : d.lenZamestnanci
            ? `Zatiaľ sem nedal nikto z vašich ľudí. Pripojených máte ${nasi.length}.`
            : "Zatiaľ ste nedorovnali žiadny dar."}
        </div>
      )}

      {/* ---- 3) ESG ---- */}
      <div style={nadpisSekcie}>ESG — ČO Z TEJTO ZBIERKY VYKÁŽETE</div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        {dlazdica("Dali ľudia", eur(daliLudia))}
        {dlazdica("Dali sme my", eur(daliMy), ZLATA)}
        {dlazdica("Spolu", eur(daliLudia + daliMy))}
        {dlazdica("Zapojených", String(ludia.length))}
      </div>
      {vycleneneNerozdane > 0 && (
        <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.45 }}>
          Vyčlenených {eur(vycleneneNerozdane)} sa do „dali sme my" neráta — peniaze sú na účte charity,
          ale ešte sa nerozdali darcom.
        </div>
      )}

      {/* ---- 4) STRÁNKA ---- */}
      <div style={nadpisSekcie}>NAŠA STRÁNKA</div>
      <div style={karta}>
        <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.5 }}>
          {archiv
            ? "Zbierka je stiahnutá z vašej stránky. Dar aj ESG čísla ostávajú — len sa neprezentuje."
            : "Zbierka je na vašej stránke, lebo ste na ňu dali. Stiahnuť ju viete kedykoľvek."}
        </div>
        <div {...pressable(() => {
          if (archiv) { vratZArchivu(firma, podpora.zbierkaId); toast("Zbierka je späť na vašej stránke"); }
          else { archivuj(firma, podpora.zbierkaId); toast("Stiahnuté zo stránky — dar aj ESG ostávajú"); }
        }, archiv ? "Vrátiť na stránku" : "Stiahnuť zo stránky")}
          style={{ marginTop: SPACE.xs, fontSize: 12.5, fontWeight: 800, color: archiv ? "var(--a-info)" : C.textTer, cursor: "pointer" }}>
          {archiv ? "Vrátiť na stránku" : "Stiahnuť zo stránky"}
        </div>
      </div>
    </Sheet>

    {platba > 0 && d && (
      <PlatbaModal kanal="EUR" suma={platba} komu={`doliatie dorovnania · ${z?.nazov ?? ""}`}
        onClose={() => setPlatba(0)}
        onDone={() => {
          const ok = dolejStrop(d.entita, d.id, platba);
          setPlatba(0); setDoliatie("");
          toast(ok ? `Strop doliaty o ${eur(platba)}` : "Doliatie sa nepodarilo");
        }} />
    )}
  </>);
}

// ============================================================
// ZOZNAM — rozcestník, každý riadok vedie do detailu
// ============================================================
export function NaseZbierkySheet({ firma, toast, onClose }: {
  firma: string; toast: (m: string) => void; onClose: () => void;
}) {
  const [otvorena, setOtvorena] = useState<string | null>(null);
  const podpory = usePodporyFirmy(firma);
  const dorovnania = useDorovnaniaFirmy(firma);
  const [teraz] = useState(() => Date.now());

  const dorovnanieKu = (zbierkaId: string): Dorovnanie | undefined =>
    dorovnania.find((d) => d.ciel === zbierkaId && zivé(d, teraz))
    ?? dorovnania.find((d) => d.ciel === zbierkaId);

  const dane = podpory.reduce((a, p) => a + p.suma, 0);
  const vyclenene = dorovnania.filter((d) => d.stav === "aktivne" || d.stav === "zapecatene").reduce((a, d) => a + zostatok(d), 0);
  const cakaju = dorovnania.filter((d) => d.stav === "zapecatene").length;

  const otvorenaPodpora = podpory.find((p) => p.zbierkaId === otvorena);
  if (otvorenaPodpora) return (
    <DetailZbierky firma={firma} podpora={otvorenaPodpora} dorovnanie={dorovnanieKu(otvorenaPodpora.zbierkaId)}
      toast={toast} onSpat={() => setOtvorena(null)} />
  );

  const riadok = (p: Podpora) => {
    const z = oZbierke(p.zbierkaId);
    const d = dorovnanieKu(p.zbierkaId);
    const archiv = !!p.archivovane;
    const bezi = d && beziDorovnanie(d, teraz);
    // čo firma môže s touto zbierkou práve urobiť — riadok nesie akciu, nie len číslo
    const akcia = d?.stav === "zapecatene" ? { t: "čaká na charitu", f: "var(--a-clay)" }
      : d?.stav === "vycerpane" ? { t: "strop minutý — doliať", f: "var(--a-clay)" }
      : bezi ? { t: `ostáva ${eur(zostatok(d!))}`, f: ZLATA }
      : !d && z?.nasa && z?.aktivna && !archiv ? { t: "+ založiť dorovnanie", f: "var(--a-info)" }
      : { t: "otvoriť", f: C.textTer };
    return (
      <div key={p.zbierkaId} {...pressable(() => setOtvorena(p.zbierkaId), z?.nazov ?? "Zbierka")}
        style={{ ...karta, opacity: archiv ? .7 : 1, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
          <span style={{ fontSize: 18, flex: "none" }}>{z?.emoji ?? "🤝"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {z?.nazov ?? "Zbierka"}
            </div>
            {z?.komu && <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{z.komu}</div>}
          </div>
          <span style={{ flex: "none", fontSize: 16, color: C.textTer }}>›</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.xs, flexWrap: "wrap" }}>
          {d && (
            <span style={cip(d.lenZamestnanci ? "var(--a-plum)" : ZLATA)}>
              {d.lenZamestnanci ? "LEN NAŠI ĽUDIA" : "VEREJNÉ DOROVNANIE"}
            </span>
          )}
          {archiv && <span style={cip("var(--a-clay)")}>STIAHNUTÁ</span>}
          <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 800, color: akcia.f }}>{akcia.t}</span>
        </div>

        <div style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>
          dali sme {eur(p.suma)}{d ? ` · rozdané darcom ${eur(vycerpane(d))}` : ""}
        </div>
      </div>
    );
  };

  const bezia = podpory.filter((p) => !p.archivovane && oZbierke(p.zbierkaId)?.aktivna);
  const ostatne = podpory.filter((p) => !bezia.includes(p));

  return (
    <Sheet onClose={onClose} label="Naše zbierky">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🎯 Naše zbierky</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Každá zbierka, na ktorú ste dali, má tu svoju plochu — dorovnanie, naši ľudia, ESG čísla.
        Otvorte riadok.
      </div>

      {cakaju > 0 && (
        <div style={{ ...karta, background: tint("var(--a-clay)", .1), border: `1px solid ${tint("var(--a-clay)", .35)}`, fontSize: 11.5, lineHeight: 1.5 }}>
          {cakaju === 1 ? "Jedno dorovnanie čaká" : `${cakaju} dorovnania čakajú`} na potvrdenie charity.
          Ak ho nepotvrdí, spustí sa samo do 48 hodín — vaše peniaze nikde neležia.
        </div>
      )}

      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {[["Podporujeme", String(bezia.length)], ["Dali sme", eur(dane)], ["Ostáva na dorovnávanie", eur(vyclenene)]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 1 }}>{k}</div>
          </div>
        ))}
      </div>

      {bezia.map(riadok)}
      {ostatne.length > 0 && (
        <>
          <div style={nadpisSekcie}>UKONČENÉ A STIAHNUTÉ</div>
          {ostatne.map(riadok)}
        </>
      )}

      {!podpory.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ ste nepodporili žiadnu zbierku.<br />Nájdite si charitu, otvorte jej zbierku a darujte — objaví sa tu aj na vašej stránke.
        </div>
      )}
    </Sheet>
  );
}
