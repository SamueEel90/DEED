// ============================================================
// DEED · Dátová vrstva (Supabase) + MOCK vendori
// Pokrýva obe registrácie: fyzická osoba (§13) + charita/OZ (§11).
// Vendori (SMS, Didit KYC/KYB) sú NAMOCKOVANÍ — žiadne reálne volania
// ani náklady. Pri ostrom spustení sa nahradia reálnymi.
// ============================================================
import { supabase } from "./supabase";
import { ZAUJMY_KATALOG } from "./personalizaciaStore";
import type {
  Ciselnik,
  CiselnikPolozka,
  OtpVysledok,
  RegistrIcoVysledok,
  UcetData,
} from "@/types";

function db() {
  if (!supabase) throw new Error("Supabase nie je nakonfigurovaný — skontroluj .env.local");
  return supabase;
}

const cakaj = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const teraz = () => new Date().toISOString();


// zoskupí ploché riadky číselníka podľa kľúča, zachová poradie
function zoskup(rows: any[], kluc: string, polozkaKluc: string): Ciselnik[] {
  const mapa = new Map<string, CiselnikPolozka[]>();
  for (const r of rows) {
    let polozky = mapa.get(r[kluc]);
    if (!polozky) {
      polozky = [];
      mapa.set(r[kluc], polozky);
    }
    polozky.push(r[polozkaKluc] !== undefined ? { hodnota: r[polozkaKluc], ...r } : r);
  }
  return Array.from(mapa, ([nazov, polozky]) => ({ nazov, polozky }));
}

// ============================================================
// MOCK VENDORI
// ============================================================

// Zadanie 3 · 3.2: SMS kód vzniká LEN na serveri. S DB: rpc otp_posli / otp_over (0040);
// bez DB: /api/otp. V mock režime server vráti pevný testovací kód, nikdy ho negeneruje prehliadač.
type OtpOdpoved = { kod?: string | null; demo?: boolean; ok?: boolean; sprava?: string };
async function apiOtp(telo: { telefon: string; kod?: string }): Promise<OtpOdpoved> {
  const r = await fetch("/api/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(telo) });
  const d = (await r.json().catch(() => ({}))) as OtpOdpoved;
  if (!r.ok) throw new Error(d.sprava ?? "SMS sa nepodarilo poslať.");
  return d;
}
export async function posliOtp(telefon: string): Promise<OtpVysledok> {
  if (supabase) {
    const { data, error } = await supabase.rpc("otp_posli", { p_telefon: telefon });
    if (error) throw error;
    const o = (data ?? {}) as OtpOdpoved;
    return { kod: o.kod ?? null, demo: !!o.demo };
  }
  const d = await apiOtp({ telefon });
  return { kod: d.kod ?? null, demo: !!d.demo };
}
/** overí SMS kód na serveri — true = sedí (chybný pokus sa zaráta, max 5) */
export async function overOtp(telefon: string, kod: string): Promise<boolean> {
  if (supabase) {
    const { data, error } = await supabase.rpc("otp_over", { p_telefon: telefon, p_kod: kod });
    if (error) throw error;
    return data === true;
  }
  return (await apiOtp({ telefon, kod })).ok === true;
}

// KYC osoby (Didit) — výsledok zapisuje LEN server (rpc kyc_spusti, dnes mock vendor „sedí").
export async function spustiKyc(_ucetId: string, sposob = "nove") {
  await cakaj(1100);
  const { data, error } = await db().rpc("kyc_spusti", { p_sposob: sposob });
  if (error) throw error;
  return { vysledok: data as string };
}

// KYB charity — DEMO register: IČO → vymyslené firemné údaje
export async function najdiIco(ico: string): Promise<RegistrIcoVysledok> {
  await cakaj(700);
  const cislo = (ico || "").replace(/\D/g, "");
  // ukážkové IČO z prototypu registrácie (karta 44)
  if (cislo === "12345678") return { ico: cislo, nazov: "Svetlo pomoci o.z.", sidlo: "Mierové nám. 1, Trenčín", datum_vzniku: "2023-03-14", pravna_forma: "Občianske združenie" };
  return {
    ico: cislo || ico,
    nazov: "OZ Pomoc " + (cislo.slice(-3) || "001"),
    sidlo: "Trenčín, Slovensko",
    datum_vzniku: "2015-03-12",
    pravna_forma: "Občianske združenie",
  };
}

// KYB — výsledok zapisuje LEN server (rpc kyb_spusti, volajúci musí byť správca organizácie)
export async function spustiKyb(orgUcetId: string, { stanovyRef }: { stanovyRef?: string | null } = {}) {
  await cakaj(1100);
  const { data, error } = await db().rpc("kyb_spusti", { p_org: orgUcetId, p_stanovy: stanovyRef || null });
  if (error) throw error;
  return { vysledok: data as string };
}

// ============================================================
// UNIVERZÁLNY ZÁKLAD — telefón/účet/zámok (§4) — osoba aj charita
// ============================================================

// TODO (Zadanie 1 · Blok 1, migrácia 0035_identita.sql): registrácia organizácie / firmy zatiaľ
// NEvolá rpc zaloz_stranku(p_id, p_typ, p_nazov). Karta, ktorá spustí vznik stránok z registrácie,
// ju musí zavolať po vytvorení účtu — vznikne stranka + účet organizácie (typ 'charita'/'firma')
// a volajúci sa zapíše do statutar ako správca. Dovtedy majú stránky len testovacie org. účty z 0035.
// Registrácia je len auth-first (session najprv — OsobaB, vytvorUcetAuth). Starý tok „telefón bez
// prihlásenia" (RegKit, rpc ucet_s_telefonom) je od 6. 10. 2026 zrušený: po RLS (0055) by nič nezapísal.

// Auth-first vytvorenie účtu (Fáza 5) — identitu rieši Supabase Auth, telefón-OTP
// a PIN sa preskakujú. Idempotentné na auth_id (resume po refreshi/abandonovaní).
// `poradove_cislo` je GENERATED ALWAYS — NIKDY ho neuvádzať v inserte.
export async function vytvorUcetAuth({ authId, typ = "aktivny", email = null, stav = "udaje" }: { authId: string; typ?: string; email?: string | null; stav?: string }) {
  const c = db();
  const { data: ex } = await c
    .from("ucet")
    .select("id, typ, poradove_cislo, stav_registracie")
    .eq("auth_id", authId)
    .maybeSingle();
  // Zadanie 1 · Blok 1: účet založený anonymnej session (obľúbené a pod. — 0035 zaisti_ucet) sa pri
  // registrácii TOHO ISTÉHO auth používateľa doplní, nie zduplikuje. Cudzí účet sa sem nedostane (kľúč = auth_id).
  if (ex && ex.stav_registracie === "anonym") {
    const { data: up, error: upErr } = await c.from("ucet")
      .update({ typ, email, email_overeny: !!email, stav_registracie: stav })
      .eq("id", ex.id).select("id, typ, poradove_cislo, stav_registracie").single();
    if (upErr) throw upErr;
    return up;
  }
  if (ex) return { ...ex, obnovene: true };

  const { data, error } = await c
    .from("ucet")
    .insert({ auth_id: authId, typ, email, email_overeny: true, telefon_overeny: false, stav_registracie: stav })
    .select("id, typ, poradove_cislo, stav_registracie")
    .single();
  if (error) throw error;
  return data;
}

// Načíta účet podľa Supabase auth usera (pri prihlásení / boot reconciliation).
export async function najdiUcetPodlaAuth(authId: string): Promise<{ id: string; typ: string; poradove_cislo: number | null; stav_registracie: string; email: string | null } | null> {
  const { data, error } = await db()
    .from("ucet")
    .select("id, typ, poradove_cislo, stav_registracie, email")
    .eq("auth_id", authId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Priebežné ukladanie kroku (§11)
export async function ulozStav(ucetId: string, stav: string) {
  const { error } = await db().from("ucet").update({ stav_registracie: stav, aktualizovane: teraz() }).eq("id", ucetId);
  if (error) throw error;
}

// Zámok účtu — PIN/heslo (hash) + biometria (§4.2)
// Zadanie 4 · 4.4: PIN hashuje (bcrypt) a overuje LEN server; pin_hash appka nevidí. Účet = prihlásený.
export async function nastavZabezpecenie(ucetId: string, { pin, biometria = false }: { pin?: string; biometria?: boolean }) {
  void ucetId;
  const { error } = await db().rpc("nastav_zabezpecenie", { p_pin: pin ?? null, p_biometria: biometria });
  if (error) throw error;
}

// KARTA 44 · telefón overený SMS je kľúč účtu (1 telefón = 1 účet). Pri 1b vzniká účet až po e-maile a hesle,
// telefón sa preto zapíše dodatočne. Server (Samuel): unique na telefon + RLS na update vlastného účtu.
export async function ulozOverenyTelefon(ucetId: string, telefon: string) {
  // Zadanie 3 · 3.2: telefon_overeny zapisuje len server (ak telefón prešiel otp_over); ucetId = môj účet
  void ucetId;
  const { error } = await db().rpc("zapis_overeny_telefon", { p_telefon: (telefon || "").replace(/\s+/g, "") });
  if (error) throw error;
}

// KARTA 44 · organizácia sa pridáva z osobného účtu: nový ucet typu charita bez vlastného prihlásenia,
// prepojený na osobu (správca / štatutár). Server (Samuel): ucet bez telefónu a auth_id + RLS pre správcu.
// Zadanie 4 · 4.3: organizačný účet + prvý správca (prihlásený) vznikajú naraz na serveri (rpc zaloz_organizaciu);
// priamy insert do ucet appka pre cudzí/organizačný účet nesmie (RLS).
export async function vytvorOrganizaciuPodOsobou(osobaUcetId: string, typ = "charita") {
  void osobaUcetId;   // správca = prihlásený účet zo session
  const { data, error } = await db().rpc("zaloz_organizaciu", { p_typ: typ });
  if (error) throw error;
  const u = data as { id: string; typ: string; poradove_cislo: number | null; stav_registracie: string };
  return { id: u.id, typ: u.typ, poradove_cislo: u.poradove_cislo, stav_registracie: u.stav_registracie };
}

export async function dokonciRegistraciu(ucetId: string) {
  const { error } = await db().from("ucet").update({ stav_registracie: "hotovo", aktualizovane: teraz() }).eq("id", ucetId);
  if (error) throw error;
}

// Načíta dáta prihláseného účtu pre zobrazenie v appke (Profil, hlavičky).
// Charita → meno z organizácie. Vracia { ucet, profil, zobrazenie, lokalita, organizacia }.
export async function nacitajUcetData(ucetId: string): Promise<UcetData> {
  const c = db();
  const [u, p, z, l] = await Promise.all([
    c.from("ucet").select("id, typ, poradove_cislo, email").eq("id", ucetId).maybeSingle(),
    c.from("profil").select("meno, druhe_meno, priezvisko, titul, mesto, profilovka_url, rod").eq("ucet_id", ucetId).maybeSingle(),
    c.from("zobrazenie").select("rezim, nick").eq("ucet_id", ucetId).maybeSingle(),
    c.from("lokalita").select("mesto, region, stvrt").eq("ucet_id", ucetId).maybeSingle(),
  ]);
  if (u.error) throw u.error;
  let organizacia: UcetData["organizacia"] = null;
  if (u.data?.typ === "charita") {
    const o = await c.from("organizacia").select("nazov, sidlo").eq("ucet_id", ucetId).maybeSingle();
    organizacia = o.data || null;
  }
  return { ucet: u.data, profil: p.data, zobrazenie: z.data, lokalita: l.data, organizacia } as UcetData;
}

/** Všetko, čo charita zadala pri registrácii — pre profil a správu (jeden zdroj pravdy). */
export interface CharitaData {
  email: string | null; telefon: string | null;
  organizacia: { nazov: string | null; ico: string | null; sidlo: string | null; bankovy_ucet: string | null } | null;
  profil: { misia: string | null; web: string | null; siete: { typ: string; url: string }[] | null; logo_url: string | null; cover_url: string | null } | null;
  segmenty: { sektor: string; pod_segment: string | null }[];
}
export async function nacitajCharitu(orgUcetId: string): Promise<CharitaData> {
  const c = db();
  const [u, o, p, sg] = await Promise.all([
    c.from("ucet").select("email, telefon").eq("id", orgUcetId).maybeSingle(),
    c.from("organizacia").select("nazov, ico, sidlo, bankovy_ucet").eq("ucet_id", orgUcetId).maybeSingle(),
    c.from("profil_charity").select("misia, web, siete, logo_url, cover_url").eq("org_ucet_id", orgUcetId).maybeSingle(),
    c.from("segmenty").select("sektor, pod_segment").eq("org_ucet_id", orgUcetId),
  ]);
  if (u.error) throw u.error;
  return {
    email: u.data?.email ?? null, telefon: u.data?.telefon ?? null,
    organizacia: o.data ?? null, profil: (p.data as CharitaData["profil"]) ?? null,
    segmenty: (sg.data as CharitaData["segmenty"]) ?? [],
  };
}

// ============================================================
// FYZICKÁ OSOBA
// ============================================================

export async function ulozProfil(ucetId: string, p: Record<string, unknown>) {
  const { error } = await db()
    .from("profil")
    .upsert({ ucet_id: ucetId, ...p, aktualizovane: teraz() }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function ulozZobrazenie(ucetId: string, { rezim, nick = null }: { rezim: string; nick?: string | null }) {
  const { error } = await db().from("zobrazenie").upsert({ ucet_id: ucetId, rezim, nick }, { onConflict: "ucet_id" });
  if (error) throw error;
}

// Záujmy — prepíše celý výber (delete + insert). polozky: [{oblast, pod_polozka, vlastny?}]
export async function ulozZaujmy(ucetId: string, polozky: { oblast: string; pod_polozka: string; vlastny?: boolean }[]) {
  const c = db();
  const { error: delErr } = await c.from("zaujmy").delete().eq("ucet_id", ucetId);
  if (delErr) throw delErr;
  if (polozky?.length) {
    const { error } = await c
      .from("zaujmy")
      .insert(polozky.map((p) => ({ ucet_id: ucetId, oblast: p.oblast, pod_polozka: p.pod_polozka, vlastny: !!p.vlastny })));
    if (error) throw error;
  }
}

/** IBAN osoby na výplaty (krok Platba v registrácii) — vlastná tabuľka, vidí ho len majiteľ (0049) */
export async function ulozVyplatnyUcet(ucetId: string, iban: string) {
  const { error } = await db()
    .from("vyplatny_ucet")
    .upsert({ ucet_id: ucetId, iban: iban.replace(/\s/g, "").toUpperCase() }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function ulozLokalitu(ucetId: string, lok: Record<string, unknown>) {
  const { error } = await db().from("lokalita").upsert({ ucet_id: ucetId, ...lok }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function ulozSuhlas(ucetId: string, druh: string, hodnota = true, detail: string | null = null) {
  const { error } = await db().from("suhlasy").insert({ ucet_id: ucetId, druh, hodnota, detail });
  if (error) throw error;
}

// ============================================================
// CHARITA / OZ
// ============================================================

export async function ulozOrganizaciu(orgUcetId: string, org: Record<string, unknown>) {
  const { error } = await db()
    .from("organizacia")
    .upsert({ ucet_id: orgUcetId, ...org }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function prepojStatutara(orgUcetId: string, osobaUcetId: string | null, opravnenie = "štatutár (register)") {
  const c = db();
  // osoba_ucet_id = NULL marí onConflict (NULL je v unique kľúči distinct) →
  // pre register-only placeholder najprv zmaž, aby sa pri opakovaní KYB nehromadili duplikáty
  if (osobaUcetId == null) {
    const { error: delErr } = await c.from("statutar").delete().eq("org_ucet_id", orgUcetId).is("osoba_ucet_id", null);
    if (delErr) throw delErr;
    const { error } = await c.from("statutar").insert({ org_ucet_id: orgUcetId, osoba_ucet_id: null, opravnenie });
    if (error) throw error;
    return;
  }
  const { error } = await c
    .from("statutar")
    .upsert({ org_ucet_id: orgUcetId, osoba_ucet_id: osobaUcetId, opravnenie }, { onConflict: "org_ucet_id,osoba_ucet_id" });
  if (error) throw error;
}

export async function ulozProfilCharity(orgUcetId: string, p: Record<string, unknown>) {
  const { error } = await db()
    .from("profil_charity")
    .upsert({ org_ucet_id: orgUcetId, ...p }, { onConflict: "org_ucet_id" });
  if (error) throw error;
}

export async function ulozDobrovolnictvo(orgUcetId: string, { zaujem = false, typ = [] }: { zaujem?: boolean; typ?: string[] }) {
  const { error } = await db()
    .from("dobrovolnictvo")
    .upsert({ org_ucet_id: orgUcetId, zaujem, typ }, { onConflict: "org_ucet_id" });
  if (error) throw error;
}

// Segmenty — prepíše výber. polozky: [{sektor, pod_segment, vlastny?}]
export async function ulozSegmenty(orgUcetId: string, polozky: { sektor: string; pod_segment?: string | null; vlastny?: boolean }[]) {
  const c = db();
  const { error: delErr } = await c.from("segmenty").delete().eq("org_ucet_id", orgUcetId);
  if (delErr) throw delErr;
  if (polozky?.length) {
    const { error } = await c
      .from("segmenty")
      .insert(polozky.map((p) => ({ org_ucet_id: orgUcetId, sektor: p.sektor, pod_segment: p.pod_segment || null, vlastny: !!p.vlastny })));
    if (error) throw error;
  }
}

export async function pridajPobocku(orgUcetId: string, { mesto, rezim, ico = null, bankovyUcet = null }: { mesto: string; rezim: string; ico?: string | null; bankovyUcet?: string | null }) {
  const { error } = await db()
    .from("pobocka")
    .insert({ centrala_ucet_id: orgUcetId, mesto, rezim, ico, bankovy_ucet: bankovyUcet });
  if (error) throw error;
}

export async function ulozBalik(orgUcetId: string, plan = "free") {
  const { error } = await db().from("balik").upsert({ org_ucet_id: orgUcetId, plan }, { onConflict: "org_ucet_id" });
  if (error) throw error;
}

// ============================================================
// ČÍSELNÍKY (accordion data) — otvorené, rastú podľa dopytu
// ============================================================

export async function nacitajCiselnikZaujmov(): Promise<Ciselnik[]> {
  const { data, error } = await db()
    .from("cis_zaujmy")
    .select("oblast, pod_polozka, poradie")
    .eq("aktivny", true)
    .order("oblast", { ascending: true })
    .order("poradie", { ascending: true });
  if (error) throw error;
  // → [{ nazov: oblast, polozky: [{hodnota: pod_polozka, ...}] }] — v poradí po pároch ako v profile (karta 18)
  const poradie = (n: string) => { const i = ZAUJMY_KATALOG.findIndex((z) => z.label === n); return i < 0 ? 99 : i; };
  return zoskup(data || [], "oblast", "pod_polozka").sort((a, b) => poradie(a.nazov) - poradie(b.nazov));
}

export async function nacitajCiselnikSektorov(): Promise<Ciselnik[]> {
  const { data, error } = await db()
    .from("cis_segmenty")
    .select("sektor, pod_segment, od_balika, poradie")
    .eq("aktivny", true)
    .order("sektor", { ascending: true })
    .order("poradie", { ascending: true });
  if (error) throw error;
  return zoskup(data || [], "sektor", "pod_segment");
}
