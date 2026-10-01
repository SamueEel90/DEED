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
import type { CSSProperties, ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { sanitizujHtml, textNaHtml, jeHtmlText } from "@/lib/richtext";
import { toast } from "@/components/toast";

function prikaz(cmd: string, arg?: string) {
  document.execCommand(cmd, false, arg);
}

const NASTROJE: Array<{ id: string; label: string; titul: string; styl?: CSSProperties }> = [
  { id: "bold", label: "B", titul: "Tučné", styl: { fontWeight: 800 } },
  { id: "italic", label: "I", titul: "Kurzíva", styl: { fontStyle: "italic", fontFamily: "serif" } },
  { id: "nadpis", label: "H", titul: "Nadpis" },
  { id: "vacsie", label: "A+", titul: "Väčšie písmo", styl: { fontSize: 14 } },
  { id: "mensie", label: "A-", titul: "Menšie písmo", styl: { fontSize: 11 } },
  { id: "insertUnorderedList", label: "•", titul: "Odrážky" },
  { id: "insertOrderedList", label: "1.", titul: "Číslovaný zoznam" },
  { id: "odkaz", label: "", titul: "Odkaz" },
  { id: "emoji", label: "😊", titul: "Emoji" },
  // KARTA 33: ďalšie nástroje (len keď ich volajúci vyžiada v `nastroje`)
  { id: "diktovat", label: "Diktovať", titul: "Diktovať text hlasom", styl: { fontWeight: 800 } },
  { id: "tx", label: "Tx", titul: "Zrušiť formátovanie", styl: { fontWeight: 600 } },
  { id: "spat", label: "↶", titul: "Späť (Ctrl+Z)", styl: { fontWeight: 600 } },
];
/** KARTA 33 · vzhľad editora v Správe stránky — popisky tlačidiel podľa prototypu */
const POPIS_SPRAVA: Record<string, string> = { mensie: "A−", odkaz: "URL" };
type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const EMOJI = ["❤️", "🙏", "💛", "🤝", "✨", "🎉", "🏠", "🍲", "🧸", "🌱", "🐾", "👉"];

/** zapnuté formátovanie pod kurzorom (null = kurzor nie je v editore) */
function zistiAktivne(el: HTMLElement | null): string[] | null {
  if (!el || !el.contains(document.getSelection()?.anchorNode ?? null)) return null;
  return ["bold", "italic", "insertUnorderedList", "insertOrderedList"].filter((c) => {
    try { return document.queryCommandState(c); } catch { return false; }
  });
}

const IKONA_ODKAZ = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>;

export function RichTextInput({ value, onChange, placeholder, minH = 110, ariaLabel, nastroje, maxZnakov, vpravo, vzhlad, chybaRam, tvrdyLimit, onRiadky, onZnaky }: {
  value?: string; onChange?: (html: string) => void; placeholder?: string; minH?: number; ariaLabel?: string;
  /** ktoré nástroje ukázať (id z NASTROJE); bez neho všetky okrem emoji */
  nastroje?: string[];
  /** limit znakov (čistý text) — počítadlo; nad limitom sčervenie (uloženie stráži volajúci) */
  maxZnakov?: number;
  /** doplnok vpravo v lište (napr. Diktovať) */
  vpravo?: ReactNode;
  /** KARTA 33: vzhľad Správy stránky (pole --field, rámik #CFC9BC, tlačidlá 34 px) */
  vzhlad?: "sprava";
  /** červený rámik editora (napr. text nad limit riadkov) */
  chybaRam?: boolean;
  /** tvrdý limit znakov — ďalej sa písať nedá (zmena sa vráti) */
  tvrdyLimit?: number;
  /** počet riadkov v skutočnej šírke editora (nie podľa znakov) */
  onRiadky?: (n: number) => void;
  onZnaky?: (n: number) => void;
}) {
  const sp = vzhlad === "sprava";
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
  const [mic, setMic] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  // riadky = počet rôznych výšok riadkov textu v editore (Range.getClientRects), prepočíta sa aj pri zmene šírky
  const merajRiadky = () => {
    const el = ref.current; if (!el || !onRiadky) return;
    if (!el.textContent?.trim()) { onRiadky(0); return; }
    const rg = document.createRange(); rg.selectNodeContents(el);
    const tops = new Set(Array.from(rg.getClientRects()).filter((q) => q.width > 0).map((q) => Math.round(q.top)));
    onRiadky(tops.size);
  };
  useEffect(() => {
    const el = ref.current; if (!el || !onRiadky) return;
    const ro = new ResizeObserver(() => merajRiadky()); ro.observe(el); return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      onZnaky?.((el.textContent || "").trim().length);
      merajRiadky();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    // tvrdý limit: nad limit sa ďalej písať nedá — vrátiť posledný platný stav
    if (tvrdyLimit != null && (el.textContent || "").trim().length > tvrdyLimit) {
      el.innerHTML = posledne.current ? (jeHtmlText(posledne.current) ? sanitizujHtml(posledne.current) : textNaHtml(posledne.current)) : "";
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = document.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
      return;
    }
    setPrazdne(!el.textContent?.trim());
    onZnaky?.((el.textContent || "").trim().length);
    requestAnimationFrame(merajRiadky);
    const dlzka = (el.textContent || "").length;
    setZnakov(dlzka);
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
    } else if (id === "vacsie") {
      prikaz("fontSize", "5");      // <font size=5> → sanitizér z toho spraví span[data-v=velke]
    } else if (id === "mensie") {
      prikaz("fontSize", "2");
    } else if (id === "emoji") {
      setEmojiOtv((o) => !o);
      return;
    } else if (id === "tx") {
      prikaz("removeFormat"); prikaz("formatBlock", "<p>");
      const blok = document.queryCommandState("insertUnorderedList") ? "insertUnorderedList" : document.queryCommandState("insertOrderedList") ? "insertOrderedList" : null;
      if (blok) prikaz(blok);
    } else if (id === "spat") {
      prikaz("undo");
    } else if (id === "diktovat") {
      if (mic) { recRef.current?.stop(); setMic(false); return; }
      const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
      const R = W.SpeechRecognition || W.webkitSpeechRecognition;
      if (!R) { toast("Diktovanie tento prehliadač nepodporuje. Skúste diktovanie na klávesnici telefónu."); return; }
      const r = new R();
      r.lang = "sk-SK"; r.interimResults = false; r.continuous = false;
      r.onresult = (e) => { const t = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim(); if (t) { ref.current?.focus(); prikaz("insertText", (prazdne ? "" : " ") + t); emit(); } };
      r.onend = () => setMic(false);
      r.onerror = () => setMic(false);
      recRef.current = r; setMic(true); r.start();
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

  const base: CSSProperties = sp ? {
    width: "100%", minHeight: minH, padding: "12px 16px", boxSizing: "border-box", border: "none",
    background: "transparent", color: "var(--ink)", fontSize: 15.5, lineHeight: 1.5, fontFamily: "inherit", outline: "none", overflowWrap: "break-word",
  } : {
    width: "100%", minHeight: minH, padding: SPACE.md - 1, borderRadius: `0 0 ${RADIUS.sm}px ${RADIUS.sm}px`,
    background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderTop: "none",
    color: C.text, fontSize: 16, lineHeight: 1.5, fontFamily: "inherit", outline: "none",
    overflowWrap: "break-word",
  };

  return (
    <div style={sp ? { position: "relative", borderRadius: 13, background: "var(--field)", border: `1.5px solid ${chybaRam ? "#A34A2A" : "var(--fieldBd, #CFC9BC)"}`, overflow: "hidden" } : { position: "relative" }}>
      {/* lišta nástrojov */}
      <div role="toolbar" aria-label="Formátovanie textu" style={sp
        ? { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--fieldBd, #CFC9BC)" }
        : { display: "flex", flexWrap: "wrap", alignItems: "center", gap: SPACE.xxs, padding: `${SPACE.xxs}px ${SPACE.xs}px`, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line}`, borderRadius: `${RADIUS.sm}px ${RADIUS.sm}px 0 0` }}>
        {lista.map((n) => {
          const zap = aktivne.includes(n.id) || (n.id === "emoji" && emojiOtv) || (n.id === "diktovat" && mic);
          return (
          <button key={n.id} type="button" title={n.titul} aria-label={n.titul}
            onMouseDown={(e) => e.preventDefault() /* nepusti focus z editora */}
            onClick={() => nastroj(n.id)}
            aria-pressed={zap}
            className={sp && !zap ? "sc-hov" : undefined}
            style={sp ? { flex: "none", minWidth: 36, height: 34, padding: "0 7px", whiteSpace: "nowrap", borderRadius: 9, border: "none",
              background: zap ? "var(--gSoft)" : "transparent", color: zap ? "var(--gInk)" : "var(--ink2)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", ...n.styl, fontSize: 15 }
              : { width: 30, height: 28, borderRadius: RADIUS.xs, border: "none",
              background: zap ? "#3D6B8E" : "transparent",
              color: aktivne.includes(n.id) ? "#fff" : C.textSec, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", ...n.styl }}>
            {sp ? (n.id === "diktovat" && mic ? "Počúvam…" : POPIS_SPRAVA[n.id] ?? n.label) : n.id === "odkaz" ? IKONA_ODKAZ : n.label}
          </button>); })}
        {vpravo}
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
      <div style={{ position: "relative" }}>
        <div ref={ref} className="ftext" contentEditable spellCheck lang="sk" role="textbox" aria-multiline="true" aria-label={ariaLabel || placeholder}
          onInput={emit} onBlur={emit} onPaste={paste} style={base} />
        {prazdne && placeholder && (
          <div aria-hidden style={sp ? { position: "absolute", top: 12, left: 16, right: 16, color: "var(--ink4)", fontSize: 15.5, lineHeight: 1.5, pointerEvents: "none" } : { position: "absolute", top: SPACE.md - 1, left: SPACE.md, right: SPACE.md, color: C.textTer, fontSize: 16, lineHeight: 1.5, pointerEvents: "none" }}>
            {placeholder}
          </div>
        )}
      </div>
      {maxZnakov && (
        <div style={{ textAlign: "right", fontSize: 11.5, fontWeight: 700, marginTop: 4, color: znakov > maxZnakov ? "#A34A2A" : C.textTer }}>
          {znakov > maxZnakov ? `Príliš dlhé — skráť text, inak sa neuloží · ` : ""}{znakov} / {maxZnakov}
        </div>
      )}
    </div>
  );
}
