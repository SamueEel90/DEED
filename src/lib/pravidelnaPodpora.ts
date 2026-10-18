// ============================================================
// OPRAVY 352 — pravidelná podpora na serveri (0109): kto, suma, od kedy, zrušenie.
// Bez DB (mock) sa nič neukladá (hárok si ju drží v prehliadači ako doteraz).
// ============================================================
import { supabase } from "./supabase";
import { idZbierkyDB, objektZbierky } from "./darZbierky";
import { zmenene } from "./mojeData";

const chyba = (code: string | undefined, m: string) =>
  code === "PGRST202" || code === "42883" || /could not find the function|does not exist/i.test(m) ? "Ukladanie pravidelnej podpory ešte nie je zapnuté na serveri"
  : /neprihlaseny/.test(m) ? "Najprv sa prihláste" : /zbierka_neexistuje/.test(m) ? "Zbierka sa nenašla" : /neplatna_suma/.test(m) ? "Neplatná suma"
  : /fetch|network/i.test(m) ? "Nie je spojenie so serverom" : m || "Pravidelnú podporu sa nepodarilo uložiť";

/** zapne pravidelnú podporu zbierky; vráti chybu (text) alebo null */
export async function pravidelnaZapni(refId: string, suma: number, mena: "EUR" | "EURC", perioda: "tyzdenne" | "mesacne" | "rocne"): Promise<string | null> {
  if (!supabase) return null;
  const zbierka = idZbierkyDB(refId);
  if (!zbierka) return null; // objekt mimo ledgera (ukážka) — nie je čo uložiť
  const { error } = await supabase.rpc("pravidelna_zapni", { p_zbierka: zbierka, p_suma: suma, p_mena: mena, p_perioda: perioda });
  return error ? chyba(error.code, error.message ?? "") : null;
}

/** zruší pravidelnú podporu (len vlastnú); vráti chybu (text) alebo null */
export async function pravidelnaZrus(id: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("pravidelna_zrus", { p_id: id });
  return error ? chyba(error.code, error.message ?? "") : data ? null : "Pravidelná podpora sa nenašla";
}

// ---------- OPRAVY 352 (odpovede): Profil → Pravidelné dary ----------
export type PeriodaPP = "tyzdenne" | "mesacne" | "rocne";
export interface PravidelnyDar { id: string; komu: string; suma: number; mena: "EUR" | "EURC"; perioda: PeriodaPP; od: number; /** bez DB: záznam z prehliadača (refId) */ lokalny?: string }
const KLUC_LOK = "deed.pravidelne";
type Lok = { refId: string; suma: number; mena: "EUR" | "EURC"; perioda: PeriodaPP; od: number; nazov?: string };
const lokalne = (): Lok[] => { try { return JSON.parse(localStorage.getItem(KLUC_LOK) ?? "[]") as Lok[]; } catch { return []; } };

/** moje bežiace pravidelné dary (server; bez DB zo zariadenia) */
export async function mojePravidelne(): Promise<PravidelnyDar[] | { e: string }> {
  if (!supabase) return lokalne().map((z, i) => ({ id: `lok-${i}-${z.od}`, komu: z.nazov || objektZbierky(z.refId)?.nazov || "Zbierka", suma: z.suma, mena: z.mena, perioda: z.perioda, od: z.od, lokalny: z.refId }));
  const { data, error } = await supabase.from("pravidelna_podpora").select("id, stranka, zbierka, suma, mena, perioda, od").is("zrusene", null).order("od", { ascending: false });
  if (error) return { e: /pravidelna_podpora|does not exist|PGRST205/i.test(`${error.code} ${error.message}`) ? "Pravidelné dary ešte nie sú zapnuté na serveri" : chyba(error.code, error.message ?? "") };
  const r = (data ?? []) as { id: string; stranka: string; zbierka: string; suma: number; mena: "EUR" | "EURC"; perioda: PeriodaPP; od: string }[];
  const [st, zb] = await Promise.all([
    r.length ? supabase.from("stranka").select("id, nazov").in("id", [...new Set(r.map((x) => x.stranka))]) : Promise.resolve({ data: [] }),
    r.some((x) => x.zbierka.startsWith("zb-")) ? supabase.from("zbierka_verejna").select("id, nastavenie").in("id", r.filter((x) => x.zbierka.startsWith("zb-")).map((x) => x.zbierka)) : Promise.resolve({ data: [] }),
  ]);
  const menoStr = new Map(((st.data ?? []) as { id: string; nazov: string }[]).map((x) => [x.id, x.nazov]));
  const menoZb = new Map(((zb.data ?? []) as { id: string; nastavenie: { nazov?: string } | null }[]).map((x) => [x.id, x.nastavenie?.nazov ?? ""]));
  return r.map((x) => {
    const s = menoStr.get(x.stranka) ?? "";
    const z = x.zbierka.endsWith(":hlavna") ? "Hlavná zbierka" : menoZb.get(x.zbierka) || "";
    return { id: x.id, komu: [s, z].filter(Boolean).join(" · ") || "Zbierka", suma: Number(x.suma), mena: x.mena, perioda: x.perioda, od: new Date(x.od).getTime() };
  });
}

/** zruší pravidelný dar zo zoznamu (server, bez DB zo zariadenia) */
export async function zrusPravidelny(d: PravidelnyDar): Promise<string | null> {
  if (d.lokalny != null) {
    try { localStorage.setItem(KLUC_LOK, JSON.stringify(lokalne().filter((z) => !(z.refId === d.lokalny && z.od === d.od)))); } catch { return "Zrušenie sa nepodarilo uložiť"; }
    zmenene(KLUC_LOK);
    return null;
  }
  return pravidelnaZrus(d.id);
}
