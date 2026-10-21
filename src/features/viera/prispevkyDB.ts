// ============================================================
// VIERA · príspevky farnosti v Supabase (prenos medzi zariadeniami).
// localStorage (stav.ts, oblasť "prispevky") zostáva ako offline cache:
//   · synchronizujPrispevky(fid) pri otvorení farnosti stiahne DB stav,
//     offline vytvorené položky DOPLNÍ do DB a zrkadlo uloží do LS
//   · publikovanie/úprava/mazanie (mock.ts) zapisuje LS + fire-and-forget DB
// Oblasť "dbsync" drží ID-čka, ktoré už boli v DB — vďaka tomu vieme odlíšiť
// „vytvorené offline → doplň do DB" od „zmazané na inom zariadení → zmaž aj tu".
// Vzor: lib/personalizaciaStore.ts (zbierka) + data/good.supabase.ts (fotky).
// Bez DB (mock režim) je všetko no-op — správanie ako doteraz.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { bezDataUrl, nahrajSuborUrl, zmensiPreZariadenie, uvolniKoncepty } from "@/lib/uploadFoto";
import { nacitajStav, ulozStav, synchronizujStav } from "./stav";
import type { VieraFeedItem } from "./mock";
import { jeVzor } from "@/lib/vzorStranky";

function oznacVDb(fid: string, id: string) {
  const s = new Set(nacitajStav<string[]>("dbsync", fid, []));
  s.add(id);
  ulozStav("dbsync", fid, [...s]);
}

export async function nacitajPrispevkyDB(fid: string): Promise<VieraFeedItem[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("naboz_prispevok").select("data")
    .eq("farnost_id", fid).order("vytvorene", { ascending: false });
  if (error) return null;
  return (data ?? []).map((r) => r.data as VieraFeedItem);
}

/** OPRAVY 253: každý obrázok v príspevku (aj fotka zosnulého v parte, šablóna, plagát) → Storage, nie len pole fotky.
 *  Vyčistená verzia (URL namiesto data URL) sa vráti aj do LS — telefón (Safari ~5 MB) inak úložisko zaplní a zápis zlyhá potichu. */
async function bezObrazkov(fid: string, it: VieraFeedItem): Promise<VieraFeedItem> {
  let cist = it;
  try { cist = await bezDataUrl(it, "prispevky"); } catch { return bezLokalnehoVidea(it); } // bez prihlásenia ostáva lokálne
  // OPRAVY 270: video udalosti je z galérie blob: (žije len v tomto okne) → Storage, inak by ho nikto iný nevidel
  if (cist.video && /^(blob|data):/.test(cist.video)) {
    const b = await fetch(cist.video).then((r) => r.blob(), () => null);
    const url = b ? await nahrajSuborUrl(b, "video", (b.type.split("/")[1] || "mp4").replace("quicktime", "mov")) : null;
    if (url) cist = { ...cist, video: url };
  }
  if (cist !== it) ulozStav("prispevky", fid, nacitajStav<VieraFeedItem[]>("prispevky", fid, []).map((x) => (x.id === it.id ? cist : x)));
  return bezLokalnehoVidea(cist); // nenahraté video ostáva len na tomto zariadení, do DB nejde
}
const bezLokalnehoVidea = (it: VieraFeedItem): VieraFeedItem => (it.video && /^(blob|data):/.test(it.video) ? { ...it, video: undefined } : it);

/** OPRAVY 273: zverejnenie, na ktoré sa čaká — zelená hláška až keď je naozaj uložené.
 *  S DB: obrázky do Storage, zápis na server (chyba = text). Bez DB: zariadenie (plné úložisko = text). Vráti chybu alebo null. */
export async function zapisPrispevokIsto(fid: string, it: VieraFeedItem, uprava = false): Promise<string | null> {
  const lok = nacitajStav<VieraFeedItem[]>("prispevky", fid, []);
  const doZoznamu = (x: VieraFeedItem) => (uprava ? lok.map((y) => (y.id === x.id ? x : y)) : [x, ...lok.filter((y) => y.id !== x.id)]);
  // OPRAVY 335: bez servera fotky zmenšené ako pre Storage; keď miesto nestačí, uvoľnia sa staré rozpísané koncepty a skúsi sa znova
  if (!supabase) {
    const mensi = await zmensiPreZariadenie(it);
    if (ulozStav("prispevky", fid, doZoznamu(mensi))) return null;
    if (uvolniKoncepty() && ulozStav("prispevky", fid, doZoznamu(mensi))) return null;
    return "Na zariadení nie je miesto. Zmenšite alebo vynechajte fotku a skúste znova.";
  }
  let cist: VieraFeedItem;
  try { cist = await bezDataUrl(it, "prispevky"); } catch (e) { return e instanceof Error ? e.message : "Fotky sa nepodarilo nahrať. Skúste znova."; }
  // ako bezObrazkov (Samuel, bod 270): video z galérie udalosti do Storage, nenahraté ostane len na tomto zariadení
  if (cist.video && /^(blob|data):/.test(cist.video)) {
    const b = await fetch(cist.video).then((r) => r.blob(), () => null);
    const url = b ? await nahrajSuborUrl(b, "video", (b.type.split("/")[1] || "mp4").replace("quicktime", "mov")) : null;
    if (url) cist = { ...cist, video: url };
  }
  const doDb = bezLokalnehoVidea(cist);
  const { error } = uprava
    ? await supabase.from("naboz_prispevok").update({ data: doDb, upravene: new Date().toISOString() }).eq("id", cist.id)
    : await supabase.from("naboz_prispevok").upsert({ id: cist.id, farnost_id: fid, data: doDb }, { onConflict: "id" });
  if (error) return "Nepodarilo sa uložiť na server. Skontrolujte pripojenie a skúste znova.";
  if (!uprava) oznacVDb(fid, cist.id);
  ulozStav("prispevky", fid, doZoznamu(cist));
  return null;
}

/** Upsert (idempotentné — id generuje klient). Obrázky data URL → Storage. */
export async function vytvorPrispevokDB(fid: string, it: VieraFeedItem): Promise<void> {
  if (!supabase) return;
  const cist = await bezObrazkov(fid, it);
  const { error } = await supabase.from("naboz_prispevok").upsert(
    { id: cist.id, farnost_id: fid, data: cist },
    { onConflict: "id" },
  );
  if (!error) oznacVDb(fid, cist.id);
}

export async function zmazPrispevokDB(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("naboz_prispevok").delete().eq("id", id);
}

export async function upravPrispevokDB(id: string, it: VieraFeedItem, fid?: string): Promise<void> {
  if (!supabase) return;
  const cist = fid ? await bezObrazkov(fid, it) : bezLokalnehoVidea(it);
  await supabase.from("naboz_prispevok")
    .update({ data: cist, upravene: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Zosúladí LS ↔ DB pre farnosť: DB je autorita, offline vytvorené sa doplnia.
 * Vráti true, keď prebehla synchronizácia (→ UI si má znova prečítať LS).
 */
export async function synchronizujPrispevky(fid: string): Promise<boolean> {
  if (jeVzor(fid)) return false;
  const zDb = await nacitajPrispevkyDB(fid);
  if (zDb === null) return false; // mock režim / DB nedostupná → LS ostáva
  const dbIds = new Set(zDb.map((it) => it.id));
  const uzBoliVDb = new Set(nacitajStav<string[]>("dbsync", fid, []));
  const lokalne = nacitajStav<VieraFeedItem[]>("prispevky", fid, []);
  // len-lokálne, ktoré v DB nikdy neboli = vytvorené offline → doplň do DB;
  // tie, čo v DB boli a už nie sú = zmazané inde → vypadnú aj lokálne
  const naDoplnenie = lokalne.filter((it) => !dbIds.has(it.id) && !uzBoliVDb.has(it.id));
  for (const it of naDoplnenie) void vytvorPrispevokDB(fid, it);
  ulozStav("prispevky", fid, [...naDoplnenie, ...zDb]);
  // OPRAVY 253: staršie príspevky s obrázkami priamo v dátach (data URL) — zariadenie, ktoré ich vytvorilo, ich prepíše na URL zo Storage
  const lokIds = new Set(lokalne.map((it) => it.id));
  for (const it of zDb) if (lokIds.has(it.id) && JSON.stringify(it).includes(";base64,")) void upravPrispevokDB(it.id, it, fid);
  ulozStav("dbsync", fid, [...dbIds]);
  return true;
}

/**
 * Hook do obrazoviek farnosti: pri otvorení stiahne DB stav (príspevky + KV
 * stav profilu/konfigu) do LS a vráti „verziu" — po jej zmene komponent znova
 * prečíta obsahFarnosti/nacitajStav.
 */
export function usePrispevkySync(fid?: string): number {
  const [verzia, setVerzia] = useState(0);
  useEffect(() => {
    if (!fid) return;
    let zije = true;
    void Promise.all([synchronizujPrispevky(fid), synchronizujStav(fid)])
      .then(([a, b]) => { if (zije && (a || b)) setVerzia((v) => v + 1); });
    // OPRAVY 336: oznam z iného zariadenia sa ukáže do 5 s — malý dotaz (id + čas úpravy), celé stiahnutie len pri zmene
    if (!supabase) return () => { zije = false; };
    let podpis = "", bezi = false;
    const skontroluj = async () => {
      if (bezi || document.visibilityState === "hidden") return;
      bezi = true;
      try {
        const { data, error } = await supabase!.from("naboz_prispevok").select("id,upravene").eq("farnost_id", fid);
        if (error || !zije) return;
        const p = (data ?? []).map((r) => `${r.id}@${r.upravene}`).sort().join("|");
        if (podpis && p !== podpis && (await synchronizujPrispevky(fid)) && zije) setVerzia((v) => v + 1);
        podpis = p;
      } finally { bezi = false; }
    };
    void skontroluj();
    const t = window.setInterval(() => { void skontroluj(); }, 5000);
    const naFokus = () => { void skontroluj(); };
    window.addEventListener("focus", naFokus); document.addEventListener("visibilitychange", naFokus);
    return () => { zije = false; window.clearInterval(t); window.removeEventListener("focus", naFokus); document.removeEventListener("visibilitychange", naFokus); };
  }, [fid]);
  return verzia;
}
