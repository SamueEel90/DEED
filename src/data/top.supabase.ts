// ============================================================
// DEED · Top (rebríčky) — Supabase repozitár (Fáza C)
// Živý agregát z reálnych dát:
//   • darcovia  ← `podpora`        (group by darca_nazov, súčet DEED)
//   • hrdinovia ← `prispevok`      (Domov skutky podľa podpory autora)
//   • charity   ← `adresar_charita`(podľa levelu overenia)
// Kurátorské do času ďalších fáz:
//   • aktivity  ← mock (oživne vo Fáze F — Aktivity na DB)
//   • b2b       ← mock (čaká na dáta o firmách/sponzoroch)
// UI (Top.tsx) sa nemení — dostane rovnaký tvar RebricekPolozka[] ako mock.
// ============================================================
import { supabase } from "@/lib/supabase";
import { naGoodPolozka } from "./good.supabase";
import type { RebricekPolozka, Karma, GoodPolozka } from "@/types";
import { REBRICKY_MOCK, topPrispevky, type RebricekKluc } from "@/features/top/mock";

// "1850" → "1 850" (tisícky medzerou, SK formát)
const sk = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// hrubá heuristika osoba vs. organizácia (pre správny label v cudzom profile)
const ORG_RE = /\b(OZ|o\.z\.|n\.o\.|Klub|Tím|Tim|Hasiči|Zbor|Centrum|Materské|Nemocnica|Domov|Únia|Škola|Spolok|Nadácia|Charita|Hospic|Dobrovoľní|Dobrovoľníci|Útulok|Mesto|Obec)\b/i;
const jeOrg = (meno: string): boolean => ORG_RE.test(meno || "");

const LVL_W: Record<string, number> = { Legend: 4, Gold: 3, Silver: 2, Bronze: 1 };

/** Top Darcovia — súčet DEED darov na darcu (živé z `podpora`). */
async function darcoviaLive(): Promise<RebricekPolozka[]> {
  const { data, error } = await supabase!.from("podpora").select("darca_nazov, suma, kanal");
  if (error) throw error;
  const sumy = new Map<string, number>();
  for (const r of data || []) {
    if (r.kanal !== "deed" || !r.darca_nazov) continue;
    sumy.set(r.darca_nazov, (sumy.get(r.darca_nazov) || 0) + Number(r.suma || 0));
  }
  return [...sumy.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([meno, deed]) => ({
      meno,
      info: `${sk(deed)} DEED`,
      subjekt: { typ: "osoba", meno, level: (deed >= 1000 ? "Gold" : "Silver") as Karma },
    }));
}

/** Top Hrdinovia — autori skutkov (Domov) podľa podpory (živé z `prispevok`). */
async function hrdinoviaLive(): Promise<RebricekPolozka[]> {
  const { data, error } = await supabase!
    .from("prispevok")
    .select("autor_nazov, autor_karma, podpora_count, overene, typ, lat, lng")
    .is("data->>comp", null)
    .is("data->>akt", null)   // len Domov skutky (Aktivity majú vlastný rebríček)
    .is("data->>help", null)  // vylúč Help (Fáza G) — typ=skutok ich aj tak nezahŕňa, ale buď explicitný
    .eq("typ", "skutok")
    .not("autor_nazov", "is", null);
  if (error) throw error;
  type Agg = { podpora: number; pocet: number; overene: number; karma?: string; lat?: number; lng?: number };
  const agg = new Map<string, Agg>();
  for (const r of data || []) {
    const a: Agg = agg.get(r.autor_nazov) || { podpora: 0, pocet: 0, overene: 0, karma: r.autor_karma || undefined };
    a.podpora += Number(r.podpora_count || 0);
    a.pocet += 1;
    a.overene += r.overene ? 1 : 0;
    if (!a.karma && r.autor_karma) a.karma = r.autor_karma;
    if (a.lat == null && r.lat != null) { a.lat = r.lat; a.lng = r.lng ?? undefined; } // reprezentatívna poloha (okruh)
    agg.set(r.autor_nazov, a);
  }
  return [...agg.entries()]
    .sort((a, b) => b[1].podpora - a[1].podpora)
    .slice(0, 6)
    .map(([meno, a]) => {
      const org = jeOrg(meno);
      const info = a.pocet > 1 ? `${a.pocet} skutkov · ${a.podpora} podpôr` : `${a.podpora} podporovateľov`;
      return {
        meno,
        info,
        subjekt: {
          typ: org ? "org" : "osoba",
          meno,
          level: (a.karma || "Silver") as Karma,
          stav: "tvorca",
          ...(org ? { emoji: "🏛" } : {}),
        },
        lat: a.lat,
        lng: a.lng,
      };
    });
}

/** Top Charity — overené organizácie podľa levelu (živé z `adresar_charita`). */
async function charityLive(): Promise<RebricekPolozka[]> {
  const { data, error } = await supabase!
    .from("adresar_charita")
    .select("nazov, popis, level")
    .eq("aktivny", true)
    .order("poradie", { ascending: true });
  if (error) throw error;
  const videne = new Set<string>();
  const unikat = (data || []).filter((r) => {
    if (videne.has(r.nazov)) return false;
    videne.add(r.nazov);
    return true;
  });
  // stabilné triedenie podľa levelu (poradie ostáva tiebreak)
  unikat.sort((a, b) => (LVL_W[b.level] || 0) - (LVL_W[a.level] || 0));
  return unikat.slice(0, 6).map((r) => ({
    meno: r.nazov,
    info: `${r.level} · overená`,
    subjekt: { typ: "org", meno: r.nazov, emoji: "🏛", lok: r.popis, level: r.level as Karma },
  }));
}

/** Top príspevky — najvýznamnejšie SKUTKY podľa skóre (živé z `prispevok`).
 *  Len Domov skutky (rovnaký rozsah ako Hrdinovia): vylúč Charita-karty (`comp`),
 *  Aktivity (`akt`) a Help (`help`). „Najväčšie" = najvyššie skóre; tie-break
 *  topované → počet podpôr. Mapované cez `naGoodPolozka` → identická karta ako Domov. */
async function prispevkyLive(): Promise<GoodPolozka[]> {
  const { data, error } = await supabase!
    .from("prispevok")
    .select("*")
    .eq("typ", "skutok")
    .is("data->>comp", null)
    .is("data->>akt", null)
    .is("data->>help", null)
    .order("skore", { ascending: false })
    .order("topovane", { ascending: false })
    .order("podpora_count", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data || []).map(naGoodPolozka);
}

// živá kategória s fallbackom na kurátorský mock (Top sa nikdy nerozbije)
async function zivaAleboMock(kluc: RebricekKluc, fn: () => Promise<RebricekPolozka[]>): Promise<RebricekPolozka[]> {
  try {
    const r = await fn();
    return r.length ? r : REBRICKY_MOCK[kluc];
  } catch {
    return REBRICKY_MOCK[kluc];
  }
}

export const topSupabase = {
  async rebricky(): Promise<Record<RebricekKluc, RebricekPolozka[]>> {
    if (!supabase) return REBRICKY_MOCK;
    const [darcovia, hrdinovia, charity] = await Promise.all([
      zivaAleboMock("darcovia", darcoviaLive),
      zivaAleboMock("hrdinovia", hrdinoviaLive),
      zivaAleboMock("charity", charityLive),
    ]);
    return {
      b2b: REBRICKY_MOCK.b2b,            // kurátorské — čaká na dáta o firmách
      darcovia,
      hrdinovia,
      aktivity: REBRICKY_MOCK.aktivity,  // kurátorské — oživne vo Fáze F
      charity,
    };
  },

  /** Top príspevky (najvýznamnejšie skutky) — živé z DB, fallback na mock. */
  async prispevky(): Promise<GoodPolozka[]> {
    if (!supabase) return topPrispevky();
    try {
      const r = await prispevkyLive();
      return r.length ? r : topPrispevky();
    } catch {
      return topPrispevky();
    }
  },
};
