// ============================================================
// AI je prísada, nie zámka: skutok uložený bez hodnotenia (AI nedostupná — výpadok, limit, bez kľúča)
// čaká v Mojich skutkoch v stave „ai" (Kontroluje AI) a ohodnotí sa dodatočne, keď je AI dostupná.
// Beží na pozadí: pri štarte appky, po návrate siete a každých 10 minút. Jeden beh naraz;
// pri prvom výpadku sa beh zastaví a skúsi sa nabudúce.
// ============================================================
import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ohodnot, jeVypadokAi, type ScoreOdpoved } from "@/features/skore/api";
import { mojeSkutky, upravSkutok, type MojSkutok, type Oblast } from "@/lib/mojeSkutky";
import { qk, repo } from "@/data";
import type { GoodPolozka } from "@/types";

/** karma za bod skóre z AI (placeholder — presné pravidlo určí kalibrácia) */
export const KARMA_ZA_BOD = 10;
export const MAX_FOTIEK_AI = 3; // backend berie max 3 obrázky
export const KAT: Partial<Record<Oblast, GoodPolozka["kat"]>> = { Príroda: "Priroda", Zdravie: "Zdravie", Učenie: "Ucenie", Pomoc: "Pomoc" };

export const DET_CAKA = "Čaká na ohodnotenie. AI ho ohodnotí, keď bude dostupná, potom pôjde do feedu alebo ostane v denníku.";
const DET_FEED = "Overila AI. Skutok je vo feede tvojej štvrte. Overenia od susedov mu pridávajú dôveru.";
const DET_DENNIK = "AI: ostáva v tvojom denníku.";

export const karmaZoSkore = (skore?: number | null) => (skore != null ? Math.max(1, Math.round(skore * KARMA_ZA_BOD)) : 3);

/** Výsledok AI → zmena skutku a (pri páse ≥ 1 s dôkazom) položka do feedu. */
export function vysledokPreSkutok(s: MojSkutok, v: ScoreOdpoved): { zmena: Partial<MojSkutok>; doFeedu: boolean } {
  const c = s.caka!;
  if (v.verdikt === "zamietnut") {
    return { zmena: { stav: "ja", karma: 0, osobny: true, caka: undefined, det: "AI ho neuznala ako dobrý skutok. Ostáva len v tvojom denníku, bez karmy." }, doFeedu: false };
  }
  // doplnit na pozadí sa nedá dopýtať — ako 2. kolo bez odpovede: pás 0, ostáva v denníku
  const pasmo = v.verdikt === "ok" ? v.pasmo ?? 0 : 0;
  const doFeedu = pasmo >= 1 && c.dokaz;
  const karma = karmaZoSkore(v.skore);
  return {
    zmena: { stav: doFeedu ? "ok" : "ja", karma: doFeedu ? karma : Math.min(karma, 5), osobny: !doFeedu, caka: undefined,
      det: doFeedu ? DET_FEED : v.verdikt === "doplnit" ? "AI by potrebovala viac podrobností. Ostáva v tvojom denníku." : DET_DENNIK },
    doFeedu,
  };
}

let bezi = false;

/** Ohodnotí všetky čakajúce skutky. Vráti počet ohodnotených. */
export async function dohodnotCakajuce(qc?: QueryClient): Promise<number> {
  if (bezi) return 0;
  bezi = true;
  let hotovo = 0;
  try {
    for (const s of mojeSkutky().filter((x) => x.stav === "ai" && x.caka)) {
      const c = s.caka!;
      let v: ScoreOdpoved;
      try {
        v = await ohodnot({ opis: c.opis, miesto: c.miesto, fotky: s.fotky.filter((f) => f.startsWith("data:image/")).slice(0, MAX_FOTIEK_AI), maVideo: c.maVideo, anonymne: false });
      } catch (e) {
        if (jeVypadokAi(e)) break; // AI stále nedostupná — skúsi sa nabudúce
        // chyba vstupu (napr. fotky) — znova by zlyhala rovnako: skutok ostane v denníku
        upravSkutok(s.id, { stav: "ja", karma: 3, osobny: true, caka: undefined, det: "AI ho nevedela ohodnotiť. Ostáva v tvojom denníku." });
        continue;
      }
      const { zmena, doFeedu } = vysledokPreSkutok(s, v);
      upravSkutok(s.id, zmena);
      hotovo++;
      if (doFeedu) {
        const it = {
          id: Date.now(), typ: "skutok", velkost: (v.pasmo ?? 0) >= 3 ? "big" : "medium", kat: KAT[s.oblast] ?? "Komunita", autor: c.autor, num: 0, emoji: "",
          fotky: s.fotky, titul: s.nazov, popis: c.text, lok: s.miesto, overene: true, skore: v.skore ?? 0, typSituacie: "normal", modul: "good", dni: 0, podpora: 0,
          lat: c.lat, lng: c.lng,
          scoreRunId: v.runId, // skóre/overené/karma do DB píše server z behu AI, nie klient
        } as GoodPolozka;
        qc?.setQueriesData<GoodPolozka[]>({ queryKey: qk.good.feed }, (old = []) => [it, ...old]);
        repo.good.vytvor(it, c.ucetId).then((nid) => { if (nid) void qc?.invalidateQueries({ queryKey: qk.good.feed }); }).catch(() => {});
      }
    }
  } finally {
    bezi = false;
  }
  return hotovo;
}

/** Spúšťa dodatočné hodnotenie: po štarte, po návrate siete a každých 10 minút. */
export function useDohodnotenie() {
  const qc = useQueryClient();
  useEffect(() => {
    const spusti = () => { void dohodnotCakajuce(qc); };
    const prvy = window.setTimeout(spusti, 4000);
    const interval = window.setInterval(spusti, 10 * 60 * 1000);
    window.addEventListener("online", spusti);
    return () => { window.clearTimeout(prvy); window.clearInterval(interval); window.removeEventListener("online", spusti); };
  }, [qc]);
}
