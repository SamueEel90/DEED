// ============================================================
// PRÍLOHA K PONUKE (PDF) — mock úložisko v prehliadači (IndexedDB).
// Charity majú výberové konanie často hotové v dokumente; nech ho vedia
// pripnúť namiesto prepisovania. V dátach je len odkaz „idb:<kľúč>".
// V produkcii to ide do úložiska na serveri, API ostáva.
// ============================================================
import { useEffect, useState } from "react";
import { jeVStorage, nahrajSuborUrl } from "@/lib/uploadFoto";

export const PRILOHA_CFG = { maxMB: 8, typy: ["application/pdf"] };
const DB = "deed-media", STORE = "priloha";

function otvor(): Promise<IDBDatabase> {
  return new Promise((ok, zle) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("video")) db.createObjectStore("video");
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => zle(r.error);
  });
}

const jeIdb = (src?: string) => !!src && src.startsWith("idb:");
/** odkaz „idb:…" (len tento prehliadač) alebo URL zo Storage (prihlásený — vidia všetci) */
export const jePriloha = (src?: string) => jeIdb(src) || jeVStorage(src, "prilohy");

export async function ulozPrilohu(f: File): Promise<string> {
  if (!PRILOHA_CFG.typy.includes(f.type)) throw new Error("Príloha musí byť PDF.");
  if (f.size > PRILOHA_CFG.maxMB * 1024 * 1024) throw new Error(`Príloha má ${(f.size / 1024 / 1024).toFixed(1)} MB — limit je ${PRILOHA_CFG.maxMB} MB.`);
  const url = await nahrajSuborUrl(f, "prilohy", "pdf"); // prihlásený → Storage, inak / pri chybe prehliadač
  if (url) return url;
  const kluc = `p${Date.now()}`;
  const db = await otvor();
  await new Promise<void>((ok, zle) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(f, kluc);
    tx.oncomplete = () => ok();
    tx.onerror = () => zle(new Error("Prílohu sa nepodarilo uložiť."));
  });
  return `idb:${kluc}`;
}

/** odkaz „idb:…" → URL na otvorenie/stiahnutie (null kým sa načítava) */
export function usePrilohaUrl(src?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!jeIdb(src)) { setUrl(jePriloha(src) ? src! : null); return; }
    let u: string | null = null, zive = true;
    otvor().then((db) => {
      const r = db.transaction(STORE).objectStore(STORE).get(src!.slice(4));
      r.onsuccess = () => { if (zive && r.result) { u = URL.createObjectURL(r.result as Blob); setUrl(u); } };
    }).catch(() => {});
    return () => { zive = false; if (u) URL.revokeObjectURL(u); };
  }, [src]);
  return url;
}

export async function zmazPrilohu(src?: string) {
  if (!jeIdb(src)) return; // súbor v Storage ostáva (môže byť v histórii / u darcov)
  try {
    const db = await otvor();
    await new Promise<void>((ok) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(src!.slice(4));
      tx.oncomplete = () => ok();
      tx.onerror = () => ok();
    });
  } catch { /* nič */ }
}
