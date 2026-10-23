// KARTA 50 · §2 Správa farnosti — rovnaká kostra ako Správa charity (SpravaStranky), položky farnosti.
// KARTA 56D: Správa od prvého príchodu — všetky funkcie, žiadne ukážkové dáta (prototyp „Sprava farnosti - prvy prichod").
// Profil, logo a percento = profil_stranky (ako charita), pripnuté = sprava_piny, hlavná zbierka = profil_stranky.centralna.
// Omše, oznamy a nastavenia farnosti z modulu Viera (stav.ts — localStorage + zrkadlo naboz_stav) pod kľúčom stránky.
import { StatistikyFarnosti, SledujuciFarnosti, RocnyVypis } from "./StatistikyFarnosti";
import { UcetFarnostiKarta, UcetFarnostiNastavenia, useUcetFarnosti } from "./UcetFarnosti";
import { VecnaNova, VecnaSprava } from "./VecnaZbierkaSprava";
import { useVecneZbierky, fotoVecnej, doKedyText, type VecnaZbierka } from "@/lib/vecnaZbierka";
import { NADPIS_SEKCIE } from "./KartaNastavenia";
import { TlZbalit } from "@/features/verejny-profil/zbalit";
import { cielSpravyPre } from "@/lib/mojeStranky";
import { UsporiadatStranku } from "./UsporiadatStranku";
import { FarbaLinii } from "./FarbaLinii";
import { VzhladStranky } from "./VzhladStranky";
import { Atelier } from "./Atelier";
import { ListaNeverejna, KartyZverejnenia, OknoZverejnit } from "./ZverejnenieStranky";
import { PrveKrokySvetlusik, type KrokSprievodcu } from "./PrveKrokySvetlusik";
import { SvetlusikKarta } from "@/components/SvetlusikInfo";
import { cistyText } from "@/lib/richtext";
import { citajNastavenie, maNastavenie } from "@/lib/nastaveniaStranky";
import { useNeverejna } from "@/lib/zverejnenieStranky";
import { KostolyMiesta } from "./KostolyMiesta";
import { useMiesta } from "@/lib/miestaFarnosti";
import { ZdrojFotiekKontext, zdrojFarnosti } from "@/components/VyberZGalerie";
import { fotkyFarnosti } from "@/lib/galeriaFotiek";
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { pripojTestovaciuStranku } from "@/lib/stranka";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { toast } from "@/components/toast";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { koniecZbierky, dniDoKonca, datumKonca, predlzZbierku } from "@/lib/koniecZbierky";
import { odFarnikov, pocetyOdVeriacich, useOdFarnikov, useCerstveOdFarnikov, DRUHY_FARNIKA, type PolozkaFarnika } from "@/lib/odFarnikov";
import { useOdVVidene, videneOdV, oznacOdVVidene, useVideneSekcie, videneSekcie, oznacSekciuVidenu } from "@/lib/odVeriacichVidene";
import { usePouzivatel } from "@/lib/pouzivatel";
import { vlastnePrispevky as prispevkyNaStranke } from "@/features/viera/mock";
import { OdVeriacich, type CastOdVeriacich } from "./OdVeriacich";
import { OmseKalendar, TyzdenVPrehlade } from "./OmseKalendar";
import { OznamyFarnosti } from "./OznamyFarnosti";
import { NastenkaFarnosti } from "@/features/verejny-profil/NastenkaFarnosti";
import { TlacidloNastavenia, LogoKarty } from "./spravaCasti";
import { QrNastroje } from "./QrNastroje";
import { PodakovatDarcom } from "./PodakovatDarcom";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { UpravitProfilCharity } from "./UpravitProfilCharity";
import { NovaZbierka } from "./NovaZbierka";
import { SpravaZbierkyFarnosti, stitokZbierkyF, fotoZbierky, rozdelenieZbierkyF } from "./SpravaZbierkyFarnosti";
import { ZbierkaSOverovatelom, type SpatZbierky } from "./ZbierkaPreVeriacich";
import { cielCislo, nacitajZbierkyStranky, useZmenyZbierok, zbierkyStrankyZPamate, type SpustenaZbierka } from "@/lib/novaZbierka";
import "@/styles/sprava.css";
import { SektorDarcuKontext, darcoviaPre, identitaDarcu, nastavCiste, sucetDarov, useZmenyDarov } from "@/lib/darcovia";
import { SpravaCentralnej } from "./SpravaCentralnej";
import { SpravaZvoncek } from "./SpravaZvoncek";
import { useZvoncek, nazovZvoncek } from "@/lib/zvoncekZbierka";
import { centralnaZPamate, hlavnaBezi, nacitajCentralnuZbierku, nazovHlavnej, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { suhrnHlavnej, useZvoncekOkno, nadpisOkna, nadpisOmse, nazovMalym, riadokOmse, omseZvoncek } from "@/lib/zvoncekOmse";
import { kostolKal } from "@/lib/kalendarFarnosti";
import { CirkevFarnosti } from "./CirkevFarnosti";
import { PripnutieVyber, PripnuteZoznam } from "./PripnuteZbierky";
import { LudiaFarnosti } from "./LudiaFarnosti";
import { BrigadyFarnosti } from "./BrigadyFarnosti";
import { useSlovaFarnosti, sledujuciMiest } from "@/lib/mojeFarnosti";
import { usePrispela } from "@/lib/farnostPrispela";
import type { OtazkyFaq } from "./NastaveniaCharity";
import { DetiMladezFarnosti } from "./DetiMladezFarnosti";
import { PredplatnePas, PredplatneFarnosti } from "./PredplatneFarnosti";
import { ObrOznamenia, ObrUdaje, ObrZariadenia, ObrSuhlasy, ObrFaq, ObrPodpora } from "./NastaveniaCharity";
import { nacitajNastavenia } from "@/lib/nastaveniaStranky";
import { useUrovenStranky } from "@/lib/mojeStranky";
import { najdiTestProfil } from "@/lib/testProfily";
import { cistyNazov, monogramZNazvu, nacitajProfil, profilZPamate, uplnostProfilu, type ProfilStranky } from "@/lib/profilStranky";
import { nacitajPiny, pinyZPamate, ulozPiny } from "@/lib/spravaPiny";
import { useHromadnyVyber, TlacidloVyberu, ListaVyberu, PolickoVyberu, PasVyberu } from "@/components/HromadnyVyber";
import { Volby } from "@/components/Volby";
import { sumaEur } from "@/lib/suma";

type Sub = "prehlad" | "zbierky" | "omse" | "oznamy" | "veriaci" | "ludia" | "filialky" | "penazenka" | "nastroje" | "profil" | "nast" | "hlavna" | "nahlad" | "zbierka" | "nova" | "n" | "zvoncek";
/** sekcie, ktoré sa dajú pripnúť v Prehľade (najviac 6) */
type Pin = Exclude<Sub, "prehlad" | "hlavna" | "nahlad" | "zbierka" | "nova" | "zvoncek">;
const PINY: Pin[] = ["zbierky", "omse", "oznamy", "veriaci", "ludia", "filialky", "penazenka", "nastroje", "profil", "nast"];
const PIN_MAX_F = 6;
const IC: Record<string, string> = {
  zbierky: "M12 21s-7-4.5-9-9.5C1.6 7.9 4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.4 2.9 4 6.5-2 5-9 9.5-9 9.5z", omse: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  oznamy: "M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6", ludia: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c1.6.6 2.6 2.4 3 5",
  penazenka: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4 2 4M16 13.5h.01", nastroje: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 17v3h-3",
  prehlad: "M3 13h4v7H3zM10 8h4v12h-4zM17 4h4v16h-4z", profil: "M4 20h4L18 10l-4-4L4 16zM13 7l4 4",
  nast: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  verejny: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  veriaci: "M4 5h16v11H9l-5 4zM9 10h6", filialky: "M3 21h18M6 21V11l6-5 6 5v10M12 3v3M10 4.5h4M10 21v-5h4v5", stat: "M3 13h4v7H3zM10 8h4v12h-4zM17 4h4v16h-4z",
  pin: "M9 4h6l-1 6 3 3H7l3-3zM12 13v7",
  // OPRAVY 344: ikony dlaždíc
  kriz: "M12 3v18M7 8h10", ok: "M20 6 9 17l-5-5", namiet: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  osoba: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6", brigada: "M14 6l4 4-9 9H5v-4zM12 8l4 4",
  dieta: "M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 22v-7l-2-4 6-2 6 2-2 4v7", vypis: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 14h8M8 18h5",
  zvon: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4", zariadenie: "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  otaz: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", dole: "M6 9l6 6 6-6", kostol: "M4 21h16M5 21V10M19 21V10M9 21V10M15 21V10M3 10l9-6 9 6z",
};
/** OPRAVY 344: ikona Usporiadať (rovnaká ako IK_PORADIE, ako jedna cesta) */
const IK_PORADIE_D = "M4.5 3.5h15a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 7V5a1.5 1.5 0 0 1 1.5-1.5zM4.5 10.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 19v-7a1.5 1.5 0 0 1 1.5-1.5zM17.5 10.5h2a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5v-7a1.5 1.5 0 0 1 1.5-1.5z";
const TIT: Record<Sub, string> = { prehlad: "Prehľad", zbierky: "Zbierky", omse: "Omše a kalendár", oznamy: "Oznamy", veriaci: "Od veriacich", ludia: "Ľudia", filialky: "Kostoly a miesta", penazenka: "Peňaženka", nastroje: "Nástroje a štatistiky", profil: "Upraviť profil", nast: "Nastavenia", hlavna: "Hlavná zbierka", nahlad: "Náhľad profilu", zbierka: "Správa zbierky", nova: "Nová zbierka", n: "Nastavenia", zvoncek: "Zvončeková zbierka" };
const Ik = ({ d, s = 20, c = "var(--acc)", w = 1.9, style }: { d: string; s?: number; c?: string; w?: number; style?: CSSProperties }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", ...style }}><path d={d} /></svg>;
const eur = (n: number) => `${sumaEur(n)}`;
/** začiatok obdobia Prehľadu: Dnes · 7 dní · 30 dní · Rok (od 1. januára) */
function zaciatokObdobia(ob: number): number {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return [t.getTime(), Date.now() - 7 * 86400000, Date.now() - 30 * 86400000, new Date(new Date().getFullYear(), 0, 1).getTime()][ob];
}
const zaciatokMesiaca = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const dnesText = () => { const s = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(new Date()); return s.charAt(0).toUpperCase() + s.slice(1); };
const VID: ["zobrazit" | "skryt" | "len-farar", string, string][] = [["zobrazit", "Zobraziť", "Návštevníci vidia, koľko sa vyzbieralo."], ["skryt", "Skryť", "Návštevníci vidia len, že zbierka beží."], ["len-farar", "Len farár", "Sumy vidí iba správca farnosti."]];
/** + Pridať mimo Zbierok, Oznamov a Omší (KARTA 56D §2) */
type Akcia = "zbierka" | "oznam" | "zmena";
const PRIDAT: [string, string, string, Akcia][] = [
  [IC.zbierky, "Zbierka", "zbierka farnosti alebo zbierka pre veriacich (pohreb, svadba)", "zbierka"],
  [IC.oznamy, "Oznam", "krátky oznam, udalosť, parte · ukáže sa na profile v Oznamoch", "oznam"],
  [IC.omse, "Zmena omše", "omša nebude alebo bude v inom čase · ťuknite na deň v kalendári", "zmena"],
];
const PRIDAT_T: Partial<Record<Sub, string>> = { zbierky: "+ Pridať zbierku", oznamy: "+ Pridať oznam" };
/** kde sa + Pridať neukazuje (úpravy, náhľad, Omše) */
const BEZ_PRIDAT: Sub[] = ["zvoncek", "profil", "hlavna", "nahlad", "zbierka", "nova", "omse", "n"];
/** prvý príchod: jeden kostol z registrácie (KARTA 56F: kým nie sú filiálky, upravuje sa len on) */

// ---- spoločné štýly (prototyp) ----
const karta: CSSProperties = { flex: "none", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
/** OPRAVY 320: krabica (Vecná zbierka) */
const IK_KRABICA = "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9zM3 7.5 12 12l9-4.5M12 12v9";
const kicker: CSSProperties = { flex: "none", ...NADPIS_SEKCIE }; // OPRAVY 325
const tlZ: CSSProperties = { flex: "none", minHeight: 44, padding: "0 14px", border: "none", borderRadius: 12, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "#fff" };

/** OPRAVY 159: Správa farnosti = sektor Viera (výpisy darov: „Bohu známy veriaci") */
export function SpravaFarnosti(p: Parameters<typeof SpravaFarnostiObsah>[0]) {
  // BLOK B 232: všade, kde Správa pridáva fotky, aj „Vybrať z galérie farnosti ›"
  const zdroj = useMemo(() => zdrojFarnosti(() => fotkyFarnosti(p.strankaId)), [p.strankaId]);
  return <SektorDarcuKontext.Provider value="viera"><ZdrojFotiekKontext.Provider value={zdroj}><SpravaFarnostiObsah {...p} /></ZdrojFotiekKontext.Provider></SektorDarcuKontext.Provider>;
}

/** OPRAVY 268: obsah, ktorý sa poskladá až pri vykreslení (sekcie sú definované nižšie v tej istej funkcii) */
function Odlozene({ f }: { f: () => ReactNode }) { return <>{f()}</>; }
/** KARTA 57 A.8: ukončené a zrušené zbierky idú do archívu */
const vArchive = (z: SpustenaZbierka) => !!z.stav && z.stav !== "aktivna";
/** „8. 10. 2026 o 14:05" */
const casKonca = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} o ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

function SpravaFarnostiObsah({ onBack, strankaId, nazov, test: testPas }: { onBack: () => void; strankaId: string; /** názov z registrácie (Moje stránky) */ nazov?: string; /** testovací pás (OPRAVY 147, 153: dostane „Pozrieť profil ›") */ test?: (onPozriet: () => void) => ReactNode }) {
  const { desktop, wide } = useLayout();
  const tablet = wide && !desktop;
  // OPRAVY 393: Pomocník = celá Správa okrem Nastavení (účet farnosti, predplatné, peňaženka) a pridávania ľudí
  const pomocnik = useUrovenStranky(strankaId) === "pomocnik";
  const [sub, setSub] = useState<Sub>(() => (cielSpravyPre(strankaId)?.sub === "veriaci" ? "veriaci" : "prehlad")); // OPRAVY 315: z upozornenia rovno Od veriacich
  const [ob, setOb] = useState(2);
  const [pridat, setPridat] = useState(false);
  const [oznamyHore, setOznamyHore] = useState(0); // KARTA 56G §2: + Pridať → Oznam otvorí Oznamy hore
  const [zmazana, setZmazana] = useState(false); // KARTA 56D §5: hláška po zmazaní hlavnej zbierky, na mieste v Zbierkach
  // OPRAVY 267: ukončená hlavná zbierka ostáva v Archíve (názov, kedy, koľko sa vyzbieralo)
  const [archivH, setArchivH] = useState<{ nazov: string; koniec: string; suma: number }[]>(() => nacitajStav("hlavnaArchiv", strankaId, []));
  // KARTA 56D §6: výber druhu zbierky, „najprv hlavná", hláška po spustení a otvorená zbierka
  const [zbVyber, setZbVyber] = useState(false);
  const [pinVyber, setPinVyber] = useState(false); // OPRAVY 187: výber zbierky iného subjektu
  const [zbBlok, setZbBlok] = useState(false);
  const [noveOk, setNoveOk] = useState<string | null>(null);
  const [zbOtv, setZbOtv] = useState<string | null>(null);
  // OPRAVY 344: dlaždice Od veriacich, Ľudia, Nástroje a štatistiky, Nastavenia — otvorená dlaždica (detail na celú obrazovku)
  const [det, setDet] = useState<string | null>(null);
  const [detY, setDetY] = useState(0);
  const otvorDet = (k: string) => { setDetY(window.scrollY); setDet(k); window.scrollTo(0, 0); };
  const zavriDet = () => { setDet(null); const y = detY; requestAnimationFrame(() => window.scrollTo(0, y)); };
  // OPRAVY 347: Tlačiť › zo záložky QR v Správe zbierky → QR nástroje so zvýraznenou zbierkou, hore ‹ Späť na zbierku (otvorí sa znova na záložke QR)
  const [qrZ, setQrZ] = useState<{ id: string; spat: () => void } | null>(null);
  const [teraz0] = useState(() => Date.now()); // OPRAVY 348: čas otvorenia Správy (Prvé kroky, zbierka končí)
  const [zbStart, setZbStart] = useState<number | undefined>(undefined); // OPRAVY 348: Ukončiť › otvorí záložku Ukončenie
  const [predlzene, setPredlzene] = useState<Record<string, { busy?: boolean; ok?: string; chyba?: boolean }>>({});
  const [navratQr, setNavratQr] = useState(false);
  const tlacQr = (spat: () => void) => (id: string) => { setQrZ({ id, spat }); setSub("nastroje"); setPridat(false); setDetY(0); setDet("qr"); setNavratQr(false); window.scrollTo(0, 0); };
  const [pz, setPz] = useState(false);
  // OPRAVY 320: Vecná zbierka — nová (vyplniť) a správa (plagát, darcovia, ukončenie)
  const [vecnaNova, setVecnaNova] = useState(false);
  const [vecnaOtv, setVecnaOtv] = useState<{ z: VecnaZbierka; nova: boolean } | null>(null);
  const vecne = useVecneZbierky(strankaId);
  const [pzT, setPzT] = useState(""); // OPRAVY 185: text Späť podľa kroku zbierky // OPRAVY 161: postup zbierky pre veriacich
  const [archOtv, setArchOtv] = useState(false); // KARTA 57 A.8: archív zbalený
  // OPRAVY 284 (5): hromadné zmazanie z archívu — len zo zoznamu, peniaze, darcovia a doklady ostávajú
  const hvA = useHromadnyVyber();
  const [archSkryte, setArchSkryte] = useState<string[]>(() => nacitajStav("archivSkryte", strankaId, []));
  const [rodOtv, setRodOtv] = useState<string | null>(null); // KARTA 57 A.6: rozbalené vysvetlenie pri zbierke rodiny
  const [pzSpat] = useState<{ current: SpatZbierky | null }>(() => ({ current: null })); // KARTA 57 A.1: horné ‹ Späť = krok späť v zbierke (zbierka sem zapíše svoj krok späť)
  // KARTA 56G: Omše a kalendár otvorené na dni (ťuk v Prehľade) alebo na tomto týždni (Zmena omše) — key = nové otvorenie
  const [omseStart, setOmseStart] = useState<{ den?: string; n: number }>({ n: 0 });
  const naDen = (den?: string) => { setOmseStart((o) => ({ den, n: o.n + 1 })); go("omse"); };
  // OPRAVY 186: obrazovka Nastavení (ako pri charite) — n:<id>
  const [nId, setNId] = useState("");
  const [atelier, setAtelier] = useState(false); // OPRAVY 467: Ateliér stránky (celá obrazovka)
  const [oknoZv, setOknoZv] = useState(false); // OPRAVY 511: Zverejniť stránku?
  const neverejna = useNeverejna(strankaId);
  useEffect(() => { void nacitajNastavenia(strankaId); }, [strankaId]);
  const go = (k: Sub) => { if (pomocnik && (k === "nast" || k === "penazenka" || k === "n")) return; setDet(null); setQrZ(null); setNavratQr(false); setZbStart(undefined); setSub(k); setPridat(false); setPinOtv(false); setOznamyHore(0); };

  // KARTA 56D §1: profil stránky (profil_stranky) — karta vľavo, percento, „Dokončiť profil"
  const [prof, setProf] = useState(() => profilZPamate(strankaId));
  const [koncept, setKoncept] = useState<ProfilStranky | null>(null); // počas úpravy percento rastie naživo (OPRAVY 112)
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) setProf(z); }); return () => { ziva = false; }; }, [strankaId]);
  const profilAkt = koncept ?? prof.koncept ?? prof.ulozeny;
  const uplnost = uplnostProfilu(profilAkt);
  const meno = cistyNazov(profilAkt?.meno ?? nazov) || "Vaša farnosť";
  // OPRAVY 347: karta profilu zlatá — hotový: logo, celý názov, „Upraviť profil ›“ (ťuk na celú kartu); nedokončený: percento, pás, čo chýba, Dokončiť profil
  const kartaProfilu = (m: boolean) => {
    const ls = m ? 56 : 44, fs = m ? 17 : 14.5;
    const hlava = (sub2: React.ReactNode) => <>
      <LogoKarty profil={profilAkt} inicialy={monogramZNazvu(meno)} size={ls} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: fs, lineHeight: 1.25, color: "var(--ink)", overflowWrap: "anywhere" }}>{meno}</b>{sub2}</span>
    </>;
    if (uplnost.pct >= 100) return (
      <button type="button" onClick={() => go("profil")} style={{ flex: "none", width: "100%", borderRadius: m ? 20 : 18, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)", padding: m ? "14px 16px" : 12, display: "flex", alignItems: "center", gap: m ? 14 : 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
        {hlava(<span style={{ fontSize: m ? 14.5 : 13, fontWeight: 800, color: "var(--gold)" }}>Upraviť profil ›</span>)}
      </button>);
    return (
      <div style={{ flex: "none", borderRadius: m ? 20 : 18, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)", padding: m ? "14px 16px" : 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: m ? 14 : 10 }}>{hlava(<span style={{ fontSize: m ? 14 : 12.5, color: "var(--ink2)" }}>Profil · {uplnost.pct} %</span>)}</div>
        <span style={{ display: "block", height: 6, borderRadius: 3, background: "rgba(120,128,136,.25)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 3, background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${uplnost.pct / 100})`, transition: "transform .5s ease" }} /></span>
        {uplnost.chyba && <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink)" }}>{uplnost.chyba}</span>}
        <button type="button" onClick={() => go("profil")} style={{ minHeight: 44, border: "none", borderRadius: 12, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, boxShadow: "none" }}>Dokončiť profil</button>
      </div>);
  };
  const [vid, setVid] = useState(() => nacitajStav<"zobrazit" | "skryt" | "len-farar">("viditelnost", strankaId, "zobrazit"));
  // KARTA 62: kostoly a filiálky = miesta farnosti (prvé z registrácie); kľúč miesta = kľúč kostola v kalendári
  const kostoly = useMiesta(strankaId);
  // KARTA 62: Nástroje — počet sledujúcich pri každom mieste (sledujuci_miest, 0086)
  const [sledM, setSledM] = useState<Record<string, number> | null>(null);
  useEffect(() => { if (sub !== "nastroje" || kostoly.length < 2) return; let ziva = true; void sledujuciMiest(strankaId).then((x) => { if (ziva) setSledM(x); }, () => undefined); return () => { ziva = false; }; }, [sub, strankaId, kostoly.length]);

  // KARTA 56D §3: pripnuté sekcie (sprava_piny, najviac 6) — prvý príchod bez pinov
  const [piny, setPiny] = useState<Pin[]>(() => pinyZPamate<Pin>(strankaId, []));
  useEffect(() => { let ziva = true; void nacitajPiny<Pin>(strankaId, []).then((p) => { if (ziva) setPiny(p.filter((x) => PINY.includes(x))); }); return () => { ziva = false; }; }, [strankaId]);
  const [pinOtv, setPinOtv] = useState(false);
  // OPRAVY 268: ťuk na čip neodchádza z Prehľadu — obsah sekcie sa ukáže pod lištou; po otvorení Treba vybaviť
  const [pinAkt, setPinAkt] = useState<Pin | "treba" | null>("treba");
  const prepniPin = (k: Pin) => { const n = piny.includes(k) ? piny.filter((x) => x !== k) : piny.length < PIN_MAX_F ? [...piny, k] : piny; setPiny(n); void ulozPiny(strankaId, n, PIN_MAX_F); };

  // KARTA 56B · hlavná zbierka farnosti (= centrálna charity) a okno „Na najbližšiu omšu"
  useZmenyCentralnej(); useZmenyDarov();
  useEffect(() => { void nacitajCentralnuZbierku(strankaId); }, [strankaId]);
  const hlavnaRef = `${strankaId}-centralna`;
  useState(() => nastavCiste([hlavnaRef])); // KARTA 56D §0: hlavná zbierka farnosti bez vymyslených darov (len skutočné)
  const hlavna = centralnaZPamate(strankaId);
  const bezi = hlavnaBezi(strankaId);
  const om = useZvoncekOkno(strankaId); // OPRAVY 289: zbierka pri každej omši z kalendára hlavného kostola
  const zvN = useZvoncek(strankaId);
  const hlavnySuhrn = suhrnHlavnej(strankaId, hlavnaRef);
  // OPRAVY 340: jeden účet farnosti (zadaný v Prehľade) pre Hlavnú zbierku aj podiel v zbierke s overovateľom
  const ucetF = useUcetFarnosti(strankaId);
  const hlavnyUcet = ucetF.iban || najdiTestProfil(strankaId)?.ucet || "hlavný účet farnosti z registrácie";
  const otvorUcty = () => { setNId("ucty"); go("n"); };
  const ukazUcet = () => { go("prehlad"); window.setTimeout(() => document.querySelector("[data-ucet-farnosti]")?.scrollIntoView({ block: "start", behavior: "smooth" }), 80); };
  useZmenyZbierok();
  useEffect(() => { void nacitajZbierkyStranky(strankaId); }, [strankaId]);
  const dalsie = zbierkyStrankyZPamate(strankaId);
  const oknoSuma = om.dary.reduce((a, r) => a + r.suma, 0);
  const oknoLudi = new Set(om.dary.map((r) => (r.moj ? "ja" : r.id))).size;

  // KARTA 56D §4: Verejný profil = náhľad vybraného vzhľadu s uloženým profilom (len to, čo farár vyplnil, nikdy ukážkový profil)
  useEffect(() => { void pripojTestovaciuStranku(strankaId); }, [strankaId]); // 0035: tester = správca testovacej stránky
  // Verejný profil = živá stránka farnosti (NastenkaFarnosti so zeleným + a zbierkami), nie zjednodušený Náhľad
  const verejny = () => otvorVerejnyProfil(strankaId, { zoSpravy: true });
  const test = testPas?.(verejny);
  const mobil = !desktop;
  const telefon = mobil && !tablet;
  // KARTA 56I · 57 B.4: čo pridali veriaci — počet pri „Od veriacich" (úmysly idú len farárovi, nerátajú sa)
  useOdFarnikov(); useCerstveOdFarnikov(strankaId); // OPRAVY 178: čerstvé príspevky a nahlásenia pre Treba vybaviť
  const odF = odFarnikov(strankaId);
  // OPRAVY 398: číslo = Čaká na schválenie + nové od poslednej návštevy sekcie (aj povolené); 0 = bez čísla
  const vOdV = useOdVVidene(strankaId);
  const odFPocet = odF.filter((x) => x.stav === "caka" || (x.k !== "umysel" && x.cas > vOdV)).length;
  // nové sa ukazujú, kým je farár v sekcii; pri odchode zo sekcie sa označia ako videné
  const [odvOd, setOdvOd] = useState(() => videneOdV(strankaId));
  const [odvOtvor, setOdvOtvor] = useState<string | undefined>(undefined);
  const predSub = useRef(sub);
  useEffect(() => {
    const p = predSub.current; predSub.current = sub;
    if (sub === "veriaci" && p !== "veriaci") setOdvOd(videneOdV(strankaId));
    if (p === "veriaci" && sub !== "veriaci") { oznacOdVVidene(strankaId); setOdvOtvor(undefined); }
  }, [sub, strankaId]);
  useEffect(() => () => { if (predSub.current === "veriaci") oznacOdVVidene(strankaId); if (predSub.current === "oznamy") oznacSekciuVidenu(strankaId, "ozn"); }, [strankaId]);
  // OPRAVY 398 (4): Oznamy → Na stránke — číslo a NOVÉ, keď v bloku pribudol príspevok (nie ten, ktorý pridal farár sám)
  const jaUcet = usePouzivatel().ucetId;
  const vOzn = useVideneSekcie(strankaId, "ozn");
  const ozNove = prispevkyNaStranke(strankaId).filter((x) => (x.vytvorene ?? 0) > vOzn && (!x.af?.ucet || x.af.ucet !== jaUcet)).length;
  const [oznOd, setOznOd] = useState(() => videneSekcie(strankaId, "ozn"));
  const predSubO = useRef(sub);
  useEffect(() => {
    const p = predSubO.current; predSubO.current = sub;
    if (sub === "oznamy" && p !== "oznamy") setOznOd(videneSekcie(strankaId, "ozn"));
    if (p === "oznamy" && sub !== "oznamy") oznacSekciuVidenu(strankaId, "ozn");
  }, [sub, strankaId]);
  const pocetNav = (k: string) => (k === "veriaci" ? odFPocet : k === "oznamy" ? ozNove : 0);
  const odV = pocetyOdVeriacich(strankaId);

  // ---------------- časti ----------------
  const riadky = (r: { t: string; s: string; v?: string; b?: string; tap?: () => void; bBd?: string; bC?: string }[]) => (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {r.map((x, i) => (
        <div key={x.t + i} style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 58 : 60, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: mobil ? 14 : 14.5 }}>{x.t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{x.s}</span></span>
          {x.v && <b style={{ flex: "none", fontSize: mobil ? 13.5 : 14, fontVariantNumeric: "tabular-nums" }}>{x.v}</b>}
          {x.b && <button type="button" onClick={x.tap} style={{ flex: "none", minHeight: 44, padding: `0 ${mobil ? 12 : 14}px`, borderRadius: 12, border: x.bBd ?? "1px solid var(--cardBd)", background: x.bBd ? "transparent" : "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: mobil ? 13 : 13.5, fontWeight: 800, color: x.bC ?? "var(--ink)" }}>{x.b}</button>}
        </div>))}
    </section>);
  // OPRAVY 288: jeden prepínač s voľbami pre celú appku
  const segment = <T extends string | number | boolean,>(vol: [T, string][], cur: T, set: (v: T) => void) => <Volby value={cur} onChange={set} moznosti={vol} label={vol.map(([, t]) => t).join(" · ")} />;
  const nadpis = (t: string, s: string) => !mobil && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>{s}</span></span></div>;

  // OPRAVY 348 (1) · 355: Prvé kroky 1–4 v pevnom poradí (QR nie je povinný krok) — hotový krok ostáva na mieste (zelený ✓, tlmený); pri 4 z 4 bežné Treba vybaviť
  const kalK = kostolKal(strankaId);
  const maOmse = Array.from({ length: 7 }, (_, i) => new Date(teraz0 + i * 86400000)).some((d) => omseZvoncek(kalK, d).length > 0);
  const kroky: { t: string; s: string; hot: boolean; tap: () => void }[] = [
    { t: "Dokončiť profil", s: "logo, titulná fotka, text O nás", hot: uplnost.pct >= 100, tap: () => go("profil") },
    { t: "Overiť účet farnosti", s: "IBAN a platba 0,01 € s kódom", hot: ucetF.overeny, tap: () => { setNId("ucty"); go("n"); } },
    { t: "Spustiť hlavnú zbierku", s: "stála zbierka farnosti, aj mesačne", hot: bezi, tap: () => go("zbierky") },
    { t: "Zadať omše", s: "časy omší a týždenný rozvrh", hot: maOmse, tap: () => go("omse") },
  ];
  const hotKroky = kroky.filter((k) => k.hot).length, prveKroky = hotKroky < kroky.length;
  // Balík 47 · Svetlúšik · Prvé kroky: výrazy z číselníka cirkví, krok Dozorca len pri cirkvi s dozorcom
  const SLs = useSlovaFarnosti(strankaId);
  const ludiaF = (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as { r?: string }[];
  const krokySp: KrokSprievodcu[] = [
    { k: "profil", t: "Profil", hot: !!prof.ulozeny?.cover?.src && !!cistyText(prof.ulozeny?.onas ?? "").trim(), tap: () => go("profil") },
    { k: "ucet", t: `Účet ${SLs.jednotka2p}`, hot: ucetF.overeny, tap: () => { setNId("ucty"); go("n"); } },
    { k: "hlavna", t: "Hlavná zbierka", hot: bezi, tap: () => go("zbierky") },
    { k: "omse", t: SLs.bohosluzby.charAt(0).toUpperCase() + SLs.bohosluzby.slice(1), hot: maOmse, tap: () => go("omse") },
    ...(SLs.dozorca ? [{ k: "dozorca", t: "Pozvať dozorcu", hot: ludiaF.some((x) => x.r === "Dozorca"), tap: () => go("ludia") }] : []),
  ];
  // OPRAVY 525 (balík 49): oslovenie z profilu duchovného (Ľudia farnosti) má prednosť; kým profil nie je uložený, predvoľba z číselníka; prázdne = bez oslovenia
  const oslovenieDuch = maNastavenie("duch") ? String((citajNastavenie("duch") as { osl?: string } | null)?.osl ?? "").trim() || null : SLs.oslovenie;
  const prveKrokySv = <PrveKrokySvetlusik oslovenie={oslovenieDuch} vasa={SLs.vasa} kroky={krokySp} mobil={mobil}
    hotovo={{ oznam: () => go("oznamy"), qr: () => go("hlavna"), vzhlad: () => go("nast") }} />;
  // KARTA 56D §3: Treba vybaviť — len to, čo naozaj čaká (profil a hlavná zbierka; počas Prvých krokov sú v krokoch)
  const ulohy: { t: string; s: string; tap: () => void }[] = [
    ...(!prveKroky && uplnost.pct < 100 ? [{ t: "Dokončiť profil", s: uplnost.chyba, tap: () => go("profil") }] : []),
    ...(!prveKroky && !bezi ? [{ t: "Pridať hlavnú zbierku", s: "Bez nej sa nedá založiť žiadna iná zbierka.", tap: () => go("zbierky") }] : []),
    // KARTA 57 D.5: od veriacich — ťuk otvorí Od veriacich
    ...(odV.nove ? [{ t: `${odV.nove} ${odV.nove === 1 ? "nový príspevok" : odV.nove < 5 ? "nové príspevky" : "nových príspevkov"} od veriacich`, s: "Pozrite, čo pridali na stránku farnosti.", tap: () => go("veriaci") }] : []),
    ...(odV.nahlasene ? [{ t: `${odV.nahlasene} ${odV.nahlasene === 1 ? "nahlásený príspevok" : odV.nahlasene < 5 ? "nahlásené príspevky" : "nahlásených príspevkov"}`, s: "Ľudia nahlásili príspevok na stránke. Pozrite a rozhodnite.", tap: () => go("veriaci") }] : []),
    ...(odV.umysly ? [{ t: `${odV.umysly} ${odV.umysly === 1 ? "úmysel čaká" : odV.umysly < 5 ? "úmysly čakajú" : "úmyslov čaká"} na omšu`, s: "Zapíšte ich na konkrétnu omšu v Od veriacich.", tap: () => go("veriaci") }] : []),
  ];
  // OPRAVY 348 (2): zbierka farnosti 3 dni pred koncom — Predĺžiť o 14 dní (výsledok na mieste) · Ukončiť › (záložka Ukončenie)
  const konciace = dalsie.filter((z) => (z.farnost?.druh ?? "farnost") === "farnost" && (z.stav ?? "aktivna") === "aktivna")
    .map((z) => ({ z, k: koniecZbierky(strankaId, z) })).filter(({ z, k }) => { const d = dniDoKonca(k, teraz0); return d <= 3 || !!predlzene[z.id]; }); // predĺžená ostáva na mieste s „predĺžená do … ✓“ · po termíne ostáva, kým ju farár nevybaví (odpovede 18. 10.)
  const pocetUloh = (prveKroky ? kroky.length - hotKroky : 0) + ulohy.length + konciace.filter(({ z }) => !predlzene[z.id]?.ok).length;
  const dniT = (d: number) => (d <= 0 ? "dnes" : d === 1 ? "zajtra" : `o ${d} ${d < 5 ? "dni" : "dní"}`);
  const predlz = async (z: SpustenaZbierka) => {
    if (predlzene[z.id]?.busy) return;
    setPredlzene((p) => ({ ...p, [z.id]: { busy: true } }));
    const v = await predlzZbierku(strankaId, z);
    setPredlzene((p) => ({ ...p, [z.id]: "e" in v ? { chyba: true } : { ok: datumKonca(v.koniec) } }));
  };
  const ukoncit = (z: SpustenaZbierka) => { go("zbierka"); setZbOtv(z.id); setZbStart(2); };
  const uloha = (key: string, obsah: ReactNode, tap?: () => void) => tap
    ? <button key={key} type="button" onClick={tap} style={{ minHeight: 56, padding: "8px 14px", borderRadius: 14, border: "1.5px solid var(--rBd2)", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>{obsah}<span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>›</span></button>
    : <div key={key} style={{ minHeight: 56, padding: "10px 14px", borderRadius: 14, border: "1.5px solid var(--rBd2)", background: "var(--field)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", color: "var(--ink)" }}>{obsah}</div>;
  const textU = (t: string, s: string) => <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>;
  const trebaVybavit = (
    <section data-treba="1" style={{ ...karta, ...(pocetUloh ? { background: "var(--rBg)", border: "2px solid var(--rBd)" } : {}), borderRadius: 18, padding: mobil ? "14px 14px" : "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 16, color: pocetUloh ? "var(--cRed)" : undefined }}>{prveKroky ? `Prvé kroky · ${hotKroky} z ${kroky.length} hotové` : `Treba vybaviť · ${pocetUloh}`}</b>
      {prveKroky && kroky.map((k, i) => (
        <button key={k.t} type="button" onClick={k.tap} style={{ minHeight: 56, padding: "8px 14px", borderRadius: 14, border: `1.5px solid ${k.hot ? "var(--cardBd)" : "var(--rBd2)"}`, background: "var(--field)", opacity: k.hot ? 0.7 : 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          <span aria-hidden="true" style={{ width: 30, height: 30, flex: "none", borderRadius: 15, background: k.hot ? "var(--green)" : "var(--card)", border: k.hot ? "none" : "1.5px solid var(--cardBd)", color: k.hot ? "#fff" : "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{k.hot ? "✓" : i + 1}</span>
          {textU(k.t, k.hot ? "hotové ✓" : k.s)}
          {!k.hot && <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>›</span>}
        </button>))}
      {konciace.map(({ z, k }) => { const st = predlzene[z.id]; const suma = darcoviaPre(z.id).reduce((a, r) => a + r.suma, 0);
        return uloha(`k${z.id}`, <>
          {textU(st?.ok ? z.nazov || "Zbierka" : dniDoKonca(k, teraz0) < 0 ? `${z.nazov || "Zbierka"} · termín bol ${datumKonca(k)}` : `${z.nazov || "Zbierka"} končí ${dniT(dniDoKonca(k, teraz0))}`, st?.ok ? eur(suma) : dniDoKonca(k, teraz0) < 0 ? eur(suma) : `${datumKonca(k)} · ${eur(suma)}`)}
          {st?.ok ? <span role="status" style={{ flex: mobil ? "1 1 100%" : undefined, fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>predĺžená do {st.ok} ✓</span> : <span style={{ flex: mobil ? "1 1 100%" : undefined, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" aria-busy={!!st?.busy} onClick={() => void predlz(z)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: st?.chyba ? "1.5px solid var(--rBd)" : "none", background: st?.chyba ? "var(--rBg)" : "#4B7A35", color: st?.chyba ? "var(--cRed)" : "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, boxShadow: "none" }}>{st?.busy ? "Predlžujem …" : st?.chyba ? "Nepodarilo sa · Skúsiť znova" : "Predĺžiť o 14 dní"}</button>
            <button type="button" onClick={() => ukoncit(z)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, boxShadow: "none" }}>Ukončiť ›</button>
          </span>}
        </>); })}
      {ulohy.map((u) => uloha(u.t, textU(u.t, u.s), u.tap))}
      {!prveKroky && !ulohy.length && !konciace.length && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Nič nečaká.</span>}
    </section>);
  // KARTA 56B · §6 / 56D §3: Čísla — Vyzbierané · hlavná (podľa obdobia) · Na najbližšiu omšu · Posledná omšová · Sledujúci.
  // Sumy = len dary cez DEED. Počet darov a pravidelná podpora sú v Nástroje → Štatistiky.
  const obOd = zaciatokObdobia(ob);
  const vsetkyDary = darcoviaPre(hlavnaRef); // OPRAVY 294: skončené omše sú v Hlavnej ako jeden dar, bežiaca nie
  const vyzbObd = vsetkyDary.filter((r) => r.cas >= obOd).reduce((a, r) => a + r.suma, 0);
  const posledna = om.uzavrete[0];
  const poslPocet = posledna ? posledna.darov : 0;
  const OBD_T = ["dnes", "za 7 dní", "za 30 dní", "od januára"];
  const ludiT = (n: number) => `${n} ${n === 1 ? "človek" : n > 1 && n < 5 ? "ľudia" : "ľudí"}`;
  const ramce: [string, string, string][] = [
    ["Vyzbierané · hlavná", eur(vyzbObd), `cez DEED+ · ${OBD_T[ob]}`],
    ["Zvončeková · teraz", eur(oknoSuma), om.okno ? `${nadpisOkna(om.okno)}${oknoLudi ? ` · ${ludiT(oknoLudi)}` : ""}` : "najprv nastavte omše"],
    ["Posledná omšová", posledna ? eur(posledna.suma) : "—", posledna ? `${riadokOmse(posledna, strankaId)} · ${poslPocet} ${poslPocet === 1 ? "dar" : poslPocet < 5 ? "dary" : "darov"}` : "zatiaľ žiadna"],
    // OPRAVY 325 (247): Sledujúci s „pripravujeme“ preč, kým sledovanie stránky nemá tabuľku
  ];
  const cisla = (
    <section aria-label="Čísla" style={{ ...karta, borderRadius: 18, padding: mobil ? "12px 12px" : "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, fontSize: 15 }}>Čísla</b>
        <div role="tablist" aria-label="Obdobie" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
          {["Dnes", "7 dní", "30 dní", "Rok"].map((t, i) => <button key={t} type="button" role="tab" aria-selected={ob === i} onClick={() => setOb(i)} style={{ minHeight: 36, padding: "0 12px", border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontSize: 13, fontWeight: ob === i ? 800 : 700, background: ob === i ? "var(--card)" : "transparent", color: ob === i ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: telefon ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: mobil ? 8 : 10 }}>{/* OPRAVY 325: 3 rámce (bez Sledujúcich) */}
        {ramce.map(([k, v, d], i) => (
          <div key={k} style={{ minWidth: 0, gridColumn: telefon && i === ramce.length - 1 && ramce.length % 2 ? "1 / -1" : undefined, padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</span>
            <b style={{ fontSize: mobil ? 19 : 22, lineHeight: 1.15, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v}</b>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d}</span>
          </div>))}
      </div>
    </section>);
  // KARTA 56D §3: Pripnuté — Treba vybaviť + počet, potom pripnuté sekcie (najviac 6, ukladá sa do účtu)
  const pripnute = (
    <section aria-label="Pripnuté" style={{ ...karta, position: "sticky", top: mobil ? 74 : 12, zIndex: 4, borderRadius: 18, padding: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: mobil ? "nowrap" : "wrap", overflowX: mobil ? "auto" : undefined, scrollbarWidth: "none", boxShadow: "0 6px 16px rgba(30,28,20,.10)" }}>
      <span style={{ flex: "none", padding: "0 8px 0 6px", fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>PRIPNUTÉ</span>
      <button type="button" onClick={() => setPinAkt((a) => (a === "treba" ? null : "treba"))} aria-pressed={pinAkt === "treba"} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 12px 0 14px", borderRadius: 13, border: pocetUloh ? "2px solid var(--rBd)" : `${pinAkt === "treba" ? 2 : 1.5}px solid ${pinAkt === "treba" ? "var(--green)" : "var(--cardBd)"}`, background: pocetUloh ? "var(--rBg)" : pinAkt === "treba" ? "var(--gSoft)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: pocetUloh ? "var(--cRed)" : "var(--ink)", boxShadow: "none" }}>
        {prveKroky ? "Prvé kroky" : "Treba vybaviť"}<span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: pocetUloh ? "#A34A2A" : "#85867B", color: "#fff", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{pocetUloh}</span>
      </button>
      {piny.filter((k) => !pomocnik || (k !== "nast" && k !== "penazenka")).map((k) => (
        <button key={k} type="button" onClick={() => setPinAkt((a) => (a === k ? null : k))} aria-pressed={pinAkt === k} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 16px 0 12px", borderRadius: 13, border: pinAkt === k ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: pinAkt === k ? "var(--gSoft)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14.5, fontWeight: pinAkt === k ? 800 : 700, color: pinAkt === k ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>
          <Ik d={IC[k]} s={18} />{TIT[k]}
        </button>))}
      {!piny.length && <span style={{ fontSize: 13.5, color: "var(--ink3)", padding: "0 6px" }}>Zatiaľ nič nepripnuté</span>}
      <span style={{ flex: 1 }} />
      <button type="button" onClick={() => setPinOtv((o) => !o)} aria-expanded={pinOtv} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 14px", border: "none", borderRadius: 13, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>
        <Ik d={IC.pin} s={17} c="currentColor" w={2.2} />Upraviť pripnuté
      </button>
      {pinOtv && <div style={{ position: "absolute", right: 8, top: 58, zIndex: 20, width: mobil ? "calc(100% - 16px)" : 340, maxHeight: 420, overflowY: "auto", padding: 8, borderRadius: 18, background: "var(--bg)", border: "1px solid var(--cardBd)", boxShadow: "0 16px 40px rgba(30,28,20,.2)", display: "flex", flexDirection: "column", gap: 2, boxSizing: "border-box" }}>
        <span style={{ padding: "8px 10px 6px", fontSize: 13, color: "var(--ink3)" }}>Pripnite si, čo používate najčastejšie. Najviac 6.</span>
        {PINY.filter((k) => !pomocnik || (k !== "nast" && k !== "penazenka")).map((k) => { const on = piny.includes(k); return (
          <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => prepniPin(k)} style={{ minHeight: 46, padding: "0 10px", border: "none", borderRadius: 12, background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{TIT[k]}</span>
            <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `1.5px solid ${on ? "var(--green)" : "#A8A396"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}
            </span>
          </button>); })}
        <button type="button" onClick={() => setPinOtv(false)} style={{ height: 46, marginTop: 6, border: "none", borderRadius: 13, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Hotovo</button>
      </div>}
    </section>);
  // KARTA 56D §6: karta hlavnej zbierky — zmenšenina fotky · HLAVNÁ ZBIERKA · AKTÍVNA · názov · Ďalší krok
  const fotoH = hlavna?.media.find((m) => m.typ === "foto")?.src;
  const nDarov = (n: number) => `${n} ${n === 1 ? "dar" : n < 5 ? "dary" : "darov"}`;
  const chipF = (t: string, bg: string, r = 8) => <span style={{ height: 26, padding: "0 10px", borderRadius: r, background: bg, color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{t}</span>;
  // KARTA 57 A.10: fotka zbierky ako <img>, nie background:url(data:…)
  const nahladFoto = (src?: string) => <span style={{ position: "relative", overflow: "hidden", flex: "none", width: mobil ? 72 : 96, height: mobil ? 52 : 64, borderRadius: 12, background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--ink3)" }}>{src ? <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : "bez fotky"}</span>;
  const hlavnaRiadok = (
    <button key="hlavna" type="button" onClick={() => go("hlavna")} style={{ flex: "none", borderRadius: 22, border: "2px solid var(--green)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: mobil ? 12 : 18, padding: mobil ? "12px 14px" : "18px 22px", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
      {nahladFoto(fotoH)}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{chipF("HLAVNÁ ZBIERKA", "var(--green)")}{neverejna ? chipF("SPUSTÍ SA PO ZVEREJNENÍ STRÁNKY", "#8A6A1C") : chipF("AKTÍVNA", "#4B7A35")}</span>
        <b style={{ fontSize: mobil ? 17 : 20, lineHeight: 1.2 }}>{nazovHlavnej(hlavna)}</b>
        <span style={{ fontSize: 14, color: "var(--ink3)" }}>{hlavnySuhrn.darcov ? nDarov(hlavnySuhrn.darcov) : "zatiaľ žiadne dary"} · stála, aj mesačne</span>
        {!hlavnySuhrn.darcov && !neverejna && <span style={{ fontSize: 14, color: "var(--ink)" }}><b>Ďalší krok:</b> stiahnite QR plagát a dajte ho do kostola ›</span>}
      </span>
      <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <b style={{ fontSize: mobil ? 18 : 24, fontVariantNumeric: "tabular-nums" }}>{eur(hlavnySuhrn.suma)}</b>
        <span style={{ fontSize: 12, color: "var(--ink3)" }}>cez <DeedZnacka /></span>
      </span>
      {!mobil && <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>}
    </button>);
  const pridatHlavnu = (
    <button key="pridat-hlavnu" type="button" onClick={() => go("hlavna")} style={{ flex: "none", minHeight: 120, borderRadius: 22, border: "2px dashed var(--cuBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 18, padding: mobil ? "16px 16px" : "20px 24px", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
      <span aria-hidden="true" style={{ flex: "none", width: 52, height: 52, borderRadius: 16, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>+</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: mobil ? 16 : 18, color: "var(--green)" }}>Pridať hlavnú zbierku</b>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{hlavna ? "Rozpracovaná, ešte nebeží. Dokončite ju a spustite." : "Stála zbierka bez cieľa a konca, aj mesačne. Všetky ďalšie zbierky posielajú peniaze na jej účet. Preto ju treba založiť ako prvú."}</span>
      </span>
    </button>);
  // OPRAVY 260: ťuk na celú kartu = Správa zvončekovej zbierky; „Ďalšia omša (test)“ je len v DEV paneli tam
  // OPRAVY 313: v rovnakom štýle ako ostatné zbierky — fotka, štítky ZVONČEKOVÁ + BEŽÍ, nadpis, omša a dary, suma vpravo; vysvetlenie len v detaile
  const oknoDarov = om.dary.length;
  const oknoKarta = (
    <button type="button" onClick={() => go("zvoncek")} style={{ flex: "none", borderRadius: 20, border: "1px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
      {nahladFoto(zvN.media.find((m) => m.typ === "foto")?.src)}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{chipF("ZVONČEKOVÁ", "#8A6A1C", 7)}{chipF(zvN.ukoncena ? "UKONČENÁ" : "BEŽÍ", zvN.ukoncena ? "#5B5D53" : "#4B7A35", 7)}</span>
        <b style={{ fontSize: mobil ? 16 : 18 }}>{nazovZvoncek(zvN)}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{om.okno ? `${nadpisOmse(om.okno)} · ${nazovMalym(om.okno.nazov)} · ${oknoDarov ? nDarov(oknoDarov) : "zatiaľ žiadne dary"}` : "najprv nastavte omše"}</span>
      </span>
      <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ fontSize: mobil ? 17 : 20, fontVariantNumeric: "tabular-nums" }}>{eur(oknoSuma)}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>cez DEED+</span></span>
      {!mobil && <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>}
    </button>);

  // KARTA 56D §3: Prehľad = Čísla · Pripnuté · Treba vybaviť.
  // KARTA 57 B.1: mobil a tablet = karta farnosti (ťuk = Upraviť profil) → Čísla → 6 dlaždíc → Verejný profil · Nastavenia · Nástroje a štatistiky → Pripnuté → Treba vybaviť
  // KARTA 61 §3: predplatné hore v Prehľade
  const predPas = <PredplatnePas strankaId={strankaId} mobil={mobil} onOtvor={() => { setNId("predplatne"); go("n"); }} />;
  // OPRAVY 218: mobil a tablet ako Správa charity — karta farnosti, mriežka 3 × 3 (Verejný profil modrý), Pripnuté, Treba vybaviť, Čísla úplne dole
  const DLAZDICE9: [Sub | "verejny", string][] = [["verejny", "Verejný profil"], ["zbierky", "Zbierky"], ["oznamy", "Oznamy"], ["omse", "Omše a kalendár"], ["veriaci", "Od veriacich"], ["ludia", "Ľudia"], ["filialky", "Kostoly a miesta"], ["penazenka", "Peňaženka"], ["nastroje", "Nástroje a štatistiky"]];
  const pinObsah = <Odlozene f={() => pinAkt === "treba" ? trebaVybavit : pinAkt ? (
    <section style={{ flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ maxHeight: "68vh", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: 12, borderRadius: 18 }}>
        {pinAkt === "omse" ? <TyzdenVPrehlade strankaId={strankaId} onDen={naDen} mobil={mobil} /> : obsah[pinAkt]}
      </div>
      <button type="button" onClick={() => go(pinAkt)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>Otvoriť celú sekciu ›</button>
    </section>) : null} />;
  const prehlad = mobil ? <>
    {!pomocnik && predPas}
    {kartaProfilu(true)}
    {!pomocnik && <UcetFarnostiKarta strankaId={strankaId} mobil={mobil} onNastavenia={otvorUcty} />}
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
      {DLAZDICE9.filter(([k]) => !pomocnik || k !== "penazenka").map(([k, t]) => { const v = k === "verejny"; return (
        <button key={k} type="button" onClick={() => (v ? verejny() : go(k))} style={{ position: "relative", minHeight: 96, padding: "8px 4px", borderRadius: 18, border: `1px solid ${v ? "var(--tBd)" : "var(--cardBd)"}`, background: v ? "var(--tBg)" : "var(--card)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", boxShadow: "none" }}>
          <Ik d={IC[k]} s={24} c={v ? "var(--tInk)" : undefined} />
          <span style={{ fontSize: 14, lineHeight: 1.2, fontWeight: 800, textAlign: "center", color: v ? "var(--tInk)" : "var(--ink)" }}>{t}</span>
          {pocetNav(k) > 0 && <span aria-label={`${pocetNav(k)} nových`} style={{ position: "absolute", top: 8, right: 8, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "#A34A2A", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>{pocetNav(k)}</span>}
        </button>); })}
    </div>
    {trebaVybavit /* OPRAVY 348 (3): na mobile bez lišty Pripnuté — karta farnosti → mriežka → Treba vybaviť / Prvé kroky → Čísla */}
    {cisla}
  </> : <>{!pomocnik && <><UcetFarnostiKarta strankaId={strankaId} mobil={mobil} onNastavenia={otvorUcty} />{predPas}</>}{pripnute}{pinObsah}{cisla}</>;

  // KARTA 56D §6 · OPRAVY 161: ďalšie zbierky stránky (zbierka farnosti / pre veriacich) — z účtu (tabuľka zbierka)
  const sprava = (m: string) => { setZbVyber(false); setZbBlok(false); setNoveOk(null); setZmazana(false); return m; };
  const dalsieRiadok = (z: SpustenaZbierka) => {
    const [chip, bg] = stitokZbierkyF(z);
    const s0 = sucetDarov(z.id);
    const veriaci = z.farnost && z.farnost.druh !== "farnost";
    // KARTA 57 A.6: zbierka rodiny po zapečatení — farár nevidí sumy ani darcov, ťuk = len vysvetlenie
    if (veriaci) { const otv = rodOtv === z.id, d = z.farnost?.druh; return (
      <button key={z.id} type="button" onClick={() => setRodOtv(otv ? null : z.id)} aria-expanded={otv} style={{ flex: "none", borderRadius: 20, border: "1.5px solid #B9A3C2", background: "var(--card)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
        {nahladFoto(fotoZbierky(z))}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ alignSelf: "flex-start" }}>{chipF(`${d === "svadba" ? "SVADBA" : d === "ine" ? "PRE VERIACEHO" : "POHREB"} · ZBIERKA RODINY`, "#6E4E7A", 7)}</span>
          <b style={{ fontSize: mobil ? 16 : 18 }}>{z.nazov || "Zbierka rodiny"}</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>overili ste · beží · spravuje príjemca</span>
        </span>
        {otv && <span style={{ flex: "1 1 100%", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Sumy a darcov vidí len príjemca. Podiel farnosti vám príde do Peňaženky. Na stránke farnosti je táto zbierka fialovou, aby bolo jasné, že ju nevyberá farnosť.</span>}
      </button>); }
    const ciel = z.cielTyp === "ciel" ? cielCislo(z) : 0;
    const pod = s0.pocet ? nDarov(s0.pocet) : "zatiaľ žiadne dary";
    return (
      <button key={z.id} type="button" onClick={() => { sprava(""); setZbOtv(z.id); go("zbierka"); }} style={{ flex: "none", borderRadius: 20, border: "1px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
        {nahladFoto(fotoZbierky(z))}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ alignSelf: "flex-start" }}>{chipF(chip, bg, 7)}</span>
          <b style={{ fontSize: mobil ? 16 : 18 }}>{z.nazov || "Nová zbierka"}</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{veriaci ? `${pod} · ${rozdelenieZbierkyF(z)}` : `${ciel ? `cieľ ${eur(ciel)} · ` : ""}${pod}`}</span>
        </span>
        <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ fontSize: mobil ? 17 : 20, fontVariantNumeric: "tabular-nums" }}>{eur(s0.suma)}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>cez DEED+</span></span>
        {!mobil && <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>}
      </button>);
  };
  // KARTA 57 A.8: archív — ukončené a zrušené v jednom zbalenom riadku, pri každej dátum a čas ukončenia (čas servera)
  const archiv = dalsie.filter(vArchive).filter((z) => !archSkryte.includes(z.id));
  // OPRAVY 320 doplnok: ukončené vecné zbierky sú v Archíve
  const archivV = vecne.filter((z) => z.stav === "ukoncena" && !archSkryte.includes(z.id));
  const archivN = archiv.length + archivH.length + archivV.length;
  const archivKarta = archivN > 0 && (
    <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" onClick={() => setArchOtv((o) => !o)} aria-expanded={archOtv} style={{ minHeight: 64, padding: "10px 16px", borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
        <Ik d="M3 5h18v4H3zM5 9v10h14V9M10 13h4" s={20} c="var(--acc)" />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>Archív · {archivN} {archivN === 1 ? "zbierka" : archivN < 5 ? "zbierky" : "zbierok"}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>ukončené a zrušené · všetko sa uchováva, kedykoľvek dohľadáte</span></span>
        <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)", transform: `rotate(${archOtv ? 180 : 0}deg)`, transition: "transform .2s ease" }}>⌄</span>
      </button>
      {archOtv && archivN > 1 && <div style={{ display: "flex", justifyContent: "flex-end" }}><TlacidloVyberu v={hvA} /></div>}
      {archOtv && <ListaVyberu v={hvA} polozky={[...archivH.map((h, i) => ({ id: `h${i}`, cas: Date.parse(h.koniec) || 0 })), ...archiv.map((z) => ({ id: z.id, cas: Date.parse(z.koniec ?? "") || 0 })), ...archivV.map((z) => ({ id: z.id, cas: z.koniec ?? 0 }))]} />}
      {archOtv && <div style={{ display: "flex", flexDirection: "column", borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", padding: "4px 16px" }}>
        {archivH.map((h, i) => (
          <div key={`h${i}`} onClick={hvA.zap ? () => hvA.prepni(`h${i}`) : undefined} style={{ minHeight: 60, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", display: "flex", alignItems: "center", gap: 12, cursor: hvA.zap ? "pointer" : undefined }}>
            {hvA.zap && <PolickoVyberu on={hvA.vyb.has(`h${i}`)} />}
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>{h.nazov}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>{["hlavná zbierka · ukončená", casKonca(h.koniec), `vyzbierané ${eur(h.suma)}`].filter(Boolean).join(" · ")}</span>
            </span>
          </div>))}
        {archiv.map((z, i0) => { const i = i0 + archivH.length; const rod = !!z.farnost && z.farnost.druh !== "farnost", otv = rodOtv === z.id; const [chip] = stitokZbierkyF(z); return (
          <button key={z.id} type="button" onClick={() => { if (hvA.zap) { hvA.prepni(z.id); return; } if (rod) { setRodOtv(otv ? null : z.id); return; } sprava(""); setZbOtv(z.id); go("zbierka"); }} aria-expanded={rod && !hvA.zap ? otv : undefined}
            style={{ minHeight: 60, padding: "10px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
            {hvA.zap && <PolickoVyberu on={hvA.vyb.has(z.id)} />}
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>{z.nazov || "Zbierka"}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>{[chip.toLocaleLowerCase("sk-SK"), casKonca(z.koniec)].filter(Boolean).join(" · ")}</span>
              {rod && otv && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)", paddingTop: 4 }}>Zbierka rodiny, ktorú ste overili. Sumy a darcov vidí len príjemca. Váš podiel farnosti nájdete v Peňaženke.</span>}
            </span>
            {!hvA.zap && <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{rod ? (otv ? "⌃" : "⌄") : "›"}</span>}
          </button>); })}
        {archivV.map((z, i0) => { const i = i0 + archivH.length + archiv.length; return (
          <button key={z.id} type="button" onClick={() => { if (hvA.zap) { hvA.prepni(z.id); return; } setVecnaOtv({ z, nova: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ minHeight: 60, padding: "10px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
            {hvA.zap && <PolickoVyberu on={hvA.vyb.has(z.id)} />}
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>{z.nazov}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>{["vecná zbierka", z.koniec ? casKonca(new Date(z.koniec).toISOString()) : ""].filter(Boolean).join(" · ")}</span>
            </span>
            {!hvA.zap && <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>›</span>}
          </button>); })}
      </div>}
      {archOtv && <TlZbalit onZbal={() => setArchOtv(false)} />}{/* OPRAVY 321 */}
      {archOtv && <PasVyberu v={hvA} dolu={mobil ? 104 : 12} pocet={(n) => (n === 1 ? "1 zbierka" : n < 5 ? `${n} zbierky` : `${n} zbierok`)}
        onZmaz={(ids) => {
          const h = archivH.filter((_, i) => !ids.includes(`h${i}`)); if (h.length !== archivH.length) { setArchivH(h); ulozStav("hlavnaArchiv", strankaId, h); }
          const sk = [...archSkryte, ...ids.filter((x) => !x.startsWith("h"))]; setArchSkryte(sk); ulozStav("archivSkryte", strankaId, sk);
          return `Zmazané z archívu: ${ids.length} ✓ · peniaze, darcovia a doklady ostávajú`; }} />}
    </div>);
  const sprava2 = (t: string, zav: () => void, zelena: boolean) => (
    <div role="status" style={{ flex: "none", borderRadius: 18, background: zelena ? "var(--gSoft)" : "var(--card)", border: `2px solid ${zelena ? "var(--green)" : "var(--cardBd)"}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <b style={{ flex: 1, minWidth: 220, fontSize: 16, color: zelena ? "var(--gInk)" : "var(--ink)" }}>{t}</b>
      <button type="button" onClick={zav} style={{ height: 44, padding: "0 16px", borderRadius: 12, border: `1px solid ${zelena ? "var(--gBd)" : "var(--cardBd)"}`, background: zelena ? "transparent" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: zelena ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>Rozumiem</button>
    </div>);
  const volbaZb = (ik: string, t: string, s: string, tap: () => void) => (
    <button type="button" onClick={tap} style={{ minHeight: 84, padding: "14px 18px", borderRadius: 18, border: "1.5px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <span style={{ flex: "none", width: 52, height: 52, borderRadius: 15, background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ik} s={24} c="var(--gInk)" /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17 }}>{t}</b><span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink3)" }}>{s}</span></span>
      <span aria-hidden="true" style={{ fontSize: 22, color: "var(--ink3)" }}>›</span>
    </button>);
  const zbierky = <>
    {nadpis("Zbierky", "Ťuk na riadok otvorí Správu zbierky")}
    {zbVyber && <section style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "2px solid var(--green)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 19 }}>Akú zbierku pridávate?</b>
        <button type="button" onClick={() => setZbVyber(false)} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button></div>
      {volbaZb(IC.kostol, "Zbierka farnosti", "na opravu, misie, lavice · peniaze idú na účet hlavnej zbierky", () => { sprava(""); if (!bezi) { setZbBlok(true); return; } go("nova"); })}
      {volbaZb(IC.ludia, "Zbierka s overovateľom", "pohreb, svadba, iné · peniaze idú rodine, podiel farnosti na účet farnosti · nezávisí od hlavnej zbierky", () => { sprava(""); setPz(true); })}
      {volbaZb(IK_KRABICA, "Vecná zbierka", "ponožky, potraviny, oblečenie · bez peňazí, darca sa zapíše cez QR pri krabici", () => { sprava(""); setZbVyber(false); setVecnaNova(true); window.scrollTo({ top: 0, behavior: "smooth" }); })}
      {volbaZb(IC.verejny, "Zbierka iného subjektu", "pripnúť zbierku charity alebo človeka z Help · peniaze idú priamo im, vy ju len ukazujete", () => { setZbVyber(false); setPinVyber(true); })}
    </section>}
    {pinVyber && <PripnutieVyber strankaId={strankaId} mobil={mobil} onSpat={() => { setPinVyber(false); setZbVyber(true); }}
      onHotovo={(t) => { setPinVyber(false); setNoveOk(t); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    {pz && <ZbierkaSOverovatelom stranka={strankaId} menoFarnosti={meno} ucetFarnosti={hlavnyUcet} mobil={mobil} pc={desktop} toast={toast} onZavri={() => setPz(false)} onOverit={() => { setPz(false); ukazUcet(); }} spatRef={pzSpat} onSpatText={setPzT}
      onHotovo={(_z, t) => { setPz(false); setNoveOk(t); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    {vecnaNova && <VecnaNova strankaId={strankaId} mobil={mobil} onZavri={() => { setVecnaNova(false); setZbVyber(true); }}
      onHotovo={(z) => { setVecnaNova(false); setVecnaOtv({ z, nova: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    {vecnaOtv && <VecnaSprava key={vecnaOtv.z.id} strankaId={strankaId} meno={meno} z={vecnaOtv.z} nova={vecnaOtv.nova} mobil={mobil} onSpat={() => { setVecnaOtv(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} onTlacQr={tlacQr(() => setSub("zbierky"))} />}
    {/* KARTA 56E §2: kým beží tvorba (výber druhu alebo postup), zoznam zbierok sa nezobrazuje */}
    {!zbVyber && !pz && !pinVyber && !vecnaNova && !vecnaOtv && <>
    {/* KARTA 57 B.2: v Zbierkach na mobile a tablete aj veľké + Pridať zbierku hore */}
    {mobil && <button type="button" onClick={() => { setPridat(false); setZbVyber(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ flex: "none", minHeight: 56, border: "none", borderRadius: 16, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}><span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>+</span>Pridať zbierku</button>}
    {noveOk && sprava2(noveOk, () => setNoveOk(null), true)}
    {zbBlok && !bezi && <div role="alert" style={{ flex: "none", borderRadius: 18, background: "var(--goldBg)", border: "2px solid #C9A24A", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 16.5 }}>Najprv treba spustiť hlavnú zbierku</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Všetky ďalšie zbierky posielajú peniaze na jej účet. Keď hlavná zbierka beží, môžete pridávať ďalšie.</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { setZbBlok(false); go("hlavna"); }} style={{ height: 50, padding: "0 20px", border: "none", borderRadius: 14, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Pridať hlavnú zbierku</button>
        <button type="button" onClick={() => setZbBlok(false)} style={{ height: 50, padding: "0 18px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zavrieť</button>
      </div>
    </div>}
    {/* OPRAVY 267: zelená hláška na mieste + ďalší krok; ukončená je v Archíve */}
    {zmazana && !hlavna && <div role="status" style={{ flex: "none", borderRadius: 18, background: "var(--gSoft)", border: "2px solid var(--green)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 16.5, color: "var(--gInk)" }}>Hlavná zbierka je ukončená ✓</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Nájdete ju nižšie v Archíve. Ďalší krok: pridajte novú hlavnú zbierku, všetky ďalšie zbierky farnosti posielajú peniaze na jej účet.</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { setZmazana(false); go("hlavna"); }} style={{ minHeight: 50, padding: "0 20px", border: "none", borderRadius: 14, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Pridať novú hlavnú zbierku ›</button>
        <button type="button" onClick={() => setZmazana(false)} style={{ minHeight: 50, padding: "0 18px", borderRadius: 14, border: "1px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Rozumiem</button>
      </div>
    </div>}
    {(bezi || !zmazana) && <span style={kicker}>HLAVNÁ ZBIERKA · JEDEN ÚČET</span>}
    {bezi ? hlavnaRiadok : !zmazana && pridatHlavnu}
    {bezi && <>
      <span style={kicker}>ZVONČEKOVÁ ZBIERKA</span>
      {oknoKarta}
    </>}
    {dalsie.some((z) => !vArchive(z)) && <>
      <span style={kicker}>ĎALŠIE ZBIERKY</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{dalsie.filter((z) => !vArchive(z)).map(dalsieRiadok)}</div>
    </>}
    {vecne.some((z) => z.stav === "aktivna") && <>
      <span style={kicker}>VECNÉ ZBIERKY</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{vecne.filter((z) => z.stav === "aktivna").map((z) => (
        <button key={z.id} type="button" onClick={() => setVecnaOtv({ z, nova: false })} style={{ flex: "none", borderRadius: 20, border: "1.5px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          {nahladFoto(fotoVecnej(z))}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ alignSelf: "flex-start" }}>{chipF(z.stav === "aktivna" ? "VECNÁ ZBIERKA" : "VECNÁ · UKONČENÁ", z.stav === "aktivna" ? "#3E7A2E" : "#6B6C64", 7)}</span>
            <b style={{ fontSize: mobil ? 16 : 18 }}>{z.nazov}</b>
            <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{z.stav === "aktivna" ? `do ${doKedyText(z.doKedy, false)} · plagát, darcovia, ukončenie` : "darcovia, poďakovanie"}</span>
          </span>
          <span aria-hidden="true" style={{ fontSize: 22, color: "var(--ink3)" }}>›</span>
        </button>))}</div>
    </>}
    {archivKarta}
    <PripnuteZoznam strankaId={strankaId} mobil={mobil} hlas={(t) => setNoveOk(t)} />
    </>}
  </>;

  // KARTA 56F · OPRAVY 165: Omše a kalendár (Týždeň · Mesiac · Rozvrh omší, úprava dňa, plagát, pripnutie do Prehľadu)
  const omse = <OmseKalendar key={omseStart.n} start={omseStart} strankaId={strankaId} meno={meno} kostoly={kostoly.map((k) => ({ id: k.id, nazov: k.nazov, adresa: k.adresa }))} onPridatKostol={() => go("filialky")} mobil={mobil} tel={telefon} toast={toast} />;

  // KARTA 56G §4–5: Oznamy farnosti — Krátky oznam · Udalosť · Oznámenie, náhľad, ohlášky, zoznam zverejnených
  const oznamy = <>
    {nadpis("Oznamy", "Ohlášky a oznamy farnosti")}
    <OznamyFarnosti strankaId={strankaId} meno={meno} profil={prof.ulozeny} mobil={mobil} tel={telefon} toast={toast} hore={oznamyHore} noveOd={oznOd} jaUcet={jaUcet ?? undefined} onUsporiadat={() => { go("nastroje"); setDet("usporiadat"); }} />
  </>;
  // KARTA 57 B.1/B.4 · D: Od veriacich = úmysly, čo pridali veriaci, nastavenia pre veriacich
  // OPRAVY 344: dlaždica ako pri charite (ikona 44 px, názov, podnadpis, počet vpravo hore, ›); ťuk = detail, hore ‹ Späť na {sekcia}
  type Dl = { k: string; t: string; s: string; d: string; n?: number; el?: () => ReactNode; tap?: () => void };
  const dlazdica = (x: Dl) => (
    <button key={x.k} type="button" onClick={() => (x.tap ? x.tap() : otvorDet(x.k))} className="sc-bdh"
      style={{ position: "relative", borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", minWidth: 0, fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={x.d} /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 15.5 }}>{x.t}</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{x.s}</span></span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
      {!!x.n && <span aria-label={`${x.n} na vybavenie`} style={{ position: "absolute", top: 8, right: 8, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "#A34A2A", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>{x.n}</span>}
    </button>);
  const dlazdice = (sek: Sub, popis: string, l: Dl[], hore?: ReactNode) => {
    const o = det ? l.find((x) => x.k === det && x.el) : undefined;
    if (o) return <>{nadpis(o.t, o.s)}{o.el!()}</>;
    return <>{nadpis(TIT[sek], popis)}{hore}<div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: mobil ? 10 : 14 }}>{l.map(dlazdica)}</div></>;
  };
  const vOd = (cast: CastOdVeriacich) => () => <OdVeriacich key={cast} cast={cast} strankaId={strankaId} meno={meno} mobil={mobil} toast={toast} onSpat={zavriDet} noveOd={odvOd} otvorId={odvOtvor} />;
  const lVer: Dl[] = [
    { k: "umysly", t: "Úmysly na omšu", s: "zapíšte ich na konkrétnu omšu · na stránku nejdú", d: IC.kriz, n: odV.umysly, el: vOd("umysly") },
    { k: "schvalit", t: "Čaká na schválenie", s: "príspevky pri kategóriách Po schválení", d: IC.ok, n: odV.caka, el: vOd("caka") },
    { k: "pridali", t: "Pridali veriaci", s: "parte, udalosti, modlitby, oznamy · opraviť, zmazať", d: IC.veriaci, n: odV.nove, el: vOd("pridali") },
    { k: "nahlasene", t: "Nahlásené", s: "ľudia nahlásili príspevok · pozrite a rozhodnite", d: IC.namiet, n: odV.nahlasene, el: vOd("nahlasene") },
    { k: "smie", t: "Čo môžu veriaci pridávať", s: "Povolené · Po schválení · Zakázané pri každej kategórii", d: IC.nast, el: vOd("smie") },
  ];
  // OPRAVY 398: karta „Nové od vašej poslednej návštevy“ — ťuk otvorí príspevok, „Videl som ✓“ označí všetko ako videné
  const noveOdV = odF.filter((x: PolozkaFarnika) => x.k !== "umysel" && x.cas > odvOd).sort((a, b) => b.cas - a.cas);
  const druhOdV = (x: PolozkaFarnika) => (DRUHY_FARNIKA.find((d) => d.k === x.k)?.t ?? "").toLocaleUpperCase("sk-SK");
  const kedyOdV = (cas: number) => { const d = new Date(cas); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const kartaNove = noveOdV.length > 0 && (
    <section style={{ flex: "none", borderRadius: 20, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, marginBottom: mobil ? 10 : 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, minWidth: 0, fontSize: 16, color: "var(--gInk)" }}>Nové od vašej poslednej návštevy · {noveOdV.length}</b>
        <button type="button" onClick={() => { oznacOdVVidene(strankaId); setOdvOd(Date.now()); }} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Videl som ✓</button>
      </div>
      {noveOdV.map((x, i) => (
        <button key={x.id} type="button" onClick={() => { setOdvOtvor(x.id); setDet(x.stav === "caka" ? "schvalit" : "pridali"); }}
          style={{ minHeight: 56, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--gBd)" : "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 10, color: "var(--ink)", boxShadow: "none" }}>
          <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: "var(--card)", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink2)", whiteSpace: "nowrap" }}>{druhOdV(x)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.t || druhOdV(x)}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{x.stav === "caka" ? "čaká na schválenie · " : ""}{x.kto} · {kedyOdV(x.cas)}</span>
          </span>
          <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>›</span>
        </button>))}
    </section>);
  const veriaci = dlazdice("veriaci", "Úmysly na omšu, príspevky veriacich a čo smú pridávať", lVer, kartaNove);
  // KARTA 62: Kostoly a miesta (aj filiálky) — zoznam, + Pridať kostol alebo filiálku, cena podľa miest
  const filialky = <>
    {nadpis("Kostoly a miesta", "Kostoly, kaplnky a filiálky farnosti")}
    <KostolyMiesta strankaId={strankaId} mobil={mobil} onOmse={() => go("omse")} />
  </>;


  // KARTA 56D §0: Ľudia = len prihlásený správca. Ďalšie osoby a počty pribudnú s tabuľkou správcov (PLACEBO — karta 56D).
  // OPRAVY 344: Ľudia = dlaždice — Farár a správcovia · Brigády a služby · Deti a mládež · Darcovia (z Nástrojov) · Sledujúci
  const darcoviaRiadky = [
    ...vsetkyDary.filter((r) => !r.omsa).map((r) => ({ r, z: nazovHlavnej(hlavna) })),
    ...dalsie.filter((z) => !(z.farnost && z.farnost.druh !== "farnost")).flatMap((z) => darcoviaPre(z.id).map((r) => ({ r, z: z.nazov || "Zbierka farnosti" }))),
  ].sort((a, b) => b.r.cas - a.r.cas);
  // OPRAVY 349: hore Poďakovať darcom (len keď sú darcovia), pod tým Darcovia · N · mená bez súm
  const cielePodak: [string, string][] = [["vsetci", "Všetkým darcom"], ...(hlavna ? [["hlavna", nazovHlavnej(hlavna)] as [string, string]] : []),
    ...dalsie.filter((z) => (z.farnost?.druh ?? "farnost") === "farnost").map((z) => [z.id, z.nazov || "Zbierka farnosti"] as [string, string])];
  const darcoviaEl = () => <>
    {darcoviaRiadky.length > 0 && <PodakovatDarcom strankaId={strankaId} mobil={mobil} ciele={cielePodak} />}
    {darcoviaRiadky.length > 0 && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)", paddingTop: 4 }}>DARCOVIA · {darcoviaRiadky.length} · MENÁ BEZ SÚM</span>}
    {darcoviaRiadky.length ? riadky(darcoviaRiadky.slice(0, 200).map(({ r, z }) => ({ t: identitaDarcu(r, undefined, "viera"), s: z })))
      : <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ žiadne dary.</section>}
  </>;
  const lLud: Dl[] = [
    { k: "farar", t: "Farár a správcovia", s: "duchovný, kto spravuje stránku · pridať človeka", d: IC.osoba, el: () => <LudiaFarnosti strankaId={strankaId} meno={meno} mobil={mobil} farar={!pomocnik} /> },
    { k: "brigady", t: "Brigády a služby", s: "blok Pomôž na stránke · brigáda, služba pri omši", d: IC.brigada, el: () => <BrigadyFarnosti strankaId={strankaId} mobil={mobil} /> },
    { k: "deti", t: "Deti a mládež", s: "stretnutia · blok Deti a mládež na stránke", d: IC.dieta, el: () => <DetiMladezFarnosti strankaId={strankaId} mobil={mobil} /> },
    { k: "darcovia", t: "Darcovia", s: "mená bez súm · bez mena = Bohu známy veriaci", d: IC.zbierky, el: darcoviaEl },
    { k: "sledujuci", t: "Sledujúci", s: "koľko ľudí sleduje farnosť a jednotlivé kostoly", d: IC.verejny, el: () => <SledujuciFarnosti strankaId={strankaId} kostoly={kostoly} pocty={sledM} mobil={mobil} /> },
  ];
  const ludia = dlazdice("ludia", "Správcovia farnosti, dobrovoľníci a darcovia", lLud);
  // KARTA 57 B.1: Nástroje a štatistiky — sledujúci, darcovia, QR do kostola
  const mesOd = zaciatokMesiaca();
  const mesDary = vsetkyDary.filter((r) => r.cas >= mesOd);
  const prispelaF = usePrispela(strankaId);
  const penazenka = <>
    {nadpis("Peňaženka", "Dary idú priamo na účet farnosti, DEED+ peniaze nedrží")}
    {riadky([
      { t: "Prišlo tento mesiac", s: mesDary.length ? `${mesDary.length} ${mesDary.length === 1 ? "dar" : mesDary.length < 5 ? "dary" : "darov"} · hlavná zbierka a omše` : "zatiaľ žiadne dary", v: eur(mesDary.reduce((a, r) => a + r.suma, 0)) },
      // OPRAVY 376: Čaká na výplatu · Výplaty na účet · Dary v EURC — kým ich platobný modul nemá, riadky sa neukazujú (len fakty)
    ])}
    {/* OPRAVY 222 (5): doklad o dare farnosti na cudziu zbierku */}
    {prispelaF.length > 0 && <>
      <span style={NADPIS_SEKCIE}>VÝPISY · DARY FARNOSTI</span>
      {riadky(prispelaF.map((x) => ({ t: `${x.nazov} · ${x.kto}`, s: `${new Date(x.cas).toLocaleDateString("sk-SK")}${x.vs ? ` · doklad č. ${x.vs}` : ""}`, v: eur(x.suma) })))}
    </>}
  </>;
  const viditKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15 }}>Viditeľnosť súm zbierok</b>
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>Čo vidia návštevníci profilu</span>
      {segment(VID.map(([k, t]) => [k, t] as [typeof vid, string]), vid, (v) => { setVid(v); ulozStav("viditelnost", strankaId, v); })}
      <span style={{ fontSize: 13, color: "var(--ink2)" }}>{VID.find((x) => x[0] === vid)?.[2]}</span>
    </section>);
  // OPRAVY 292: Usporiadať stránku — v Nástrojoch, nie v Nastaveniach (aby si farár omylom nič nepokazil)
  // OPRAVY 324: zlatá karta nástroja (rovnaká ako Čo môžu veriaci pridávať), nie riadok ako štatistiky
  // OPRAVY 344: Nástroje a štatistiky = dlaždice
  const lNas: Dl[] = [
    { k: "statistiky", t: "Štatistiky", s: "vyzbierané, dary podľa zbierok a mesiacov", d: IC.prehlad, el: () => <StatistikyFarnosti strankaId={strankaId} mobil={mobil} /> },
    { k: "usporiadat", t: "Usporiadať stránku", s: "poradie blokov, ukázať alebo skryť, nadpisy", d: IK_PORADIE_D, el: () => <UsporiadatStranku strankaId={strankaId} mobil={mobil} onSpat={zavriDet} /> },
    { k: "qr", t: "QR nástroje", s: "nálepky a plagáty · QR farnosti a zbierok", d: IC.nastroje, el: () => <QrNastroje strankaId={strankaId} meno={meno} mobil={mobil} zvyraznit={qrZ?.id} /> }, // OPRAVY 347
    { k: "viditelnost", t: "Viditeľnosť súm zbierok", s: "Zobraziť · Skryť · Len farár", d: IC.verejny, el: () => viditKarta },
    { k: "vypis", t: "Ročný výpis", s: "podklad pre farskú radu a ekonómov", d: IC.vypis, el: () => <RocnyVypis strankaId={strankaId} meno={meno} mobil={mobil} prispela={prispelaF} /> },
  ];
  const nastroje = dlazdice("nastroje", "Štatistiky, poradie stránky, QR a výpis", lNas);
  // OPRAVY 344: Nastavenia = dlaždice (ťuk = detail, hore ‹ Späť na Nastavenia)
  const nn = (id: string) => () => { setNId(id); go("n"); };
  const vzhladEl = <FarbaLinii strankaId={strankaId} pred={<VzhladStranky strankaId={strankaId} sektor="farnost" kto="veriaci" zadarmo={false} onPozriet={verejny} onAtelier={() => setAtelier(true)} />} />;
  const lNast: Dl[] = [
    { k: "penazenka", t: "Peňaženka", s: "zostatok, výplaty na účet farnosti · súkromné", d: IC.penazenka, tap: () => go("penazenka") },
    { k: "predplatne", t: "Predplatné a platba", s: "2 mesiace zadarmo, potom mesačne alebo ročne", d: IC.zbierky, tap: nn("predplatne") },
    { k: "vzhlad", t: "Vzhľad stránky", s: "Nástenka · Kronika · Moderné · farba línií", d: IC.verejny, tap: nn("vzhlad") },
    { k: "notif", t: "Čo chcete dostávať", s: "upozornenia na dary, príspevky, úmysly", d: IC.zvon, tap: nn("notif") },
    { k: "ucty", t: "Účet farnosti", s: "overený účet, kam idú všetky dary", d: IC.penazenka, tap: nn("ucty") },
    { k: "udaje", t: "Údaje farnosti", s: "názov, cirkev, IČO", d: IC.kostol, tap: nn("udaje") },
    { k: "zariadenia", t: "Prihlásené zariadenia", s: "kde je správa otvorená", d: IC.zariadenie, tap: nn("zariadenia") },
    { k: "suhlasy", t: "Súhlasy", s: "podmienky a ochrana údajov", d: IC.ok, tap: nn("suhlasy") },
    { k: "faq", t: "Časté otázky", s: "začiatok, omše a oznamy, peniaze, predplatné", d: IC.otaz, tap: nn("faq") },
    { k: "podpora", t: "Napísať podpore", s: "odpovieme e-mailom", d: IC.veriaci, tap: nn("podpora") },
  ];
  const nastavenia = dlazdice("nast", "Účet, predplatné, vzhľad a súkromie", lNast);
  const SLF = useSlovaFarnosti(strankaId);
  const NAST_T: Record<string, string> = { predplatne: "Predplatné a platba", vzhlad: "Vzhľad stránky", notif: "Čo chcete dostávať", ucty: "Účet farnosti", udaje: "Údaje farnosti", zariadenia: "Prihlásené zariadenia", suhlasy: "Súhlasy", faq: "Časté otázky", podpora: "Napísať podpore" };
  const nObr = <>{nadpis(NAST_T[nId] ?? "Nastavenia", "")}
    {nId === "predplatne" ? <PredplatneFarnosti strankaId={strankaId} meno={meno} mobil={mobil} onUdaje={() => setNId("udaje")} onMiesta={() => go("filialky")} />
      : nId === "vzhlad" ? vzhladEl
      : nId === "notif" ? <ObrOznamenia mobil={!desktop} farnost />
      : nId === "udaje" ? <ObrUdaje mobil={!desktop} farnost={{ nazov: meno, cirkev: <CirkevFarnosti strankaId={strankaId} mobil={mobil} toast={toast} /> }} />
      : nId === "ucty" ? <UcetFarnostiNastavenia strankaId={strankaId} mobil={mobil} /> /* OPRAVY 340b: jediné miesto na zmenu účtu */
      : nId === "zariadenia" ? <ObrZariadenia mobil={!desktop} />
      : nId === "suhlasy" ? <ObrSuhlasy mobil={!desktop} otvor={(x) => setNId(x.replace(/^n:/, ""))} />
      : nId === "faq" ? <ObrFaq faq={faqFarnosti(SLF.titul)} otvor={(x) => setNId(x.replace(/^n:/, ""))} />
      : nId === "podpora" ? <ObrPodpora mobil={!desktop} otvor={(x) => setNId(x.replace(/^n:/, ""))} />
      : null}</>;

  // KARTA 56D §4: Upraviť profil = modul z charity (profil_stranky: koncept sa ukladá sám, Uložiť zverejní)
  const profil = <UpravitProfilCharity farnost strankaId={strankaId} pozicia="charita" tier={4} nazov={cistyNazov(nazov) || "Vaša farnosť"} inicialy="" mobil={mobil} tablet={tablet} stit="silver"
    onZmena={setKoncept} onUlozene={(pr) => { setProf({ koncept: null, konceptCas: null, ulozeny: pr }); setKoncept(null); }}
    onZrusit={() => { setKoncept(null); go("prehlad"); }} onHotovo={() => { setKoncept(null); go("prehlad"); }} />; // OPRAVY 202: bez výberu vzhľadu, farnosť je vždy Nástenka
  // OPRAVY 202: náhľad v Správe = Nástenka (živá stránka farnosti)
  const nahlad = <>
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={() => go("profil")} style={{ height: 44, padding: "0 16px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>‹ Späť na úpravu</button>
      <span style={{ fontSize: 14, color: "var(--ink3)" }}>Náhľad · zobrazené je len to, čo ste vyplnili</span>
    </div>
    <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--cardBd)" }}><NastenkaFarnosti bezVidenych strankaId={strankaId} meno={cistyNazov(prof.ulozeny?.meno ?? nazov) || "Vaša farnosť"} profil={prof.ulozeny} stit="Silver" /></div>
  </>;

  // KARTA 56B: hlavnú zbierku nejde zmazať, kým beží zbierka farnosti (na jej účet). Zbierky pre veriacich od nej nezávisia (OPRAVY 161).
  const ostatneBezia = dalsie.some((z) => (z.farnost?.druh ?? "farnost") === "farnost" && z.stav !== "ukoncena" && z.stav !== "vyuctovana");
  const zbOtvorena = dalsie.find((z) => z.id === zbOtv);
  const zbierkaEl = zbOtvorena ? <SpravaZbierkyFarnosti key={zbOtvorena.id} stranka={strankaId} z={zbOtvorena} mobil={mobil} toast={toast} onSpat={() => go("zbierky")} menoStranky={meno}
    startQr={navratQr} startTab={zbStart} onTlacQr={tlacQr(() => { setZbOtv(zbOtvorena.id); setSub("zbierka"); })} /> : null;
  const novaEl = <NovaZbierka strankaId={strankaId} pozicia="charita" tier={4} nazov={meno} inicialy={meno.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase()} mobil={mobil} tablet={tablet} stit="silver"
    onMojeZbierky={() => go("zbierky")} farnost={{ ucet: hlavnyUcet, onSpustena: (z) => { go("zbierky"); setNoveOk(`Zbierka „${z.nazov}“ beží. Nájdete ju nižšie v Ďalších zbierkach.`); } }} />;
  const hlavnaSprava = <SpravaCentralnej key={navratQr ? "qr" : "z"} strankaId={strankaId} nazov={meno} hlavnyUcet={hlavnyUcet} tier={4} mobil={mobil} toast={toast} startQr={navratQr} onTlacQr={tlacQr(() => setSub("hlavna"))}
    onZbierky={() => setSub("zbierky")} farnost={{ ostatneBezia, onZmazana: () => { const n = [{ nazov: nazovHlavnej(hlavna), koniec: new Date().toISOString(), suma: hlavnySuhrn.suma }, ...archivH]; setArchivH(n); ulozStav("hlavnaArchiv", strankaId, n); setZmazana(true); go("zbierky"); }, onHotovo: () => go("prehlad"), onZmenitUcet: otvorUcty }} />;
  // Balík 47 · krok 1 Profil: Svetlúšik povie, kam ťuknúť (nič nevypĺňa za farára)
  const profilSoSvetlusikom = krokySp[0].hot || pomocnik ? profil : <>
    <SvetlusikKarta style={{ fontSize: 16 }}><span style={{ fontSize: 15.5, lineHeight: 1.55 }}>Stránka je zatiaľ prázdna. Ťuknite na <b>Zmeniť fotku</b> a pridajte titulnú fotku, potom na <b>Prispôsobiť rámu</b>. Nižšie napíšte pár viet <b>O nás</b> a ťuknite <b>Uložiť profil</b>.</span></SvetlusikKarta>
    {profil}</>;
  const obsah: Record<Sub, ReactNode> = { prehlad, zbierky, omse, oznamy, veriaci, ludia, filialky, penazenka, nastroje, profil: profilSoSvetlusikom, nahlad, hlavna: hlavnaSprava, zbierka: zbierkaEl, nova: novaEl, nast: nastavenia, n: nObr,
    zvoncek: <SpravaZvoncek key={navratQr ? "qr" : "z"} strankaId={strankaId} mobil={mobil} toast={toast} onSpat={() => go("zbierky")} meno={meno} startQr={navratQr} onTlacQr={tlacQr(() => setSub("zvoncek"))} /> };

  // ---------------- Pridať ----------------
  // KARTA 56D §2 · 56G §2: tlačidlo v hlavičke podľa sekcie; inde ponuka 3 položiek (Zbierka · Oznam · Zmena omše)
  const akcia = (k: Akcia) => {
    setPridat(false);
    if (k === "zbierka") { go("zbierky"); setZbVyber(true); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (k === "oznam") { go("oznamy"); setOznamyHore((n) => n + 1); return; }
    naDen(); // KARTA 56G §2: Zmena omše = kalendár na tomto týždni, bez vybraného dňa
  };
  const pridatTl = () => { if (sub === "zbierky") akcia("zbierka"); else if (sub === "oznamy") akcia("oznam"); else setPridat(true); };
  const zoznamPridat = PRIDAT.map(([d, t, s, k]) => (
    <button key={t} type="button" onClick={() => akcia(k)} style={{ minHeight: mobil ? 56 : 60, padding: mobil ? "6px 12px" : "8px 12px", borderRadius: 15, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ width: mobil ? 38 : 40, height: mobil ? 38 : 40, flex: "none", borderRadius: 11, background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={d} s={mobil ? 19 : 20} c="var(--gInk)" /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: mobil ? 14.5 : 15, color: "var(--ink)" }}>{t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{s}</span></span>
    </button>));
  const vrstvy = <>
    {oknoZv && <OknoZverejnit strankaId={strankaId} farnost onZavri={() => setOknoZv(false)} polozky={[
      { t: "Názov", ok: !!cistyNazov(prof.ulozeny?.meno ?? nazov ?? "").trim(), onDoplnit: () => go("profil") },
      { t: "Titulná fotka", ok: !!prof.ulozeny?.cover?.src, onDoplnit: () => go("profil") },
      { t: "Omše", ok: maOmse, onDoplnit: () => go("omse") },
    ]} />}
    {pridat && createPortal(<div className="sprava-charity" data-stit="silver" style={{ minHeight: 0, background: "transparent" }}>
      <div onClick={() => setPridat(false)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(20,17,11,.45)" }} />
      <div role="dialog" aria-modal="true" aria-label="Pridať do farnosti" style={mobil
        ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 141, borderRadius: "24px 24px 0 0", background: "var(--panel)", padding: "10px 14px calc(30px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 8, color: "var(--ink)" }
        : { position: "fixed", top: 80, left: "50%", zIndex: 141, width: 520, marginLeft: -260, borderRadius: 24, background: "var(--panel)", border: "1px solid var(--cardBd)", padding: 18, display: "flex", flexDirection: "column", gap: 8, color: "var(--ink)" }}>
        {mobil ? <><span aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "var(--cardBd)" }} /><b style={{ fontSize: 17, padding: "4px 2px" }}>Pridať do farnosti</b></>
          : <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 18 }}>Pridať do farnosti</b><button type="button" onClick={() => setPridat(false)} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button></div>}
        {zoznamPridat}
      </div>
    </div>, document.body)}
  </>;

  const titul = TIT[sub];
  // OPRAVY 185: Späť píše cieľ, keď nevedie o jeden krok späť
  const spatT = det === "qr" && qrZ ? "‹ Späť na zbierku" : sub === "zbierky" && pinVyber ? "‹ Späť na výber zbierky" : sub === "zbierky" && pz ? (pzT ? `‹ ${pzT}` : "‹ Zbierky") : sub === "prehlad" ? "‹ Domov" : sub === "hlavna" || sub === "zbierka" || sub === "nova" || sub === "zvoncek" ? "‹ Zbierky" : sub === "penazenka" || sub === "n" ? (telefon ? "‹ Späť" : "‹ Späť na Nastavenia") : det ? (telefon ? "‹ Späť" : `‹ Späť na ${TIT[sub]}`) : "‹ Prehľad";
  const spatTl = (onClick: () => void) => <button type="button" onClick={onClick} style={{ flex: "none", height: 44, padding: mobil ? "0 12px 0 8px" : "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: mobil ? 14 : 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>{spatT}</button>;
  const nazpat = () => {
    if (sub === "zbierky" && pinVyber) { setPinVyber(false); setZbVyber(true); return; }
    if (sub === "zbierky" && pz && pzSpat.current) { const r = pzSpat.current(); if (r === "spat") return; if (r === "zavriet") { setPz(false); return; } }
    if (det === "qr" && qrZ) { const f = qrZ.spat; setQrZ(null); setDet(null); setNavratQr(true); f(); window.scrollTo(0, 0); return; } // OPRAVY 347
    if (det) { zavriDet(); return; } // OPRAVY 344: z detailu dlaždice späť na dlaždice
    if (sub === "hlavna" || sub === "zbierka" || sub === "nova" || sub === "zvoncek") setSub("zbierky"); else if (sub === "penazenka" || sub === "n") setSub("nast"); else if (sub === "prehlad") onBack(); else setSub("prehlad"); };

  // ================= PC =================
  if (desktop) {
    const nav: Sub[] = ["prehlad", "zbierky", "omse", "oznamy", "veriaci", "ludia", "filialky", "nastroje"]; // KARTA 62: + Kostoly a miesta // KARTA 57 B.4: + Od veriacich (s počtom), − Peňaženka (je v Nastaveniach) // Nastavenia ako tlačidlo pod Verejným profilom (OPRAVY 157); Upraviť profil je hore pri profile (KARTA 56F)
    const aktivna = sub === "hlavna" || sub === "zbierka" || sub === "nova" || sub === "zvoncek" ? "zbierky" : sub === "penazenka" || sub === "n" ? "nast" : sub;
    return (
      <div className="sprava-charity" data-stit="silver" style={{ minHeight: "100dvh", boxSizing: "border-box", padding: "20px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        {atelier && <Atelier strankaId={strankaId} meno={cistyNazov(prof.ulozeny?.meno ?? nazov) || "Vaša farnosť"} profil={prof.ulozeny} onZavri={() => setAtelier(false)}
          onPoradie={() => { setAtelier(false); go("nastroje"); otvorDet("usporiadat"); }} />}
        <aside style={{ width: 244, flex: "none", display: "flex", flexDirection: "column", gap: 12, paddingRight: 16, borderRight: "2px solid", borderImage: "var(--metal) 1", position: "sticky", top: 20, alignSelf: "flex-start", minHeight: "calc(100dvh - 40px)", boxSizing: "border-box" }}>
          {kartaProfilu(false)}
          <button type="button" onClick={verejny} style={{ flex: "none", height: 56, padding: "0 14px", borderRadius: 18, background: "var(--tBg)", border: "1px solid var(--tBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <Ik d={IC.verejny} c="var(--tInk)" />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 800, color: "var(--tInk)" }}>Verejný profil</span><span style={{ fontSize: 12, color: "var(--tInk2)" }}>ako ho vidia veriaci</span></span>
            <span aria-hidden="true" style={{ fontSize: 18, color: "var(--tInk)" }}>›</span>
          </button>
          {!pomocnik && <TlacidloNastavenia modre on={aktivna === "nast"} onClick={() => go("nast")} />}
          <nav aria-label="Správa farnosti" style={{ flex: "none", display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}>
            {nav.map((k) => { const on = aktivna === k; return (
              <button key={k} type="button" onClick={() => go(k)} aria-current={on ? "page" : undefined} className={on ? undefined : "sc-hov"} style={{ height: 48, padding: "0 14px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none", background: on ? "var(--accSoft)" : "transparent", color: on || k === "prehlad" ? "var(--ink)" : "var(--ink2)" }}>
                <Ik d={IC[k]} /><span style={{ flex: 1, fontSize: 15, fontWeight: on ? 800 : 600, whiteSpace: "nowrap" }}>{TIT[k]}</span>
                {pocetNav(k) > 0 && <span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: "#A34A2A", color: "#fff", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>{pocetNav(k)}</span>}
              </button>); })}
          </nav>
        </aside>
        <div style={{ flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 960, margin: 0, /* OPRAVY 325: obsah najviac 960 px, zľava pri menu */ minWidth: 0, display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
            <header style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat" }}>
              {spatTl(nazpat)}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>
                <span style={{ fontSize: 13, color: "var(--ink3)" }}>{dnesText()}</span>
              </span>
              {!BEZ_PRIDAT.includes(sub) && <button type="button" onClick={pridatTl} style={{ ...tlZ, height: 44, padding: "0 18px", borderRadius: 13, fontSize: 15 }}>{PRIDAT_T[sub] ?? "+ Pridať"}</button>}
            </header>
            {test}
            {!pomocnik && <ListaNeverejna strankaId={strankaId} mobil={false} onZverejnit={() => setOknoZv(true)} />}
            {sub === "prehlad" && !pomocnik && <KartyZverejnenia strankaId={strankaId} farnost onQrPlagat={() => go("hlavna")} />}
            {sub === "prehlad" && !pomocnik && prveKrokySv}
            <div key={sub} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both" }}>{obsah[sub]}</div>
          </main>
        </div>
        {vrstvy}
      </div>);
  }

  // ================= MOBIL a TABLET =================
  // OPRAVY 344: na telefóne je v hlavičke názov otvorenej dlaždice
  const detTitul = det ? [...lVer, ...lLud, ...lNas, ...lNast].find((x) => x.k === det)?.t ?? null : null;
  const mTitul = detTitul ?? (sub === "n" ? NAST_T[nId] ?? titul : titul);
  return (
    <div className="sprava-charity" data-stit="silver" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {atelier && <Atelier strankaId={strankaId} meno={cistyNazov(prof.ulozeny?.meno ?? nazov) || "Vaša farnosť"} profil={prof.ulozeny} onZavri={() => setAtelier(false)}
        onPoradie={() => { setAtelier(false); go("nastroje"); otvorDet("usporiadat"); }} />}
      <header style={{ position: "sticky", top: 0, zIndex: 5, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat, var(--bg)" }}>
        {spatTl(nazpat)}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <b style={{ maxWidth: "100%", fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mTitul}</b>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>{dnesText()}</span>
        </span>
        {/* OPRAVY 218 / 347: koliesko Nastavenia (modré) a zelené + v hlavičke, plávajúce + zmizlo */}
        {sub === "prehlad" && !pomocnik && <button type="button" onClick={() => go("nast")} aria-label="Nastavenia" style={{ flex: "none", width: 46, height: 46, borderRadius: 14, border: "1px solid var(--bBd)", background: "var(--bSoft)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" }}><Ik d={IC.nast} s={22} c="var(--bInk)" /></button>}
        {!BEZ_PRIDAT.includes(sub) && !pridat ? <button type="button" onClick={pridatTl} aria-label={(PRIDAT_T[sub] ?? "+ Pridať").slice(2)} style={{ flex: "none", width: 46, height: 46, border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button> : sub !== "prehlad" && <span aria-hidden="true" style={{ flex: "none", width: 46 }} />}
      </header>
      <div key={sub} style={{ padding: "12px 14px 180px", display: "flex", flexDirection: "column", gap: 12, animation: "spravaFade .2s ease both", width: "100%", maxWidth: tablet ? 880 : undefined, margin: tablet ? "0 auto" : undefined, boxSizing: "border-box" }}>
        {!pomocnik && <ListaNeverejna strankaId={strankaId} mobil onZverejnit={() => setOknoZv(true)} />}
        {sub === "prehlad" && !pomocnik && <KartyZverejnenia strankaId={strankaId} farnost onQrPlagat={() => go("hlavna")} />}
        {sub === "prehlad" && !pomocnik && prveKrokySv}
        {obsah[sub]}
        {test}
      </div>
      {vrstvy}
    </div>);
}

/** OPRAVY 214 · Časté otázky farára (dočasné, obsah sa ešte prepracuje). Titul podľa cirkvi (farár · duchovný · kazateľ…). */
function faqFarnosti(titul: string): OtazkyFaq {
  const t = titul.charAt(0).toLocaleLowerCase("sk-SK") + titul.slice(1);
  return [
    ["Začiatok", [
      ["Musím si robiť účet v DEED+?", `Nie, ${t} účet mať nemusí, stránku môže za neho viesť správca stránky, ktorý účet má.`],
      ["Kde vidím, ako to vyzerá pre ľudí?", "V Prehľade ťuknite na Verejný profil a uvidíte stránku presne tak, ako ju vidia veriaci."],
      ["Ako pridám kaplána alebo kostolníka?", "V Ľudia ťuknite Potrebujete pridať ďalších ľudí, vyberte, čo bude robiť, a pošlite mu pozvánku e-mailom alebo QR kódom."],
    ]],
    ["Omše a oznamy", [
      ["Ako zadám omše na celý týždeň?", "V Omše a kalendár raz vyplníte časy omší a týždenný vzor a appka ich potom opakuje každý týždeň."],
      ["Ako dám nedeľné oznamy?", "V Oznamy ťuknite + Pridať, napíšte krátky oznam a podržaním ho zverejnite."],
      ["Zmizne oznam sám?", "Áno, pri ozname nastavíte Platí do a potom zo stránky sám zmizne, zmazať ho môžete aj skôr."],
      ["Čo smú pridávať veriaci?", "Len to, čo zapnete v Od veriacich, a pridávať môžu iba registrovaní v DEED+."],
    ]],
    ["Peniaze", [
      ["Kam idú peniaze zo zbierok?", "Dary idú priamo na účet farnosti overený pri registrácii, DEED+ peniaze nedrží."],
      ["Ako funguje zvončeková zbierka?", "Ku každej omši z kalendára vznikne sama. Na stránke je vždy jedna omša a po nej pribudne v Hlavnej zbierke jeden riadok so sumou."],
      ["Pohreb: vidím sumy rodiny?", "Nie. Po zapečatení vidí sumy aj darcov len rodina. Vy vidíte len podiel farnosti, ktorý príde na účet farnosti."],
    ]],
    ["Predplatné", [
      ["Koľko to stojí?", "Prvé 2 mesiace sú zadarmo, potom sa platí mesačne alebo ročne a presnú sumu vidíte v Nastavenia → Predplatné."],
      ["Čo keď nezaplatím?", "Na stránke ostane zadarmo kontakt a časy omší, oznamy, zbierky a Správa sa zastavia a nič sa nezmaže."],
    ]],
  ];
}
