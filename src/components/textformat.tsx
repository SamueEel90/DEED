// ============================================================
// DEED · Formátovaný text — pole, do ktorého sa dá vložiť text z Wordu,
// Facebooku či Instagramu a NESTRATÍ sa tučné/kurzíva/odrážky, plus
// tlačidlá na úpravu (tučné · kurzíva · väčšie · menšie · odrážky).
//
// Do databázy ide očistené HTML — z vloženého textu si necháme len
// zopár značiek, zvyšok (farby, fonty, odkazy, obrázky, skripty) ide preč,
// nech vyzerá všetko v appke rovnako a nič sa nedá prepašovať.
// ============================================================
import { useEffect, useRef, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";

const INLINE = new Set(["B", "STRONG", "I", "EM", "U", "BR"]);
const BLOK = new Set(["P", "UL", "OL", "LI"]);
const VELKOSTI = new Set(["velke", "male"]);

function rozbal(el: Element) {
  const rodic = el.parentNode;
  if (!rodic) return;
  while (el.firstChild) rodic.insertBefore(el.firstChild, el);
  rodic.removeChild(el);
}

function premen(el: Element, tag: string, velkost?: string) {
  const novy = document.createElement(tag);
  if (velkost) novy.setAttribute("data-v", velkost);
  while (el.firstChild) novy.appendChild(el.firstChild);
  el.replaceWith(novy);
}

/** nechá len povolené značky; všetko ostatné rozbalí na holý text */
export function ocistiHtml(html: string): string {
  const kos = document.createElement("div");
  kos.innerHTML = html;
  kos.querySelectorAll("script,style,noscript,iframe,object,embed,img,svg,video,audio,table").forEach((e) => e.remove());
  for (const el of Array.from(kos.querySelectorAll("*"))) {
    if (!kos.contains(el)) continue;   // kos je odpojený od stránky — isConnected by tu bolo vždy false
    const t = el.tagName;
    if (t === "FONT") {                                   // Word/FB posielajú veľkosť takto
      const v = Number(el.getAttribute("size") || 0);
      if (v >= 4) premen(el, "span", "velke");
      else if (v > 0 && v <= 2) premen(el, "span", "male");
      else rozbal(el);
      continue;
    }
    if (t === "H1" || t === "H2" || t === "H3" || t === "H4" || t === "H5" || t === "H6") {
      const silne = document.createElement("strong");
      while (el.firstChild) silne.appendChild(el.firstChild);
      el.replaceChildren(silne);
      premen(el, "p", "velke");
      continue;
    }
    if (t === "DIV") { premen(el, "p"); continue; }
    if (t === "SPAN") {
      const v = el.getAttribute("data-v") ?? "";
      const tucne = /(^|;)\s*font-weight\s*:\s*(bold|[6-9]00)/i.test(el.getAttribute("style") ?? "");
      const kurziva = /(^|;)\s*font-style\s*:\s*italic/i.test(el.getAttribute("style") ?? "");
      if (VELKOSTI.has(v)) { premen(el, "span", v); continue; }
      if (tucne) { premen(el, "strong"); continue; }
      if (kurziva) { premen(el, "em"); continue; }
      rozbal(el);
      continue;
    }
    if (INLINE.has(t) || BLOK.has(t)) {                   // povolené — len bez atribútov
      for (const a of Array.from(el.attributes)) el.removeAttribute(a.name);
      continue;
    }
    rozbal(el);                                           // odkazy, tabuľky, zvyšok
  }
  return kos.innerHTML.replace(/&nbsp;/g, "\u0020").trim();
}

/** holý text (na počítadlo znakov a kontrolu, či človek vôbec niečo napísal) */
export function cistyText(html: string): string {
  const kos = document.createElement("div");
  kos.innerHTML = html;
  return (kos.innerText || kos.textContent || "").replace(/\u00a0/g, "\u0020").trim();
}

/** staré oznamy sú holý text — ten len zabezpečíme a zalomíme */
export function naBezpecneHtml(hodnota: string): string {
  if (!/<[a-z]/i.test(hodnota)) {
    const d = document.createElement("div");
    d.textContent = hodnota;
    return (d.innerHTML || "").replace(/\n/g, "<br />");
  }
  return ocistiHtml(hodnota);
}

const btn: CSSProperties = {
  minWidth: 34, height: 32, borderRadius: RADIUS.xs, border: `1px solid ${C.line}`, background: C.surface,
  color: C.textSec, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: `0 ${SPACE.xs}px`,
};

export function EditorTextu({ hodnota, onZmena, placeholder, vyska = 130 }: {
  hodnota: string; onZmena: (html: string) => void; placeholder?: string; vyska?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const posledne = useRef<string>("");

  useEffect(() => {                                       // zvonku (načítanie, úprava) — inak by skákal kurzor
    if (ref.current && hodnota !== posledne.current) {
      ref.current.innerHTML = naBezpecneHtml(hodnota);
      posledne.current = hodnota;
    }
  }, [hodnota]);

  const posli = () => {
    if (!ref.current) return;
    const html = ocistiHtml(ref.current.innerHTML);
    posledne.current = html;
    onZmena(html);
  };

  const uprav = (prikaz: string, param?: string) => {
    ref.current?.focus();
    document.execCommand(prikaz, false, param);
    posli();
  };

  const vloz = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const d = document.createElement("div");
    d.textContent = text;
    document.execCommand("insertHTML", false, html ? ocistiHtml(html) : d.innerHTML.replace(/\n/g, "<br />"));
    posli();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: SPACE.xxs, marginBottom: 4, flexWrap: "wrap" }}>
        <button type="button" onClick={() => uprav("bold")} title="Tučné" aria-label="Tučné" style={{ ...btn, fontWeight: 900 }}>B</button>
        <button type="button" onClick={() => uprav("italic")} title="Kurzíva" aria-label="Kurzíva" style={{ ...btn, fontStyle: "italic" }}>I</button>
        <button type="button" onClick={() => uprav("fontSize", "5")} title="Väčšie písmo" aria-label="Väčšie písmo" style={{ ...btn, fontSize: 15 }}>A+</button>
        <button type="button" onClick={() => uprav("fontSize", "2")} title="Menšie písmo" aria-label="Menšie písmo" style={{ ...btn, fontSize: 11 }}>A-</button>
        <button type="button" onClick={() => uprav("insertUnorderedList")} title="Odrážky" aria-label="Odrážky" style={btn}>• —</button>
        <button type="button" onClick={() => uprav("removeFormat")} title="Zrušiť formátovanie" aria-label="Zrušiť formátovanie" style={{ ...btn, marginLeft: "auto", fontSize: 11.5, fontWeight: 700 }}>Vyčistiť</button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder={placeholder} className="deed-text deed-editor"
        onInput={posli} onBlur={posli} onPaste={vloz}
        style={{ minHeight: vyska, maxHeight: 320, overflowY: "auto", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 14, lineHeight: 1.5, outline: "none" }} />
    </div>
  );
}
