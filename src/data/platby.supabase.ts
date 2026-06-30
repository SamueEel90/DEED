// ============================================================
// DEED · Payment Engine — Supabase repozitár   [Fáza 2]
// `poslat` = jediná zapisovacia cesta (RPC platba_create, idempotentná).
// `vypis`/`zostatok` = pohľady v_vypis/v_zostatok. `batchClose` = demo trigger.
// UI volá cez hooky (data/hooks.ts) — nikdy priamo.
// ============================================================
import { supabase } from "@/lib/supabase";

export interface SplitPolozka {
  prijemcaUcet?: string | null;
  prijemcaText?: string | null;
  podiel: number;        // 0..1 (Σ = 1.0)
  fixny?: boolean;
}

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
  split?: SplitPolozka[];          // rozdelenie na N príjemcov (reťaz / honorár)
}

export interface RecurringVstup {
  rozsah: "request" | "segment" | "charita";  // táto žiadosť / segment / celá charita
  darca: string;
  suma: number;
  mena: "DEED" | "EUR";
  perioda: "tyzdenne" | "mesacne" | "rocne";
  caseId?: string | null;
  charitaUcet?: string | null;
  viazaneNaZbierku?: boolean;
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
      p_split: v.split?.length
        ? v.split.map((s) => ({ prijemca_ucet: s.prijemcaUcet ?? null, prijemca_text: s.prijemcaText ?? null, podiel: s.podiel, fixny: s.fixny ?? false }))
        : null,
    });
    if (error) throw error;
    return (data as PlatbaRiadok) ?? null;
  },

  /** Vytvor pravidelnú (opakovanú) podporu — LEN charita. Vráti riadok. */
  async recurringCreate(v: RecurringVstup): Promise<{ id: string; dalsia_platba: string } | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("recurring_create", {
      p_rozsah: v.rozsah, p_darca: v.darca, p_suma: v.suma, p_mena: v.mena, p_perioda: v.perioda,
      p_case: v.caseId ?? null, p_charita: v.charitaUcet ?? null, p_segment: null,
      p_viazane: v.viazaneNaZbierku ?? v.rozsah === "request",
    });
    if (error) throw error;
    return (data as { id: string; dalsia_platba: string }) ?? null;
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
