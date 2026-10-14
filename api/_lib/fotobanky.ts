// ============================================================
// Fotobanky pre Verejné fotky (bod 254): Pexels (hlavná) → Pixabay → Unsplash → Openverse.
// Jednotný tvar FotkaBanky. Kľúče LEN v env: PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY.
// Openverse beží bez kľúča (licencie s NC/ND sa vylúčia).
// Podmienky: Pixabay a Openverse sa pri výbere stiahnu k nám, Unsplash nie (ich adresa + download ping).
// ============================================================

export type Zdroj = "pexels" | "pixabay" | "unsplash" | "openverse";
export interface FotkaBanky {
  id: string; zdroj: Zdroj; maly: string; velky: string; sirka: number; vyska: number;
  autor: string; odkazAutora: string; odkazZdroja?: string; licencia: string;
  /** len Unsplash: adresa, ktorú treba pri výbere zavolať */ stiahnutie?: string;
}

/** kategórie okna Verejné fotky → slovo do hľadania */
export const KATEGORIE: Record<string, string> = {
  kostol: "church", priroda: "nature", ludia: "people", deti: "children",
  sviecky: "candle", svadba: "wedding", jedlo: "food", praca: "volunteer",
};
// Pexels a Pixabay hľadajú aj po slovensky (locale sk-SK / lang=sk); Unsplash a Openverse len po anglicky → malý slovník
const SLOVNIK: Record<string, string> = {
  kostol: "church", kaplnka: "chapel", kríž: "cross", kriz: "cross", oltár: "altar", oltar: "altar", sviečka: "candle", sviecka: "candle",
  sviečky: "candles", sviecky: "candles", modlitba: "prayer", biblia: "bible", ruženec: "rosary", ruzenec: "rosary", krst: "baptism",
  svadba: "wedding", pohreb: "funeral", cintorín: "cemetery", cintorin: "cemetery", vianoce: "christmas", veľká: "easter", velka: "easter", noc: "night",
  príroda: "nature", priroda: "nature", les: "forest", hory: "mountains", more: "sea", kvety: "flowers", kvet: "flower", strom: "tree", nebo: "sky",
  ľudia: "people", ludia: "people", deti: "children", dieťa: "child", dieta: "child", rodina: "family", mládež: "youth", mladez: "youth",
  jedlo: "food", chlieb: "bread", práca: "work", praca: "work", pomoc: "help", dobrovoľník: "volunteer", dobrovolnik: "volunteer",
  srdce: "heart", ruky: "hands", slnko: "sun", zima: "winter", leto: "summer", jeseň: "autumn", jesen: "autumn", jar: "spring",
  hudba: "music", spev: "choir", zbor: "choir", seniori: "elderly", starký: "grandfather", starká: "grandmother",
};
export const poAnglicky = (q: string) =>
  q.toLocaleLowerCase("sk-SK").split(/\s+/).filter(Boolean).map((w) => SLOVNIK[w] ?? w).join(" ");

const NA_STRANU = 24;
const UTM = "utm_source=deed&utm_medium=referral";
const sUtm = (u: string) => u + (u.includes("?") ? "&" : "?") + UTM;

async function json<T>(url: string, init?: RequestInit, ms = 8000): Promise<T | null> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    if (!r.ok) { console.error("[fotky]", url.split("?")[0], r.status); return null; }
    return (await r.json()) as T;
  } catch (e) { console.error("[fotky]", url.split("?")[0], (e as Error).message); return null; }
}

// ---------- Pexels ----------
interface PexelsFoto { id: number; width: number; height: number; url: string; photographer: string; photographer_url: string; src: { original: string } }
const pexels = (p: PexelsFoto): FotkaBanky => ({
  id: String(p.id), zdroj: "pexels", sirka: p.width, vyska: p.height,
  maly: `${p.src.original}?auto=compress&cs=tinysrgb&w=400`, velky: `${p.src.original}?auto=compress&cs=tinysrgb&w=1600`,
  autor: p.photographer, odkazAutora: p.photographer_url, odkazZdroja: p.url, licencia: "Pexels License",
});
async function hladajPexels(q: string, strana: number): Promise<FotkaBanky[] | null> {
  const k = process.env.PEXELS_API_KEY; if (!k) return null;
  const d = await json<{ photos: PexelsFoto[] }>(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${NA_STRANU}&page=${strana}&locale=sk-SK`, { headers: { Authorization: k } });
  return d ? d.photos.map(pexels) : null;
}

// ---------- Pixabay ----------
interface PixabayFoto { id: number; pageURL: string; webformatURL: string; largeImageURL: string; imageWidth: number; imageHeight: number; user: string; user_id: number }
const pixabay = (p: PixabayFoto): FotkaBanky => ({
  id: String(p.id), zdroj: "pixabay", sirka: p.imageWidth, vyska: p.imageHeight,
  maly: p.webformatURL, velky: p.largeImageURL,
  autor: p.user, odkazAutora: `https://pixabay.com/users/${encodeURIComponent(p.user)}-${p.user_id}/`, odkazZdroja: p.pageURL, licencia: "Pixabay Content License",
});
async function hladajPixabay(q: string, strana: number): Promise<FotkaBanky[] | null> {
  const k = process.env.PIXABAY_API_KEY; if (!k) return null;
  const d = await json<{ hits: PixabayFoto[] }>(`https://pixabay.com/api/?key=${k}&q=${encodeURIComponent(q.slice(0, 100))}&lang=sk&image_type=photo&safesearch=true&per_page=${NA_STRANU}&page=${strana}`);
  return d ? d.hits.map(pixabay) : null;
}

// ---------- Unsplash ----------
interface UnsplashFoto { id: string; width: number; height: number; urls: { raw: string; small: string }; links: { html: string; download_location: string }; user: { name: string; links: { html: string } } }
const unsplash = (p: UnsplashFoto): FotkaBanky => ({
  id: p.id, zdroj: "unsplash", sirka: p.width, vyska: p.height,
  maly: p.urls.small, velky: `${p.urls.raw}&w=1600&q=80&fm=jpg&fit=max`,
  autor: p.user.name, odkazAutora: sUtm(p.user.links.html), odkazZdroja: sUtm(p.links.html), licencia: "Unsplash License", stiahnutie: p.links.download_location,
});
const unsplashHlavicky = () => ({ Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`, "Accept-Version": "v1" });
async function hladajUnsplash(q: string, strana: number): Promise<FotkaBanky[] | null> {
  if (!process.env.UNSPLASH_ACCESS_KEY) return null;
  const d = await json<{ results: UnsplashFoto[] }>(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(poAnglicky(q))}&per_page=${NA_STRANU}&page=${strana}&content_filter=high`, { headers: unsplashHlavicky() });
  return d ? d.results.map(unsplash) : null;
}

// ---------- Openverse ----------
interface OpenverseFoto { id: string; url: string; thumbnail: string; width: number | null; height: number | null; creator: string | null; creator_url: string | null; license: string; license_version: string | null; foreign_landing_url: string | null }
const ovOk = (p: OpenverseFoto) => !/(^|-)n[cd]($|-)/i.test(p.license); // poistka: žiadne NC ani ND
const openverse = (p: OpenverseFoto): FotkaBanky => ({
  id: p.id, zdroj: "openverse", sirka: p.width ?? 0, vyska: p.height ?? 0,
  maly: p.thumbnail, velky: p.url,
  autor: p.creator || "neznámy autor", odkazAutora: p.creator_url || p.foreign_landing_url || "", odkazZdroja: p.foreign_landing_url ?? undefined,
  licencia: p.license === "cc0" || p.license === "pdm" ? p.license.toUpperCase() : `CC ${p.license.toUpperCase()}${p.license_version ? " " + p.license_version : ""}`,
});
async function hladajOpenverse(q: string, strana: number): Promise<FotkaBanky[] | null> {
  const d = await json<{ results: OpenverseFoto[] }>(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(poAnglicky(q))}&page=${strana}&page_size=20&license_type=commercial,modification&mature=false&extension=jpg,png`, { headers: { "User-Agent": "DEED+ (deed-help.vercel.app)" } }, 20000); // Openverse býva pomalý (~7 s)
  return d ? d.results.filter(ovOk).map(openverse) : null;
}

/** hľadá postupne v bankách, kým nie je aspoň jedna plná strana */
export async function hladaj(q: string, strana: number): Promise<FotkaBanky[]> {
  const out: FotkaBanky[] = [];
  for (const banka of [hladajPexels, hladajPixabay, hladajUnsplash, hladajOpenverse]) {
    if (out.length >= NA_STRANU) break;
    const r = await banka(q, strana);
    if (r) out.push(...r);
  }
  return out;
}

/** jedna fotka podľa id priamo z banky (pri uložení neveríme adrese od klienta) */
export async function fotkaPodlaId(zdroj: Zdroj, id: string): Promise<FotkaBanky | null> {
  const e = encodeURIComponent(id);
  if (zdroj === "pexels") {
    const k = process.env.PEXELS_API_KEY; if (!k) return null;
    const p = await json<PexelsFoto>(`https://api.pexels.com/v1/photos/${e}`, { headers: { Authorization: k } });
    return p ? pexels(p) : null;
  }
  if (zdroj === "pixabay") {
    const k = process.env.PIXABAY_API_KEY; if (!k) return null;
    const d = await json<{ hits: PixabayFoto[] }>(`https://pixabay.com/api/?key=${k}&id=${e}`);
    return d?.hits[0] ? pixabay(d.hits[0]) : null;
  }
  if (zdroj === "unsplash") {
    if (!process.env.UNSPLASH_ACCESS_KEY) return null;
    const p = await json<UnsplashFoto>(`https://api.unsplash.com/photos/${e}`, { headers: unsplashHlavicky() });
    return p ? unsplash(p) : null;
  }
  const p = await json<OpenverseFoto>(`https://api.openverse.org/v1/images/${e}/`, { headers: { "User-Agent": "DEED+ (deed-help.vercel.app)" } }, 20000);
  return p && ovOk(p) ? openverse(p) : null;
}

/** Unsplash: pri výbere fotky zavolať ich download adresu (podmienka API) */
export async function unsplashStiahnutie(url: string): Promise<void> {
  await json(url, { headers: unsplashHlavicky() });
}
