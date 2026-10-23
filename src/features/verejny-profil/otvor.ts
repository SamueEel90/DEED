// KARTA 43 · verejné profily — jedna obrazovka pre charitu, firmu aj tvorcu.
// Otvára sa z viacerých miest: tlačidlo v Správe stránky, feed, „Stránka organizácie",
// adresár aj QR. Verejný odkaz na zdieľanie: /p/svetlo · /p/pekaren · /p/martin.
// Režim modulu (všade / len v detaile) je v DEV paneli v Mojom profile, nie v adrese.
import { ADRESA } from "@/lib/adresa";
import { useEffect, useSyncExternalStore } from "react";
import { slugNaKluc, klucNaSlug } from "@/lib/testProfily";
import { hlavnaBezi, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { STREAMY } from "@/lib/testTvorca";
import { strankaZbierky } from "@/lib/novaZbierka";
import { supabase } from "@/lib/supabase";
import { profilOsoby, otvorOsobu } from "@/lib/odkazOsoby";

let otvorene = false;
let kluc: string | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

// OPRAVY 225: náhľad vlastnej stránky zo Správy („‹ Späť do Správy“, štítok Náhľad namiesto Sledovať)
let zoSpravy = false;
// OPRAVY 315: ťuk na upozornenie „Farár zverejnil váš príspevok“ → stránka presne pri príspevku
let doOznamu: string | null = null;
export function otvorVerejnyProfil(k: string, o?: { zoSpravy?: boolean; doOznamu?: string; doVecnej?: string; doSkutku?: string; /** OPRAVY 485: Späť zo skutku vráti rovno na Domov */ spatNaFeed?: boolean }) { otvorene = true; kluc = k; zoSpravy = !!o?.zoSpravy; doOznamu = o?.doOznamu ?? null; doVecnej = o?.doVecnej ?? null; doSkutku = o?.doSkutku ?? null; skutokZFeedu = !!o?.spatNaFeed; zmena(); }
let skutokZFeedu = false;
export const skutokOtvorenyZFeedu = (): boolean => skutokZFeedu;
// OPRAVY 490: „Pozri ›“ pri skutku v module zbierky → stránka charity s otvoreným detailom skutku (číta sa bez mazania, zmaže zrusDoSkutku)
let doSkutku: string | null = null;
export const cielSkutku = (): string | null => doSkutku;
export function zrusDoSkutku() { doSkutku = null; }
// OPRAVY 320 doplnok: z upozornenia „Poďakovanie · …“ → stránka s detailom vecnej zbierky (číta sa bez mazania, zmaže zrusDoVecnej)
let doVecnej: string | null = null;
export const cielVecnej = (): string | null => doVecnej;
export function zrusDoVecnej() { doVecnej = null; }
/** príspevok, pri ktorom sa má stránka otvoriť (číta sa bez mazania, zmaže ho zrusDoOznamu) */
export const cielOznamu = (): string | null => doOznamu;
export function zrusDoOznamu() { doOznamu = null; }
/** stránka je otvorená ako náhľad zo Správy */
export const nahladZoSpravy = (): boolean => zoSpravy;
/** KARTA 55 · E: odkaz z Domova „Celý príbeh na stránke … ›" — stránka Príbeh nad feedom, „Späť na Domov" vráti na to isté miesto */
export function otvorPribeh(zbierkaId: string) { otvorVerejnyProfil(`pribeh:${zbierkaId}`); }
export function zavriVerejnyProfil() { otvorene = false; zoSpravy = false; doOznamu = null; zmena(); } // OPRAVY 249: náhľad sa neprenesie na ďalšie otvorenie
/** kľúč profilu, ktorý je otvorený (číta sa bez mazania — StrictMode volá inicializáciu dvakrát) */
export const verejnyProfilKluc = (): string | null => kluc;

// OPRAVY 162 · QR farnosti = jeden QR z registrácie (/p/{slug}?qr=1), nikdy sa nemení.
// Kým hlavná zbierka nebeží, otvorí profil; keď beží, ten istý QR otvorí rovno hlavnú zbierku.
let qrHlavna = false;
// OPRAVY 320: QR na plagáte vecnej zbierky (/p/{slug}?vz={id}) → stránka farnosti a hneď „Darovali ste?“ (raz)
let vecnaZQr: string | null = null;
/** číta sa bez mazania (StrictMode volá inicializáciu dvakrát), zmaže zrusVecnuZQr */
export const vecnaZQrCitaj = (): string | null => vecnaZQr;
export function zrusVecnuZQr() { vecnaZQr = null; }
export const odkazQrStranky = (stranka: string) => `${ADRESA}/p/${klucNaSlug(stranka)}?qr=1`;
// OPRAVY 347: QR zvončeka (trvalý) → zbierka pri aktuálnej omši · QR zbierky (na dobu zbierky) → priamo zbierka, po skončení „Zbierka skončila“
export const odkazQrZvonceka = (stranka: string) => `${ADRESA}/p/${klucNaSlug(stranka)}/omsa`;
export const odkazQrZbierky = (id: string) => `${ADRESA}/z/${encodeURIComponent(id)}`;
export type QrCiel = { omsa: true } | { zbierka: string };
let qrCiel: QrCiel | null = null;
/** cieľ z QR (číta sa bez mazania — StrictMode), zmaže zrusQrCiel */
export const qrCielCitaj = (): QrCiel | null => qrCiel;
export function zrusQrCiel() { qrCiel = null; }
// OPRAVY 483: zbierka z QR pre stránku charity — samostatne, lebo nástenka farnosti qrCiel pri prvom vykreslení maže
// (stránka charity sa pri načítaní chvíľu vykreslí ako farnosť, kým appka nevie, že je to charita)
let zbierkaZQr: string | null = null;
export const zbierkaZQrCitaj = (): string | null => zbierkaZQr;
export function zrusZbierkuZQr() { zbierkaZQr = null; }
/** OPRAVY 356: QR farnosti (?qr=1) pre Nástenku farnosti — číta sa bez mazania (StrictMode), zmaže zrusQrHlavna */
export const qrHlavnaCitaj = (): boolean => qrHlavna;
export function zrusQrHlavna() { qrHlavna = false; }
/** profil farnosti otvorený z QR farnosti: keď hlavná zbierka beží, otvor ju (raz) */
export function useOtvorHlavnuZQr(stranka: string, farnost: boolean, otvor: () => void) {
  useZmenyCentralnej();
  const bezi = farnost && hlavnaBezi(stranka);
  useEffect(() => { if (bezi && qrHlavna) { qrHlavna = false; otvor(); } }, [bezi]); // eslint-disable-line react-hooks/exhaustive-deps
}

// OPRAVY 385: adresa prišla s cieľom (/p/… alebo /z/…) → appka neukáže bránu, otvorí cieľ aj hosťovi
let prisloSCielom = false;
export const prisloZQr = (): boolean => prisloSCielom;
// OPRAVY 385 doplnok: adresa z QR (/p/…, /z/…) ostane v prehliadači, kým je cieľ otvorený (dá sa zdieľať a obnoviť)
export const qrAdresa: string | null = typeof window !== "undefined" && /^\/(p|z)\//.test(window.location.pathname) ? window.location.pathname + window.location.search : null;
// /p/{slug} — verejný odkaz (QR, zdieľanie). Slug sa preloží na kľúč profilu.
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
  if (m) {
    prisloSCielom = true;
    const k = slugNaKluc(decodeURIComponent(m[1]));
    const omsa = /^\/p\/[^/?#]+\/omsa\/?$/.test(window.location.pathname);
    if (k) { otvorene = true; kluc = k; qrHlavna = !omsa && new URLSearchParams(window.location.search).has("qr"); vecnaZQr = new URLSearchParams(window.location.search).get("vz"); if (omsa) qrCiel = { omsa: true }; }
    // OPRAVY 449 (1): staré osobné pozvánky /p/<meno-x> — keď taká stránka nie je, otvorí sa profil usera s týmto odkazom
    const slug = decodeURIComponent(m[1]).toLowerCase();
    if (k && k === slug && supabase && /^[a-z0-9-]+$/.test(slug)) {
      const sb = supabase;
      void sb.from("stranka").select("id").eq("id", k).maybeSingle().then(async ({ data, error }) => {
        if (error || data) return;
        const p = await profilOsoby(slug);
        if (p) { zavriVerejnyProfil(); otvorOsobu(slug); }
      });
    }
  }
}
// OPRAVY 492 · /r/{reťaz}/{zbierka} — QR reťaze dobra: verzia zbierky u toho, kto reťazí (lib/retazVerzia), aj hosťovi
if (typeof window !== "undefined" && /^\/r\/rt-/.test(window.location.pathname)) prisloSCielom = true;
// KARTA 47 · /z/{zbierka}?s={stream} — QR / odkaz zo streamu tvorcu → rovno stránka streamu na zbierku.
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/z\/([^/?#]+)/);
  const s = new URLSearchParams(window.location.search).get("s");
  if (m && s && STREAMY[s] && STREAMY[s].zbierka === decodeURIComponent(m[1])) {
    otvorene = true; prisloSCielom = true; kluc = `stream:${s}`;
  } else if (m) {
    prisloSCielom = true;
    // OPRAVY 347: /z/{id} — QR zbierky farnosti, vecnej aj rodiny: stránka, ktorej zbierka patrí, a hneď zbierka
    const id = decodeURIComponent(m[1]);
    void strankaZbierky(id).then((st) => { if (st) { qrCiel = { zbierka: id }; zbierkaZQr = id; otvorVerejnyProfil(st); } });
  }
}

export function useVerejnyProfilOtvoreny(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return otvorene;
}

// koľko vrstiev profilu je práve na obrazovke (Host aj vložený z Domova) — appka vtedy skryje plávajúce „+"
let vrstvy = 0;
export function vrstvaProfiluPripoj(): () => void { vrstvy++; zmena(); return () => { vrstvy--; zmena(); }; }
export function useVrstvaProfiluOtvorena(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return vrstvy > 0;
}
