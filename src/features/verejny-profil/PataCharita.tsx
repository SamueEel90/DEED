// ============================================================
// OPRAVY 400 · verejný profil charity: Kontakt (sídlo, prevádzky s popisom, telefóny, e-maily, web a siete)
// a pod ním Údaje organizácie (právna forma · IČO · DIČ · IČ DPH · registrácia · založené · zamestnanci). Štatutár tu nie je.
// Zdroj: uložený profil (Upraviť profil) + údaje z registra (verejné nastavenia stránky).
// ============================================================
import { useEffect, useState } from "react";
import { nacitajProfil, profilZPamate, type ProfilStranky } from "@/lib/profilStranky";
import { useRegistra, icoText, mesiacRok, zamestnanciText } from "@/lib/udajeRegistra";
import { KontaktBlok, maKontaktCharity } from "@/features/rola/kontakt";

export function PataCharita({ strankaId, pad = "0 16px", siroke }: { strankaId: string; pad?: string; siroke?: boolean }) {
  const [prof, setProf] = useState<ProfilStranky | null>(() => profilZPamate(strankaId).ulozeny);
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) setProf(z.ulozeny); }); return () => { ziva = false; }; }, [strankaId]);
  const reg = useRegistra(strankaId);
  const k = prof?.kontakt ? { ...prof.kontakt, sidlo: reg.sidlo || prof.kontakt.sidlo } : reg.sidlo ? { sidlo: reg.sidlo, adresaVerejna: "", telefony: [], emaily: [], web: "", siete: {} } : null;
  const zalozene = prof?.zalozene?.trim() || mesiacRok(reg.vznik);
  const udaje = [reg.forma, reg.ico ? `IČO ${icoText(reg.ico)}` : "", reg.dic ? `DIČ ${reg.dic}` : "", reg.icdph ? `IČ DPH ${reg.icdph}` : "", reg.registracia, zalozene ? `založené ${zalozene}` : "", zamestnanciText(reg.zamestnanci)].map((x) => x.trim()).filter(Boolean);
  if (!(k && maKontaktCharity(k)) && !udaje.length) return null;
  return (
    <section aria-label="Kontakt a údaje organizácie" style={{ padding: pad, display: "flex", flexDirection: "column", gap: 14 }}>
      {k && maKontaktCharity(k) && <KontaktBlok k={k} vodorovne={siroke} />}
      {udaje.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink3)" }}>ÚDAJE ORGANIZÁCIE</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{udaje.join(" · ")}</span>
      </div>}
    </section>);
}
