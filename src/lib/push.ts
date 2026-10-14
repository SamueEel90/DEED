// ============================================================
// KARTA 63 · push upozornenia na tomto zariadení (web push).
// Zapnutie: povolenie → pushManager.subscribe s VAPID kľúčom z /api/push → rpc uloz_push_odber (0088b).
// Posiela server (/api/push) pri každej notifikácii, ktorá má push (upozornenia z farností).
// ============================================================
import { supabase } from "./supabase";

export const pushPodporovany = (): boolean =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const naBajty = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function odberZariadenia(): Promise<PushSubscription | null> {
  if (!pushPodporovany()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function ulozOdber(o: PushSubscription): Promise<boolean> {
  const j = o.toJSON();
  if (!supabase || !j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return false;
  const { error } = await supabase.rpc("uloz_push_odber", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
  return !error;
}

/** je push na tomto zariadení zapnutý */
export async function pushZapnuty(): Promise<boolean> {
  return Notification.permission === "granted" && !!(await odberZariadenia().catch(() => null));
}

/** zapne push (musí ísť z ťuku); vráti výsledok na hlášku */
export async function zapniPush(): Promise<"ok" | "zamietnute" | "nepodporovane" | "chyba"> {
  if (!pushPodporovany() || !supabase) return "nepodporovane";
  try {
    if ((await Notification.requestPermission()) !== "granted") return "zamietnute";
    const r = await fetch("/api/push");
    if (!r.ok) return "chyba";
    const { kluc } = (await r.json()) as { kluc: string };
    const reg = await navigator.serviceWorker.ready;
    const o = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: naBajty(kluc) }));
    return (await ulozOdber(o)) ? "ok" : "chyba";
  } catch { return "chyba"; }
}

/** vypne push na tomto zariadení */
export async function vypniPush(): Promise<void> {
  const o = await odberZariadenia().catch(() => null);
  if (!o) return;
  if (supabase) await supabase.from("push_odber").delete().eq("endpoint", o.endpoint);
  await o.unsubscribe().catch(() => false);
}

/** po prihlásení: existujúci odber zariadenia priradí aktuálnemu účtu (bez pýtania povolenia) */
export async function obnovPushOdber(): Promise<void> {
  if (!pushPodporovany() || Notification.permission !== "granted") return;
  const o = await odberZariadenia().catch(() => null);
  if (o) await ulozOdber(o).catch(() => false);
}
