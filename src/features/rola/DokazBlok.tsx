// Dôkaz použitia zbierky — fotky PRED/PO, text a doklady (verejný profil aj oznam darcovi)
import { useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { pressable } from "@/components/pressable";
import { jePdf, otvorDoklad } from "@/lib/doklad";
import type { Dokaz } from "@/lib/zbierky";
import { jeVideo, useVideoUrl } from "@/lib/videoUloz";
import type { CSSProperties } from "react";

/** fotka alebo video dôkazu (video z úložiska „idb:…") */
export function MediaNahlad({ src, popis, ovladanie, style }: { src: string; popis: string; ovladanie?: boolean; style?: CSSProperties }) {
  const url = useVideoUrl(src);
  if (!jeVideo(src)) return <img src={src} alt={popis} style={style} />;
  if (!url) return <div style={{ ...style, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>▶ video</div>;
  return <video src={url} controls={ovladanie} muted={!ovladanie} playsInline preload="metadata" style={{ ...style, background: "#000" }} />;
}

const eur = (n: number) => n.toLocaleString("sk", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

export function DokazBlok({ dokaz, vyzbierane, odberatel = "Svetlo pomoci o.z." }: { dokaz: Dokaz; vyzbierane?: number; odberatel?: string }) {
  const [otvoreny, setOtvoreny] = useState<number | null>(null);
  const spolu = dokaz.doklady.reduce((a, d) => a + d.suma, 0);
  return (
    <div style={{ marginBottom: SPACE.sm }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>DÔKAZ — TAKTO SME POMOHLI</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, dokaz.fotky.length))}, 1fr)`, gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {dokaz.fotky.map((f) => (
          <div key={f.src} style={{ position: "relative", borderRadius: RADIUS.sm, overflow: "hidden" }}>
            <MediaNahlad src={f.src} popis={f.popis} ovladanie style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", left: 6, top: 6, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "#fff", background: f.popis === "PRED" ? "rgba(0,0,0,.65)" : "var(--a-green)", borderRadius: RADIUS.xs, padding: "2px 7px" }}>{f.popis}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: SPACE.sm }}>{dokaz.text}</div>
      <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, overflow: "hidden" }}>
        {dokaz.doklady.map((d, i) => (
          <div key={d.cislo} style={{ borderBottom: `1px solid ${C.line}` }}>
            <div {...pressable(() => setOtvoreny(otvoreny === i ? null : i), `${d.druh} ${d.nazov}`)}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{d.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{d.druh} · {d.dodavatel}</div>
              </div>
              <span style={{ flex: "none", fontSize: 14, fontWeight: 800 }}>{eur(d.suma)}</span>
              <span style={{ color: C.textTer, fontSize: 14, transform: otvoreny === i ? "rotate(90deg)" : "none" }}>›</span>
            </div>
            {otvoreny === i && (
              <div style={{ margin: `0 ${SPACE.gutter}px ${SPACE.sm}px`, background: "#fff", color: "#222", borderRadius: RADIUS.xs, padding: SPACE.gutter, fontSize: 12, lineHeight: 1.6, boxShadow: "0 1px 6px rgba(0,0,0,.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, marginBottom: 6 }}><span>{d.druh.toUpperCase()}</span><span>{d.cislo}</span></div>
                <div>Dodávateľ: <b>{d.dodavatel}</b></div>
                <div>Odberateľ: <b>{odberatel}</b></div>
                <div>Dátum: {d.datum}</div>
                {d.sken && (jePdf(d.sken)
                  ? <span {...pressable(() => void otvorDoklad(d.sken!), "Otvoriť PDF")} style={{ display: "inline-block", margin: "6px 0", fontWeight: 800, color: "#1a5fb4", cursor: "pointer" }}>📄 Otvoriť faktúru (PDF)</span>
                  : <img src={d.sken} alt={`Sken — ${d.nazov}`} style={{ width: "100%", borderRadius: 4, margin: "6px 0", display: "block" }} />)}
                <div style={{ borderTop: "1px dashed #bbb", margin: "6px 0", paddingTop: 6, display: "flex", justifyContent: "space-between" }}><span>{d.nazov}</span><b>{eur(d.suma)}</b></div>
                <div style={{ color: "#1a7f37", fontWeight: 700 }}>✓ Uhradené zo zbierky · overené DEED</div>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: `${SPACE.sm}px ${SPACE.gutter}px`, fontSize: 14, fontWeight: 800 }}>
          <span>Spolu doložené</span>
          <span style={{ color: "var(--a-green)" }}>{eur(spolu)}{vyzbierane ? ` z ${eur(vyzbierane)}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
