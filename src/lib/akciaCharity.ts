// ============================================================
// OPRAVY 446 · akcia za charitu naostro (migrácia 0145)
//  · organizátor skenuje Môj QR účastníkov (akcia_pridaj_skenom) a vidí zoznam zo servera (akcia_ucastnici)
//  · QR charity naozaj rotuje (event_token, nový kód každých 15 s) — adresa „<appka>/akcia/<kód>“
//  · účastník, ktorý ho naskenuje, dostane rovno okno „Pripojiť sa k akcii …?“ (aj bez účtu: prihlásenie a hneď späť)
//  · poloha: appka ju zistí sama (usePoloha), nič sa nehlási dole malým toastom
// ============================================================
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { ADRESA } from "./adresa";

const vetaChyby = (m: string | undefined, nahrada: string) => (m && /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(m) && !/[a-z]+_[a-z]+/.test(m) ? m : nahrada);
export const jeUuid = (s: string | undefined | null) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ---------------- organizátor ----------------
const KROK = 15;
/** rotujúci kód QR charity: nový pri každom 15 s okne (zarovnané na čas servera aj Môj QR) */
export function useKodAkcie(akcia: string | null, nazov: string): { kod: string | null; sek: number } {
  const [kod, setKod] = useState<string | null>(null);
  const [sek, setSek] = useState(KROK);
  useEffect(() => {
    if (!akcia || !supabase) return;
    const sb = supabase;
    let ziva = true; let t: number | undefined;
    void (async () => {
      await sb.rpc("event_secret_create", { p_event: akcia, p_step: KROK, p_mod: "threshold", p_nazov: nazov || null });
      const nacitaj = async () => {
        const { data } = await sb.rpc("event_token", { p_event: akcia });
        if (!ziva) return;
        if (data) setKod(String(data));
        t = window.setTimeout(() => void nacitaj(), (KROK - ((Date.now() / 1000) % KROK)) * 1000 + 250);
      };
      await nacitaj();
    })();
    return () => { ziva = false; window.clearTimeout(t); };
  }, [akcia, nazov]);
  useEffect(() => { const t = window.setInterval(() => setSek(Math.max(1, Math.ceil(KROK - ((Date.now() / 1000) % KROK)))), 500); return () => window.clearInterval(t); }, []);
  return { kod, sek };
}
export const odkazAkcie = (kod: string) => `${ADRESA}/akcia/${kod}`;

export type UcastnikServer = { ucet: string; meno: string; prichod: string | null; odchod: string | null };
/** zoznam účastníkov akcie zo servera (sken organizátora aj QR charity), obnova každé 4 s */
export function useUcastniciAkcie(akcia: string | null): { zoznam: UcastnikServer[] | null; obnov: () => void } {
  const [zoznam, setZoznam] = useState<UcastnikServer[] | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!akcia || !supabase) return;
    const sb = supabase;
    let ziva = true;
    const nacitaj = async () => {
      const { data, error } = await sb.rpc("akcia_ucastnici", { p_akcia: akcia });
      if (ziva && !error) setZoznam((data as UcastnikServer[] | null) ?? []);
    };
    void nacitaj();
    const t = window.setInterval(() => void nacitaj(), 4000);
    return () => { ziva = false; window.clearInterval(t); };
  }, [akcia, n]);
  return { zoznam, obnov: useCallback(() => setN((x) => x + 1), []) };
}
export async function pridajUcastnikaSkenom(akcia: string, kod: string): Promise<{ meno: string; ucet: string } | { chyba: string }> {
  if (!supabase) return { chyba: "Skenovanie funguje len s pripojením na server." };
  const { data, error } = await supabase.rpc("akcia_pridaj_skenom", { p_akcia: akcia, p_kod: kod });
  if (error) return { chyba: vetaChyby(error.message, "Účastníka sa nepodarilo pridať. Skúste znova.") };
  const d = data as { meno?: string; ucet?: string } | null;
  return { meno: String(d?.meno ?? "Účastník"), ucet: String(d?.ucet ?? "") };
}
export async function odoberUcastnika(akcia: string, ucet: string): Promise<string | null> {
  if (!supabase) return "Nie je spojenie so serverom.";
  const { error } = await supabase.rpc("akcia_odober", { p_akcia: akcia, p_ucet: ucet });
  return error ? vetaChyby(error.message, "Účastníka sa nepodarilo odobrať. Skúste znova.") : null;
}

// ---------------- poloha ----------------
export type StavPolohy = "zistuje" | "ok" | "vypnuta" | "zamietnuta" | "nepodporovana";
/** appka zistí polohu sama; skus() = systémová žiadosť znova (tlačidlo „Zapnúť polohu“) */
export function usePoloha(zapnute: boolean): { stav: StavPolohy; poz: { lat: number; lng: number } | null; skus: () => void } {
  const [stav, setStav] = useState<StavPolohy>("zistuje");
  const [poz, setPoz] = useState<{ lat: number; lng: number } | null>(null);
  const skus = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setStav("nepodporovana"); return; }
    setStav((s) => (s === "ok" ? s : "zistuje"));
    navigator.geolocation.getCurrentPosition(
      (p) => { setPoz({ lat: p.coords.latitude, lng: p.coords.longitude }); setStav("ok"); },
      (e) => setStav(e.code === e.PERMISSION_DENIED ? "zamietnuta" : "vypnuta"),
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 });
  }, []);
  useEffect(() => {
    if (!zapnute) return;
    skus();
    const t = window.setInterval(skus, 30000); // počas akcie stráži, či ju organizátor nevypol
    return () => window.clearInterval(t);
  }, [zapnute, skus]);
  return { stav, poz, skus };
}

// ---------------- účastník: okno „Pripojiť sa k akcii …?“ ----------------
// OPRAVY 446 doplnok (0147): kód QR charity sa overí hneď pri skene; server podrží miesto 15 minút (pozvanie „rez“),
// kým sa nový človek zaregistruje. Potom sa pripojí bez nového skenu. Po 15 minútach „Čas vypršal …“.
const KLUC = "deed.pripojenie";
const PLATI_MS = 15 * 60 * 1000;
export type Pripojenie = { kod: string; rez?: string; cas: number };
let stav: Pripojenie | null = null;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
function uloz(p: Pripojenie | null) { try { if (p) localStorage.setItem(KLUC, JSON.stringify(p)); else localStorage.removeItem(KLUC); } catch { /* súkromné okno */ } }
export function usePripojenie(): Pripojenie | null { useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver); return stav; }
export function otvorPripojenie(kod: string) { stav = { kod, cas: Date.now() }; uloz(stav); zmena(); }
export function zavriPripojenie() { uloz(null); stav = null; zmena(); }
function nastavRez(rez: string) { if (!stav) return; stav = { ...stav, rez }; uloz(stav); zmena(); }
/** kód QR charity z naskenovaného textu (adresa …/akcia/<kód> alebo holý kód) */
export function kodAkcieZQr(text: string): string | null {
  const m = text.trim().match(/(?:\/akcia\/)?(DEED1\.[0-9a-f-]{36}\.[0-9]+\.[0-9a-f]{16})/i);
  return m ? m[1] : null;
}
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/akcia\/(DEED1\.[^/?#]+)/);
  if (m) { try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ } stav = { kod: m[1], cas: Date.now() }; uloz(stav); }
  else { try { const x = JSON.parse(localStorage.getItem(KLUC) ?? "null") as Pripojenie | null; if (x?.kod && Date.now() - (x.cas ?? 0) < PLATI_MS) stav = x; } catch { /* nič */ } }
}

export type InfoAkcie = { plati: boolean; skoncila?: boolean; vyprsal?: boolean; nazov?: string; som?: boolean; organizator?: boolean };
/** pri prvom otvorení overí kód a podrží miesto; potom stav pozvania */
export async function infoAkcie(p: Pripojenie): Promise<InfoAkcie | null> {
  if (!supabase) return null;
  let rez = p.rez;
  if (!rez) {
    const { data, error } = await supabase.rpc("akcia_rezervuj", { p_token: p.kod });
    if (error) return null;
    const d = data as { plati: boolean; skoncila?: boolean; rez?: string };
    if (!d.plati || !d.rez) return { plati: false, skoncila: d.skoncila };
    rez = d.rez; nastavRez(rez);
  }
  const { data, error } = await supabase.rpc("akcia_info_rez", { p_rez: rez });
  return error ? null : (data as InfoAkcie);
}
export async function pripojSaKAkcii(p: Pripojenie, poz: { lat: number; lng: number } | null): Promise<string | null> {
  if (!supabase || !p.rez) return "Nie je spojenie so serverom. Skúste znova.";
  const { error } = await supabase.rpc("akcia_pripoj_rez", { p_rez: p.rez, p_lat: poz?.lat ?? null, p_lng: poz?.lng ?? null });
  return error ? vetaChyby(error.message, "Nepodarilo sa pripojiť. Skúste znova.") : null;
}
