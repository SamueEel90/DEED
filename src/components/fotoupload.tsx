// ============================================================
// DEED · FotoUpload — cover/avatar zo ZARIADENIA (spec ČASŤ B, §8).
// Mobil: galéria/fotoaparát · desktop: výber súboru + drag & drop.
// Súbor prejde cez spracujFotku (re-enkód → EXIF/GPS preč, orez na pomer,
// kontrola typu podľa obsahu, limit veľkosti). URL cesta ostáva ako
// doplnok u volajúceho — toto je primárna cesta „odfotím a mám cover".
// ============================================================
import { useRef, useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { spracujFotku, OBRAZOK_CFG } from "@/lib/obrazok";
import { toast } from "@/components/toast";
import { Foto } from "@/components/media";
import { IkonaFoto } from "@/components/icons";

export function FotoUpload({ value, onZmena, pomer = 16 / 9, vyska = 140 }: {
  value?: string;
  onZmena: (dataUrl: string) => void;
  /** pomer orezu (16/9 cover · 1 avatar) */
  pomer?: number;
  vyska?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tahanie, setTahanie] = useState(false);
  const [pracujem, setPracujem] = useState(false);

  async function spracuj(file?: File | null) {
    if (!file || pracujem) return;
    setPracujem(true);
    try {
      onZmena(await spracujFotku(file, { pomer }));
      toast("Fotka nahraná — EXIF/GPS odstránené");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nahranie fotky zlyhalo.");
    } finally {
      setPracujem(false);
    }
  }

  return (
    <div>
      {/* náhľad + drop zóna v jednom */}
      <div
        onDragOver={(e) => { e.preventDefault(); setTahanie(true); }}
        onDragLeave={() => setTahanie(false)}
        onDrop={(e) => { e.preventDefault(); setTahanie(false); void spracuj(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        role="button" aria-label="Nahrať fotku zo zariadenia" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        style={{ position: "relative", borderRadius: RADIUS.sm, overflow: "hidden", cursor: "pointer", border: `1.5px ${value ? "solid" : "dashed"} ${tahanie ? C.green : C.line}`, outline: tahanie ? `2px solid ${C.green}` : "none" }}
      >
        {value ? (
          <Foto src={value} emoji="🖼" h={vyska} radius={0} />
        ) : (
          <div style={{ height: vyska, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: SPACE.xs, color: C.textTer, background: "rgba(var(--glass-rgb),.04)" }}>
            <IkonaFoto size={22} color={C.textTer} />
            <div style={{ fontSize: 12, fontWeight: 700 }}>Klikni alebo pretiahni fotku sem</div>
            <div style={{ fontSize: 10.5 }}>JPG · PNG · WebP · HEIC — max {OBRAZOK_CFG.maxMB} MB</div>
          </div>
        )}
        {pracujem && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
            Spracúvam… (re-enkód + čistenie EXIF)
          </div>
        )}
        {value && !pracujem && (
          <span style={{ position: "absolute", bottom: 8, right: 8, display: "inline-flex", alignItems: "center", gap: SPACE.xxs, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(8,11,18,.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.18)", padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, pointerEvents: "none" }}>
            <IkonaFoto size={12} color="#fff" /> Zmeniť
          </span>
        )}
      </div>
      {/* iOS konvertuje HEIC→JPEG pri výbere sám; accept nechá prejsť aj .heic */}
      <input ref={inputRef} type="file" accept="image/*,.heic,.heif"
        onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; void spracuj(f); }}
        style={{ display: "none" }} />
    </div>
  );
}
