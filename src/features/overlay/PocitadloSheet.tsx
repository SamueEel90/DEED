// ============================================================
// POČÍTADLO DO STREAMU — panel v appke, odkiaľ si tvorca zoberie odkaz.
// Sám overlay je na /overlay/:splitId; tu je len odkaz, náhľad a návod.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";

const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.sm,
};
const btnHlavny: CSSProperties = {
  width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer",
  fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "var(--a-green)", color: "#fff",
};

const kroky = (s: number, v: number) => [
  "V OBS klikni v paneli Zdroje na ＋",
  "Vyber Prehliadač (Browser Source)",
  "Vlož odkaz do poľa URL",
  `Šírka ${s}, výška ${v}`,
  "OK — počítadlo je v obraze",
];

export function PocitadloSheet({ splitId, nazov, toast, onClose }: {
  splitId: string; nazov?: string; toast: (m: string) => void; onClose: () => void;
}) {
  const [tema, setTema] = useState<"tmava" | "svetla">("tmava");
  const [orientacia, setOrientacia] = useState<"sirka" | "vyska">("sirka");
  const [strana, setStrana] = useState<"vpravo" | "vlavo">("vpravo");
  const [demo, setDemo] = useState(false);
  const zaklad = `${window.location.origin}/overlay/${splitId}`;
  const parametre = [
    tema === "tmava" ? "" : `tema=${tema}`,
    orientacia === "vyska" ? "orientacia=vyska" : "",
    orientacia === "vyska" && strana === "vlavo" ? "strana=vlavo" : "",
    demo ? "demo=1" : "",
  ].filter(Boolean).join("&");
  // rozmer zdroja v OBS sa líši podľa orientácie — inak si tvorca nastaví zlý
  const rozmer = orientacia === "vyska" ? { s: 420, v: 640 } : { s: 800, v: 200 };
  const odkaz = parametre ? `${zaklad}?${parametre}` : zaklad;

  const kopiruj = async () => {
    try { await navigator.clipboard.writeText(odkaz); toast("Odkaz skopírovaný — vlož ho v OBS do zdroja Prehliadač"); }
    catch { toast("Nepodarilo sa skopírovať — označ odkaz a skopíruj ručne"); }
  };

  return (
    <Sheet onClose={onClose} label="Počítadlo do streamu">
      <div style={{ fontSize: 16, fontWeight: 800 }}>📺 Počítadlo do streamu</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Pás s aktuálnou zbierkou, ktorý si vložíš do OBS. Vidno na ňom, koľko už prišlo cez tvoj QR
        a kto dal naposledy. Funguje na YouTube, Twitchi, Kicku aj TikToku — OBS ho vpečie do obrazu.
        {nazov ? <> Teraz ukazuje: <b style={{ color: C.text }}>{nazov}</b>.</> : null}
      </div>

      {/* odkaz */}
      <div style={karta}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer, marginBottom: 4 }}>ODKAZ</div>
        <div style={{ fontSize: 12, color: C.text, wordBreak: "break-all", lineHeight: 1.5, marginBottom: SPACE.xs }}>{odkaz}</div>
        <button style={btnHlavny} onClick={() => void kopiruj()}>Kopírovať odkaz</button>
      </div>

      {/* voľby */}
      <div style={karta}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: SPACE.xs }}>Ako to má stáť</div>
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
          {([["sirka", "Na šírku"], ["vyska", "Na výšku"]] as const).map(([k, l]) => (
            <div key={k} {...pressable(() => setOrientacia(k), l)}
              style={{ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, cursor: "pointer",
                fontSize: 12, fontWeight: 700,
                background: orientacia === k ? tint("var(--a-green)", .16) : "transparent",
                border: `1px solid ${orientacia === k ? tint("var(--a-green)", .5) : C.line}`,
                color: orientacia === k ? "var(--a-green)" : C.textSec }}>
              {l}
            </div>
          ))}
        </div>

        {orientacia === "vyska" && (<>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: SPACE.xs }}>Pri ktorom okraji</div>
          <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
            {([["vlavo", "Vľavo"], ["vpravo", "Vpravo"]] as const).map(([k, l]) => (
              <div key={k} {...pressable(() => setStrana(k), l)}
                style={{ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, cursor: "pointer",
                  fontSize: 12, fontWeight: 700,
                  background: strana === k ? tint("var(--a-green)", .16) : "transparent",
                  border: `1px solid ${strana === k ? tint("var(--a-green)", .5) : C.line}`,
                  color: strana === k ? "var(--a-green)" : C.textSec }}>
                {l}
              </div>
            ))}
          </div>
        </>)}

        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: SPACE.xs }}>Podklad pod textom</div>
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
          {([["tmava", "Na svetlé video"], ["svetla", "Na tmavé video"]] as const).map(([k, l]) => (
            <div key={k} {...pressable(() => setTema(k), l)}
              style={{ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, cursor: "pointer",
                fontSize: 12, fontWeight: 700,
                background: tema === k ? tint("var(--a-green)", .16) : "transparent",
                border: `1px solid ${tema === k ? tint("var(--a-green)", .5) : C.line}`,
                color: tema === k ? "var(--a-green)" : C.textSec }}>
              {l}
            </div>
          ))}
        </div>
        <div {...pressable(() => setDemo((d) => !d), "Skúšobný režim")}
          style={{ display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer" }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, flex: "none", display: "grid", placeItems: "center",
            border: `1px solid ${demo ? "var(--a-green)" : C.line}`, background: demo ? "var(--a-green)" : "transparent",
            color: "#fff", fontSize: 12, fontWeight: 800 }}>{demo ? "✓" : ""}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Skúšobný režim</div>
            <div style={{ fontSize: 10.5, color: C.textTer, lineHeight: 1.45 }}>
              Počítadlo si samo vymýšľa dary každých 5 sekúnd, aby si si v OBS nastavil miesto a veľkosť.
              Pred streamom ho vypni.
            </div>
          </div>
        </div>
      </div>

      {/* náhľad */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer, margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>
        NÁHĽAD
      </div>
      <div style={{ borderRadius: RADIUS.sm, overflow: "hidden", border: `1px solid ${C.line}`,
        background: "repeating-conic-gradient(rgba(255,255,255,.06) 0% 25%, transparent 0% 50%) 50% / 16px 16px" }}>
        <iframe title="Náhľad počítadla" src={parametre ? `${zaklad}?${parametre}` : `${zaklad}?demo=1`}
          style={{ width: "100%", height: orientacia === "vyska" ? 420 : 200, border: "none", display: "block" }} />
      </div>
      <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 4, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Kocky v pozadí sú len náhľad priehľadnosti — v streame tam bude tvoje video.
      </div>

      {/* návod */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>
        AKO TO DOSTAŤ DO OBS
      </div>
      <div style={karta}>
        {kroky(rozmer.s, rozmer.v).map((k, i) => (
          <div key={k} style={{ display: "flex", gap: SPACE.sm, alignItems: "flex-start", padding: `${SPACE.xs}px 0`,
            borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
              background: tint("var(--a-info)", .16), color: "var(--a-info)", fontSize: 11, fontWeight: 800 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>{k}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
