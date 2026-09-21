// ============================================================
// Údaje z registrácie → profil a správa subjektu.
// Prihlásená charita (session typ „charita") sa načíta z databázy a prepíše ukážkové
// dáta v SUBJEKTY — všetky obrazovky (správa, verejný profil, Upraviť profil) ich
// potom čítajú z jedného miesta. Demo bez účtu ostáva na ukážkových dátach.
// ============================================================
import { useEffect, useState } from "react";
import * as db from "@/lib/db";
import { getSession } from "@/lib/session";
import { SUBJEKTY, SEGMENTY_CHARITY } from "./mock";
import type { Siet } from "./kontakt";

let registrovana: db.CharitaData | null = null;
let segmenty: string[] = SEGMENTY_CHARITY;

/** segmenty, ktoré si charita vybrala pri registrácii (pod-segment, inak sektor) */
export const segmentyCharity = () => segmenty;
/** siete z registrácie (na predvyplnenie kontaktu) */
export function sieteZRegistracie(): Partial<Record<Siet, string>> {
  const out: Partial<Record<Siet, string>> = {};
  (registrovana?.profil?.siete ?? []).forEach((x) => { if (x?.typ && x?.url) out[x.typ as Siet] = x.url; });
  return out;
}
export const jeRegistrovanaCharita = () => !!registrovana;

function aplikuj(d: db.CharitaData) {
  const s = SUBJEKTY.charita;
  if (d.organizacia?.nazov) s.nazov = d.organizacia.nazov;
  if (d.organizacia?.sidlo) {
    s.kontakt = { ...s.kontakt, adresa: d.organizacia.sidlo };
    s.lok = d.organizacia.sidlo.split(",")[0].trim() || s.lok;
  }
  if (d.email) s.kontakt = { ...s.kontakt, email: d.email };
  if (d.telefon) s.kontakt = { ...s.kontakt, tel: d.telefon };
  if (d.profil?.web) s.kontakt = { ...s.kontakt, web: d.profil.web };
  if (d.profil?.misia) s.onas = d.profil.misia;
  if (d.profil?.cover_url) s.cover = d.profil.cover_url;
  if (d.profil?.logo_url) s.foto = d.profil.logo_url;
  const seg = d.segmenty.map((x) => (x.pod_segment ? `${x.sektor} · ${x.pod_segment}` : x.sektor)).filter(Boolean);
  if (seg.length) segmenty = Array.from(new Set(seg));
  registrovana = d;
}

/** Načíta prihlásenú charitu z databázy; vráti `true`, keď sú údaje pripravené (aj keď ide o demo). */
export function useRegistraciaCharity(): { pripravene: boolean; orgId: string | null } {
  const ses = getSession();
  const orgId = ses && !("demo" in ses && ses.demo) && ses.typ === "charita" ? ses.ucet_id ?? null : null;
  const [pripravene, setPripravene] = useState(!orgId || !!registrovana);
  useEffect(() => {
    if (!orgId || registrovana) return;
    let zive = true;
    db.nacitajCharitu(orgId)
      .then((d) => { aplikuj(d); })
      .catch(() => { /* bez spojenia ostanú ukážkové dáta */ })
      .finally(() => { if (zive) setPripravene(true); });
    return () => { zive = false; };
  }, [orgId]);
  return { pripravene, orgId };
}

/** zápis úprav profilu späť do databázy (len registrovaná charita) */
export async function ulozDoRegistracie(orgId: string, z: { misia: string; web: string; siete: Partial<Record<Siet, string>> }) {
  await db.ulozProfilCharity(orgId, {
    misia: z.misia, web: z.web || null,
    siete: Object.entries(z.siete).filter(([, u]) => u && u.trim()).map(([typ, url]) => ({ typ, url })),
  });
  if (registrovana) registrovana = { ...registrovana, profil: { ...(registrovana.profil ?? { logo_url: null, cover_url: null, misia: null, web: null, siete: null }), misia: z.misia, web: z.web, siete: Object.entries(z.siete).map(([typ, url]) => ({ typ, url: url ?? "" })) } };
}
