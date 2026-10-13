// ============================================================
// VÝZVY A ŽREBOVANIE (správa tvorcu) — vyhlásenie, prehľad, zrušenie a uzávierka.
//
// Motor (lib/vyzvy, DB 0085b) vie celú logiku: podmienka → odmena → obdobie, zbieranie
// účastníkov (dar a overený skutok ich zapíšu sami) a dokázateľný žreb.
// Čo ešte NIE JE: upozornenia výhercom.
//
// Prečo je tu tlačidlo na žreb zhasnuté, kým výzva beží: keby sa dalo
// žrebovať počas behu, tvorca si vyberie moment, ktorý mu vyhovuje, a celá
// dokázateľnosť padne. Motor to odmietne, tu to len nemá svietiť.
// ============================================================
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import {
  useVyzvyTvorcu, vyzrebuj, daSaZrebovat, doUzavierky, popisPodmienky, bezi, vyhlas, zrus,
  type Vyzva, type PodmienkaTyp, type OdmenaTyp,
} from "@/lib/vyzvy";

const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.sm,
};
const cip = (farba: string): CSSProperties => ({
  flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em",
  color: farba, background: tint(farba, .14), borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px`,
});
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });

const pole: CSSProperties = {
  width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 12px", borderRadius: RADIUS.sm,
  border: `1px solid ${C.line}`, background: "var(--field)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit",
};
const stitok: CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 800, color: C.textSec, margin: `${SPACE.sm}px 0 4px` };

/** formulár: čo majú ľudia spraviť, čo za to dostanú a dokedy */
function NovaVyzva({ tvorca, stranka, toast, onHotovo }: { tvorca: string; stranka?: string; toast: (m: string) => void; onHotovo: () => void }) {
  const [nazov, setNazov] = useState("");
  const [typ, setTyp] = useState<PodmienkaTyp>("dar");
  const [min, setMin] = useState("10");
  const [druh, setDruh] = useState("");
  const [odmenaTyp, setOdmenaTyp] = useState<OdmenaTyp>("zreb");
  const [popis, setPopis] = useState("");
  const [pocet, setPocet] = useState("1");
  const [dni, setDni] = useState("14");
  const [posiela, setPosiela] = useState(false);
  const odosli = async () => {
    const n = Number(min), p = Math.round(Number(pocet)), d = Math.round(Number(dni));
    if (nazov.trim().length < 3) { toast("Pomenuj výzvu (aspoň 3 znaky)."); return; }
    if (!popis.trim()) { toast("Napíš, čo dostanú — odmenu dávaš ty."); return; }
    if (typ === "darNad" && !(n > 0)) { toast("Zadaj najmenšiu sumu daru."); return; }
    if (odmenaTyp === "zreb" && !(p >= 1)) { toast("Koľko ľudí vyžrebovať? Aspoň jedného."); return; }
    if (!(d >= 1 && d <= 365)) { toast("Výzva trvá 1 až 365 dní."); return; }
    setPosiela(true);
    const od = Date.now();
    const v = await vyhlas({
      tvorca, stranka, nazov: nazov.trim(),
      podmienka: { typ, ...(typ === "darNad" ? { min: n } : {}), ...(typ === "skutok" && druh.trim() ? { druh: druh.trim() } : {}) },
      odmena: { typ: odmenaTyp, popis: popis.trim(), ...(odmenaTyp === "zreb" ? { pocet: p } : {}) },
      od, do: od + d * 86400000,
    });
    setPosiela(false);
    if (v) { toast("Výzva beží — účastníci pribúdajú sami"); onHotovo(); }
  };
  const volba = <T extends string>(hodnota: T, akt: T, set: (x: T) => void, text: string) => (
    <button key={hodnota} type="button" aria-pressed={hodnota === akt} onClick={() => set(hodnota)}
      style={{ minHeight: 40, padding: "6px 10px", borderRadius: RADIUS.pill, border: `1px solid ${hodnota === akt ? "var(--a-green)" : C.line}`, background: hodnota === akt ? tint("var(--a-green)", .12) : "transparent", color: "var(--ink)", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{text}</button>
  );
  return (
    <div style={{ ...karta, padding: SPACE.md }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>Nová výzva</div>
      <label style={stitok} htmlFor="vz-nazov">Názov</label>
      <input id="vz-nazov" style={pole} value={nazov} maxLength={120} onChange={(e) => setNazov(e.target.value)} placeholder="napr. Daruj krv v októbri" />
      <span style={stitok}>Čo treba spraviť</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {volba<PodmienkaTyp>("dar", typ, setTyp, "Akýkoľvek dar")}
        {volba<PodmienkaTyp>("darNad", typ, setTyp, "Dar aspoň …")}
        {volba<PodmienkaTyp>("skutok", typ, setTyp, "Overený skutok")}
        {volba<PodmienkaTyp>("cezMojQr", typ, setTyp, "Dar cez môj QR")}
      </div>
      {typ === "darNad" && <><label style={stitok} htmlFor="vz-min">Najmenší dar (€)</label>
        <input id="vz-min" style={pole} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value.replace(",", "."))} /></>}
      {typ === "skutok" && <><label style={stitok} htmlFor="vz-druh">Druh skutku (prázdne = hocijaký)</label>
        <input id="vz-druh" style={pole} value={druh} maxLength={40} onChange={(e) => setDruh(e.target.value)} placeholder="napr. Zdravie" /></>}
      <span style={stitok}>Kto dostane odmenu</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {volba<OdmenaTyp>("zreb", odmenaTyp, setOdmenaTyp, "Vyžrebovaní")}
        {volba<OdmenaTyp>("kazdemu", odmenaTyp, setOdmenaTyp, "Každý, kto splní")}
      </div>
      {odmenaTyp === "zreb" && <><label style={stitok} htmlFor="vz-pocet">Koľko výhercov</label>
        <input id="vz-pocet" style={pole} inputMode="numeric" value={pocet} onChange={(e) => setPocet(e.target.value)} /></>}
      <label style={stitok} htmlFor="vz-popis">Odmena (dávaš ju ty)</label>
      <input id="vz-popis" style={pole} value={popis} maxLength={160} onChange={(e) => setPopis(e.target.value)} placeholder="napr. vstupenka na koncert" />
      <label style={stitok} htmlFor="vz-dni">Trvanie (dni)</label>
      <input id="vz-dni" style={pole} inputMode="numeric" value={dni} onChange={(e) => setDni(e.target.value)} />
      <button type="button" disabled={posiela} onClick={() => void odosli()}
        style={{ marginTop: SPACE.md, width: "100%", minHeight: 46, borderRadius: RADIUS.sm, border: "none", background: "var(--a-green)", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: posiela ? "default" : "pointer", opacity: posiela ? .6 : 1 }}>
        {posiela ? "Vyhlasujem…" : "Vyhlásiť výzvu"}
      </button>
    </div>
  );
}

export function VyzvySheet({ tvorca, stranka, toast, onClose }: {
  tvorca: string; stranka?: string; toast: (m: string) => void; onClose: () => void;
}) {
  const vyzvy = useVyzvyTvorcu(tvorca);
  const [teraz] = useState(() => Date.now());
  const [nova, setNova] = useState(false);

  const riadok = (v: Vyzva) => {
    const mozeZrebovat = daSaZrebovat(v, teraz);
    const doKonca = doUzavierky(v, teraz);
    const stav = v.zreb ? "VYŽREBOVANÉ"
      : v.stav === "zrusena" ? "ZRUŠENÁ"
      : bezi(v, teraz) ? "BEŽÍ" : "PO UZÁVIERKE";
    const farba = v.zreb ? "var(--a-gold)" : v.stav === "zrusena" ? C.textTer
      : bezi(v, teraz) ? "var(--a-green)" : "var(--a-clay)";

    return (
      <div key={v.id} style={karta}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {v.nazov}
          </div>
          <span style={cip(farba)}>{stav}</span>
        </div>

        <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2, lineHeight: 1.5 }}>
          Podmienka: {popisPodmienky(v.podmienka)}<br />
          Odmena: {v.odmena.popis} — {v.odmena.typ === "zreb" ? `${v.odmena.pocet ?? 1} vyžrebovaným` : "každému, kto splní"}
        </div>

        <div style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>
          {v.ucastnici.length} {v.ucastnici.length === 1 ? "účastník" : v.ucastnici.length < 5 ? "účastníci" : "účastníkov"}
          {" · "}do {datum(v.do)}
        </div>

        {v.zreb ? (
          <div style={{ marginTop: SPACE.xs, padding: SPACE.xs, borderRadius: RADIUS.xs, background: tint("var(--a-gold)", .1) }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--a-gold)" }}>
              Výhercovia: {v.zreb.vyherci.join(", ")}
            </div>
            {/* číslo bloku a hash sú tu preto, aby si žreb vedel ktokoľvek prepočítať */}
            <div style={{ fontSize: 10, color: C.textTer, marginTop: 2, wordBreak: "break-all", lineHeight: 1.45 }}>
              blok {v.zreb.blok} · {v.zreb.hash.slice(0, 24)}…
            </div>
          </div>
        ) : v.stav !== "zrusena" && (
          <div style={{ marginTop: SPACE.xs }}>
            {mozeZrebovat ? (
              <div {...pressable(async () => {
                const hotovo = await vyzrebuj(v.id);
                toast(hotovo?.zreb ? `Vyžrebované — ${hotovo.zreb.vyherci.length} ${hotovo.zreb.vyherci.length === 1 ? "výherca" : "výhercovia"}` : "Žrebovanie sa nepodarilo");
              }, "Vyžrebovať")}
                style={{ fontSize: 12.5, fontWeight: 800, color: "var(--a-green)", cursor: "pointer" }}>
                🎲 Vyžrebovať
              </div>
            ) : (
              <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.45 }}>
                Žrebovať sa dá až po uzávierke{doKonca ? ` — ${doKonca}` : ""}. Dovtedy môžu pribúdať účastníci.
              </div>
            )}
            {bezi(v, teraz) && (
              <span {...pressable(() => { void zrus(v.id).then(() => toast("Výzva zrušená")); }, "Zrušiť výzvu")}
                style={{ display: "inline-block", marginTop: SPACE.xs, fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>Zrušiť výzvu</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet onClose={onClose} label="Výzvy a žrebovanie">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🏆 Výzvy a žrebovanie</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Vyhlásiš, čo majú tvoji ľudia spraviť, a čo za to dostanú. Systém sám zistí,
        kto to splnil. Odmenu dávaš ty, nie <DeedZnacka />.
      </div>

      {nova
        ? <NovaVyzva tvorca={tvorca} stranka={stranka} toast={toast} onHotovo={() => setNova(false)} />
        : <button type="button" onClick={() => setNova(true)}
            style={{ width: "100%", minHeight: 46, marginBottom: SPACE.sm, borderRadius: RADIUS.sm, border: `1px dashed ${C.line}`, background: "transparent", color: "var(--a-green)", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
            + Vyhlásiť novú výzvu
          </button>}

      {vyzvy.map(riadok)}

      {!vyzvy.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ žiadna výzva.
        </div>
      )}
    </Sheet>
  );
}
