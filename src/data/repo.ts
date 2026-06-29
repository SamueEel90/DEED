// ============================================================
// DEED · Repozitár (dátová vrstva)
// Jediný švík medzi UI a zdrojom dát. Dnes mock (z features/<x>/mock),
// neskôr Supabase — vymení sa IBA tu (`repo`), moduly sa nemenia.
// Komponenty NIKDY nečítajú mock pole priamo — vždy cez hooky (./hooks).
// ============================================================
import type {
  GoodPolozka,
  Udalost,
  HelpFeedItem,
  CharitaFeedItem,
  AdresarSekcia,
  Zbierka,
  AktivitaItem,
  Notifikacia,
  RetazZiadost,
  FunItem,
  PrevodTuple,
  MojSkutokTuple,
  RebricekPolozka,
  MapaBod,
} from "@/types";

import { POLOZKY, EVENTS } from "@/features/good/mock";
import { MOCK_FEED } from "@/features/help/mock";
import { FEED_ITEMS, ADRESAR, ZBIERKA } from "@/features/charita/mock";
import { SEED_ITEMS } from "@/features/aktivity/mock";
import { NOTIFY } from "@/features/notifikacie/mock";
import { ZIADOSTI } from "@/features/retaz/mock";
import { FUN } from "@/features/fun/mock";
import { PREVODY, MOJE_SKUTKY, KARMA, STATISTIKY } from "@/features/profil/mock";
import { REBRICKY_MOCK, topPrispevky, type RebricekKluc } from "@/features/top/mock";
import { MAPA_UDALOSTI } from "@/features/mapa/mock";

/** Rozhranie dátovej vrstvy — mock aj budúci Supabase ho implementujú rovnako. */
export interface Repo {
  good: {
    feed(): Promise<GoodPolozka[]>;
    udalosti(): Promise<Udalost[]>;
  };
  help: {
    feed(): Promise<HelpFeedItem[]>;
  };
  charita: {
    feed(): Promise<CharitaFeedItem[]>;
    adresar(): Promise<AdresarSekcia[]>;
    zbierka(): Promise<Zbierka>;
  };
  aktivity: {
    feed(): Promise<AktivitaItem[]>;
  };
  mapa: {
    body(): Promise<MapaBod[]>;
  };
  top: {
    rebricky(): Promise<Record<RebricekKluc, RebricekPolozka[]>>;
    prispevky(): Promise<GoodPolozka[]>;
  };
  notifikacie: {
    list(): Promise<Notifikacia[]>;
  };
  retaz: {
    ziadosti(): Promise<RetazZiadost[]>;
  };
  fun: {
    list(): Promise<FunItem[]>;
  };
  profil: {
    prevody(): Promise<PrevodTuple[]>;
    mojeSkutky(): Promise<MojSkutokTuple[]>;
    karma(): Promise<MojSkutokTuple[]>;
    statistiky(): Promise<MojSkutokTuple[]>;
  };
}

// Mock latencia (ms) — simuluje sieť, nech sú loading skeletony reálne viditeľné.
// Pri prepojení na Supabase sem príde reálny dotaz (a táto konštanta zmizne).
const MOCK_LATENCY = 320;
const ok = <T>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), MOCK_LATENCY));

/** Mock implementácia — zdroj = statické dáta z features/<x>/mock. */
export const mockRepo: Repo = {
  good: {
    feed: () => ok(POLOZKY),
    udalosti: () => ok(EVENTS),
  },
  help: {
    feed: () => ok(MOCK_FEED),
  },
  charita: {
    feed: () => ok(FEED_ITEMS),
    adresar: () => ok(ADRESAR),
    zbierka: () => ok(ZBIERKA),
  },
  aktivity: {
    feed: () => ok(SEED_ITEMS as unknown as AktivitaItem[]),
  },
  mapa: {
    // body z mocku: skutky odvodené z Domov POLOZKY (majú lat/lng) + statické udalosti
    body: () => ok([
      ...POLOZKY.filter((p) => p.lat != null && p.lng != null)
        .map((p): MapaBod => ({ lat: p.lat!, lng: p.lng!, druh: "skutok", modul: p.modul, typ: p.typ })),
      ...MAPA_UDALOSTI,
    ]),
  },
  top: {
    rebricky: () => ok(REBRICKY_MOCK),
    prispevky: () => ok(topPrispevky()),
  },
  notifikacie: {
    list: () => ok(NOTIFY),
  },
  retaz: {
    ziadosti: () => ok(ZIADOSTI),
  },
  fun: {
    list: () => ok(FUN),
  },
  profil: {
    prevody: () => ok(PREVODY),
    mojeSkutky: () => ok(MOJE_SKUTKY),
    karma: () => ok(KARMA),
    statistiky: () => ok(STATISTIKY),
  },
};

// ---- Aktívny repozitár — postupné prepínanie mock → Supabase, modul po module ----
// Modul je na Supabase len ak (a) je v NA_SUPABASE a (b) je nakonfigurovaný klient
// (.env.local). Inak fallback na mock → appka beží aj bez DB.
import { supabaseReady } from "@/lib/supabase";
import { goodSupabase } from "./good.supabase";
import { helpSupabase } from "./help.supabase";
import { charitaSupabase } from "./charita.supabase";
import { topSupabase } from "./top.supabase";
import { notifikacieSupabase } from "./notifikacie.supabase";
import { aktivitySupabase } from "./aktivity.supabase";
import { mapaSupabase } from "./mapa.supabase";

const NA_SUPABASE = { good: true, help: true, charita: true, top: true, notifikacie: true, aktivity: true, mapa: true } as const; // ktoré moduly už bežia na reálnych dátach

export const repo: Repo = {
  ...mockRepo,
  good: supabaseReady && NA_SUPABASE.good ? goodSupabase : mockRepo.good,
  help: supabaseReady && NA_SUPABASE.help ? helpSupabase : mockRepo.help,
  charita: supabaseReady && NA_SUPABASE.charita ? charitaSupabase : mockRepo.charita,
  aktivity: supabaseReady && NA_SUPABASE.aktivity ? aktivitySupabase : mockRepo.aktivity,
  mapa: supabaseReady && NA_SUPABASE.mapa ? mapaSupabase : mockRepo.mapa,
  top: supabaseReady && NA_SUPABASE.top ? topSupabase : mockRepo.top,
  notifikacie: supabaseReady && NA_SUPABASE.notifikacie ? notifikacieSupabase : mockRepo.notifikacie,
};
