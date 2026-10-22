// ============================================================
// OPRAVY 478 · texty a striedajúci sa riadok karty Naživo / Od začiatku pre skutočnú charitu (lib/nazivoCharity)
// ============================================================
import { useEffect, useState } from "react";
import type { NazivoCharity } from "@/lib/nazivoCharity";
import { sumaEur } from "@/lib/suma";
import { tvar } from "@/lib/testProfily";

export const dnesNazivo = (nz: NazivoCharity) => nz.dnesLudi ? `Dnes ${sumaEur(nz.dnesSuma)} od ${tvar(nz.dnesLudi, ["človeka", "ľudí", "ľudí"])}` : "Dnes zatiaľ bez darov";
const slovo = (n: number, f: [string, string, string]) => (n === 1 ? f[0] : n >= 2 && n <= 4 ? f[1] : f[2]);
/** Od začiatku · len to, čo je (Martin 23. 10.: nič s nulou, nič nesľubujeme); null = zatiaľ nič → riadok sa neukáže */
export function cislaOdZaciatku(nz: NazivoCharity): [string, string][] | null {
  const o = nz.odZaciatku;
  const l: [string, string][] = [
    ...(o.suma > 0 ? [[sumaEur(o.suma), "vyzbierané"] as [string, string]] : []),
    ...(o.darcov ? [[o.darcov.toLocaleString("sk-SK"), slovo(o.darcov, ["darca", "darcovia", "darcov"])] as [string, string]] : []),
    ...(o.skutkov ? [[o.skutkov.toLocaleString("sk-SK"), slovo(o.skutkov, ["doložený skutok", "doložené skutky", "doložených skutkov"])] as [string, string]] : []),
  ];
  return l.length ? l : null;
}

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
