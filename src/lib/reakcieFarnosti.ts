// ============================================================
// KARTA 57C §1 — reakcie ľudí na verejnej stránke farnosti pri tom, čo pridal farár (udalosť, parte,
// svadba, jubileum) a pri zbierkach rodiny: Prídem / Prihlásiť sa, Úprimnú sústrasť, Blahoželám.
// Príspevky veriacich majú reakcie priamo v položke (lib/odFarnikov).
// Úložisko: KV stav farnosti, oblasť „reakcie“ (zrkadlo naboz_stav) = { [id príspevku alebo zbierky]: Reakcie }.
// Zápis ako pri OPRAVY 178: hneď lokálne a znova na čerstvom stave z DB (iní ľudia medzitým mohli reagovať).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, ulozStavLokalne, obnovOblast } from "@/features/viera/stav";
import { supabase } from "./supabase";
import { ukazChybuPriTuku } from "./chybaPriTuku";

export type PoleReakcieF = "ucast" | "sustrast" | "blaho" | "spomin";
export interface ReakcieF { ucast?: string[]; sustrast?: string[]; blaho?: string[]; /** Spomínam (pohrebná zbierka) */ spomin?: string[]; /** kľúč účtu → meno (Kto sa prihlásil) */ mena?: Record<string, string> }
type Mapa = Record<string, ReakcieF>;

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export const useReakcieF = () => useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
/** pri otvorení stránky stiahni čerstvé reakcie */
export function useCerstveReakcieF(id: string) {
  useEffect(() => { let ziva = true; void obnovOblast("reakcie", id).then((ok) => { if (ok && ziva) zmena(); }, () => undefined); return () => { ziva = false; }; }, [id]);
}

const mapa = (id: string): Mapa => nacitajStav<Mapa>("reakcie", id, {});
export const reakcieF = (id: string, ref: string): ReakcieF => mapa(id)[ref] ?? {};

/** nastaví želaný stav (nie prepínač) — na čerstvom stave sa nastaví rovnako */
export function prepniReakciuF(id: string, ref: string, pole: PoleReakcieF, kto: string, meno?: string) {
  const chce = !(reakcieF(id, ref)[pole] ?? []).includes(kto);
  const f = (m: Mapa): Mapa => {
    const r = m[ref] ?? {};
    const z = (r[pole] ?? []).filter((k) => k !== kto);
    return { ...m, [ref]: { ...r, [pole]: chce ? [...z, kto] : z, ...(meno && chce ? { mena: { ...r.mena, [kto]: meno } } : {}) } };
  };
  if (supabase) { // OPRAVY 372: na serveri len cez reakcia_f (kľúč účtu dosadí server)
    ulozStavLokalne("reakcie", id, f(mapa(id))); zmena();
    const znova = () => { if ((reakcieF(id, ref)[pole] ?? []).includes(kto) !== chce) prepniReakciuF(id, ref, pole, kto, meno); };
    void Promise.resolve(supabase.rpc("reakcia_f", { p_stranka: id, p_ref: ref, p_pole: pole, p_chce: chce, p_meno: meno ?? null }))
      .then((r) => r.error, () => true).then(async (chyba) => {
        await obnovOblast("reakcie", id).catch(() => false); zmena();
        if (chyba) ukazChybuPriTuku(znova); // OPRAVY 382
      });
    return;
  }
  ulozStav("reakcie", id, f(mapa(id))); zmena();
  void obnovOblast("reakcie", id).then((ok) => { if (ok) { ulozStav("reakcie", id, f(mapa(id))); zmena(); } }, () => undefined);
}
