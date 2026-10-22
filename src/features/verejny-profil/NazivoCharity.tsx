// ============================================================
// OPRAVY 478 · texty a striedajúci sa riadok karty Naživo / Od začiatku pre skutočnú charitu (lib/nazivoCharity)
// ============================================================
import { useEffect, useState } from "react";
import type { NazivoCharity } from "@/lib/nazivoCharity";
import { sumaEur } from "@/lib/suma";
import { tvar } from "@/lib/testProfily";

export const dnesNazivo = (nz: NazivoCharity) => nz.dnesLudi ? `Dnes ${sumaEur(nz.dnesSuma)} od ${tvar(nz.dnesLudi, ["človeka", "ľudí", "ľudí"])}` : "Dnes zatiaľ bez darov";
const slovo = (n: number, f: [string, string, string]) => (n === 1 ? f[0] : n >= 2 && n <= 4 ? f[1] : f[2]);
/** Od začiatku · 3 čísla; null = zatiaľ nič („Prvý dar tu bude čoskoro.“) */
export function cislaOdZaciatku(nz: NazivoCharity): [string, string][] | null {
  const o = nz.odZaciatku;
  if (!(o.suma > 0) && !o.darcov && !o.skutkov) return null;
  return [[sumaEur(o.suma), "vyzbierané"], [o.darcov.toLocaleString("sk-SK"), slovo(o.darcov, ["darca", "darcovia", "darcov"])],
    [o.skutkov.toLocaleString("sk-SK"), slovo(o.skutkov, ["doložený skutok", "doložené skutky", "doložených skutkov"])]];
}
export const PRVY_DAR = "Prvý dar tu bude čoskoro.";

/** jeden riadok, ktorý sa sám strieda (posledný dar · nový skutok · nové v príbehu), prechod len cez opacity */
export function ZivyRiadok({ nz, fs = 14 }: { nz: NazivoCharity; fs?: number }) {
  const [i, setI] = useState(0), [op, setOp] = useState(1);
  const n = nz.polozky.length;
  useEffect(() => {
    if (n < 2) return;
    let t2: number | undefined;
    const t = window.setInterval(() => { setOp(0); t2 = window.setTimeout(() => { setI((x) => x + 1); setOp(1); }, 320); }, 5000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, [n]);
  if (!n) return null;
  const p = nz.polozky[i % n];
  return (
    <span aria-live="polite" style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: op, transition: "opacity .3s", minWidth: 0 }}>
      <b style={{ flex: "none", fontSize: fs, whiteSpace: "nowrap" }}>{p.tucne}</b>
      <span style={{ fontSize: fs - 1, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>· {p.text}</span>
    </span>);
}
