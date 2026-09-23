// ============================================================
// FORMÁTOVANÉ TEXTY (DEED_Formatovanie_Textu_DEV.md · ČASŤ A)
// Sanitizované HTML s whitelistom tagov: p, br, strong, em, h3, ul, ol, li, a.
// Zahadzuje fonty, farby, štýly, obrázky, tabuľky a Word-balast (mso-*, span
// smetie); prežijú odseky, zalomenia, tučné/kurzíva, zoznamy, nadpisy, odkazy.
// XSS: žiadny script/style/iframe/on* — element sa buduje cez DOM (textContent),
// nikdy string concat. POZOR: toto je frontend vrstva — pri reálnom backende
// MUSÍ rovnaká sanitizácia bežať aj na serveri (spec §4).
// ============================================================

const POVOLENE = new Set(["p", "br", "strong", "em", "h3", "ul", "ol", "li", "a"]);
// dve veľkosti písma (A+ / A−) — jediný povolený „štýl", drží sa cez data-v
const VELKOSTI = new Set(["velke", "male"]);
/** akú veľkosť nesie element: vlastné data-v, alebo <font size> z execCommand/Wordu */
function velkostZ(el: Element): string | null {
  const v = el.getAttribute("data-v");
  if (v && VELKOSTI.has(v)) return v;
  const size = Number(el.getAttribute("size") || 0);
  if (size >= 4) return "velke";
  if (size > 0 && size <= 2) return "male";
  return null;
}
const jeTucne = (el: Element) => /(^|;)\s*font-weight\s*:\s*(bold|[6-9]00)/i.test(el.getAttribute("style") || "");
const jeKurziva = (el: Element) => /(^|;)\s*font-style\s*:\s*italic/i.test(el.getAttribute("style") || "");
// premapovanie príbuzných tagov na whitelist (b→strong, všetky nadpisy→h3, div→p)
const PREMAP: Record<string, string> = { b: "strong", i: "em", h1: "h3", h2: "h3", h4: "h3", h5: "h3", h6: "h3", div: "p" };
// tieto tagy sa zahadzujú AJ S OBSAHOM (nie unwrap)
const ZAHOD_CELE = new Set(["script", "style", "iframe", "object", "embed", "noscript", "head", "title", "meta", "link", "img", "svg", "video", "audio", "form", "input", "button", "table", "select", "textarea"]);

const jeMsoIgnore = (el: Element) => /mso-list\s*:\s*ignore/i.test(el.getAttribute("style") || "");
const jeMsoListOdsek = (el: Element) =>
  el.tagName.toLowerCase() === "p" && (/msolist/i.test(el.getAttribute("class") || "") || /mso-list\s*:/i.test(el.getAttribute("style") || ""));

function prepisDeti(zdroj: Node, ciel: Element, doc: Document) {
  let aktualnyUl: HTMLElement | null = null; // Word odrážky: po sebe idúce MsoListParagraph → jeden <ul>

  zdroj.childNodes.forEach((dieta) => {
    if (dieta.nodeType === Node.TEXT_NODE) {
      aktualnyUl = null;
      if (dieta.textContent) ciel.appendChild(doc.createTextNode(dieta.textContent));
      return;
    }
    if (dieta.nodeType !== Node.ELEMENT_NODE) return; // komentáre (aj <!--[if]-->) preč
    const el = dieta as Element;
    const tag = el.tagName.toLowerCase();

    if (ZAHOD_CELE.has(tag) || jeMsoIgnore(el)) return; // vrátane obsahu (číslo odrážky z Wordu…)

    // Word zoznam: <p class=MsoListParagraph> → <li>, po sebe idúce zgrupuj do <ul>
    if (jeMsoListOdsek(el)) {
      if (!aktualnyUl) { aktualnyUl = doc.createElement("ul"); ciel.appendChild(aktualnyUl); }
      const li = doc.createElement("li");
      aktualnyUl.appendChild(li);
      prepisDeti(el, li, doc);
      return;
    }
    aktualnyUl = null;

    // span/font: nesie veľkosť (A+/A−) alebo tučné/kurzívu zo schránky (FB, Word)
    if (tag === "span" || tag === "font") {
      const velkost = velkostZ(el);
      if (velkost) {
        const obal = doc.createElement("span");
        obal.setAttribute("data-v", velkost);
        ciel.appendChild(obal);
        prepisDeti(el, obal, doc);
        return;
      }
      if (jeTucne(el) || jeKurziva(el)) {
        const obal = doc.createElement(jeTucne(el) ? "strong" : "em");
        ciel.appendChild(obal);
        prepisDeti(el, obal, doc);
        return;
      }
    }

    const mapovany = POVOLENE.has(tag) ? tag : PREMAP[tag];
    if (!mapovany) { prepisDeti(el, ciel, doc); return; } // unwrap: span/font/… — obsah prežije, obal nie

    const novy = doc.createElement(mapovany);
    if (mapovany === "a") {
      const href = el.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) {
        novy.setAttribute("href", href);
        novy.setAttribute("rel", "noopener nofollow"); // spec §4
        novy.setAttribute("target", "_blank");         // otvárať mimo appky
      } else { prepisDeti(el, ciel, doc); return; }    // javascript:/data:/relatívne → len text
    }
    if (mapovany === "br") { ciel.appendChild(novy); return; }
    ciel.appendChild(novy);
    prepisDeti(el, novy, doc);
  });
}

/** Sanitizácia HTML na whitelist — jediná cesta, ktorou sa HTML dostane do uloženia/renderu. */
export function sanitizujHtml(spinave: string): string {
  if (!spinave) return "";
  const doc = new DOMParser().parseFromString(spinave, "text/html");
  const out = doc.createElement("div");
  prepisDeti(doc.body, out, doc);
  // prázdne odseky (Word ich sype) — von; <p> s len whitespace zmaž
  out.querySelectorAll("p, h3, li").forEach((p) => { if (!p.textContent?.trim() && !p.querySelector("br")) p.remove(); });
  return out.innerHTML.trim();
}

/** Je uložený text HTML (z editora), alebo starý čistý text (render cez pre-wrap)? */
export function jeHtmlText(t?: string | null): boolean {
  return !!t && /^\s*</.test(t) && /<\/?(p|br|strong|em|h3|ul|ol|li|a|span)[\s>/]/i.test(t);
}

/** Čistý text z HTML — pre krátke náhľady v kartách/riadkoch (tam HTML nepatrí). */
export function cistyText(t?: string | null): string {
  if (!t) return "";
  if (!jeHtmlText(t)) return t;
  const doc = new DOMParser().parseFromString(t, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

/** Escape čistého textu + \n → <br> (vloženie plain textu do editora). */
export function textNaHtml(t: string): string {
  const div = document.createElement("div");
  div.textContent = t;
  return div.innerHTML.replace(/\n/g, "<br>");
}
