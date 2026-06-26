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
} from "@/types";

import { POLOZKY, EVENTS } from "@/features/good/mock";
import { MOCK_FEED } from "@/features/help/mock";
import { FEED_ITEMS, ADRESAR, ZBIERKA } from "@/features/charita/mock";
import { SEED_ITEMS } from "@/features/aktivity/mock";
import { NOTIFY } from "@/features/notifikacie/mock";
import { ZIADOSTI } from "@/features/retaz/mock";
import { FUN } from "@/features/fun/mock";
import { PREVODY, MOJE_SKUTKY, KARMA, STATISTIKY } from "@/features/profil/mock";

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

// pomocník — okamžite vyrieši (mock). Pri Supabase sa nahradí reálnym dotazom.
const ok = <T>(v: T): Promise<T> => Promise.resolve(v);

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

// Aktívny repozitár. Neskôr: selektor podľa import.meta.env (mock | supabase).
export const repo: Repo = mockRepo;
