// ============================================================
// VÝZVY A ŽREBOVANIE (správa tvorcu) — zatiaľ len prehľad a uzávierka.
//
// Motor (lib/vyzvy) vie celú logiku: podmienka → odmena → obdobie, zbieranie
// účastníkov a dokázateľný žreb. Čo tu ešte NIE JE: formulár na vyhlásenie
// výzvy, napojenie na overenie skutku a notifikácie výhercom.
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
  useVyzvyTvorcu, vyzrebuj, daSaZrebovat, doUzavierky, popisPodmienky, bezi,
  type Vyzva,
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

export function VyzvySheet({ tvorca, toast, onClose }: {
  tvorca: string; toast: (m: string) => void; onClose: () => void;
}) {
  const vyzvy = useVyzvyTvorcu(tvorca);
  const [teraz] = useState(() => Date.now());

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

      <div style={{ ...karta, background: tint("var(--a-info)", .08), border: `1px solid ${tint("var(--a-info)", .3)}`, fontSize: 11.5, lineHeight: 1.5 }}>
        <b>Rozrobené.</b> Vyhlásiť výzvu sa zatiaľ nedá kliknutím — chýba formulár,
        napojenie na overenie skutkov a upozornenia výhercom. Čo už funguje: zbieranie
        účastníkov, uzávierka a dokázateľný žreb.
      </div>

      {vyzvy.map(riadok)}

      {!vyzvy.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ žiadna výzva.
        </div>
      )}
    </Sheet>
  );
}
