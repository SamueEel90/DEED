// ============================================================
// DEED · Payment Engine — Supabase repozitár   [Fáza 2]
// `poslat` = jediná zapisovacia cesta (RPC platba_create, idempotentná).
// `vypis`/`zostatok` = pohľady v_vypis/v_zostatok. `batchClose` = demo trigger.
// UI volá cez hooky (data/hooks.ts) — nikdy priamo.
// ============================================================
import { supabase } from "@/lib/supabase";

export interface PlatbaVstup {
  idemKluc?: string;
  suma: number;
  mena: "DEED" | "EUR";
  kanal: "deed" | "fiat" | "sms" | "sepa";
  caseId?: string | null;          // interné ID prípadu (prispevok.id)
  odosielatel?: string | null;     // ucet.id darcu
  odosielatelText?: string | null; // denormalizovaný darca (demo)
  prijemcaUcet?: string | null;
  prijemcaText?: string | null;
  obeRegistrovane?: boolean;
  tip?: number;
  meta?: Record<string, unknown>;
}

export interface PlatbaRiadok {
  id: string;
  verejne_cislo: number;
  suma: number;
  mena: string;
  kanal: string;
  ext_vs: string | null;
  ext_hash: string | null;
  ext_sms_kod: string | null;
  poplatok: number;
  marza: number;
  cista_suma: number;
  tip: number;
  stav: string;
  batch_id: string | null;
  cas: string;
}

export interface VypisRiadok {
  platba_id: string;
  ucet_id: string;
  smer: "dal" | "dostal";
  case_id: string | null;
  protistrana: string | null;
  suma: number;
  mena: string;
  kanal: string;
  poplatok: number;
  tip: number;
  cista_suma: number;
  stav: string;
  externy_id: string | null;
  batch_id: string | null;
  cas: string;
}

export interface BatchVysledok {
  id: string;
  pocet: number;
  suma_spolu: number;
  settle_hash: string | null;
  stav: string;
}

function idem(): string {
  try { return crypto.randomUUID(); } catch { return `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`; }
}

export const platbySupabase = {
  /** Pošli platbu cez engine (idempotentne). Vráti uložený `platba` riadok. */
  async poslat(v: PlatbaVstup): Promise<PlatbaRiadok | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("platba_create", {
      p_idem_kluc: v.idemKluc ?? idem(),
      p_suma: v.suma,
      p_mena: v.mena,
      p_kanal: v.kanal,
      p_case_id: v.caseId ?? null,
      p_odosielatel: v.odosielatel ?? null,
      p_odosielatel_text: v.odosielatelText ?? null,
      p_prijemca_ucet: v.prijemcaUcet ?? null,
      p_prijemca_text: v.prijemcaText ?? null,
      p_obe_registrovane: v.obeRegistrovane ?? false,
      p_tip: v.tip ?? 0,
      p_meta: v.meta ?? {},
    });
    if (error) throw error;
    return (data as PlatbaRiadok) ?? null;
  },

  /** Jednotný výpis (dal/dostal) pre účet. */
  async vypis(filter: { ucetId: string; smer?: "dal" | "dostal" }): Promise<VypisRiadok[]> {
    if (!supabase || !filter.ucetId) return [];
    let q = supabase.from("v_vypis").select("*").eq("ucet_id", filter.ucetId).order("cas", { ascending: false });
    if (filter.smer) q = q.eq("smer", filter.smer);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as VypisRiadok[];
  },

  /** Reálny DEED zostatok peňaženky. */
  async zostatok(ucetId: string): Promise<number> {
    if (!supabase || !ucetId) return 0;
    const { data, error } = await supabase.from("v_zostatok").select("zostatok_deed").eq("ucet_id", ucetId).maybeSingle();
    if (error) throw error;
    return data ? Number(data.zostatok_deed) : 0;
  },

  /** Demo trigger: zúčtuj 24h batch teraz (cron robí to isté denne). */
  async batchClose(): Promise<BatchVysledok | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("platba_batch_close", {});
    if (error) throw error;
    return (data as BatchVysledok) ?? null;
  },
};
