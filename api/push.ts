// ============================================================
// /api/push — web push upozornení (KARTA 63, migrácia 0088b)
// ------------------------------------------------------------
//   GET  → { kluc } verejný VAPID kľúč pre prihlásenie zariadenia na push (appka ho použije v pushManager.subscribe)
//   POST → pošle čakajúce push (notifikacia.push a push_odoslane null, nie staršie ako deň).
//          Volá ho pg_cron cez pg_net raz za minútu, len keď niečo čaká. Nepotrebuje telo ani heslo:
//          pošle len to, čo už v DB čaká, a každú notifikáciu najviac raz (push_odoslane sa nastaví pred odoslaním).
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), SUPABASE_SERVICE_ROLE_KEY.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";
import { EMAIL_PODPORA } from "../src/lib/kontakty.js";
import { dbSluzba } from "./_lib/server.js";

const DAVKA = 300;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(pub ? 200 : 503).json(pub ? { kluc: pub } : { chyba: "push_vypnuty" });
    return;
  }
  if (req.method !== "POST") { res.status(405).json({ chyba: "zla_metoda" }); return; }
  const db = dbSluzba();
  if (!pub || !priv || !db) { res.status(503).json({ chyba: "push_vypnuty", sprava: "Chýba VAPID alebo service role kľúč." }); return; }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${EMAIL_PODPORA}`, pub, priv);

  const odDna = new Date(Date.now() - 864e5).toISOString();
  const { data: cakaju, error } = await db.from("notifikacia").select("id")
    .eq("push", true).is("push_odoslane", null).gte("cas", odDna).order("cas").limit(DAVKA);
  if (error) { res.status(500).json({ chyba: "db", sprava: error.message }); return; }
  if (!cakaju?.length) { res.status(200).json({ poslane: 0 }); return; }

  // zaber (súbežné volanie tie isté nedostane)
  const { data: moje, error: e2 } = await db.from("notifikacia").update({ push_odoslane: new Date().toISOString() })
    .in("id", cakaju.map((r) => r.id)).is("push_odoslane", null).select("id, ucet_id, titul, text");
  if (e2) { res.status(500).json({ chyba: "db", sprava: e2.message }); return; }
  const ucty = [...new Set((moje ?? []).map((r) => r.ucet_id).filter(Boolean))];
  if (!ucty.length) { res.status(200).json({ poslane: 0 }); return; }
  const { data: odbery } = await db.from("push_odber").select("id, ucet_id, endpoint, p256dh, auth").in("ucet_id", ucty);

  let poslane = 0;
  const zle: number[] = [];
  await Promise.all((moje ?? []).flatMap((n) => (odbery ?? []).filter((o) => o.ucet_id === n.ucet_id).map(async (o) => {
    try {
      await webpush.sendNotification({ endpoint: o.endpoint, keys: { p256dh: o.p256dh, auth: o.auth } },
        JSON.stringify({ titul: n.titul, text: n.text ?? "", url: "/", tag: `n${n.id}` }), { TTL: 24 * 3600, urgency: "normal" });
      poslane++;
    } catch (e) {
      const kod = (e as { statusCode?: number }).statusCode;
      if (kod === 404 || kod === 410) zle.push(o.id); // zariadenie sa odhlásilo
      else console.error("[push]", kod, (e as Error).message);
    }
  })));
  if (zle.length) await db.from("push_odber").delete().in("id", zle);
  res.status(200).json({ poslane, zmazane: zle.length });
}
