// OPRAVY 62 · dlaždice profilu + Upraviť dlaždice (poradie ťahaním aj klávesnicou, skryť, Rozbalené na profile, Obnoviť pôvodné).
// Pri nepárnom počte sa posledná dlaždica roztiahne na celú šírku. Rozbalené sekcie sú pod mriežkou a vidí ich len vlastník.
import { useRef, useState, type ReactNode } from "react";
import { Harok } from "@/features/zbierka/Zdielat";
import { toast } from "@/components/toast";
import { useDlazdice, ulozDlazdice, obnovPovodne, MA_ROZBALENIE, type DlazdicaId } from "@/lib/dlazdice";
import { Prepinac } from "./nastUi";

export type Dlazdica = { id: DlazdicaId; t: string; s: string; ikona: ReactNode; bg: string; c: string; onClick: () => void; skryt?: boolean };

export function MriezkaDlazdic({ vsetky, sekcie, medzi }: { vsetky: Dlazdica[]; sekcie: Partial<Record<DlazdicaId, ReactNode>>; /** medzi tlačidlom a rozbalenými sekciami (Poďakovania) */ medzi?: ReactNode }) {
  const n = useDlazdice();
  const [uprava, setUprava] = useState(false);
  const dostupne = vsetky.filter((d) => !d.skryt); // napr. Zamestnávateľ len pre prepojeného / s pozvánkou
  const podla = (id: DlazdicaId) => dostupne.find((d) => d.id === id);
  const viditelne = n.poradie.map(podla).filter((d): d is Dlazdica => !!d && !n.skryte.includes(d.id));
  const neparne = viditelne.length % 2 === 1;
  const rozbalene = n.poradie.filter((id) => n.rozbalene.includes(id) && !n.skryte.includes(id) && podla(id) && sekcie[id]);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {viditelne.map((d, i) => (
          <button key={d.id} type="button" onClick={d.onClick} style={{ gridColumn: neparne && i === viditelne.length - 1 ? "1 / -1" : undefined, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", minHeight: 104, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: d.bg, color: d.c, display: "flex", alignItems: "center", justifyContent: "center" }}>{d.ikona}</span>
            <span><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{d.t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{d.s}</span></span>
          </button>))}
      </div>
      <button type="button" onClick={() => setUprava(true)} style={{ alignSelf: "center", minHeight: 44, padding: "0 16px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "transparent", color: "var(--ink2)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>Upraviť dlaždice</button>
      {medzi}
      {rozbalene.map((id) => <div key={id}>{sekcie[id]}</div>)}
      {uprava && <UpravitDlazdice dostupne={dostupne} onClose={() => setUprava(false)} maSekciu={(id) => !!sekcie[id]} />}
    </>
  );
}

type Tah = { id: DlazdicaId; from: number; to: number; y0: number; dy: number; rects: DOMRect[] };

/** OPRAVY 69: riadky rovnako vysoké, cieľ podľa skutočných pozícií, živý náhľad, pustenie = presne index z náhľadu */
export function UpravitDlazdice({ dostupne, onClose, maSekciu }: { dostupne: Dlazdica[]; onClose: () => void; maSekciu: (id: DlazdicaId) => boolean }) {
  const n = useDlazdice();
  const [tah, setTah] = useState<Tah | null>(null);
  const li = useRef<(HTMLLIElement | null)[]>([]);
  const zoznam = n.poradie.filter((id) => dostupne.some((d) => d.id === id));
  const presunNa = (id: DlazdicaId, k: number) => {
    const bez = zoznam.filter((x) => x !== id);
    const c = Math.max(0, Math.min(bez.length, k));
    ulozDlazdice({ ...n, poradie: [...bez.slice(0, c), id, ...bez.slice(c), ...n.poradie.filter((x) => !zoznam.includes(x))] });
  };
  const zaciatok = (id: DlazdicaId, i: number, e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rects = li.current.slice(0, zoznam.length).map((r) => r!.getBoundingClientRect());
    setTah({ id, from: i, to: i, y0: e.clientY, dy: 0, rects });
  };
  const pohyb = (e: React.PointerEvent) => {
    if (!tah) return;
    const dy = e.clientY - tah.y0, r = tah.rects[tah.from];
    const mid = r.top + r.height / 2 + dy;
    let to = 0; tah.rects.forEach((q, k) => { if (k !== tah.from && q.top + q.height / 2 < mid) to++; });
    setTah({ ...tah, dy, to });
  };
  const koniec = () => { if (tah) { if (tah.to !== tah.from) { presunNa(tah.id, tah.to); navigator.vibrate?.(8); } } setTah(null); };
  const posun = (k: number) => {
    if (!tah || k === tah.from) return 0;
    const h = tah.rects[tah.from].height;
    if (tah.from < tah.to && k > tah.from && k <= tah.to) return -h;
    if (tah.from > tah.to && k >= tah.to && k < tah.from) return h;
    return 0;
  };
  const prepniSkryt = (id: DlazdicaId) => ulozDlazdice({ ...n, skryte: n.skryte.includes(id) ? n.skryte.filter((x) => x !== id) : [...n.skryte, id] });
  const prepniRozbal = (id: DlazdicaId) => ulozDlazdice({ ...n, rozbalene: n.rozbalene.includes(id) ? n.rozbalene.filter((x) => x !== id) : [...n.rozbalene, id] });
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Upraviť dlaždice</span>} zatvorText="Hotovo"
      paticka={<button type="button" onClick={() => { obnovPovodne(); toast("Pôvodné dlaždice obnovené"); }} style={{ flex: 1, minHeight: 50, borderRadius: 15, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Obnoviť pôvodné</button>}>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Chyť dlaždicu za úchyt a posuň ju. Rovnaké poradie má aj menu na tablete a počítači. Prepínač <b>Rozbalené</b> ukáže sekciu celú pod dlaždicami, vidíš ju len ty.</div>
      <ul role="list" aria-label="Poradie dlaždíc" style={{ listStyle: "none", margin: 0, padding: 0, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", touchAction: tah ? "none" : undefined }}>
        {zoznam.map((id, i) => {
          const d = dostupne.find((x) => x.id === id)!;
          const skryta = n.skryte.includes(id), t = tah?.id === id;
          const rozb = maSekciu(id) && !!MA_ROZBALENIE[id], rOn = n.rozbalene.includes(id);
          return (
            <li key={id} ref={(el) => { li.current[i] = el; }}
              style={{ position: "relative", zIndex: t ? 2 : 1, height: 64, display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 2px", borderTop: i ? "1px solid var(--cardBd)" : "none", background: t ? "var(--card)" : "transparent", borderRadius: t ? 14 : 0,
                transform: t ? `translateY(${tah!.dy}px) scale(1.02)` : `translateY(${posun(i)}px)`, transition: t ? "none" : "transform .18s ease", boxShadow: t ? "0 10px 24px rgba(0,0,0,.18)" : "none" }}>
              <span role="button" tabIndex={0} aria-label={`${d.t}, ${i + 1}. miesto. Šípkami hore a dole zmeníš poradie.`}
                onKeyDown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); presunNa(id, i - 1); } if (e.key === "ArrowDown") { e.preventDefault(); presunNa(id, i + 1); } }}
                onPointerDown={(e) => zaciatok(id, i, e)} onPointerMove={pohyb} onPointerUp={koniec} onPointerCancel={() => setTah(null)}
                style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink3)", cursor: t ? "grabbing" : "grab", touchAction: "none", flex: "none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg></span>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: d.bg, color: d.c, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", opacity: skryta ? 0.4 : 1 }}>{d.ikona}</span>
              <span style={{ flex: 1, minWidth: 0, opacity: skryta ? 0.5 : 1 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.t}</span>{skryta && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>skrytá</span>}</span>
              {rozb && !skryta && (
                <button type="button" role="switch" aria-checked={rOn} aria-label={`Rozbalené na profile: ${d.t}`} title={MA_ROZBALENIE[id]} onClick={() => prepniRozbal(id)}
                  style={{ flex: "none", minHeight: 44, display: "flex", alignItems: "center", gap: 6, padding: "0 4px", border: "none", background: "none", boxShadow: "none", cursor: "pointer", color: rOn ? "var(--gInk)" : "var(--ink3)", fontFamily: "inherit" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
                  <span style={{ display: "flex", transform: "scale(.8)", transformOrigin: "center" }}><Prepinac on={rOn} /></span>
                </button>)}
              {id !== "nastavenia"
                ? <button type="button" onClick={() => prepniSkryt(id)} style={{ flex: "none", minHeight: 44, minWidth: 56, padding: "0 6px", border: "none", background: "transparent", boxShadow: "none", color: skryta ? "var(--gInk)" : "var(--ink3)", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{skryta ? "Ukázať" : "Skryť"}</button>
                : <span style={{ flex: "none", minWidth: 56, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>vždy</span>}
            </li>);
        })}
      </ul>
    </Harok>
  );
}
