// ============================================================
// OPRAVY 404 · práva pracovníka charity (server: 0129 smie_v_stranke, uroven_stranky).
// Zoznam „ludia“ v nastaveniach stránky: Štatutár (všetko) alebo Pracovník s poľom „prava“.
// Štatutár vyberie pracovníkovi: Všetko okrem peňazí · Len obsah · Vybrať sám (8 prepínačov).
// Appka podľa toho zamkne časti Správy („Nemáte povolené · požiadajte štatutára“); server to isté stráži sám.
// Len charita — Viera ostáva Farár / Pomocník.
// ============================================================
import { citajNastavenie, maNastavenie, useZmenyNastaveni } from "./nastaveniaStranky";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Pravo = "zbierky" | "doklady" | "obsah" | "ludia" | "penazenka_vidiet" | "penazenka_vyplaty" | "nastavenia" | "pridavat";
/** [právo, názov, čo smie] — poradie ako v prototype Ľudia charity */
export const PRAVA: [Pravo, string, string][] = [
  ["zbierky", "Zbierky", "vytvárať a upravovať"], ["doklady", "Doklady", "nahrávať, na čo išli peniaze"], ["obsah", "Obsah", "oznamy, skutky, video"],
  ["ludia", "Ľudia", "darcovia, dobrovoľníci, akcie"], ["penazenka_vidiet", "Peňaženka · vidieť", "koľko prišlo a odišlo"],
  ["penazenka_vyplaty", "Peňaženka · výplaty", "posielať peniaze na účet"], ["nastavenia", "Nastavenia", "účet, predplatné, vzhľad"],
  ["pridavat", "Pridávať pracovníkov", "a meniť, čo smú"],
];
export type Predvolba = "bez_penazi" | "obsah" | "vlastne";
export const PREDVOLBY: [Predvolba, string, string, Pravo[]][] = [
  ["bez_penazi", "Všetko okrem peňazí", "zbierky, doklady, obsah, ľudia", ["zbierky", "doklady", "obsah", "ludia"]],
  ["obsah", "Len obsah", "oznamy, skutky, video", ["obsah"]],
  ["vlastne", "Vybrať sám", "zapnete, čo presne smie", []],
];
export const STATUTAR = "Štatutár", PRACOVNIK = "Pracovník";
export const NEMATE_POVOLENE = "Nemáte povolené · požiadajte štatutára";

/** ktorá predvoľba zodpovedá poľu práv (inak Vybrať sám) */
export function predvolbaZ(prava: Pravo[]): Predvolba {
  const s = [...prava].sort().join(",");
  return PREDVOLBY.find(([k, , , p]) => k !== "vlastne" && [...p].sort().join(",") === s)?.[0] ?? "vlastne";
}
/** „smie: zbierky, doklady …“ — krátko do zoznamu */
export const smieText = (prava: Pravo[]) => {
  const z = PRAVA.filter(([k]) => prava.includes(k));
  return z.length === PRAVA.length ? "smie všetko" : z.length ? `smie: ${z.map(([, t]) => t.replace(" · vidieť", " (vidieť)").replace(" · výplaty", " (výplaty)").toLowerCase()).join(", ")}` : "nesmie nič";
};

/** e-mail prihláseného účtu (Supabase) — podľa neho server aj appka nájdu človeka v zozname */
export function useMojEmail(): string {
  const [m, setM] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let ziva = true;
    void supabase.auth.getSession().then(({ data }) => { if (ziva) setM((data.session?.user.email ?? "").trim().toLowerCase()); });
    const { data } = supabase.auth.onAuthStateChange((_e, ses) => setM((ses?.user.email ?? "").trim().toLowerCase()));
    return () => { ziva = false; data.subscription.unsubscribe(); };
  }, []);
  return m;
}
type Riadok = { k?: string; r?: string; prava?: Pravo[]; caka?: unknown };
/** práva prihláseného v otvorenej Správe charity: null = plné (štatutár, vlastník, alebo nie je v zozname ako pracovník) */
export function useMojePrava(): Pravo[] | null {
  useZmenyNastaveni();
  const mail = useMojEmail();
  if (!mail) return null;
  const L = (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Riadok[];
  const moj = L.find((x) => (x.k ?? "").trim().toLowerCase() === mail && (x.caka == null || x.caka === false));
  if (!moj || moj.r !== PRACOVNIK || !Array.isArray(moj.prava)) return null;
  return moj.prava;
}
export const smie = (prava: Pravo[] | null, p: Pravo) => prava === null || prava.includes(p);
