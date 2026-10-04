// OPRAVY 142/4 · ikona info v celej appke = malý Svetlúšik (sprite svetlusik-let.png, 30 px so žiarou, ťuk 44 px)
// + malé „i" vpravo dole (kruh 16 px, --ink2, biely okraj 2 px, kurzíva). Každé ~3,2 s krátko zamáva a nadskočí
// o 4 px, inak pokoj; prefers-reduced-motion = stojí. Ťuk rozbalí krémovú kartu (--goldBg/--goldBd) so Svetlúšikom 26 px.
// Vzor: Kronika v6 pri centrálnej zbierke. Svetlúšik tu nehovorí (bubliny len v registrácii a úvode).
import type { CSSProperties, ReactNode } from "react";
import "@/styles/svetlusikInfo.css";

/** tlačidlo info — otv mení silu žiary */
export function SvetlusikInfo({ otv, onPrepni, okraj = "var(--card)", style }: { otv: boolean; onPrepni: () => void; okraj?: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onPrepni} aria-expanded={otv} aria-label="Svetlúšik vysvetlí, ako to funguje"
      style={{ flex: "none", width: 44, height: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      <span style={{ position: "relative", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", inset: -4, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,196,92,.55) 0%,rgba(255,196,92,0) 70%)", opacity: otv ? 1 : 0.55, transition: "opacity .25s ease" }} />
        <span className="sv-info-hop" style={{ position: "relative", width: 30, height: 30, overflow: "hidden" }}>
          <span className="sv-info-mav" style={{ position: "absolute", left: 0, top: 0, width: 300, height: 30, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} />
        </span>
        <span aria-hidden="true" style={{ position: "absolute", right: -5, bottom: -3, width: 16, height: 16, borderRadius: "50%", background: "var(--ink2)", border: `2px solid ${okraj}`, color: okraj, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 10.5, fontWeight: 700, lineHeight: 1 }}>i</span>
      </span>
    </button>
  );
}

/** krémová karta s vysvetlením */
export function SvetlusikKarta({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", display: "flex", gap: 10, alignItems: "flex-start", ...style }}>
      <span aria-hidden="true" style={{ flex: "none", position: "relative", width: 26, height: 26, overflow: "hidden" }}>
        <span style={{ position: "absolute", left: 0, top: 0, width: 260, height: 26, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} />
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)", textWrap: "pretty" } as CSSProperties}>{children}</span>
    </div>
  );
}
