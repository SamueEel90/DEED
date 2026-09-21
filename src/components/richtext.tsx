// ============================================================
// DEED · RichTextInput — ľahký editor dlhých textov (spec §2–3).
// LEN základ: tučné · kurzíva · nadpis (1 úroveň) · odrážky · číslovanie ·
// odkaz. Žiadne farby/fonty/tabuľky — texty vyzerajú jednotne s dizajnom.
// Vkladanie z Wordu: paste handler zachytí HTML zo schránky, štruktúra
// prežije, balast (mso-*, span smetie, fonty, farby) sa zahodí —
// všetko cez sanitizujHtml (lib/richtext.ts). Ukladá sanitizované HTML.
// Bez knižnice (TipTap/Quill by pridali stovky kB — základ zvládne
// contentEditable; ak neskôr treba viac, vymení sa vnútro, API ostane).
// ============================================================
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { sanitizujHtml, textNaHtml, jeHtmlText } from "@/lib/richtext";

function prikaz(cmd: string, arg?: string) {
  document.execCommand(cmd, false, arg);
}

const NASTROJE: Array<{ id: string; label: string; titul: string; styl?: CSSProperties }> = [
  { id: "bold", label: "B", titul: "Tučné", styl: { fontWeight: 800 } },
  { id: "italic", label: "I", titul: "Kurzíva", styl: { fontStyle: "italic", fontFamily: "serif" } },
  { id: "nadpis", label: "H", titul: "Nadpis" },
  { id: "insertUnorderedList", label: "•", titul: "Odrážky" },
  { id: "insertOrderedList", label: "1.", titul: "Číslovaný zoznam" },
  { id: "odkaz", label: "🔗", titul: "Odkaz" },
  { id: "emoji", label: "😊", titul: "Emoji" },
];
const EMOJI = ["❤️", "🙏", "💛", "🤝", "✨", "🎉", "🏠", "🍲", "🧸", "🌱", "🐾", "👉"];

/** zapnuté formátovanie pod kurzorom (null = kurzor nie je v editore) */
function zistiAktivne(el: HTMLElement | null): string[] | null {
  if (!el || !el.contains(document.getSelection()?.anchorNode ?? null)) return null;
  return ["bold", "italic", "insertUnorderedList", "insertOrderedList"].filter((c) => {
    try { return document.queryCommandState(c); } catch { return false; }
  });
}

export function RichTextInput({ value, onChange, placeholder, minH = 110, ariaLabel, nastroje, maxZnakov }: {
  value?: string; onChange?: (html: string) => void; placeholder?: string; minH?: number; ariaLabel?: string;
  /** ktoré nástroje ukázať (id z NASTROJE); bez neho všetky okrem emoji */
  nastroje?: string[];
  /** limit znakov (čistý text) — nad limitom sa neukladá, počítadlo sčervenie */
  maxZnakov?: number;
}) {
  const lista = NASTROJE.filter((n) => (nastroje ? nastroje.includes(n.id) : n.id !== "emoji"));
  const [emojiOtv, setEmojiOtv] = useState(false);
  const [znakov, setZnakov] = useState(0);
  // ktoré formátovanie je práve zapnuté pod kurzorom — tlačidlo sa vysvieti
  const [aktivne, setAktivne] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obnov = () => { const a = zistiAktivne(ref.current); if (a) setAktivne(a); };
    document.addEventListener("selectionchange", obnov);
    return () => document.removeEventListener("selectionchange", obnov);
  }, []);
  const posledne = useRef<string>(""); // čo sme naposledy emitli — nech externý echo nepremaže kurzor
  const [prazdne, setPrazdne] = useState(!value);

  // externá hodnota → do editora LEN keď sa reálne líši (inicializácia/reset)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const v = value ?? "";
    if (v !== posledne.current) {
      // starý čistý text → \n ako <br>, nech odseky v editore neprepadnú
      el.innerHTML = v ? (jeHtmlText(v) ? sanitizujHtml(v) : textNaHtml(v)) : "";
      posledne.current = v;
      setPrazdne(!el.textContent?.trim());
      setZnakov((el.textContent || "").length);
    }
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    setPrazdne(!el.textContent?.trim());
    const dlzka = (el.textContent || "").length;
    setZnakov(dlzka);
    if (maxZnakov && dlzka > maxZnakov) return; // nad limitom sa neukladá
    let cisty = sanitizujHtml(el.innerHTML);
    // text začínajúci obyčajným textom (bez <p>) by sa pri ďalšom otvorení bral ako čistý text
    // a značky by sa ukázali ako &lt;strong&gt; — preto vždy obaliť do odseku
    if (cisty.trim() && !/^\s*</.test(cisty)) cisty = `<p>${cisty}</p>`;
    posledne.current = cisty;
    onChange?.(cisty);
  }

  function nastroj(id: string) {
    ref.current?.focus();
    if (id === "nadpis") {
      // toggle: nadpis ↔ odsek (jedna úroveň — h3)
      const blok = document.queryCommandValue("formatBlock");
      prikaz("formatBlock", /h3/i.test(blok) ? "<p>" : "<h3>");
    } else if (id === "emoji") {
      setEmojiOtv((o) => !o);
      return;
    } else if (id === "odkaz") {
      const url = window.prompt("Adresa odkazu (https://…):", "https://");
      if (url && /^https?:\/\//i.test(url)) prikaz("createLink", url);
    } else {
      prikaz(id);
    }
    emit();
    const a = zistiAktivne(ref.current); if (a) setAktivne(a);
  }

  // kľúčová požiadavka (spec §3): paste z Wordu — štruktúra prežije, balast nie
  function paste(e: React.ClipboardEvent) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const vloz = html ? sanitizujHtml(html) : textNaHtml(e.clipboardData.getData("text/plain"));
    prikaz("insertHTML", vloz);
    emit();
  }

  const base: CSSProperties = {
    width: "100%", minHeight: minH, padding: SPACE.md - 1, borderRadius: `0 0 ${RADIUS.sm}px ${RADIUS.sm}px`,
    background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderTop: "none",
    color: C.text, fontSize: 16, lineHeight: 1.5, fontFamily: "inherit", outline: "none",
    overflowWrap: "break-word",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* lišta nástrojov */}
      <div role="toolbar" aria-label="Formátovanie textu" style={{ display: "flex", gap: SPACE.xxs, padding: `${SPACE.xxs}px ${SPACE.xs}px`, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line}`, borderRadius: `${RADIUS.sm}px ${RADIUS.sm}px 0 0` }}>
        {lista.map((n) => (
          <button key={n.id} type="button" title={n.titul} aria-label={n.titul}
            onMouseDown={(e) => e.preventDefault() /* nepusti focus z editora */}
            onClick={() => nastroj(n.id)}
            aria-pressed={aktivne.includes(n.id) || (n.id === "emoji" && emojiOtv)}
            style={{ width: 30, height: 28, borderRadius: RADIUS.xs, border: "none",
              background: aktivne.includes(n.id) || (n.id === "emoji" && emojiOtv) ? "var(--a-info)" : "transparent",
              color: aktivne.includes(n.id) ? "#fff" : C.textSec, fontSize: 13, cursor: "pointer", fontFamily: "inherit", ...n.styl }}>
            {n.label}
          </button>
        ))}
      </div>
      {emojiOtv && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: `${SPACE.xxs}px ${SPACE.xs}px`, background: "rgba(var(--glass-rgb),.05)", borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}` }}>
          {EMOJI.map((e) => (
            <button key={e} type="button" aria-label={`Vložiť ${e}`}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => { ref.current?.focus(); prikaz("insertText", e); emit(); }}
              style={{ width: 34, height: 32, border: "none", background: "transparent", fontSize: 18, cursor: "pointer" }}>{e}</button>
          ))}
        </div>
      )}
      <div ref={ref} className="ftext" contentEditable spellCheck lang="sk" role="textbox" aria-multiline="true" aria-label={ariaLabel || placeholder}
        onInput={emit} onBlur={emit} onPaste={paste} style={base} />
      {maxZnakov && (
        <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, marginTop: 4, color: znakov > maxZnakov ? "var(--a-danger)" : C.textTer }}>
          {znakov > maxZnakov ? `Príliš dlhé — skráť text, inak sa neuloží · ` : ""}{znakov} / {maxZnakov}
        </div>
      )}
      {prazdne && placeholder && (
        <div aria-hidden style={{ position: "absolute", top: 34 + SPACE.md, left: SPACE.md, right: SPACE.md, color: C.textTer, fontSize: 14.5, lineHeight: 1.5, pointerEvents: "none" }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
