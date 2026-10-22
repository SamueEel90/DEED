// ============================================================
// OPRAVY 486 · Materiálne zbierky na verejnej stránke charity = vecné zbierky z Viery (OPRAVY 320):
// bežiace a ukončené s poďakovaním (kým ho charita nezmaže zo stránky) · ťuk = detail ·
// QR na plagáte (/p/{slug}?vz={id}) otvorí rovno „Darovali ste?“; po prihlásení späť na zápis.
// ============================================================
import { useEffect, useState } from "react";
import { useVecneZbierky, vecneZbierky, fotoVecnej, doKedyText, usePrehladDarov, cakajZapisPoPrihlaseni, zapisPoPrihlaseni, zrusZapisPoPrihlaseni, type VecnaZbierka } from "@/lib/vecnaZbierka";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useUpgrade } from "@/components/context";
import { VecnaDetail, VecnaDarca, STITOK_MATERIALNEJ } from "./VecnaZbierkaStranka";
import { vecnaZQrCitaj, zrusVecnuZQr, cielVecnej, zrusDoVecnej } from "./otvor";

function Karta({ strankaId, z, onTap }: { strankaId: string; z: VecnaZbierka; onTap: () => void }) {
  const pr = usePrehladDarov(strankaId, z);
  const f = fotoVecnej(z);
  const bezi = z.stav === "aktivna";
  return (
    <button type="button" onClick={onTap} style={{ width: "100%", textAlign: "left", border: "1px solid rgba(128,128,128,.28)", borderLeft: "5px solid #C9A24A", borderRadius: 20, background: "rgba(128,128,128,.08)", padding: 14, display: "flex", gap: 14, alignItems: "center", color: "inherit", cursor: "pointer", fontFamily: "inherit", boxShadow: "none" }}>
      {f && <span aria-hidden="true" style={{ flex: "none", width: 84, height: 84, borderRadius: 14, background: `url("${f}") center/cover no-repeat #2B2620` }} />}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", opacity: 0.8 }}>{bezi ? STITOK_MATERIALNEJ : "MATERIÁLNA · ĎAKUJEME"}</span>
        <b style={{ fontSize: 18, lineHeight: 1.25, overflowWrap: "anywhere" }}>{z.nazov}</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.45, opacity: 0.85 }}>{[z.co, bezi && z.doKedy ? `do ${doKedyText(z.doKedy, false)}` : "", pr.ludi ? `${pr.ludi} ${pr.ludi === 1 ? "človek daroval" : pr.ludi < 5 ? "ľudia darovali" : "ľudí darovalo"}` : ""].filter(Boolean).join(" · ")}</span>
      </span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 22, opacity: 0.7 }}>›</span>
    </button>);
}

export function MaterialneNaProfile({ strankaId, meno, logo, inicialy, pad }: { strankaId: string; meno: string; logo?: string | null; inicialy: string; pad?: string }) {
  const ja = usePouzivatel();
  const regV = ja.typ !== "pasivny";
  const vsetky = useVecneZbierky(strankaId);
  const vecne = vsetky.filter((z) => z.stav === "aktivna" || (!!z.podakovanie?.ulozene && !z.podakovanie.zmazane));
  const [det, setDet] = useState<string | null>(cielVecnej);
  const [dar, setDar] = useState<string | null>(() => vecnaZQrCitaj() ?? (regV ? zapisPoPrihlaseni(strankaId) : null));
  useEffect(() => { zrusVecnuZQr(); zrusDoVecnej(); }, []);
  const upgrade = useUpgrade();
  const [regPred, setRegPred] = useState(regV);
  if (regV !== regPred) { setRegPred(regV); if (regV) { const id = zapisPoPrihlaseni(strankaId); if (id) setDar(id); } }
  const zD = det ? vecne.find((z) => z.id === det) ?? null : null;
  const zQ = dar ? vecneZbierky(strankaId).find((z) => z.id === dar) ?? null : null;
  return <>
    {vecne.length > 0 && <section data-blok="mat" style={{ padding: pad, display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>
      <b style={{ fontSize: 26, letterSpacing: "-.01em" }}>Materiálne zbierky</b>
      {vecne.map((z) => <Karta key={z.id} strankaId={strankaId} z={z} onTap={() => setDet(z.id)} />)}
    </section>}
    {zD && <VecnaDetail charita strankaId={strankaId} z={zD} onZavri={() => setDet(null)} />}
    {zQ && <VecnaDarca charita strankaId={strankaId} z={zQ} org={{ meno, logo: logo ?? null, inicialy }} onZavri={() => { zrusZapisPoPrihlaseni(); setDar(null); }}
      onPozriet={() => { zrusZapisPoPrihlaseni(); setDar(null); setDet(zQ.id); }} onPrihlasit={() => { cakajZapisPoPrihlaseni(strankaId, zQ.id); setDar(null); upgrade(); }} />}
  </>;
}
