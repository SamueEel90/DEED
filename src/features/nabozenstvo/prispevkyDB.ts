// ============================================================
// NÁBOŽENSTVO · príspevky farnosti v Supabase (prenos medzi zariadeniami).
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
import { nahrajFotky } from "@/lib/uploadFoto";
import { nacitajStav, ulozStav, synchronizujStav } from "./stav";
import type { NabozFeedItem } from "./mock";

function oznacVDb(fid: string, id: string) {
  const s = new Set(nacitajStav<string[]>("dbsync", fid, []));
  s.add(id);
  ulozStav("dbsync", fid, [...s]);
}

export async function nacitajPrispevkyDB(fid: string): Promise<NabozFeedItem[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("naboz_prispevok").select("data")
    .eq("farnost_id", fid).order("vytvorene", { ascending: false });
  if (error) return null;
  return (data ?? []).map((r) => r.data as NabozFeedItem);
}

/** Upsert (idempotentné — id generuje klient). Fotky data URL → Storage. */
export async function vytvorPrispevokDB(fid: string, it: NabozFeedItem): Promise<void> {
  if (!supabase) return;
  const fotky = await nahrajFotky(it.fotky ?? []);
  const { error } = await supabase.from("naboz_prispevok").upsert(
    { id: it.id, farnost_id: fid, data: { ...it, fotky: fotky.length ? fotky : undefined } },
    { onConflict: "id" },
  );
  if (!error) oznacVDb(fid, it.id);
}

export async function zmazPrispevokDB(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("naboz_prispevok").delete().eq("id", id);
}

export async function upravPrispevokDB(id: string, it: NabozFeedItem): Promise<void> {
  if (!supabase) return;
  await supabase.from("naboz_prispevok")
    .update({ data: it, upravene: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Zosúladí LS ↔ DB pre farnosť: DB je autorita, offline vytvorené sa doplnia.
 * Vráti true, keď prebehla synchronizácia (→ UI si má znova prečítať LS).
 */
export async function synchronizujPrispevky(fid: string): Promise<boolean> {
  const zDb = await nacitajPrispevkyDB(fid);
  if (zDb === null) return false; // mock režim / DB nedostupná → LS ostáva
  const dbIds = new Set(zDb.map((it) => it.id));
  const uzBoliVDb = new Set(nacitajStav<string[]>("dbsync", fid, []));
  const lokalne = nacitajStav<NabozFeedItem[]>("prispevky", fid, []);
  // len-lokálne, ktoré v DB nikdy neboli = vytvorené offline → doplň do DB;
  // tie, čo v DB boli a už nie sú = zmazané inde → vypadnú aj lokálne
  const naDoplnenie = lokalne.filter((it) => !dbIds.has(it.id) && !uzBoliVDb.has(it.id));
  for (const it of naDoplnenie) void vytvorPrispevokDB(fid, it);
  ulozStav("prispevky", fid, [...naDoplnenie, ...zDb]);
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
    return () => { zije = false; };
  }, [fid]);
  return verzia;
}
