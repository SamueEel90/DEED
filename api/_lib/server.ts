// ============================================================
// Spoločné pre serverové funkcie (push, fotky): klient so service role a overenie volajúceho.
// Service role kľúč žije LEN v env Vercelu (SUPABASE_SERVICE_ROLE_KEY), nikdy v appke.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

let sluzba: SupabaseClient | null | undefined;
/** klient so service role (obíde RLS); bez kľúča null */
export function dbSluzba(): SupabaseClient | null {
  if (sluzba !== undefined) return sluzba;
  const kluc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  sluzba = url() && kluc ? createClient(url(), kluc, { auth: { persistSession: false } }) : null;
  return sluzba;
}

/** klient v mene používateľa (jeho RLS a moj_ucet()) */
export function dbAko(token: string): SupabaseClient | null {
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url() || !anon || !token) return null;
  return createClient(url(), anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
}

export const tokenZ = (authHeader: string | string[] | undefined) =>
  (Array.isArray(authHeader) ? authHeader[0] : authHeader || "").replace(/^Bearer\s+/i, "").trim();

/** prihlásený správca aspoň jednej stránky → id účtu; inak null */
export async function spravcaStranky(token: string): Promise<string | null> {
  const s = dbAko(token);
  if (!s) return null;
  const { data: u } = await s.auth.getUser(token);
  if (!u?.user?.id) return null;
  const { data: ucet } = await s.from("ucet").select("id").eq("auth_id", u.user.id).maybeSingle();
  if (!ucet?.id) return null;
  const { data: stranky, error } = await s.rpc("moje_stranky");
  if (error || !Array.isArray(stranky) || !stranky.length) return null;
  return String(ucet.id);
}
