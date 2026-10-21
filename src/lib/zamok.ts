// ============================================================
// OPRAVY 466 doplnok 3 · zámok citlivých akcií v mobile (Martin 21. 10.): stratený odomknutý telefón nesmie
// vybrakovať peňaženku. Pri citlivej akcii (Peňaženka, platba nad hranicu, vstup do Správy) overenie
// tvárou / odtlačkom (WebAuthn tohto telefónu) alebo PIN-om (server over_pin, 5 zlých = 15 min čakania).
// Po overení 5 minút pokoj. Na počítači nie (tam stráži nečinnosť). Mikro dary pod hranicou bez trenia.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { nacitajNastavenia } from "./nastaveniaAppky";
import { nazovZariadenia } from "./zariadenia";

export type Oblast = "penazenka" | "platba" | "sprava" | "nastavenie";
export const ODOMKNUTE_MIN = 5;
let odomknuteDo = 0;
export const jeTelefon = () => typeof navigator !== "undefined" && nazovZariadenia().typ === "telefon";

/** treba overiť? (len telefón so serverom, nie v 5-minútovom okne po overení) */
export function trebaOverit(oblast: Oblast, sumaEur = 0): boolean {
  if (!jeTelefon() || !supabase || Date.now() < odomknuteDo) return false;
  const n = nacitajNastavenia();
  if (oblast === "penazenka") return n.zamokPenazenka;
  if (oblast === "sprava") return n.zamokSprava;
  if (oblast === "platba") return n.hranicaPlatby === 0 || sumaEur > n.hranicaPlatby;
  return true; // vypnutie ochrany v Nastaveniach
}

// ---- výzva (jedno okno pre celú appku: ZamokHost) ----
type Vyzva = { dovod: string; hotovo: (ok: boolean) => void };
let vyzva: Vyzva | null = null;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
export function useVyzvaZamku(): Vyzva | null { useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver); return vyzva; }
/** overí totožnosť, ak treba; vráti true = pokračovať */
export function overTotoznost(oblast: Oblast, dovod: string, sumaEur = 0): Promise<boolean> {
  if (!trebaOverit(oblast, sumaEur)) return Promise.resolve(true);
  return new Promise((ok) => {
    vyzva?.hotovo(false);
    vyzva = { dovod, hotovo: (x) => { if (x) odomknuteDo = Date.now() + ODOMKNUTE_MIN * 60000; vyzva = null; zmena(); ok(x); } };
    zmena();
  });
}

// ---- tvár / odtlačok: WebAuthn s overením používateľa na tomto telefóne ----
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const zB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const kluc = (uid: string) => `deed.zamok.cred.${uid}`;
export async function bioDostupna(): Promise<boolean> {
  try { return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}
async function uid(): Promise<string | null> { return supabase ? (await supabase.auth.getSession()).data.session?.user.id ?? null : null; }
/** overenie tvárou / odtlačkom; prvýkrát na tomto telefóne si kľúč založí (tiež s overením) */
export async function overBio(): Promise<boolean> {
  const u = await uid(); if (!u) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  let id: string | null = null;
  try { id = localStorage.getItem(kluc(u)); } catch { /* LS */ }
  try {
    if (id) {
      const a = await navigator.credentials.get({ publicKey: { challenge, allowCredentials: [{ type: "public-key", id: zB64(id) }], userVerification: "required", timeout: 60000 } });
      return !!a;
    }
    const c = await navigator.credentials.create({ publicKey: {
      challenge, rp: { name: "DEED+", id: location.hostname }, user: { id: new TextEncoder().encode(u), name: "DEED+", displayName: "DEED+" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }, timeout: 60000,
    } }) as PublicKeyCredential | null;
    if (!c) return false;
    try { localStorage.setItem(kluc(u), b64(c.rawId)); } catch { /* LS */ }
    return true;
  } catch { return false; }
}

// ---- PIN (server) ----
const veta = (m: string | undefined, n: string) => (m && /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(m) ? m : n);
export async function mamPin(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.rpc("mam_pin");
  return !!data;
}
export async function overPin(pin: string): Promise<{ ok: boolean; chyba?: string }> {
  if (!supabase) return { ok: false, chyba: "Nie je spojenie so serverom." };
  const { data, error } = await supabase.rpc("over_pin", { p_pin: pin });
  if (error) return { ok: false, chyba: veta(error.message, "PIN sa nepodarilo overiť. Skúste znova.") };
  return data ? { ok: true } : { ok: false, chyba: "PIN nesedí." };
}
export async function zmenPin(novy: string, stary?: string): Promise<string | null> {
  if (!supabase) return "Nie je spojenie so serverom.";
  const { error } = await supabase.rpc("zmen_pin", { p_novy: novy, p_stary: stary ?? null });
  return error ? veta(error.message, "PIN sa nepodarilo uložiť. Skúste znova.") : null;
}
