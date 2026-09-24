// ============================================================
// VIDEO K DÔKAZU — mock úložisko v prehliadači (IndexedDB, prežije reload).
// V produkcii upload do úložiska + prekódovanie na serveri.
// V dátach sa drží len odkaz „idb:<kľúč>"; URL na prehratie sa získa hookom.
// ============================================================
import { useEffect, useState } from "react";

export const VIDEO_CFG = { maxMB: 60, maxSekund: 90 };
const DB = "deed-media", STORE = "video";

function otvor(): Promise<IDBDatabase> {
  return new Promise((ok, zle) => {
    // verzia 2 = spoločná databáza s prílohami (lib/prilohy.ts) — obe musia
    // otvárať rovnakú verziu, inak si navzájom hodia VersionError
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains("priloha")) db.createObjectStore("priloha");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => zle(r.error);
  });
}

export const jeVideo = (src?: string) => !!src && src.startsWith("idb:");

/** skontroluje dĺžku/veľkosť, uloží a vráti odkaz „idb:…" */
export async function ulozVideo(f: File, maxSekund = VIDEO_CFG.maxSekund): Promise<string> {
  return (await ulozVideoInfo(f, maxSekund)).ref;
}
/** ako ulozVideo, navyše vráti dĺžku v sekundách */
export async function ulozVideoInfo(f: File, maxSekund = VIDEO_CFG.maxSekund): Promise<{ ref: string; sekundy: number }> {
  if (f.size > VIDEO_CFG.maxMB * 1024 * 1024) throw new Error(`Video má ${(f.size / 1024 / 1024).toFixed(0)} MB — limit je ${VIDEO_CFG.maxMB} MB.`);
  const dlzka = await new Promise<number>((ok) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { ok(v.duration); URL.revokeObjectURL(v.src); };
    v.onerror = () => ok(0);
    v.src = URL.createObjectURL(f);
  });
  if (dlzka > maxSekund) throw new Error(`Video má ${Math.round(dlzka)} s — limit je ${maxSekund} s.`);
  const kluc = `v${Date.now()}`;
  const db = await otvor();
  await new Promise<void>((ok, zle) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(f, kluc);
    tx.oncomplete = () => ok();
    tx.onerror = () => zle(new Error("Video sa nepodarilo uložiť."));
  });
  return { ref: `idb:${kluc}`, sekundy: Math.round(dlzka) };
}

/** odkaz „idb:…" → URL na prehratie (null kým sa načítava / keď chýba) */
export function useVideoUrl(src?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!jeVideo(src)) return;
    let u: string | null = null, zive = true;
    otvor().then((db) => {
      const r = db.transaction(STORE).objectStore(STORE).get(src!.slice(4));
      r.onsuccess = () => { if (zive && r.result) { u = URL.createObjectURL(r.result as Blob); setUrl(u); } };
    }).catch(() => {});
    return () => { zive = false; if (u) URL.revokeObjectURL(u); };
  }, [src]);
  return url;
}

/** zmaže video z úložiska prehliadača (odkaz „idb:…") */
export async function zmazVideo(src?: string) {
  if (!jeVideo(src)) return;
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
