// ============================================================
// GET /i/{id} → /api/iskra?id={id} — webová stránka Iskry (KARTA 41 · Martin 3. 10.: bod 4)
// ------------------------------------------------------------
// Otvorí ju aj človek bez appky, keď mu niekto pošle odkaz (odkazIskry v src/lib/iskry.ts).
// Samostatné ľahké HTML (nie SPA): video, autor, popis, zbierka, „Podporiť v DEED⁺"
// a náhľad odkazu pre Messenger / WhatsApp (og:*). Číta verejnú tabuľku iskra (0034)
// anon kľúčom — RLS pustí len nezmazané Iskry.
// Iskra, ktorá v DB nie je (ukážkové videá v appke, DB nedostupná) → presmerovanie
// do appky na /iskra/{id}, appka ju otvorí v prúde.
// Všetok text od používateľa ide cez esc() — popis je cudzí obsah.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";

interface IskraWeb {
  id: string; autor: string; kto: string; ini: string; popis: string; video: string; plagat: string | null;
  zbierka: { nazov?: string; pozn?: string } | null; bez_darov: boolean; iskry: number; stranka: string | null;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function konfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const kluc = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  return url && kluc ? { url, kluc } : null;
}

async function nacitaj(id: string): Promise<{ i: IskraWeb; storage: string } | null> {
  const k = konfig();
  if (!k) return null;
  const pole = "id,autor,kto,ini,popis,video,plagat,zbierka,bez_darov,iskry,stranka";
  const r = await fetch(`${k.url}/rest/v1/iskra?id=eq.${encodeURIComponent(id)}&zmazane=is.null&select=${pole}`, {
    headers: { apikey: k.kluc, Authorization: `Bearer ${k.kluc}`, Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const riadky = (await r.json().catch(() => [])) as IskraWeb[];
  return riadky[0] ? { i: riadky[0], storage: `${k.url}/storage/v1/object/public/iskry/` } : null;
}

const cesta = (storage: string, p: string) => storage + p.split("/").map(encodeURIComponent).join("/");

export function strankaIskry(i: IskraWeb, storage: string, origin: string): string {
  const video = cesta(storage, i.video);
  const plagat = i.plagat ? cesta(storage, i.plagat) : `${origin}/icons/icon-512.png`;
  const odkaz = `${origin}/i/${encodeURIComponent(i.id)}`;
  const doAppky = `${origin}/iskra/${encodeURIComponent(i.id)}`;
  const titul = `${i.autor} · Iskra v DEED⁺`;
  const zbierka = i.zbierka?.nazov ? `<p class="zb"><b>${esc(i.zbierka.nazov)}</b>${i.zbierka.pozn ? `<span>${esc(i.zbierka.pozn)}</span>` : ""}</p>` : "";
  const podporit = i.bez_darov ? "" : `<a class="hl" href="${esc(doAppky)}">Podporiť v DEED⁺</a>`;
  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titul)}</title>
<meta name="description" content="${esc(i.popis)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="canonical" href="${esc(odkaz)}">
<meta property="og:type" content="video.other">
<meta property="og:site_name" content="DEED⁺">
<meta property="og:title" content="${esc(titul)}">
<meta property="og:description" content="${esc(i.popis)}">
<meta property="og:url" content="${esc(odkaz)}">
<meta property="og:image" content="${esc(plagat)}">
<meta property="og:video" content="${esc(video)}">
<meta property="og:video:type" content="video/mp4">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14110B">
<style>
:root{--bg:#F1ECE1;--card:#fff;--ink:#1D211B;--ink2:#4A4F45;--g:#4B7A35;--gSoft:#E4EDDA}
@media (prefers-color-scheme:dark){:root{--bg:#14110B;--card:#1E1B14;--ink:#F1ECE1;--ink2:#BDB6A6;--g:#74A24A;--gSoft:#26301D}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:480px;margin:0 auto;padding:16px 16px 32px;display:flex;flex-direction:column;gap:14px}
.znacka{font-weight:800;font-size:20px;color:var(--g);text-decoration:none}
.video{position:relative;aspect-ratio:9/16;max-height:72vh;border-radius:22px;overflow:hidden;background:#000 center/cover no-repeat}
video{width:100%;height:100%;object-fit:cover;display:block}
.autor{display:flex;align-items:center;gap:10px}.ini{width:40px;height:40px;border-radius:50%;background:var(--g);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.autor b{display:block}.autor span{font-size:13px;color:var(--ink2)}
p{margin:0}.popis{font-size:16px}.zb{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:14px;background:var(--gSoft)}.zb span{font-size:13px;color:var(--ink2)}
.isk{font-size:14px;color:var(--ink2)}
a.hl,a.ved{display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:26px;font-weight:800;text-decoration:none;font-size:16px}
a.hl{background:var(--g);color:#fff}a.ved{border:1.5px solid var(--g);color:var(--g)}
</style>
</head>
<body>
<main>
<a class="znacka" href="${esc(origin)}/">DEED⁺</a>
<div class="video" style="background-image:url('${esc(plagat)}')">
<video src="${esc(video)}" poster="${esc(plagat)}" autoplay muted loop playsinline controls preload="metadata"></video>
</div>
<div class="autor"><span class="ini">${esc(i.ini || i.autor.slice(0, 2).toUpperCase())}</span><span><b>${esc(i.autor)}</b><span>${esc(i.kto)}</span></span></div>
<p class="popis">${esc(i.popis)}</p>
${zbierka}
<p class="isk">✨ ${esc(i.iskry.toLocaleString("sk-SK"))} Iskier</p>
${podporit}
<a class="ved" href="${esc(doAppky)}">Otvoriť v appke DEED⁺</a>
</main>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? "");
  const proto = String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0];
  const origin = `${proto}://${String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost")}`;
  if (!ID.test(id)) { res.status(404).send("Iskra sa nenašla."); return; }

  const n = await nacitaj(id);
  if (!n) {
    // ukážková Iskra alebo nedostupná DB → appka (otvor.ts otvorí prúd na tomto videu)
    res.setHeader("Location", `/iskra/${encodeURIComponent(id)}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(302).send("");
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'; img-src * data:; media-src *; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
  res.status(200).send(strankaIskry(n.i, n.storage, origin));
}
