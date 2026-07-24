// ============================================================
// MOCK hodnotiteľ — simulácia Opusa BEZ API kľúča
// ------------------------------------------------------------
// Účel: overiť celý flow (tri vetvy skladačky, kotvy, kredibilita,
// dopočet skóre/pásma, log, kalibrácia) skôr, než príde reálny kľúč.
// Heuristiky zrkadlia pravidlá SCORING_PROMPT; VŠETKY čísla berie
// z scoring-config.json — mock nemá vlastné konštanty.
//
// Zapína sa: SCORING_MOCK=1, alebo chýbajúci ANTHROPIC_API_KEY mimo
// produkcie. V produkcii bez kľúča NIKDY nemockuje (vráti „nedostupné“),
// aby falošné skóre neušlo do ostrého behu.
// ============================================================
import type { OpusVystup, ScoringConfig, Stupen } from "./typy";

/** lowercase + odstránená diakritika — kľúčové slová chytia aj „pozar“ aj „požiar“ */
const bez = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export interface MockVstup {
  opis: string;
  miesto: string;
  anonymne: boolean;
  pocetFotiek: number;
  maVideo: boolean;
  kolo: number;
}

export function mockOhodnot(cfg: ScoringConfig, v: MockVstup): { vystup: OpusVystup; surovyText: string; parseRetry: boolean } {
  const t = bez(v.opis);

  // BEZPEČNOSŤ — injection je DÁTA, nie inštrukcia; flag + hodnotí sa obsah
  const injectionFlag =
    /ignoruj (pravidla|pokyny|instrukcie)|daj (mi )?(10|desiatku|max)|testovac(i|om) (mod|rezim)|system ?prompt|si (v )?(vyvojarsk|testovac)/.test(t);

  // KROK 1a — HRUBÝ ROZPOR (v teste simulovaný textom — doplnok §1: EXIF/GPS rozpor sa píše do opisu)
  const rozpor =
    /fotka (je )?z (minul|ineho|vlan)|gps (je |bolo )?inde|exif nesedi|nesedi (datum|cas|miesto)|stara fotka|recyklovan|fotka nesedi|dokaz protireci/.test(t);
  if (rozpor) {
    const vystup: OpusVystup = {
      verdikt: "zamietnut",
      zamietnutieDovod: "hrubý rozpor opisu a dôkazu (simulovaný v texte) — bez otázok, otázka = druhý pokus pre podvodníka",
      injectionFlag,
    };
    return zabal(vystup);
  }

  // KROK 1b — CHÝBA DIELIK → max jedno kolo otázok (2. kolo rieši backend prepnutím na zamietnut)
  const cistyOpis = v.opis.split("--- Doplnenie:")[0].trim();
  if (v.kolo === 1 && (cistyOpis.length < 60 || !v.miesto.trim())) {
    const otazky = [
      "Komu presne si pomohol a ako?",
      !v.miesto.trim() ? "Kde sa to stalo?" : "Kedy sa to stalo a ako dlho to trvalo?",
      "Máš k tomu nejaký dôkaz (fotku, QR akcie)?",
    ].slice(0, cfg.otazky.max_pocet);
    return zabal({ verdikt: "doplnit", otazky, injectionFlag });
  }

  // KROK 2 — TYP SKUTKU
  const typ: OpusVystup["typ"] =
    /poslal peniaze|prispel na ucet|daroval \d+ ?(€|eur)/.test(t) ? "DAR"
    : /pre seba|(vlastn(y|u|om|eho)|svoj(om)?) (dvor|zahrad|byt|dom|zdravi)/.test(t) ? "OSOB"
    : /qr akcie|dobrovolnick(a|ej) akci|cez akciu|organizovan(a|e|ej) (akci|zbierk|brigad)/.test(t) ? "ORGANIZOVANE"
    : "KOM";

  // KROK 3 — DOPAD (kotvy, ber vyššie z hĺbky/šírky, NEINTERPOLUJ)
  const dopad: Stupen =
    /topiac|zachranil (zivot|cloveka)|pestunstv|\b[23]\d\b rodin|zmenil (mu|jej) osud|z horiaceho/.test(t) ? 10
    : /zorganizoval|pravidelne|hospic|upratovanie (ulice|parku)|viacerym|celej komunite|kazdy tyzden/.test(t) ? 6
    : /senior|dochodc|imobil|chor(y|u|ej|emu)|ztp|bez domova|bezdomov|dieta|v nudzi|utulk|zvierat/.test(t) ? 3
    : 1;

  // KROK 4 — NÁROČNOSŤ (ber vyššie z času/rizika/peňazí/zručnosti)
  const narocnost: Stupen =
    /\b(dni|dna dni|tyzdn\w*)\b|riskoval|vlastny zivot|z (ladovej |studenej )?vody|nebezpec/.test(t) ? 10
    : /cely den|pol dna|celodenn|strech|odborn|opravil|instalater|elektrikar/.test(t) ? 6
    : /hodin|odviezol|nakupil|za svoje|material|benzin|navaril|uvaril/.test(t) ? 3
    : 1;

  // KROK 5 — NEZIŠTNOSŤ (len dve hodnoty z configu)
  const nezistnost = v.anonymne ? cfg.nezistnost.anonymne : cfg.nezistnost.zverejnene;

  // KROK 6 — KREDIBILITA: signály podľa configu (mock obsah fotiek nevidí →
  // 1 fotka = spodok pásma jasných, 2–3 = vrch; QR simulované textom = plná)
  const sila = cfg.kredibilita.sila_dokazu;
  const signaly: string[] = [];
  let kredibilita: number;
  if (/qr akcie|naskenoval som qr|prikladam qr/.test(t)) {
    kredibilita = cfg.kredibilita.qr_organizovana_akcia.hodnota;
    signaly.push("QR organizovanej akcie (v teste simulované textom)");
  } else if (v.pocetFotiek >= 2) {
    kredibilita = sila.jasne_fotky.max;
    signaly.push(`${v.pocetFotiek} fotky zachytávajúce skutok (mock — obsah nehodnotený)`);
  } else if (v.pocetFotiek === 1) {
    kredibilita = sila.jasne_fotky.min;
    signaly.push("1 fotka (mock — obsah nehodnotený)");
  } else {
    kredibilita = sila.len_text;
    signaly.push("len textový opis, žiadny dôkaz");
  }
  if (/prikladam gps|gps z garminu/.test(t)) signaly.push("simulovaný GPS záznam sedí s miestom");
  if (v.maVideo) signaly.push("user priložil video — v teste sa neanalyzuje");
  kredibilita = Math.min(1, kredibilita);

  // KROK 7 — KRÍZOVÝ REŽIM: typ situácie, NIE „veľmi dobrý skutok“
  const krizovyRezim = /povod(en|n)|zemetrasen|poziar (domu|domova|bytu)|\bsos\b|hromadn(a|ej) nudz|evakuaci/.test(t);

  // KROK 8 — UČESANÝ TEXT: forma, nie obsah (mock: orezanie + prvé vety + veľké písmeno)
  const ucesanyText = ucesi(cistyOpis);

  const kotvaD = cfg.dopad.kotvy[String(dopad) as "1" | "3" | "6" | "10"];
  const kotvaN = cfg.narocnost.kotvy[String(narocnost) as "1" | "3" | "6" | "10"];
  const vystup: OpusVystup = {
    verdikt: "ok",
    typ,
    dopad,
    dopadZdovodnenie: `stupeň ${dopad}, lebo pripomína kotvu: ${kotvaD.popis.toLowerCase()} (napr. ${kotvaD.priklady[0]})`,
    narocnost,
    narocnostZdovodnenie: `stupeň ${narocnost}, lebo pripomína kotvu: ${kotvaN.popis.toLowerCase()} (napr. ${kotvaN.priklady[0]})`,
    nezistnost,
    kredibilita,
    kredibilitaSignaly: signaly,
    krizovyRezim,
    ucesanyText,
    injectionFlag,
  };
  return zabal(vystup);
}

/** surovyText = JSON ako od reálneho modelu → log má rovnaký tvar ako ostrý beh */
function zabal(vystup: OpusVystup) {
  return { vystup, surovyText: JSON.stringify(vystup, null, 2), parseRetry: false };
}

function ucesi(opis: string): string {
  let s = opis.replace(/\s+/g, " ").trim();
  // odstráň zjavné injection frázy z karty (obsah skutku ostáva)
  s = s.replace(/ignoruj [^.!?]*[.!?]?/gi, "").replace(/daj (mi )?(10|desiatku|max)[^.!?]*[.!?]?/gi, "").trim();
  // max ~2 vety / 180 znakov
  const vety = s.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  s = (vety || s).slice(0, 180).trim();
  if (!s) s = "Dobrý skutok.";
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}
