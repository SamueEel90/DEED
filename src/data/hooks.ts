// ============================================================
// DEED · Dátové hooky (TanStack Query nad repozitárom)
// Jednotný spôsob čítania dát: cache, isLoading, isError, refetch.
// Moduly volajú tieto hooky namiesto priameho importu mock polí.
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { repo } from "./repo";

/** Stabilné query kľúče (cache + invalidácia). */
export const qk = {
  good: { feed: ["good", "feed"] as const, udalosti: ["good", "udalosti"] as const },
  help: { feed: ["help", "feed"] as const },
  charita: { feed: ["charita", "feed"] as const, adresar: ["charita", "adresar"] as const, zbierka: ["charita", "zbierka"] as const },
  aktivity: { feed: ["aktivity", "feed"] as const },
  notifikacie: { list: ["notifikacie", "list"] as const },
  retaz: { ziadosti: ["retaz", "ziadosti"] as const },
  fun: { list: ["fun", "list"] as const },
  profil: {
    prevody: ["profil", "prevody"] as const,
    mojeSkutky: ["profil", "mojeSkutky"] as const,
    karma: ["profil", "karma"] as const,
    statistiky: ["profil", "statistiky"] as const,
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

// ---- Notifikácie ----
export const useNotifikacie = () => useQuery({ queryKey: qk.notifikacie.list, queryFn: () => repo.notifikacie.list() });

// ---- Reťaz dobra ----
export const useRetazZiadosti = () => useQuery({ queryKey: qk.retaz.ziadosti, queryFn: () => repo.retaz.ziadosti() });

// ---- Fun zóna ----
export const useFun = () => useQuery({ queryKey: qk.fun.list, queryFn: () => repo.fun.list() });

// ---- Profil ----
export const useProfilPrevody = () => useQuery({ queryKey: qk.profil.prevody, queryFn: () => repo.profil.prevody() });
export const useProfilMojeSkutky = () => useQuery({ queryKey: qk.profil.mojeSkutky, queryFn: () => repo.profil.mojeSkutky() });
export const useProfilKarma = () => useQuery({ queryKey: qk.profil.karma, queryFn: () => repo.profil.karma() });
export const useProfilStatistiky = () => useQuery({ queryKey: qk.profil.statistiky, queryFn: () => repo.profil.statistiky() });
