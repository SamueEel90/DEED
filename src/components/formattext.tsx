// ============================================================
// DEED · FormatovanyText — JEDEN render dlhých textov v celej appke.
// · starý čistý text → pre-wrap (\n\n = odsek, \n = zalomenie) — okamžitá
//   oprava „machule" bez migrácie (spec §1, AC#5)
// · HTML z editora → sanitizované cez whitelist (lib/richtext.ts)
// · odkazy: rel=noopener nofollow, otvárajú sa mimo appky s upozornením
// ============================================================
import { useMemo } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { sanitizujHtml, jeHtmlText } from "@/lib/richtext";

// štýly formátovaného obsahu — raz do <head> (inline style pseudo-selektory nevie)
const CSS_ID = "deed-ftext-css";
function zaistiCss() {
  if (typeof document === "undefined" || document.getElementById(CSS_ID)) return;
  const s = document.createElement("style");
  s.id = CSS_ID;
  s.textContent = `
.ftext p{margin:0 0 .7em}
.ftext p:last-child{margin-bottom:0}
.ftext h3{font-size:1.06em;font-weight:800;margin:.9em 0 .35em}
.ftext h3:first-child{margin-top:0}
.ftext ul,.ftext ol{margin:.2em 0 .7em;padding-left:1.35em}
.ftext li{margin:.15em 0}
.ftext a{color:var(--a-info);text-decoration:underline;word-break:break-word}
.ftext strong{font-weight:700}
`;
  document.head.appendChild(s);
}

export function FormatovanyText({ text, style }: { text?: string | null; style?: CSSProperties }) {
  const html = useMemo(() => (jeHtmlText(text) ? sanitizujHtml(text!) : null), [text]);
  zaistiCss();
  if (!text) return null;

  if (html == null) {
    // starý/čistý text — zachovaj konce riadkov (nikdy ich nezahadzuj)
    return <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", ...style }}>{text}</div>;
  }

  // odkazy vedú mimo appky — krátke upozornenie pred otvorením (spec §4)
  const klik = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute("href") || "";
    if (window.confirm(`Odkaz vedie mimo DEED:\n${href}\n\nOtvoriť?`)) window.open(href, "_blank", "noopener");
  };

  return <div className="ftext" style={style} onClick={klik} dangerouslySetInnerHTML={{ __html: html }} />;
}
