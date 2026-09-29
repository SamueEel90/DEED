// KARTA 16 · Hárok „Zdieľať zbierku" — NÁŠ hárok (systémové zdieľanie až po „Poslať priateľom").
// Bez spodného „Hotovo"; zatvára sa krížikom / ťukom mimo / Esc. QR = náš DEED QR (tvar „D", zelený rám).
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { DeedQr, stiahniDeedQr } from "@/components/deedqr";
import { vibruj } from "./animacie";

export const odkazZbierky = (id: string) => `https://deed.sk/z/${encodeURIComponent(id)}`;

/** spoločný hárok modulu: mobil zdola, tablet 640 px / PC 560 px na stred, bez blur */
export function Harok({ onClose, children, hlavicka, podHlavickou, paticka, plnaVyska, zatvorText }: {
  onClose: () => void; children: ReactNode; hlavicka: ReactNode;
  /** textové zatvorenie vpravo („Zrušiť", „Zavrieť") namiesto krížika */ zatvorText?: string;
  /** napr. kroky (Nastavenie · Spôsob · Zhrnutie) — pevne pod hlavičkou */ podHlavickou?: ReactNode;
  /** pevné tlačidlá dole — obsah nad nimi sa posúva */ paticka?: ReactNode;
  /** mobil: hárok vždy 92 % výšky (nie podľa obsahu) */ plnaVyska?: boolean;
}) {
  const { wide, desktop } = useLayout();
  const [otv, setOtv] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOtv(true)); return () => cancelAnimationFrame(r); }, []);
  const zavri = () => { setOtv(false); setTimeout(onClose, 250); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div onClick={zavri} style={{ position: "absolute", inset: 0, background: "var(--scrim)", opacity: otv ? 1 : 0, transition: "opacity .32s ease" }} />
      <div style={{ ...(wide
          ? { position: "relative", width: desktop ? 560 : 640, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 48px)", borderRadius: 28, transform: otv ? "none" : "translateY(24px)", opacity: otv ? 1 : 0 }
          : { position: "absolute", left: 0, right: 0, bottom: 0, ...(plnaVyska ? { height: "92%" } : { maxHeight: "92%" }), borderRadius: "28px 28px 0 0", transform: otv ? "none" : "translateY(105%)" }), // mobil zdola, tablet/PC v strede
        background: "var(--sheet)", color: "var(--ink)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "transform .42s cubic-bezier(.2,.8,.2,1), opacity .32s ease" }}>
        <div style={{ flex: "none", padding: wide ? "18px 18px 0" : "10px 18px 0" }}>
          {!wide && <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--handle)", margin: "0 auto 12px" }} />}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {hlavicka}
            {zatvorText
              ? <button type="button" onClick={zavri} style={{ border: "none", background: "transparent", color: "var(--ink3)", fontSize: 14.5, fontWeight: 700, cursor: "pointer", padding: "10px 0 10px 10px", flex: "none", fontFamily: "inherit" }}>{zatvorText}</button>
              : <button type="button" onClick={zavri} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>}
          </div>
          {podHlavickou}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: paticka ? "14px 18px 18px" : "14px 18px max(22px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
        {paticka && <div style={{ flex: "none", padding: "12px 18px max(22px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--cardBd)", display: "flex", gap: 10, background: "var(--sheet)" }}>{paticka}</div>}
      </div>
    </div>,
    document.body,
  );
}

const IKONA_ZDIELAT = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>;

export function ZdielatHarok({ id, nazov, organizacia, obrazok, onClose }: { id: string; nazov: string; organizacia?: string; obrazok?: string; onClose: () => void }) {
  const url = odkazZbierky(id);
  const [skop, setSkop] = useState(false);
  const kopiruj = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* bez schránky */ }
    vibruj(8); setSkop(true); setTimeout(() => setSkop(false), 1600);
  };
  const posli = async () => {
    if (typeof navigator.share === "function") { try { await navigator.share({ title: nazov, url }); } catch { /* zrušené */ } }
    else void kopiruj(); // PC prehliadač bez zdieľania → skopíruje odkaz
  };
  const plagat = async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const qr = renderToStaticMarkup(<DeedQr data={url} odznak="D++" size={600} />);
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${esc(nazov)}</title>
<style>@page{size:A4;margin:16mm}body{font-family:'Plus Jakarta Sans',Arial,sans-serif;text-align:center;color:#1D211B;margin:0}
h1{font-size:30pt;margin:8mm 0 4mm}p{font-size:14pt;margin:0 0 6mm;color:#4A4C43}.f{width:100%;height:80mm;object-fit:cover;border-radius:6mm}.q{width:110mm;margin:6mm auto 0}.q svg{width:100%;height:auto}</style></head>
<body>${obrazok ? `<img class="f" src="${esc(obrazok)}">` : ""}<h1>${esc(nazov)}</h1>${organizacia ? `<p>${esc(organizacia)}</p>` : ""}
<p>Kto ho naskenuje, otvorí túto zbierku a môže hneď darovať.</p><div class="q">${qr}</div><p>${esc(url)}</p></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  };
  const male = { height: 40, padding: "0 12px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" } as const;

  return (
    <Harok onClose={onClose} hlavicka={<>
      <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{IKONA_ZDIELAT(22)}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>Zdieľať zbierku</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>odkaz, správa alebo QR na plagát</span>
      </span>
    </>}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        {obrazok ? <span style={{ width: 46, height: 46, borderRadius: 12, flex: "none", background: `url(${obrazok}) center/cover no-repeat` }} />
          : <span style={{ width: 46, height: 46, borderRadius: 12, flex: "none", background: "var(--gSoft)" }} />}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazov}</span>
          {organizacia && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{organizacia}</span>}
        </span>
      </div>
      <button type="button" onClick={posli} style={{ height: 54, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Poslať priateľom</button>
      <div style={{ marginTop: -4, fontSize: 12.5, color: "var(--ink3)", textAlign: "center" }}>Otvorí ponuku telefónu: Správy, WhatsApp, Messenger, e&#8209;mail…</div>
      <button type="button" onClick={() => void kopiruj()} style={{ height: 48, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: skop ? "var(--green)" : "var(--ink)" }}>
        <span key={String(skop)} style={{ animation: "zbFsIn .25s ease both" }}>{skop ? "Odkaz skopírovaný" : "Kopírovať odkaz"}</span>
      </button>
      <div style={{ margin: "8px 2px 0", fontSize: 12.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" }}>QR KÓD · NA PLAGÁT ALEBO UKÁZAŤ NAŽIVO</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 12, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <span style={{ background: "#fff", padding: 8, borderRadius: 12, flex: "none", lineHeight: 0 }}><DeedQr data={url} odznak="D++" size={148} /></span>
        <span style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Kto ho naskenuje, otvorí túto zbierku a môže hneď darovať.</span>
          <button type="button" onClick={() => void stiahniDeedQr({ data: url, odznak: "D++", variant: "svetly", nazov })} style={male}>Stiahnuť obrázok</button>
          <button type="button" onClick={() => void plagat()} style={male}>Plagát na tlač (A4)</button>
        </span>
      </div>
    </Harok>
  );
}
