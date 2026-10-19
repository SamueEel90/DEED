// ============================================================
// OPRAVY 402 (Martin 19. 10., zjednodušené): „+ Založiť charitu (test)“ = jeden ťuk.
// Hneď založí novú charitu s testovacími údajmi (názov, IČO, sídlo, IBAN) pod prihláseným účtom, bez registračných
// krokov, overenia účtu, stanov a Didit. Údaje sa potom menia v Správe (Upraviť profil, Nastavenia → Údaje organizácie
// „upraviť (test)“). Bez databázy (alebo pri ukážkovom účte) sa charita založí len v tomto prehliadači.
// ============================================================
import * as db from "./db";
import { getSession } from "./session";
import { USE_SUPABASE } from "./supabase";
import { nastavAktivnuCharitu, noveIdCharity, pridajLokalnuStranku, zapisCasRegistracie } from "./aktivnaCharita";
import { nastavAko, otvorSpravuPoRegistracii, nacitajStrankyUctu, ulozNovuStranku, strankaCharity } from "./mojeStranky";
import { ulozRegistra } from "./udajeRegistra";
import { ulozIbanOrg, ulozTypStranky } from "@/features/rola/stav";

/** testovací IBAN (platný tvar) — v Správe sa dá zmeniť */
const TEST_IBAN = "SK3112000000198742637541";

export async function zalozTestovaciuCharitu(): Promise<string> {
  const s = getSession();
  const naServeri = USE_SUPABASE && !!s && !s.demo && s.typ !== "pasivny" && !!s.ucet_id;
  const d = new Date();
  const nazov = `Testovacia charita ${d.getDate()}. ${d.getMonth() + 1}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const ico = String(10000000 + Math.floor(Math.random() * 89999999));
  let id: string;
  if (naServeri) {
    const org = await db.vytvorOrganizaciuPodOsobou(s!.ucet_id!);
    await db.ulozOrganizaciu(org.id, { ico, nazov, sidlo: "Trenčín", pravna_forma: "Občianske združenie", z_registra: false });
    id = await db.zalozStrankuOrganizacie(org.id, nazov);
  } else {
    id = noveIdCharity();
    pridajLokalnuStranku({ k: id, n: nazov, typ: "charita" });
  }
  nastavAktivnuCharitu(id);
  await ulozRegistra(id, { nazov, forma: "občianske združenie", ico, registracia: "", sidlo: "Trenčín", vznik: `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` }).catch(() => undefined);
  ulozIbanOrg("charita", TEST_IBAN);
  ulozTypStranky("charita");
  zapisCasRegistracie(id);
  if (naServeri) await nacitajStrankyUctu().catch(() => undefined);
  nastavAko(id);
  ulozNovuStranku(strankaCharity(id, nazov));
  otvorSpravuPoRegistracii("prehlad");
  return id;
}
