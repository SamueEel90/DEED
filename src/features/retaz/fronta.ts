// ============================================================
// DEED · Reťaz tvorcu — FRONTA & OVERFLOW (DEV špec v2, 8. 7. 2026)
// Tvorca smeruje % svojho honoráru na VŽDY PRÁVE JEDNU aktívnu zbierku.
// Zbierky si zoradí do FRONTY; po naplnení cieľa sa aktívna automaticky
// prehodí na ďalšiu. Peniaze nikdy netečú do prázdna (dorovnanie + fallback).
//
// Toto je JADRO špecifikácie (§3 dátový model + §4 routing algoritmus) —
// bez Reactu, čisté funkcie → testovateľné a použiteľné aj serverom neskôr.
// Nahrádza paralelný split viacerých zbierok pre tvorcu (ten sa RUŠÍ).
// ============================================================

// ---- §2 pravidlá percent ----
export const PCT_KROK = 5;   // krok slidera
export const PCT_MIN = 5;    // minimum; 0 % = zákaz generovania QR
export const PCT_MAX = 100;

/** Zaokrúhli % na povolený krok (5) a orež do rozsahu [0..100]. 0 ostáva 0 (= zákaz QR). */
export function naKrok(pct: number): number {
  if (!Number.isFinite(pct)) return PCT_MIN;
  const r = Math.round(pct / PCT_KROK) * PCT_KROK;
  return Math.max(0, Math.min(PCT_MAX, r));
}

// ---- §3.1 / §3.2 dátový model ----
export type ChainStatus = "draft" | "published";
export type QueueItemStatus = "waiting" | "active" | "filled" | "skipped" | "system-assigned";
export type AddedBy = "creator" | "system";

/** §3.2 ChainQueueItem — jedna zbierka vo fronte tvorcu. */
export interface ChainQueueItem {
  id: string;                 // lokálne id položky vo fronte
  collectionId: string;       // id zbierky (Help/Charita)
  nazov: string;
  emoji: string;
  lok?: string;
  zdroj?: string;             // "Help" | "Charita"
  overena?: boolean;
  kat?: string;               // kategória (pre systémové doparovanie)
  col?: string;               // akcentová farba karty
  ciel: number;               // cieľová suma zbierky
  vyzbierane: number;         // aktuálny stav
  position: number;           // poradie vo fronte (0 = prvá)
  percent: number;            // 5–100, krok 5; editovateľné LEN v drafte
  status: QueueItemStatus;
  addedBy: AddedBy;
  activatedAt?: string;
  filledAt?: string;
}

/** §3.1 CreatorChain — celá reťaz tvorcu. */
export interface CreatorChain {
  id: string;
  creatorId: string;
  chainStatus: ChainStatus;           // draft (editovateľná/zmazateľná) / published (zamknutá navždy)
  queue: ChainQueueItem[];            // zoradené; aktívna = prvá nenaplnená
  systemFallbackEnabled: boolean;     // default true; nastaviteľné len v drafte
  publishedAt?: string;
}

/** §3.3 ForwardBlock — charita odmietla peniaze tvorcu; fallback ho preskočí. */
export interface ForwardBlock {
  recipientId: string;
  creatorId: string;
  reason: string;
  createdAt: string;
}

// ---- odvodené pomôcky ----

/** Zvyšok do cieľa položky (nikdy záporný). */
export const zvysokDoCiela = (it: ChainQueueItem): number => Math.max(0, it.ciel - it.vyzbierane);

/** Je položka naplnená? */
export const jeNaplnena = (it: ChainQueueItem): boolean => it.vyzbierane >= it.ciel;

/** Aktívna položka = prvá vo fronte, ktorá nie je naplnená ani preskočená. */
export function aktivnaPolozka(chain: CreatorChain): ChainQueueItem | null {
  const zoradene = [...chain.queue].sort((a, b) => a.position - b.position);
  return zoradene.find((it) => it.status !== "filled" && it.status !== "skipped") ?? null;
}

/** §2/§6.3 — QR sa dá vygenerovať len ak má aktívna položka percent ≥ 5. */
export function mozeGenerovatQr(chain: CreatorChain): boolean {
  const a = aktivnaPolozka(chain);
  return !!a && a.percent >= PCT_MIN;
}

/** Draft je validný na zverejnenie: aspoň 1 položka a každá má percent ≥ 5. */
export function chainValid(chain: CreatorChain): boolean {
  return chain.queue.length >= 1 && chain.queue.every((it) => it.percent >= PCT_MIN);
}

/** Prečísluje `position` podľa poradia v poli (0..n) a zosynchronizuje status aktívnej. */
export function prečísluj(queue: ChainQueueItem[]): ChainQueueItem[] {
  const out = queue.map((it, i) => ({ ...it, position: i }));
  // prvá nenaplnená/nepreskočená = active, ostatné čakajúce = waiting
  let aktivnaBola = false;
  for (const it of out) {
    if (it.status === "filled" || it.status === "skipped") continue;
    if (!aktivnaBola) { it.status = "active"; aktivnaBola = true; }
    else if (it.status === "active") it.status = "waiting";
  }
  return out;
}

// ---- §4 ROUTING ALGORITMUS ----

export interface DarRozdelenie {
  itemId: string;
  nazov: string;
  suma: number;          // koľko z reťazovej časti dostala táto položka
  naplnila: boolean;     // dovŕšil tento dar jej cieľ?
  systemove?: boolean;   // system-assigned (fallback)
}

export interface DarVysledok {
  chain: CreatorChain;             // nový (immutable) stav reťaze
  celyDar: number;                 // celý dar cez QR
  retazoPodiel: number;            // podiel reťaze (dar × % aktívnej)
  rozdelenia: DarRozdelenie[];     // kam koľko pretieklo (môže zavrieť aj dve zbierky)
  doPoolu: number;                 // fronta vyschla + žiadny fallback → community pool
  prehodenaNa: ChainQueueItem | null; // nová aktívna po dare (pre live prehod podstránky)
}

export interface SmerujOpts {
  now?: string;                             // časová pečiatka (test-friendly)
  fallbackKandidati?: ChainQueueItem[];     // §4.4 otvorené overené zbierky na doparovanie
  forwardBlocks?: ForwardBlock[];           // §3.3 páry, ktoré sa nikdy nespoja
}

const kluc = (id: string) => `sys-${id}`;

/**
 * §4 — Dar príde cez QR tvorcu → smeruje na AKTÍVNU položku; podiel reťaze = dar × percent.
 * §4.2 Dorovnanie: ak podiel presahuje zvyšok do cieľa → dorovnaj presne a zvyšok tečie
 *      NASLEDUJÚCEJ položke (jeden dar smie zavrieť aj dve zbierky).
 * §4.3 Naplnenie → filled (zamknuté), ďalšia waiting→active, QR/podstránka sa prehodí.
 * §4.4 Prázdna fronta → systém doparuje overenú zbierku (rovnaká kat / geo / najdlhšie otvorená),
 *      rešpektuje ForwardBlock; ak nič → community pool.
 * §4.5 Atomicita: celé v jednom synchrónnom priechode (žiadny race nepretečie cieľ).
 */
export function smerujDar(chain: CreatorChain, darSuma: number, opts: SmerujOpts = {}): DarVysledok {
  const now = opts.now ?? new Date().toISOString();
  const aktiv = aktivnaPolozka(chain);

  // reťazový podiel počítame z % PRÁVE aktívnej položky (§1, §4.1)
  const retazoPodiel = aktiv ? Math.round((darSuma * aktiv.percent) / 100) : 0;

  // pracovná kópia fronty (immutable navonok)
  let q: ChainQueueItem[] = chain.queue.map((it) => ({ ...it })).sort((a, b) => a.position - b.position);
  const rozdelenia: DarRozdelenie[] = [];
  let zvysok = retazoPodiel;

  // index prvej aktívnej/čakajúcej
  const start = aktiv ? q.findIndex((it) => it.id === aktiv.id) : q.length;

  for (let i = start; i < q.length && zvysok > 0; i++) {
    const it = q[i];
    if (it.status === "filled" || it.status === "skipped") continue;
    if (it.status === "waiting") { it.status = "active"; it.activatedAt = it.activatedAt ?? now; }
    if (!it.activatedAt) it.activatedAt = now;

    const kolko = Math.min(zvysok, zvysokDoCiela(it));
    it.vyzbierane += kolko;
    zvysok -= kolko;
    const naplnila = jeNaplnena(it);
    if (naplnila) { it.status = "filled"; it.filledAt = now; }
    rozdelenia.push({ itemId: it.id, nazov: it.nazov, suma: kolko, naplnila });
  }

  // §4.4 fronta vyschla a ešte máme peniaze → systémové doparovanie / community pool
  let doPoolu = 0;
  if (zvysok > 0) {
    const blocked = new Set((opts.forwardBlocks ?? [])
      .filter((b) => b.creatorId === chain.creatorId)
      .map((b) => b.recipientId));
    const poslednaKat = [...q].reverse().find((it) => it.kat)?.kat;
    const kandidat = chain.systemFallbackEnabled
      ? vyberFallback(opts.fallbackKandidati ?? [], blocked, poslednaKat, q)
      : null;

    if (kandidat) {
      const pct = q.length ? q[q.length - 1].percent : PCT_MIN;
      const nova: ChainQueueItem = {
        ...kandidat,
        id: kluc(kandidat.collectionId),
        percent: pct,
        position: q.length,
        status: "system-assigned",
        addedBy: "system",
        activatedAt: now,
        vyzbierane: kandidat.vyzbierane,
      };
      const kolko = Math.min(zvysok, zvysokDoCiela(nova));
      nova.vyzbierane += kolko;
      zvysok -= kolko;
      const naplnila = jeNaplnena(nova);
      if (naplnila) { nova.status = "filled"; nova.filledAt = now; }
      q = [...q, nova];
      rozdelenia.push({ itemId: nova.id, nazov: nova.nazov, suma: kolko, naplnila, systemove: true });
    }
    doPoolu = zvysok; // čokoľvek ostane → community pool
  }

  const novaChain: CreatorChain = { ...chain, queue: prečísluj(q) };
  return {
    chain: novaChain,
    celyDar: darSuma,
    retazoPodiel,
    rozdelenia,
    doPoolu,
    prehodenaNa: aktivnaPolozka(novaChain),
  };
}

/** §4.4 výber kandidáta: (a) rovnaká kategória, (b) geo najbližšia (mock: prvá), (c) najdlhšie otvorená. */
function vyberFallback(
  kandidati: ChainQueueItem[],
  blocked: Set<string>,
  poslednaKat: string | undefined,
  fronta: ChainQueueItem[],
): ChainQueueItem | null {
  const uzVoFronte = new Set(fronta.map((it) => it.collectionId));
  const volni = kandidati.filter(
    (k) => !blocked.has(k.collectionId) && !uzVoFronte.has(k.collectionId) && k.overena && zvysokDoCiela(k) > 0,
  );
  if (!volni.length) return null;
  const rovnakaKat = poslednaKat ? volni.filter((k) => k.kat === poslednaKat) : [];
  return (rovnakaKat[0] ?? volni[0]) ?? null;
}
