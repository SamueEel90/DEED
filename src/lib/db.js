// ============================================================
// DEED · Dátová vrstva (Supabase) + MOCK vendori
// Pokrýva obe registrácie: fyzická osoba (§13) + charita/OZ (§11).
// Vendori (SMS, Didit KYC/KYB) sú NAMOCKOVANÍ — žiadne reálne volania
// ani náklady. Pri ostrom spustení sa nahradia reálnymi.
// ============================================================
import { supabase } from "./supabase";

function db() {
  if (!supabase) throw new Error("Supabase nie je nakonfigurovaný — skontroluj .env.local");
  return supabase;
}

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms));
const teraz = () => new Date().toISOString();

// PIN/heslo hash (DEMO: SHA-256 cez Web Crypto; v produkcii server-side argon2/bcrypt)
async function hashPin(pin) {
  const data = new TextEncoder().encode("deed:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// zoskupí ploché riadky číselníka podľa kľúča, zachová poradie
function zoskup(rows, kluc, polozkaKluc) {
  const mapa = new Map();
  for (const r of rows) {
    if (!mapa.has(r[kluc])) mapa.set(r[kluc], []);
    mapa.get(r[kluc]).push(r[polozkaKluc] !== undefined ? { hodnota: r[polozkaKluc], ...r } : r);
  }
  return Array.from(mapa, ([nazov, polozky]) => ({ nazov, polozky }));
}

// ============================================================
// MOCK VENDORI
// ============================================================

// SMS OTP — DEMO: žiadna reálna SMS; kód vrátime, nech ho UI zobrazí.
export async function posliOtp(telefon) {
  await cakaj(450);
  const kod = String(Math.floor(100000 + Math.random() * 900000));
  return { kod, demo: true };
}

// KYC osoby (Didit) — DEMO: vždy "sedí" po krátkej chvíli. Ukladá len výsledok.
export async function spustiKyc(ucetId, sposob = "nove") {
  await cakaj(1100);
  const vysledok = "sedi";
  const { error } = await db().from("kyc").insert({ ucet_id: ucetId, vendor: "mock", vysledok, sposob });
  if (error) throw error;
  return { vysledok };
}

// KYB charity — DEMO register: IČO → vymyslené firemné údaje
export async function najdiIco(ico) {
  await cakaj(700);
  const cislo = (ico || "").replace(/\D/g, "");
  return {
    ico: cislo || ico,
    nazov: "OZ Pomoc " + (cislo.slice(-3) || "001"),
    sidlo: "Trenčín, Slovensko",
    datum_vzniku: "2015-03-12",
    pravna_forma: "Občianske združenie",
  };
}

export async function spustiKyb(orgUcetId, { stanovyRef } = {}) {
  await cakaj(1100);
  const { error } = await db()
    .from("kyb")
    .insert({ org_ucet_id: orgUcetId, vendor: "mock", vysledok: "overena", stanovy_ref: stanovyRef || null, aml: "clean" });
  if (error) throw error;
  return { vysledok: "overena" };
}

// ============================================================
// UNIVERZÁLNY ZÁKLAD — telefón/účet/zámok (§4) — osoba aj charita
// ============================================================

// Vytvorí (alebo obnoví) účet po overení telefónu. Podporuje priebežné ukladanie (§11).
export async function vytvorUcet({ typ = "aktivny", telefon, email = null }) {
  const c = db();
  const tel = (telefon || "").replace(/\s+/g, ""); // normalizuj — bez medzier (stabilný unique kľúč + resume)
  const { data: ex } = await c
    .from("ucet")
    .select("id, typ, poradove_cislo, stav_registracie")
    .eq("telefon", tel)
    .maybeSingle();
  if (ex) return { ...ex, obnovene: true };

  const { data, error } = await c
    .from("ucet")
    .insert({ typ, telefon: tel, telefon_overeny: true, email, email_overeny: !!email, stav_registracie: "zabezpecenie" })
    .select("id, typ, poradove_cislo, stav_registracie")
    .single();
  if (error) throw error;
  return data;
}

// Priebežné ukladanie kroku (§11)
export async function ulozStav(ucetId, stav) {
  const { error } = await db().from("ucet").update({ stav_registracie: stav, aktualizovane: teraz() }).eq("id", ucetId);
  if (error) throw error;
}

// Zámok účtu — PIN/heslo (hash) + biometria (§4.2)
export async function nastavZabezpecenie(ucetId, { pin, biometria = false }) {
  const pin_hash = pin ? await hashPin(pin) : null;
  const { error } = await db()
    .from("ucet")
    .update({ pin_hash, biometria, stav_registracie: "udaje", aktualizovane: teraz() })
    .eq("id", ucetId);
  if (error) throw error;
}

export async function dokonciRegistraciu(ucetId) {
  const { error } = await db().from("ucet").update({ stav_registracie: "hotovo", aktualizovane: teraz() }).eq("id", ucetId);
  if (error) throw error;
}

// Načíta dáta prihláseného účtu pre zobrazenie v appke (Profil, hlavičky).
// Charita → meno z organizácie. Vracia { ucet, profil, zobrazenie, lokalita, organizacia }.
export async function nacitajUcetData(ucetId) {
  const c = db();
  const [u, p, z, l] = await Promise.all([
    c.from("ucet").select("id, typ, poradove_cislo, email").eq("id", ucetId).maybeSingle(),
    c.from("profil").select("meno, druhe_meno, priezvisko, titul, mesto, profilovka_url").eq("ucet_id", ucetId).maybeSingle(),
    c.from("zobrazenie").select("rezim, nick").eq("ucet_id", ucetId).maybeSingle(),
    c.from("lokalita").select("mesto, region, stvrt").eq("ucet_id", ucetId).maybeSingle(),
  ]);
  if (u.error) throw u.error;
  let organizacia = null;
  if (u.data?.typ === "charita") {
    const o = await c.from("organizacia").select("nazov, sidlo").eq("ucet_id", ucetId).maybeSingle();
    organizacia = o.data || null;
  }
  return { ucet: u.data, profil: p.data, zobrazenie: z.data, lokalita: l.data, organizacia };
}

// ============================================================
// FYZICKÁ OSOBA
// ============================================================

export async function ulozProfil(ucetId, p) {
  const { error } = await db()
    .from("profil")
    .upsert({ ucet_id: ucetId, ...p, aktualizovane: teraz() }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function ulozZobrazenie(ucetId, { rezim, nick = null }) {
  const { error } = await db().from("zobrazenie").upsert({ ucet_id: ucetId, rezim, nick }, { onConflict: "ucet_id" });
  if (error) throw error;
}

// Záujmy — prepíše celý výber (delete + insert). polozky: [{oblast, pod_polozka, vlastny?}]
export async function ulozZaujmy(ucetId, polozky) {
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

export async function ulozLokalitu(ucetId, lok) {
  const { error } = await db().from("lokalita").upsert({ ucet_id: ucetId, ...lok }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function ulozSuhlas(ucetId, druh, hodnota = true, detail = null) {
  const { error } = await db().from("suhlasy").insert({ ucet_id: ucetId, druh, hodnota, detail });
  if (error) throw error;
}

// Pasívny dar (§2) — host bez účtu: ucetId = null
export async function pridajDar({ ucetId = null, sumaEur, kanal, prijemca = null, zobrazenie = "anonym" }) {
  const { error } = await db()
    .from("dar")
    .insert({ ucet_id: ucetId, suma_eur: sumaEur, kanal, prijemca, zobrazenie });
  if (error) throw error;
}

// ============================================================
// CHARITA / OZ
// ============================================================

export async function ulozOrganizaciu(orgUcetId, org) {
  const { error } = await db()
    .from("organizacia")
    .upsert({ ucet_id: orgUcetId, ...org }, { onConflict: "ucet_id" });
  if (error) throw error;
}

export async function prepojStatutara(orgUcetId, osobaUcetId, opravnenie = "štatutár (register)") {
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

export async function ulozProfilCharity(orgUcetId, p) {
  const { error } = await db()
    .from("profil_charity")
    .upsert({ org_ucet_id: orgUcetId, ...p }, { onConflict: "org_ucet_id" });
  if (error) throw error;
}

export async function ulozDobrovolnictvo(orgUcetId, { zaujem = false, typ = [] }) {
  const { error } = await db()
    .from("dobrovolnictvo")
    .upsert({ org_ucet_id: orgUcetId, zaujem, typ }, { onConflict: "org_ucet_id" });
  if (error) throw error;
}

// Segmenty — prepíše výber. polozky: [{sektor, pod_segment, vlastny?}]
export async function ulozSegmenty(orgUcetId, polozky) {
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

export async function pridajPobocku(orgUcetId, { mesto, rezim, ico = null, bankovyUcet = null }) {
  const { error } = await db()
    .from("pobocka")
    .insert({ centrala_ucet_id: orgUcetId, mesto, rezim, ico, bankovy_ucet: bankovyUcet });
  if (error) throw error;
}

export async function ulozBalik(orgUcetId, plan = "free") {
  const { error } = await db().from("balik").upsert({ org_ucet_id: orgUcetId, plan }, { onConflict: "org_ucet_id" });
  if (error) throw error;
}

// ============================================================
// ČÍSELNÍKY (accordion data) — otvorené, rastú podľa dopytu
// ============================================================

export async function nacitajCiselnikZaujmov() {
  const { data, error } = await db()
    .from("cis_zaujmy")
    .select("oblast, pod_polozka, poradie")
    .eq("aktivny", true)
    .order("oblast", { ascending: true })
    .order("poradie", { ascending: true });
  if (error) throw error;
  // → [{ nazov: oblast, polozky: [{hodnota: pod_polozka, ...}] }]
  return zoskup(data, "oblast", "pod_polozka");
}

export async function nacitajCiselnikSektorov() {
  const { data, error } = await db()
    .from("cis_segmenty")
    .select("sektor, pod_segment, od_balika, poradie")
    .eq("aktivny", true)
    .order("sektor", { ascending: true })
    .order("poradie", { ascending: true });
  if (error) throw error;
  return zoskup(data, "sektor", "pod_segment");
}
