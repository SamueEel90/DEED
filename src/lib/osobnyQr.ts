// ============================================================
// OPRAVY 448 (3) · osobný rotujúci kód (Môj QR) podpísaný serverom (migrácia 0144).
// Kód „<účet>.<okno>.<podpis>“ platí 15 s (server prijme aj predchádzajúce okno). Platí ktorákoľvek záložka
// Môj QR (Na akciu aj Overiť ma) — organizátor ho naskenuje a pridá pomocníka ku skutku.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/** podpísaný kód zo servera, obnovuje sa každých 15 s; null = bez servera / neprihlásený */
export function useMojQrKod(zapnute: boolean): string | null {
  const [kod, setKod] = useState<string | null>(null);
  useEffect(() => {
    if (!zapnute || !supabase) return;
    const sb = supabase;
    let ziva = true; let t: number | undefined;
    const nacitaj = async () => {
      const { data, error } = await sb.rpc("moj_qr_kod");
      if (!ziva) return;
      const d = data as { kod?: string; zostava?: number } | null;
      if (!error && d?.kod) setKod(d.kod);
      t = window.setTimeout(() => void nacitaj(), Math.max(1, Number(d?.zostava ?? 15)) * 1000 + 200);
    };
    void nacitaj();
    return () => { ziva = false; window.clearTimeout(t); };
  }, [zapnute]);
  return kod;
}

/** kód z naskenovanej adresy …/q/<záložka>/<kód> */
export function kodZQr(text: string): string | null {
  const m = text.match(/\/q\/(?:akcia|overit)\/([0-9a-f-]{36}\.[0-9]+\.[0-9a-f]{20})/i);
  return m ? m[1] : null;
}

/** organizátor pridá pomocníka skenom; vráti meno alebo chybu */
export async function pridajPomocnikaSkenom(kod: string, skutok: string, nazov: string, stranka: string | null): Promise<{ meno: string } | { chyba: string }> {
  if (!supabase) return { chyba: "Skenovanie funguje len s pripojením na server." };
  const { data, error } = await supabase.rpc("skutok_pridaj_skenom", { p_kod: kod, p_skutok: skutok, p_nazov: nazov || "Skutok", p_stranka: stranka });
  if (error) return { chyba: /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(error.message) && !/[a-z]+_[a-z]+/.test(error.message) ? error.message : "Pomocníka sa nepodarilo pridať. Skúste znova." };
  return { meno: String((data as { meno?: string } | null)?.meno ?? "Pomocník") };
}
