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
];

export function RichTextInput({ value, onChange, placeholder, minH = 110, ariaLabel }: {
  value?: string; onChange?: (html: string) => void; placeholder?: string; minH?: number; ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
    }
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    setPrazdne(!el.textContent?.trim());
    const cisty = sanitizujHtml(el.innerHTML);
    posledne.current = cisty;
    onChange?.(cisty);
  }

  function nastroj(id: string) {
    ref.current?.focus();
    if (id === "nadpis") {
      // toggle: nadpis ↔ odsek (jedna úroveň — h3)
      const blok = document.queryCommandValue("formatBlock");
      prikaz("formatBlock", /h3/i.test(blok) ? "<p>" : "<h3>");
    } else if (id === "odkaz") {
      const url = window.prompt("Adresa odkazu (https://…):", "https://");
      if (url && /^https?:\/\//i.test(url)) prikaz("createLink", url);
    } else {
      prikaz(id);
    }
    emit();
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
        {NASTROJE.map((n) => (
          <button key={n.id} type="button" title={n.titul} aria-label={n.titul}
            onMouseDown={(e) => e.preventDefault() /* nepusti focus z editora */}
            onClick={() => nastroj(n.id)}
            style={{ width: 30, height: 28, borderRadius: RADIUS.xs, border: "none", background: "transparent", color: C.textSec, fontSize: 13, cursor: "pointer", fontFamily: "inherit", ...n.styl }}>
            {n.label}
          </button>
        ))}
      </div>
      <div ref={ref} className="ftext" contentEditable role="textbox" aria-multiline="true" aria-label={ariaLabel || placeholder}
        onInput={emit} onBlur={emit} onPaste={paste} style={base} />
      {prazdne && placeholder && (
        <div aria-hidden style={{ position: "absolute", top: 34 + SPACE.md, left: SPACE.md, right: SPACE.md, color: C.textTer, fontSize: 14.5, lineHeight: 1.5, pointerEvents: "none" }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
