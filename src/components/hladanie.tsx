import { useState, useDeferredValue, useEffect, useRef } from "react";
import { C, glassTmavy } from "@/theme";
import { tint } from "@/lib/ui";
import { Lupa, IkonaKriz, IkonaOpakovat, IkonaStit } from "@/components/icons";
import { pressable } from "@/components/pressable";
import { SegTabs } from "@/components/segtabs";
import { VirtualList } from "@/components/virtuallist";

// ============================================================
// VYHĽADÁVANIE — zdieľaný overlay (zhora), živé filtrovanie feedu
// data: [{ id, titul, podtitul, kat, emoji, tag }] · onPick(id) otvorí detail
// ============================================================
// jeden engine, jeden register filtrov (§11) — moduly ladia len default filter
export const HL_FILTRE = ["Všetko", "Osoby", "Firmy", "Školitelia", "Charity", "Žiadosti Help", "Žiadosti Charita", "Udalosti"];

// VEREJNÉ subjekty — dohľadateľné z ktoréhokoľvek modulu (jeden engine).
// SÚKROMNÉ osoby tu zámerne NIE SÚ (ochrana pred lustráciou §11/§13).
export const SUBJEKTY = [
  // firmy & partneri (reálne podniky / zamestnávatelia z regiónu)
  { id: "s-kauf",  typ: "Firmy",      titul: "Kaufland — DEED partner",        podtitul: "Firma · ESG report · Trenčín",        emoji: "🏢", tag: "Firma" },
  { id: "s-lidl",  typ: "Firmy",      titul: "Lidl pomáha — nadácia",          podtitul: "Firma · matching kampaň",             emoji: "🏢", tag: "Firma" },
  { id: "s-leoni", typ: "Firmy",      titul: "Leoni Slovakia",                 podtitul: "Zamestnávateľ · firemné dobrovoľníctvo · Trenčín", emoji: "🏭", tag: "Firma" },
  { id: "s-vetro", typ: "Firmy",      titul: "Vetropack Nemšová",              podtitul: "Sklárne · podpora komunity · Nemšová", emoji: "🏭", tag: "Firma" },
  { id: "s-janko", typ: "Firmy",      titul: "Pekáreň U Janka",                podtitul: "Lokálny partner · pečivo do útulku",  emoji: "🥨", tag: "Partner" },
  { id: "s-laug",  typ: "Firmy",      titul: "OC Laugaricio",                  podtitul: "Nákupné centrum · charitatívne akcie · Trenčín", emoji: "🛍", tag: "Partner" },
  // verejné inštitúcie (organizácie)
  { id: "s-mesto", typ: "Firmy",      titul: "Mesto Trenčín",                  podtitul: "Inštitúcia · verejné akcie a zbierky", emoji: "🏛", tag: "Mesto" },
  { id: "s-tsk",   typ: "Firmy",      titul: "Trenčiansky samosprávny kraj",   podtitul: "Inštitúcia · regionálne projekty",     emoji: "🏛", tag: "Kraj" },
  { id: "s-fntn",  typ: "Firmy",      titul: "Fakultná nemocnica Trenčín",     podtitul: "Inštitúcia · darcovstvo krvi · Trenčín", emoji: "🏥", tag: "Nemocnica" },
  { id: "s-kniz",  typ: "Firmy",      titul: "Verejná knižnica M. Rešetku",    podtitul: "Inštitúcia · vzdelávanie · Trenčín",   emoji: "📚", tag: "Knižnica" },
  { id: "s-muz",   typ: "Firmy",      titul: "Trenčianske múzeum",             podtitul: "Inštitúcia · kultúra · Trenčín",       emoji: "🏰", tag: "Kultúra" },
  // školitelia / lektori / školy
  { id: "s-tnuad", typ: "Školitelia", titul: "Trenčianska univerzita A. Dubčeka", podtitul: "Škola · prednášky a workshopy · Trenčín", emoji: "🎓", tag: "Škola" },
  { id: "s-pet",   typ: "Školitelia", titul: "Coach Peter — mentálny tréning", podtitul: "Školiteľ · Trenčín",                  emoji: "🧠", tag: "Školiteľ" },
  { id: "s-evac",  typ: "Školitelia", titul: "Coach Eva — joga",               podtitul: "Školiteľ · Mestský park",             emoji: "🧘", tag: "Školiteľ" },
  { id: "s-anna",  typ: "Školitelia", titul: "Anna K. — Python lektorka",      podtitul: "Školiteľ · online · ★ 4.9",           emoji: "🐍", tag: "Školiteľ" },
  { id: "s-hra",   typ: "Školitelia", titul: "MUDr. Hraško — prvá pomoc",      podtitul: "Školiteľ · BOZP · Trenčín",           emoji: "🚑", tag: "Školiteľ" },
  // charity (overené)
  { id: "s-nem",   typ: "Charity",    titul: "Detská nemocnica — nadácia",     podtitul: "✓ Overená charita · Gold · BA",       emoji: "🏥", tag: "Charita" },
  { id: "s-liga",  typ: "Charity",    titul: "Liga proti rakovine",            podtitul: "✓ Overená charita · Gold · SR",       emoji: "🎗", tag: "Charita" },
  { id: "s-cht",   typ: "Charity",    titul: "Charita Trenčín",                podtitul: "✓ Overená · jedáleň a nocľaháreň · Trenčín", emoji: "🍲", tag: "Charita" },
  { id: "s-hms",   typ: "Charity",    titul: "Hospic Milosrdných sestier",     podtitul: "✓ Overená · paliatíva · Trenčín",     emoji: "🕊", tag: "Charita" },
  { id: "s-tul",   typ: "Charity",    titul: "OZ Túlavá labka",                podtitul: "✓ Overená · útulok · Trenčín",        emoji: "🐾", tag: "Charita" },
  // osoby & tvorcovia (verejné profily)
  { id: "s-jan",   typ: "Osoby",      titul: "Ján Novák — lektor gitary",      podtitul: "Verejný profil · ponúka službu",      emoji: "🎸", tag: "Osoba" },
  { id: "s-tlupa", typ: "Osoby",      titul: "Tlupa — kapela",                 podtitul: "Verejný profil · benefičné koncerty", emoji: "🎵", tag: "Osoba" },
  { id: "s-cyklo", typ: "Osoby",      titul: "Cyklo Trenčín",                  podtitul: "Verejný profil · komunita cyklistov", emoji: "🚲", tag: "Osoba" },
  { id: "s-ekot",  typ: "Osoby",      titul: "EkoTím Juh",                     podtitul: "Verejný profil · dobrovoľnícky eko tím", emoji: "🌿", tag: "Osoba" },
];

// klasifikácia ľubovoľnej položky do filtra (z existujúcich tagov, bez zásahu do modulov)
function hlTyp(x: any) {
  if (x.typ && HL_FILTRE.includes(x.typ)) return x.typ;
  const t = (x.tag || "").toString().toLowerCase();
  if (t.includes("charita")) return "Charity";
  if (t.includes("žiadosť") || t.includes("ziadost")) return "Žiadosti Help";
  if (t.includes("workshop") || t.includes("udalos") || t.includes("akcia")) return "Udalosti";
  if (t.includes("talent") || t.includes("lektor") || t.includes("školit")) return "Školitelia";
  if (t.includes("ponuka")) return "Osoby";
  if (t.includes("firma") || t.includes("partner")) return "Firmy";
  return "Skutky"; // skutky a ostatné → viditeľné len pod „Všetko"
}

export function HladanieModal({ data = [], onPick, onClose, akcent = "var(--a-info)", placeholder = "Hľadať…",
  defaultFilter = "Všetko", posledne = ["Detská nemocnica", "Coach gitara", "Povodeň pomoc"], subjekty = SUBJEKTY, toast }: { data?: any[]; onPick?: (id: any) => void; onClose: () => void; akcent?: string; placeholder?: string; defaultFilter?: string; posledne?: string[]; subjekty?: any[]; toast?: (t: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(defaultFilter);
  // input je svižný (q), drahé filtrovanie beží na odloženej hodnote (dq)
  const dq = useDeferredValue(q);
  const resultsRef = useRef<HTMLDivElement>(null); // scroll kontajner výsledkov (virtualizácia pri raste)

  // Escape zatvorí overlay (klávesnica)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const norm = (s: any) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dotaz = norm(dq.trim());

  // celý vyhľadávací vesmír = obsah modulu + verejné subjekty (jeden engine naprieč)
  const vesmir = [
    ...data.map((x) => ({ ...x, _typ: hlTyp(x) })),
    ...subjekty.map((x) => ({ ...x, _subj: true, _typ: x.typ })),
  ];
  const podlaFiltra = vesmir.filter((x) => filter === "Všetko" || x._typ === filter);
  const vysl = dotaz ? podlaFiltra.filter((x) => norm([x.titul, x.podtitul, x.kat, x.tag].join(" ")).includes(dotaz)) : podlaFiltra;
  const prazdny = !dotaz && filter === "Všetko"; // história + odporúčané
  const odporucane = vesmir.slice(0, 3);

  const klik = (x: any) => { if (x._subj) toast?.(`Otváram profil: ${x.titul} (demo)`); else onPick?.(x.id); onClose(); };
  const Riadok = (x: any) => (
    <div key={x.id} {...pressable(() => klik(x), x.titul)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", borderRadius: 12, cursor: "pointer", borderBottom: `1px solid ${C.line2}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: tint(akcent, .14) }}>{x.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.titul}</div>
        {x.podtitul && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.podtitul}</div>}
      </div>
      {x.tag && <span style={{ flex: "0 0 auto", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background: tint(akcent, .14), color: akcent }}>{x.tag}</span>}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", flexDirection: "column", zIndex: 58, animation: "fadeUp .18s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...glassTmavy(26, .92), borderTop: "none", borderLeft: "none", borderRight: "none", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: "12px 14px 14px", boxShadow: "0 18px 50px rgba(0,0,0,.45)", maxHeight: "86%", display: "flex", flexDirection: "column" }}>
        {/* vyhľadávací riadok */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 13px", flex: "0 0 auto" }}>
          <Lupa size={18} color={C.textTer} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, fontFamily: "inherit" }} />
          {q
            ? <span {...pressable(() => setQ(""), "Vymazať hľadanie")} title="Vymazať" style={{ display: "flex", cursor: "pointer" }}><IkonaKriz size={18} color={C.textTer} /></span>
            : <span {...pressable(onClose, "Zrušiť hľadanie")} style={{ fontSize: 13, fontWeight: 600, color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}>Zrušiť</span>}
        </div>

        {/* filter-chipy — jeden engine, 8 typov */}
        <SegTabs
          options={HL_FILTRE}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter výsledkov hľadania"
          style={{ display: "flex", gap: 7, padding: "10px 0 2px", overflowX: "auto", flex: "0 0 auto" }}
          render={(f, on) => (
            <span style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 13, fontSize: 11.5, fontWeight: on ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
              background: on ? tint(akcent, .16) : C.surface2, border: `1px solid ${on ? tint(akcent, .5) : C.line}`, color: on ? akcent : C.textSec }}>{f}</span>
          )}
        />

        {/* obsah */}
        <div ref={resultsRef} style={{ overflowY: "auto", margin: "8px -4px 0", flex: "1 1 auto" }}>
          {prazdny ? (
            <>
              {/* POSLEDNÉ HĽADANIA */}
              <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 4px" }}>
                <span style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700 }}>POSLEDNÉ HĽADANIA</span>
                <span {...pressable(() => setQ(""), "Vymazať históriu hľadania")} style={{ marginLeft: "auto", fontSize: 11, color: C.textTer, cursor: "pointer" }}>vymazať</span>
              </div>
              {posledne.map((p) => (
                <div key={p} {...pressable(() => setQ(p), `Hľadať: ${p}`)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 8px", borderRadius: 12, cursor: "pointer", borderBottom: `1px solid ${C.line2}` }}>
                  <IkonaOpakovat size={15} color={C.textTer} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{p}</span>
                  <IkonaKriz size={14} color={C.textTer} />
                </div>
              ))}
              {/* ODPORÚČANÉ V OKOLÍ */}
              <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, padding: "16px 8px 6px" }}>ODPORÚČANÉ V OKOLÍ</div>
              {odporucane.map(Riadok)}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: C.textTer, padding: "2px 8px 6px" }}>
                {`${vysl.length} ${vysl.length === 1 ? "výsledok" : vysl.length < 5 ? "výsledky" : "výsledkov"}`}{dotaz ? ` · „${q.trim()}"` : ""}{filter !== "Všetko" ? ` · ${filter}` : ""}
              </div>
              {vysl.length === 0
                ? <div style={{ textAlign: "center", padding: "30px 14px", color: C.textTer, fontSize: 13 }}>Nič sa nenašlo. Skús iné slovo alebo filter.</div>
                : <VirtualList items={vysl} scrollRef={resultsRef} renderItem={Riadok} getKey={(x: any) => x.id} estimateSize={64} />}
            </>
          )}
          {/* ochrana — súkromné osoby nelustrovateľné */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: C.textTer, lineHeight: 1.4, margin: "14px 4px 2px", padding: "9px 11px", borderRadius: 10, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}` }}>
            <IkonaStit size={14} color={C.textTer} /> Súkromné osoby sa nedajú vyhľadať — len verejné profily a tvorcovia (ochrana).
          </div>
        </div>
      </div>
    </div>
  );
}
