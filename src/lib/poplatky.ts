// ============================================================
// DEED · Poplatky — klientske ZRKADLO serverovej logiky (RPC platba_create).
// Marža/poplatok sa zobrazujú PRED odoslaním (Payment §6). Reálna degresívna
// krivka 3 %→1,5 % = tokenomika (mimo enginu) — tu konštanta 3 % placeholder.
// ============================================================
export type Kanal = "deed" | "fiat" | "sms" | "sepa";

export interface Poplatok {
  poplatok: number; // celkový poplatok (procesor + marža)
  marza: number;    // naša marža (časť poplatku)
  cista: number;    // príjemcovi po poplatku
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** Poplatok podľa kanála — identická logika ako `platba_create` v 0014. */
export function vypocitajPoplatok(suma: number, kanal: Kanal, obeRegistrovane = false): Poplatok {
  let marza = 0;
  let poplatok = 0;
  if (kanal === "deed") {
    marza = suma <= 0.5 && obeRegistrovane ? 0 : r4(suma * 0.03); // mikro 0€ / DEED ~3 %
    poplatok = marza;
  } else if (kanal === "sepa") {
    marza = 0; poplatok = 0;                                       // SEPA 0 % marža
  } else if (kanal === "fiat") {
    marza = r4(suma * 0.015);
    poplatok = r4(suma * 0.014 + 0.15 + marza);                    // procesor + marža
  } else if (kanal === "sms") {
    marza = r4(suma * 0.05);
    poplatok = r4(suma * 0.10 + marza);                            // operátor + marža
  }
  return { poplatok: r4(poplatok), marza: r4(marza), cista: r4(suma - poplatok) };
}

/** Mikro-DEED = pripíše sa hneď, zúčtuje v 24h batchi. */
export const jeMikro = (suma: number, kanal: Kanal): boolean => kanal === "deed" && suma <= 1;

/** SEPA dobrovoľný tip podľa pásma (Zeffy model). NIKDY predzaškrtnutý. */
export function navrhniTip(suma: number): number {
  if (suma <= 10) return 0;
  if (suma <= 100) return 3;
  if (suma <= 1000) return 5;
  if (suma <= 10000) return 10;
  return 50;
}
