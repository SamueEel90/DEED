// ============================================================
// DEED · Dátové hooky (TanStack Query nad repozitárom)
// Jednotný spôsob čítania dát: cache, isLoading, isError, refetch.
// Moduly volajú tieto hooky namiesto priameho importu mock polí.
// ============================================================
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { repo } from "./repo";
import type { QrCiel } from "@/lib/qr";
import type { PlatbaVstup } from "./platby.supabase";
import type { ScanVstup } from "./qr.supabase";

/** Stabilné query kľúče (cache + invalidácia). */
export const qk = {
  good: { feed: ["good", "feed"] as const, udalosti: ["good", "udalosti"] as const },
  help: { feed: ["help", "feed"] as const },
  charita: { feed: ["charita", "feed"] as const, adresar: ["charita", "adresar"] as const, zbierka: ["charita", "zbierka"] as const },
  aktivity: { feed: ["aktivity", "feed"] as const },
  mapa: { body: ["mapa", "body"] as const },
  top: { rebricky: ["top", "rebricky"] as const, prispevky: ["top", "prispevky"] as const },
  notifikacie: { list: ["notifikacie", "list"] as const },
  retaz: { ziadosti: ["retaz", "ziadosti"] as const },
  fun: { list: ["fun", "list"] as const },
  profil: {
    prevody: ["profil", "prevody"] as const,
    mojeSkutky: ["profil", "mojeSkutky"] as const,
    karma: ["profil", "karma"] as const,
    statistiky: ["profil", "statistiky"] as const,
  },
  qr: {
    static: (druh: string, ref: string) => ["qr", "static", druh, ref] as const,
    resolve: (slug: string) => ["qr", "resolve", slug] as const,
    token: (eventId: string) => ["qr", "token", eventId] as const,
  },
  platby: {
    vypis: (ucetId: string, smer?: string) => ["platby", "vypis", ucetId, smer ?? "vsetko"] as const,
    zostatok: (ucetId: string) => ["platby", "zostatok", ucetId] as const,
  },
};

// ---- Good ----
export const useGoodFeed = () => useQuery({ queryKey: qk.good.feed, queryFn: () => repo.good.feed() });
export const useGoodUdalosti = () => useQuery({ queryKey: qk.good.udalosti, queryFn: () => repo.good.udalosti() });

// ---- Help ----
export const useHelpFeed = () => useQuery({ queryKey: qk.help.feed, queryFn: () => repo.help.feed() });

// ---- Charita ----
export const useCharitaFeed = () => useQuery({ queryKey: qk.charita.feed, queryFn: () => repo.charita.feed() });
export const useCharitaAdresar = () => useQuery({ queryKey: qk.charita.adresar, queryFn: () => repo.charita.adresar() });
export const useCharitaZbierka = () => useQuery({ queryKey: qk.charita.zbierka, queryFn: () => repo.charita.zbierka() });

// ---- Aktivity ----
export const useAktivityFeed = () => useQuery({ queryKey: qk.aktivity.feed, queryFn: () => repo.aktivity.feed() });

// ---- Mapa (body + počty v okruhu) ----
export const useMapaBody = () => useQuery({ queryKey: qk.mapa.body, queryFn: () => repo.mapa.body() });

// ---- Top (rebríčky + najvýznamnejšie príspevky) ----
export const useTopRebricky = () => useQuery({ queryKey: qk.top.rebricky, queryFn: () => repo.top.rebricky() });
export const useTopPrispevky = () => useQuery({ queryKey: qk.top.prispevky, queryFn: () => repo.top.prispevky() });

// ---- Notifikácie ----
export const useNotifikacie = () => useQuery({ queryKey: qk.notifikacie.list, queryFn: () => repo.notifikacie.list() });

/** Realtime (Fáza E): jeden kanál na INSERT do `notifikacia` → invaliduje zoznam.
 *  Mountuje sa RAZ (App/Screens). Bez Supabase = no-op (mock/offline). */
export function useNotifikacieRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    const kanal = supabase
      .channel("rt-notifikacia")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifikacia" }, () => {
        qc.invalidateQueries({ queryKey: qk.notifikacie.list });
      })
      .subscribe();
    return () => { supabase!.removeChannel(kanal); };
  }, [qc]);
}

// ---- Reťaz dobra ----
export const useRetazZiadosti = () => useQuery({ queryKey: qk.retaz.ziadosti, queryFn: () => repo.retaz.ziadosti() });

// ---- Fun zóna ----
export const useFun = () => useQuery({ queryKey: qk.fun.list, queryFn: () => repo.fun.list() });

// ---- Profil ----
export const useProfilPrevody = () => useQuery({ queryKey: qk.profil.prevody, queryFn: () => repo.profil.prevody() });
export const useProfilMojeSkutky = () => useQuery({ queryKey: qk.profil.mojeSkutky, queryFn: () => repo.profil.mojeSkutky() });
export const useProfilKarma = () => useQuery({ queryKey: qk.profil.karma, queryFn: () => repo.profil.karma() });
export const useProfilStatistiky = () => useQuery({ queryKey: qk.profil.statistiky, queryFn: () => repo.profil.statistiky() });

// ---- QR (Fáza 1) — odkazové QR: zaistenie statického kódu + resolver ----
/** Zaistí/získa kanonické odkazové QR pre objekt (slug+URL). `enabled` až keď je `ref`. */
export const useQrStatic = (ciel: QrCiel | null) =>
  useQuery({
    queryKey: qk.qr.static(ciel?.druh ?? "", ciel?.ref ?? ""),
    queryFn: () => repo.qr.staticPre(ciel as QrCiel),
    enabled: !!ciel?.ref,
    staleTime: Infinity, // kanonické QR sa nemení → cachuj natrvalo
  });
/** Resolvne slug → interný objekt (deep-link). */
export const useQrResolve = (slug: string | null) =>
  useQuery({
    queryKey: qk.qr.resolve(slug ?? ""),
    queryFn: () => repo.qr.resolve(slug as string),
    enabled: !!slug,
  });

// ---- TOTP proof-of-presence (Fáza 3) ----
/** Polluje čerstvý rotujúci token každých `step` s (organizátorov displej). */
export const useEventToken = (eventId: string | null, step = 15, mod = "threshold", nazov?: string) =>
  useQuery({
    queryKey: qk.qr.token(eventId ?? ""),
    queryFn: () => repo.qr.eventToken(eventId as string, step, mod, nazov),
    enabled: !!eventId,
    refetchInterval: Math.max(step, 5) * 1000,
    staleTime: 0,
  });
/** Validuj sken rotujúceho QR (proof-of-presence). */
export const useScan = () => useMutation({ mutationFn: (v: ScanVstup) => repo.qr.scan(v) });

// ---- Payment Engine (Fáza 2) — poslať platbu, výpis, zostatok ----
/** Pošli platbu cez engine (idempotentne) → invaliduje výpis/zostatok/„Čo podporujem". */
export function usePoslatPlatbu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: PlatbaVstup) => repo.platby.poslat(v),
    onSuccess: (_r, v) => {
      if (v.odosielatel) {
        qc.invalidateQueries({ queryKey: qk.platby.vypis(v.odosielatel) });
        qc.invalidateQueries({ queryKey: qk.platby.zostatok(v.odosielatel) });
      }
      qc.invalidateQueries({ queryKey: qk.charita.feed });
    },
  });
}
/** Jednotný výpis (dal/dostal) pre účet. */
export const useVypis = (ucetId: string | null, smer?: "dal" | "dostal") =>
  useQuery({
    queryKey: qk.platby.vypis(ucetId ?? "", smer),
    queryFn: () => repo.platby.vypis({ ucetId: ucetId as string, smer }),
    enabled: !!ucetId,
  });
/** Reálny DEED zostatok peňaženky. */
export const useZostatok = (ucetId: string | null) =>
  useQuery({
    queryKey: qk.platby.zostatok(ucetId ?? ""),
    queryFn: () => repo.platby.zostatok(ucetId as string),
    enabled: !!ucetId,
  });
