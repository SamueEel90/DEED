// Bod 254 · záložka „Verejné fotky" v okne galérie (len Správa stránky).
// Hore kategórie a hľadanie, pod tým mriežka: najprv náš výber (verejne_fotky_vyber), potom fotobanky (/api/fotky).
// Ťuk = vybrať (výber drží okno galérie), pri každej fotke autor a zdroj. Uloženie k nám robí okno pri „Pridať".
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cipFiltra } from "@/components/Volby";
import { ChybaFotiek, hladajFotky, KATEGORIE_FOTIEK, vyberFotiek, ZDROJ_NAZOV, type KategoriaFotiek, type VerejnaFotka } from "@/lib/verejneFotky";

export const klucFotky = (f: VerejnaFotka) => `${f.zdroj}:${f.id}`;

export function PanelVerejnychFotiek({ uzke, vyb, onTukni }: { uzke: boolean; /** kľúče vybraných (klucFotky) v poradí */ vyb: string[]; onTukni: (f: VerejnaFotka) => void }) {
  const [kat, setKat] = useState<KategoriaFotiek | null>("kostol");
  const [q, setQ] = useState("");
  const [hladane, setHladane] = useState("");
  const [nase, setNase] = useState<VerejnaFotka[]>([]);
  const [banky, setBanky] = useState<VerejnaFotka[]>([]);
  const [strana, setStrana] = useState(1);
  const [stav, setStav] = useState<"nacitavam" | "ok" | "chyba">("nacitavam");
  const [chyba, setChyba] = useState("");
  const [viac, setViac] = useState(false);
  const poradie = useRef(0);

  // nové hľadanie (kategória alebo text) → strana 1; stav sa vynuluje v hladajNovo
  const hladajNovo = (k: KategoriaFotiek | null, h: string) => {
    if (k === kat && h === hladane) return; // to isté znova = nič (efekt by nebežal)
    setStav("nacitavam"); setChyba(""); setBanky([]); setStrana(1); setKat(k); setHladane(h);
  };
  useEffect(() => {
    const ja = ++poradie.current;
    void (async () => {
      const [v, b] = await Promise.all([
        hladane ? Promise.resolve([]) : vyberFotiek(kat ?? undefined),
        hladajFotky(hladane, kat ?? undefined, 1).then((l) => ({ l }), (e: Error) => ({ e })),
      ]);
      if (ja !== poradie.current) return;
      setNase(v);
      if ("e" in b) {
        // nie správca (veriaci): fotobanky nevidí, len náš výber — bez hlášky
        const lenNas = (b.e as ChybaFotiek).kod === "len_spravca";
        setChyba(lenNas ? (v.length ? "" : "Verejné fotky tu zatiaľ nie sú.") : b.e.message); setStav(v.length ? "ok" : "chyba"); return;
      }
      setBanky(b.l); setViac(b.l.length >= 20); setStav("ok");
    })();
  }, [kat, hladane]);

  const dalsie = async () => {
    const ja = poradie.current, s = strana + 1;
    setViac(false);
    try {
      const l = await hladajFotky(hladane, kat ?? undefined, s);
      if (ja !== poradie.current) return;
      const uz = new Set(banky.map(klucFotky));
      setBanky([...banky, ...l.filter((f) => !uz.has(klucFotky(f)))]); setStrana(s); setViac(l.length >= 20);
    } catch (e) { setChyba((e as Error).message); }
  };
  const hladaj = () => { const t = q.trim(); if (t) hladajNovo(null, t); };
  const vsetky = [...nase, ...banky];

  const cip = (on: boolean): CSSProperties => ({ flex: "none", height: 40, padding: "0 14px", borderRadius: 20, border: on ? "1.5px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", color: on ? "var(--gInk)" : "var(--ink2)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", ...cipFiltra(on) });
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <form onSubmit={(e) => { e.preventDefault(); hladaj(); }} style={{ display: "flex", gap: 8 }}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať, napr. sviečka, hory, chlieb" aria-label="Hľadať verejné fotky"
        style={{ flex: 1, minWidth: 0, height: 46, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, outline: "none" }} />
      <button type="submit" disabled={!q.trim()} style={{ flex: "none", height: 46, padding: "0 16px", borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: q.trim() ? "pointer" : "default", opacity: q.trim() ? 1 : 0.45 }}>Hľadať</button>
    </form>
    <div role="radiogroup" aria-label="Kategórie" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
      {KATEGORIE_FOTIEK.map(([k, n]) => <button key={k} type="button" role="radio" aria-checked={kat === k} onClick={() => { hladajNovo(k, ""); setQ(""); }} style={cip(kat === k)}>{n}</button>)}
    </div>
    {stav === "nacitavam" && <p style={{ margin: "14px 0", fontSize: 15, color: "var(--ink3)" }}>Hľadám fotky…</p>}
    {stav === "chyba" && <p role="alert" style={{ margin: "14px 0", fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{chyba}</p>}
    {stav === "ok" && !vsetky.length && <p style={{ margin: "14px 0", fontSize: 15, color: "var(--ink2)" }}>Nič sme nenašli. Skúste iné slovo.</p>}
    {stav === "ok" && vsetky.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${uzke ? 2 : 3}, minmax(0,1fr))`, gap: 8 }}>
      {vsetky.map((f) => {
        const n = vyb.indexOf(klucFotky(f)), zdroj = ZDROJ_NAZOV[f.zdroj] ?? f.zdroj;
        return (
          <button key={klucFotky(f)} type="button" onClick={() => onTukni(f)} aria-pressed={n >= 0} aria-label={`Fotka: ${f.autor ?? "neznámy autor"}, ${zdroj}`}
            style={{ position: "relative", aspectRatio: "4 / 3", padding: 0, border: "none", borderRadius: 12, overflow: "hidden", background: "#1D211B", cursor: "pointer", boxShadow: n >= 0 ? "0 0 0 3px var(--green)" : "none" }}>
            <img src={f.maly} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: n >= 0 ? 0.85 : 1 }} />
            {n >= 0 && <span style={{ position: "absolute", right: 6, top: 6, width: 28, height: 28, borderRadius: "50%", background: "var(--green)", color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n + 1}</span>}
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 8px 5px", background: "linear-gradient(transparent, rgba(0,0,0,.7))", color: "#fff", fontSize: 11.5, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {f.autor ?? "neznámy autor"} · {zdroj}
            </span>
          </button>);
      })}
    </div>}
    {stav === "ok" && chyba && vsetky.length > 0 && <p role="alert" style={{ margin: 0, fontSize: 13.5, color: "var(--ink3)" }}>{chyba}</p>}
    {stav === "ok" && viac && <button type="button" onClick={() => void dalsie()} style={{ alignSelf: "center", height: 44, padding: "0 18px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Ďalšie fotky</button>}
    <span style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink3)" }}>Fotky z verejných fotobánk (Pixabay, Openverse a ďalšie) sa smú použiť zadarmo. Autora pri fotke uvádzame.</span>
  </div>;
}
