// ============================================================
// OPRAVY 338 — zbierka s overovateľom naostro: skutočný sken QR príjemcu (migrácia 0104).
// Farár: ovpZaloz → každých 15 s ovpToken → QR „<appka>/overenie/<token>“; ovpStav sleduje, kto potvrdil.
// Príjemca: fotoaparát otvorí /overenie/<token> → hneď sa vymení za lístok (15 min, aj bez prihlásenia),
// lístok sa pamätá v zariadení, aby prežil prihlásenie / registráciu. Potom potvrdí „som to ja“ a podržaním rozdelenie (0113, bez kódu).
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

const KLUC = "deed.ovp";
const LISTOK_MS = 15 * 60 * 1000;

export type StavOverenia = { listok: string } | { chyba: string } | { nacitava: true } | null;
let stav: StavOverenia = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
const nastav = (s: StavOverenia) => { stav = s; zmena(); };

function ulozListok(listok: string | null) {
  try { if (listok) localStorage.setItem(KLUC, JSON.stringify({ listok, cas: Date.now() })); else localStorage.removeItem(KLUC); } catch { /* súkromné okno */ }
}
function pamatanyListok(): string | null {
  try {
    const x = JSON.parse(localStorage.getItem(KLUC) ?? "null") as { listok?: string; cas?: number } | null;
    return x?.listok && Date.now() - (x.cas ?? 0) < LISTOK_MS ? x.listok : null;
  } catch { return null; }
}

/** chyba zo servera → veta pre človeka (čo sa stalo + čo urobiť) */
export function textChyby(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e ?? "");
  if (/kod_neplati/.test(m)) return "Kód už neplatí. Požiadajte farára o nový.";
  if (/neregistrovany/.test(m)) return "Váš účet nemá dokončenú registráciu. Dokončite ju v appke a naskenujte QR znova.";
  if (/neprihlaseny/.test(m)) return "Nie ste prihlásený. Prihláste sa svojím účtom a skúste znova.";
  if (/uz_potvrdil_iny/.test(m)) return "Toto overenie už potvrdil niekto iný. Požiadajte farára o nový QR.";
  if (/okno_vyprsalo|kod_vyprsal/.test(m)) return "Čas vypršal · požiadajte farára o nové potvrdenie.";
  if (/bez_prijemcu/.test(m)) return "Príjemca ešte nepotvrdil sken. Nech naskenuje QR znova.";
  if (/uz_pouzite/.test(m)) return "Toto overenie už patrí inej zbierke. Začnite novú zbierku.";
  if (/nie_spravca/.test(m)) return "Túto stránku nespravujete. Prihláste sa účtom správcu.";
  if (/Príjemca nemá overený účet/.test(m)) return "Príjemca nemá overený účet. Nech naskenuje QR farnosti v appke DEED, potvrdí sa a podržaním potvrdí rozdelenie.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Nie je spojenie so serverom. Skontrolujte internet a skúste znova.";
  return m ? `${m.replace(/\.?$/, ".")} Skúste znova.` : "Niečo sa nepodarilo. Skúste znova.";
}

// /overenie/<token> — QR z kroku 1: token platí 20 s, preto sa vymení hneď pri otvorení, ešte pred prihlásením
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/overenie\/([A-Za-z0-9]+)/);
  if (m) {
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
    if (!supabase) stav = { chyba: "Kód už neplatí. Požiadajte farára o nový." };
    else {
      stav = { nacitava: true };
      void supabase.rpc("ovp_otvor", { p_token: m[1] }).then(({ data, error }) => {
        if (error || !data) { ulozListok(null); nastav({ chyba: textChyby(error ?? "kod_neplati") }); return; }
        ulozListok(String(data)); nastav({ listok: String(data) });
      }, (e: unknown) => nastav({ chyba: textChyby(e) }));
    }
  } else {
    const l = pamatanyListok();
    if (l) stav = { listok: l };
  }
}

export function useOverenieStav(): StavOverenia {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return stav;
}
/** ťuk na upozornenie (odkaz ovp:<stránka>:<lístok>) → obrazovka potvrdenia */
export function otvorOverenie(listok: string) { ulozListok(listok); nastav({ listok }); }
export function zavriOverenie() { ulozListok(null); nastav(null); }

export type NahladOverenia = {
  stranka: string; nazov: string | null; druh: "pohreb" | "svadba" | "ine"; potvrdene: boolean; ja: boolean; iny: boolean;
  /** 0113: okno na potvrdenie rozdelenia platí / skončilo bez potvrdenia */ caka?: boolean; vyprsalo?: boolean;
  kod_caka: boolean; rozdelenie: string | null; suhlas: boolean; zbierka: string | null;
};
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Nie je spojenie so serverom.");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message, { cause: error });
  return data as T;
}
export const ovpNahlad = (listok: string) => rpc<NahladOverenia>("ovp_nahlad", { p_listok: listok });
export const ovpPotvrd = (listok: string) => rpc<string>("ovp_potvrd", { p_listok: listok });
export const ovpSuhlas = (listok: string) => rpc<null>("ovp_suhlas", { p_listok: listok });

// ---- farár ----
export const OVP_NAOSTRO = !!supabase;
export const ovpZaloz = (stranka: string, druh: string) => rpc<string>("ovp_zaloz", { p_stranka: stranka, p_druh: druh });
export const ovpToken = (id: string) => rpc<string | null>("ovp_token", { p_id: id });
export type StavPreFarara = { meno: string | null; potvrdene: boolean; suhlas: boolean; ucet: string | null };
export const ovpStav = (id: string) => rpc<StavPreFarara>("ovp_stav", { p_id: id });
/** farár: „Poslať na potvrdenie“ — okno 5 min a upozornenie príjemcovi, bez kódu (0113; názov funkcie z 0104) */
export const ovpKod = (id: string, rozdelenie: string) => rpc<null>("ovp_kod", { p_id: id, p_rozdelenie: rozdelenie });
export const adresaOverenia = (token: string) => `${window.location.origin}/overenie/${token}`;
