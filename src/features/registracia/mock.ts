// ============================================================
// DEED · Registrácia — mock/číselník dát (Osoba flow)
// Čisté dáta (bez JSX) presunuté z OsobaFlow.
// ============================================================

export type ZobrazenieRezim = "cele" | "iniciala" | "nick" | "mesto" | "anonym";

export interface ZobrazenieVolba {
  rezim: ZobrazenieRezim;
  emoji: string;
  title: string;
  desc: string;
}

// KROK 5 — Zobrazenie (ako ťa vidí komunita)
export const ZOBRAZENIE_VOLBY: ZobrazenieVolba[] = [
  { rezim: "cele", emoji: "🪪", title: "Celé meno + mesto", desc: "Martin S., Trenčín" },
  { rezim: "iniciala", emoji: "🔤", title: "Krstné + iniciála", desc: "Martin S." },
  { rezim: "nick", emoji: "🏷️", title: "Prezývka (nick)", desc: "Tvoja prezývka." },
  { rezim: "mesto", emoji: "📍", title: "Len mesto", desc: "Niekto z Trenčína" },
  { rezim: "anonym", emoji: "🕶️", title: "Anonym", desc: "Bez mena, bez mesta." },
];

// ============================================================
// Charita / OZ flow — čisté dáta (bez JSX) presunuté z CharitaFlow.
// ============================================================

export interface DobroTyp {
  kluc: string;
  title: string;
  desc: string;
}

// KROK 5 — Typy dobrovoľníctva
export const DOBRO_TYPY: DobroTyp[] = [
  { kluc: "jednorazové", title: "Jednorazové", desc: "Akcie a brigády podľa potreby." },
  { kluc: "dlhodobé", title: "Dlhodobé", desc: "Pravidelná spolupráca." },
  { kluc: "odborné/skill-based", title: "Odborné / skill-based", desc: "Konkrétne zručnosti (IT, právo, dizajn…)." },
  { kluc: "podľa potreby", title: "Podľa potreby", desc: "Flexibilne, keď treba." },
];

export interface PobockaRezim {
  rezim: string;
  emoji: string;
  title: string;
  desc: string;
}

// KROK 7 — Režimy pobočiek
export const POBOCKA_REZIMY: PobockaRezim[] = [
  { rezim: "samostatna", emoji: "🏢", title: "Samostatná — vlastné IČO/účet", desc: "Pobočka s vlastnou identitou." },
  { rezim: "pod_centralou", emoji: "🏠", title: "Pod centrálou", desc: "Vedená pod ústredím." },
];

export interface BalikVolba {
  plan: string;
  emoji: string;
  title: string;
  desc: string;
}

// KROK 8 — Balíky
export const BALIKY: BalikVolba[] = [
  { plan: "FREE", emoji: "🆓", title: "FREE — 0 €", desc: "Overenie + profil + 10 sektorov + základný badge." },
  { plan: "BASIC", emoji: "⭐", title: "BASIC — 400 €", desc: "Pod-segmenty, výzvy pre dobrovoľníkov, väčšia viditeľnosť." },
  { plan: "PRO", emoji: "🚀", title: "PRO — 1 500 €", desc: "Pobočky, rozšírené funkcie a dosah." },
  { plan: "ENTERPRISE", emoji: "🏛️", title: "ENTERPRISE — 2 990 €", desc: "Plný balík pre veľké organizácie." },
];
