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
import { IkonaFoto } from "@/components/icons";

export function FotoUpload({ value, onZmena, pomer = 16 / 9, vyska = 140, maxSirka, tvar = "obdlznik" }: {
  value?: string;
  onZmena: (dataUrl: string) => void;
  /** pomer orezu (16/9 cover · 1 avatar) — náhľad drží ten istý pomer */
  pomer?: number;
  /** výška náhľadu, keď pomer neplatí (kruh = priemer) */
  vyska?: number;
  /** dlhšia strana po zmenšení (avatar = menší data-URL, viď AVATAR_SIRKA) */
  maxSirka?: number;
  /** tvar náhľadu: „kruh" = ako avatar · „stvorec" = ako logo v dlaždici ·
   *  „obdlznik" = pás v pomere `pomer` (cover) */
  tvar?: "obdlznik" | "kruh" | "stvorec";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tahanie, setTahanie] = useState(false);
  const [pracujem, setPracujem] = useState(false);

  async function spracuj(file?: File | null) {
    if (!file || pracujem) return;
    setPracujem(true);
    try {
      onZmena(await spracujFotku(file, { pomer, maxSirka }));
      toast("Fotka nahraná — EXIF/GPS odstránené");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nahranie fotky zlyhalo.");
    } finally {
      setPracujem(false);
    }
  }

  // Náhľad drží PRESNE ten pomer, na ktorý sa fotka oreže (a v akom sa zobrazí
  // na profile) — 16:9 cover, kruh pre avatar. Fixná `vyska` slúži už len ako
  // veľkosť kruhu / záloha, keď pomer nie je zadaný.
  const kruh = tvar === "kruh";
  const maly = kruh || tvar === "stvorec"; // pevný štvorec namiesto pásu cez celú šírku
  const ramStyl: React.CSSProperties = maly
    ? { width: vyska, height: vyska, borderRadius: kruh ? RADIUS.round : RADIUS.sm, margin: "0 auto" }
    : pomer ? { aspectRatio: `${pomer}`, borderRadius: RADIUS.sm } : { height: vyska, borderRadius: RADIUS.sm };

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
        style={{ position: "relative", overflow: "hidden", cursor: "pointer", border: `1.5px ${value ? "solid" : "dashed"} ${tahanie ? C.green : C.line}`, outline: tahanie ? `2px solid ${C.green}` : "none", ...ramStyl }}
      >
        {value ? (
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: SPACE.xs, textAlign: "center", padding: `0 ${SPACE.sm}px`, color: C.textTer, background: "rgba(var(--glass-rgb),.04)" }}>
            <IkonaFoto size={maly ? 18 : 22} color={C.textTer} />
            <div style={{ fontSize: maly ? 11 : 12, fontWeight: 700 }}>{maly ? "Nahrať fotku" : "Klikni alebo pretiahni fotku sem"}</div>
            {!maly && <div style={{ fontSize: 10.5 }}>JPG · PNG · WebP · HEIC — max {OBRAZOK_CFG.maxMB} MB</div>}
          </div>
        )}
        {pracujem && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
            Spracúvam… (re-enkód + čistenie EXIF)
          </div>
        )}
        {value && !pracujem && (
          // v kruhu sedí pilulka v strede dole (v rohu by ju orezal oblúk)
          <span style={{ position: "absolute", bottom: kruh ? 10 : 8, ...(kruh ? { left: "50%", transform: "translateX(-50%)" } : { right: 8 }), display: "inline-flex", alignItems: "center", gap: SPACE.xxs, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(8,11,18,.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.18)", padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, pointerEvents: "none", whiteSpace: "nowrap" }}>
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
