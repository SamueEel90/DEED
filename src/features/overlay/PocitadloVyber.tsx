// ============================================================
// POČÍTADLO DO STREAMU — výber, ktorý QR sa má počítať.
// Tvorca má QR-iek viac (každá s vlastným pomerom), a každá má vlastné
// počítadlo. Keď ešte žiadnu nemá, dá sa aspoň odskúšať vzhľad v OBS.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useQrSplitList } from "@/data";
import { PocitadloSheet } from "./PocitadloSheet";

const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer",
};

export function PocitadloVyberSheet({ toast, onClose }: {
  toast: (m: string) => void; onClose: () => void;
}) {
  const { ucetId } = usePouzivatel();
  const { data: splity = [], isLoading } = useQrSplitList(ucetId ?? null);
  const [vybrany, setVybrany] = useState<{ splitId: string; nazov?: string } | null>(null);

  if (vybrany) return (
    <PocitadloSheet splitId={vybrany.splitId} nazov={vybrany.nazov}
      toast={toast} onClose={() => setVybrany(null)} />
  );

  return (
    <Sheet onClose={onClose} label="Počítadlo do streamu">
      <div style={{ fontSize: 16, fontWeight: 800 }}>📺 Počítadlo do streamu</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Živý pás so zbierkou, ktorý si vložíš do OBS. Každý tvoj QR má vlastné počítadlo —
        ukazuje len to, čo prišlo cez ten jeden.
      </div>

      {isLoading ? (
        <div style={{ padding: SPACE.lg, textAlign: "center", color: C.textTer, fontSize: 13 }}>Načítavam…</div>
      ) : splity.length > 0 ? (
        splity.map((s) => (
          <div key={s.id} {...pressable(() => setVybrany({ splitId: s.slug, nazov: s.titul || undefined }), s.titul || "QR")}
            style={karta}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <span style={{ fontSize: 18, flex: "none" }}>{s.emoji || "🎬"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.titul || "Príspevok"}
                </div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>
                  {s.pocet} {s.pocet === 1 ? "dar" : s.pocet < 5 ? "dary" : "darov"} cez tento QR
                </div>
              </div>
              <span style={{ flex: "none", fontSize: 11.5, fontWeight: 800, color: "var(--a-info)" }}>Do streamu ›</span>
            </div>
          </div>
        ))
      ) : (
        <div style={{ ...karta, cursor: "default", background: tint("var(--a-info)", .08), border: `1px solid ${tint("var(--a-info)", .3)}` }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            Zatiaľ nemáš žiadny QR, takže počítadlo nemá čo počítať. Vzhľad a umiestnenie
            v OBS si ale vieš nastaviť už teraz — v skúšobnom režime si počítadlo vymýšľa dary samo.
          </div>
          <div {...pressable(() => setVybrany({ splitId: "skusobne" }), "Odskúšať v OBS")}
            style={{ marginTop: SPACE.xs, fontSize: 12.5, fontWeight: 800, color: "var(--a-info)", cursor: "pointer" }}>
            Odskúšať v OBS ›
          </div>
        </div>
      )}
    </Sheet>
  );
}
