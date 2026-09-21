// ============================================================
// Svetlúšik — maskot DEED (svetluška / motýlik zo štartovacieho videa).
// Krátka ďakovačka po dare: priletí, rozžiari sa, poďakuje a pripomenie karmu.
// Čisté CSS/SVG, bez knižníc; rešpektuje prefers-reduced-motion.
// ============================================================
import type { ReactNode } from "react";
import { C, SPACE } from "@/theme";

const CSS = `
@keyframes sv-prilet { 0% { transform: translate(-120px, 80px) scale(.4); opacity: 0 } 60% { opacity: 1 } 100% { transform: translate(0,0) scale(1); opacity: 1 } }
@keyframes sv-mav { 0%,100% { transform: scaleX(1) } 50% { transform: scaleX(.55) } }
@keyframes sv-ziara { 0%,100% { opacity: .55; transform: scale(1) } 50% { opacity: 1; transform: scale(1.18) } }
@keyframes sv-iskra { 0% { transform: translate(0,0) scale(1); opacity: 1 } 100% { transform: var(--kam) scale(.2); opacity: 0 } }
@keyframes sv-text { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .sv * { animation: none !important } }
`;

const ISKRY = [
  "translate(-70px,-40px)", "translate(60px,-55px)", "translate(-40px,50px)", "translate(75px,30px)",
  "translate(0,-75px)", "translate(-80px,5px)", "translate(40px,65px)", "translate(85px,-10px)",
];

export function Svetlusik({ nadpis, dar, karma }: { nadpis: ReactNode; dar: ReactNode; karma: ReactNode }) {
  return (
    <div className="sv" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: `${SPACE.xs}px 0 ${SPACE.gutter}px` }}>
      <style>{CSS}</style>
      <div style={{ position: "relative", width: 150, height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* žiara */}
        <span style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,196,77,.55) 0%, rgba(255,160,40,.18) 45%, transparent 70%)", animation: "sv-ziara 1.6s ease-in-out infinite" }} />
        {/* iskry */}
        {ISKRY.map((kam, i) => (
          <span key={i} style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: "#FFD27A", boxShadow: "0 0 8px #FFB84D",
            ["--kam" as string]: kam, animation: `sv-iskra 1.4s ease-out ${0.9 + i * 0.12}s infinite` } as React.CSSProperties} />
        ))}
        {/* motýlik — priletí a máva */}
        <span style={{ position: "relative", animation: "sv-prilet .9s cubic-bezier(.2,.8,.3,1) both" }}>
          <svg width="64" height="54" viewBox="0 0 64 54" style={{ filter: "drop-shadow(0 0 10px #FFB84D) drop-shadow(0 0 22px rgba(255,170,60,.7))", overflow: "visible" }}>
            <g style={{ transformOrigin: "32px 27px", animation: "sv-mav .35s ease-in-out infinite" }}>
              <path d="M32 27 C22 6, 2 4, 4 20 C5 30, 18 32, 32 27 Z" fill="#FFC857" />
              <path d="M32 27 C42 6, 62 4, 60 20 C59 30, 46 32, 32 27 Z" fill="#FFC857" />
              <path d="M32 28 C24 34, 10 44, 16 50 C22 54, 30 42, 32 28 Z" fill="#F4A93B" />
              <path d="M32 28 C40 34, 54 44, 48 50 C42 54, 34 42, 32 28 Z" fill="#F4A93B" />
            </g>
            <ellipse cx="32" cy="28" rx="2.6" ry="11" fill="#7A4A12" />
          </svg>
        </span>
      </div>
      <div style={{ animation: "sv-text .5s ease-out .7s both" }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>{nadpis}</div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--a-green)", marginTop: 4 }}>{dar}</div>
        <div style={{ fontSize: 12.5, color: C.textSec, marginTop: SPACE.xs, lineHeight: 1.45, maxWidth: 300 }}>{karma}</div>
      </div>
    </div>
  );
}
