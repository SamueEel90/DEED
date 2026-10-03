// ============================================================
// Vite plugin: /api/score + /api/score-log + /i/{id} (api/iskra) v `npm run dev` a `vite preview`
// ------------------------------------------------------------
// Vercel serverless funkcie z api/ inak lokálne nebežia (vite ich nepozná,
// treba `vercel dev`). Tento plugin ich namontuje ako connect middleware
// s malým adaptérom (status/json/send ako VercelResponse), takže celý
// flow — vrátane MOCK režimu bez API kľúča — sa dá testovať lokálne.
// Na produkčný build/deploy nemá žiadny vplyv (len dev/preview server).
// ============================================================
import { loadEnv, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import scoreHandler from "../api/score";
import scoreLogHandler from "../api/score-log";
import iskraHandler from "../api/iskra";

const MAX_TELO_B = 20 * 1024 * 1024; // 3 fotky v base64 sa zmestia s rezervou

function precitajTelo(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const kusy: Buffer[] = [];
    let dlzka = 0;
    req.on("data", (k: Buffer) => {
      dlzka += k.length;
      if (dlzka > MAX_TELO_B) { reject(new Error("telo requestu je príliš veľké")); req.destroy(); return; }
      kusy.push(k);
    });
    req.on("end", () => {
      const text = Buffer.concat(kusy).toString("utf8");
      if (!text) { resolve({}); return; }
      try { resolve(JSON.parse(text)); } catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

/** ServerResponse → tvar VercelResponse (status().json()/send()), len to, čo handlery používajú */
function obalOdpoved(res: ServerResponse) {
  const r = res as ServerResponse & {
    status: (code: number) => typeof r;
    json: (obj: unknown) => typeof r;
    send: (telo: string | Buffer) => typeof r;
  };
  r.status = (code: number) => { res.statusCode = code; return r; };
  r.json = (obj: unknown) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); return r; };
  r.send = (telo: string | Buffer) => { res.end(telo); return r; };
  return r;
}

function apiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    // /i/{id} → /api/iskra?id={id} (rewrite ako vo vercel.json)
    const iskra = url.pathname.match(/^\/i\/([^/]+)$/);
    if (iskra) { url.pathname = "/api/iskra"; url.searchParams.set("id", decodeURIComponent(iskra[1])); }
    const handlery: Record<string, typeof scoreHandler> = { "/api/score": scoreHandler, "/api/score-log": scoreLogHandler, "/api/iskra": iskraHandler };
    if (!handlery[url.pathname]) { next(); return; }

    const vreq = req as IncomingMessage & { query: Record<string, string>; body?: unknown };
    vreq.query = Object.fromEntries(url.searchParams);
    if (req.method === "POST") {
      try { vreq.body = await precitajTelo(req); }
      catch { res.statusCode = 413; res.end(JSON.stringify({ chyba: "velke_telo" })); return; }
    }

    try {
      const handler = handlery[url.pathname];
      await handler(vreq as never, obalOdpoved(res) as never);
    } catch (e) {
      console.error("[api-dev] handler spadol:", e);
      if (!res.writableEnded) { res.statusCode = 500; res.end(JSON.stringify({ chyba: "server" })); }
    }
  };
}

export function apiDevPlugin(): Plugin {
  return {
    name: "deed-api-dev",
    config(_c, { mode }) {
      // .env/.env.local → process.env pre backend handlery (vite ich sám do
      // process.env nedáva). Existujúce hodnoty z shellu majú prednosť.
      const env = loadEnv(mode, process.cwd(), "");
      for (const k of ["ANTHROPIC_API_KEY", "SUPABASE_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SCORING_ADMIN_TOKEN", "SCORING_MOCK"]) {
        if (env[k] && !process.env[k]) process.env[k] = env[k];
      }
      // lokálny default admin tokenu, nech kalibračná tabuľka funguje hneď
      if (!process.env.SCORING_ADMIN_TOKEN) {
        process.env.SCORING_ADMIN_TOKEN = "dev";
        console.log("[api-dev] SCORING_ADMIN_TOKEN nenastavený — lokálne platí token „dev“.");
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        // vite preview beží s NODE_ENV=production → mock treba zapnúť explicitne.
        // Bezpečné: tento plugin beží LEN lokálne (dev/preview), nie na Verceli.
        if (!process.env.SCORING_MOCK) process.env.SCORING_MOCK = "1";
        console.log("[api-dev] ANTHROPIC_API_KEY chýba — /api/score beží v MOCK režime (simulátor bez Opusa).");
      }
    },
    configureServer(server) { server.middlewares.use(apiMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(apiMiddleware()); },
  };
}
