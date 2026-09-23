// ============================================================
// KARTA ZBIERKY — spoločný formulár pre centrálnu a sektorovú zbierku.
// Aby zbierka nebola suchý platobný modul, ale karta ako každá iná:
// galéria fotiek (s voľbou úvodnej), krátke video, názov a popis.
// ============================================================
import { useState, type CSSProperties, type ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { spracujFotku } from "@/lib/obrazok";
import { ulozVideoInfo, zmazVideo, jeVideo } from "@/lib/videoUloz";
import { MediaNahlad } from "./DokazBlok";
import { MilnikBar } from "@/components/milnikbar";
import { fotkyZbierky, uvodnaFotka, MAX_FOTIEK, VIDEO_SEKUND, type ProfilZbierky } from "./vlastneZbierky";

const ZELENA = "var(--a-green)";
export const vstup: CSSProperties = {
  width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`,
  borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 13.5, fontFamily: "inherit", outline: "none",
};
const pilulka: CSSProperties = {
  fontSize: 11.5, fontWeight: 800, cursor: "pointer", background: "rgba(0,0,0,.6)", color: "#fff",
  borderRadius: RADIUS.pill, padding: `${SPACE.xxs}px ${SPACE.sm}px`, border: "none", fontFamily: "inherit",
};

export function KartaZbierkyForm({ profil, zmen, logo, toast, deti, bar }: {
  profil: ProfilZbierky;
  zmen: (patch: Partial<ProfilZbierky>) => void;
  /** fallback obrázok, keď charita nedá vlastnú fotku (logo organizácie) */
  logo?: string;
  toast: (m: string) => void;
  /** doplnkové polia (napr. IBAN sektora) */
  deti?: ReactNode;
  /** míľnikový bar — karta je zároveň náhľadom, netreba ju ukazovať druhýkrát */
  bar?: ReactNode;
}) {
  const fotky = fotkyZbierky(profil);
  const uvodna = Math.min(profil.uvodna ?? 0, Math.max(0, fotky.length - 1));
  const [nahravam, setNahravam] = useState(false);

  const pridajFotky = async (files: FileList | null) => {
    if (!files?.length) return;
    const volne = MAX_FOTIEK - fotky.length;
    if (volne <= 0) { toast(`Viac než ${MAX_FOTIEK} fotiek nejde`); return; }
    setNahravam(true);
    const nove: string[] = [];
    for (const f of Array.from(files).slice(0, volne)) {
      try { nove.push(await spracujFotku(f, { pomer: 16 / 9, maxSirka: 1200 })); }
      catch (e) { toast((e as Error).message); }
    }
    setNahravam(false);
    if (nove.length) zmen({ fotky: [...fotky, ...nove], foto: undefined, uvodna });
    if (Array.from(files).length > volne) toast(`Pridal som ${volne} — viac než ${MAX_FOTIEK} fotiek nejde`);
  };
  const zmazFotku = (i: number) => {
    const zvysok = fotky.filter((_, x) => x !== i);
    zmen({ fotky: zvysok, foto: undefined, uvodna: uvodna >= zvysok.length ? Math.max(0, zvysok.length - 1) : uvodna > i ? uvodna - 1 : uvodna });
  };
  const nahrajVideo = async (files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    setNahravam(true);
    try { const v = await ulozVideoInfo(f, VIDEO_SEKUND); zmen({ video: v.ref }); }
    catch (e) { toast((e as Error).message); }
    setNahravam(false);
  };
  const zmazVideoZbierky = () => { if (profil.video) void zmazVideo(profil.video); zmen({ video: undefined }); };

  const titulna = uvodnaFotka(profil) ?? logo;

  return (
    <>
      {/* úvodná fotka */}
      <div style={{ position: "relative", borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${C.line}`, background: C.surface2, aspectRatio: "16 / 9", marginBottom: SPACE.xs }}>
        {titulna
          ? <img src={titulna} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uvodnaFotka(profil) ? 1 : .55 }} />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 34 }}>💛</div>}
        <span style={{ position: "absolute", left: SPACE.xs, top: SPACE.xs, fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", color: "#fff", background: "rgba(0,0,0,.55)", borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px` }}>
          {uvodnaFotka(profil) ? "ÚVODNÁ FOTKA" : "LOGO ORGANIZÁCIE"}
        </span>
        <div style={{ position: "absolute", right: SPACE.xs, bottom: SPACE.xs, display: "flex", gap: SPACE.xxs }}>
          <label style={pilulka}>
            {fotky.length ? "Pridať ďalšie" : "Pridať fotky"}
            <input type="file" accept="image/*" multiple hidden onChange={(e) => void pridajFotky(e.target.files)} />
          </label>
        </div>
      </div>

      {/* galéria — klik vyberie úvodnú */}
      {fotky.length > 0 && (
        <>
          <div style={{ display: "flex", gap: SPACE.xxs, overflowX: "auto", paddingBottom: 2, marginBottom: SPACE.xxs }}>
            {fotky.map((f, i) => (
              <div key={i} style={{ position: "relative", flex: "none" }}>
                <span {...pressable(() => zmen({ uvodna: i }), `Nastaviť ako úvodnú fotku ${i + 1}`)}
                  style={{ display: "block", width: 84, height: 48, borderRadius: RADIUS.xs, overflow: "hidden", cursor: "pointer",
                    border: `2px solid ${i === uvodna ? ZELENA : "transparent"}`, boxSizing: "border-box" }}>
                  <img src={f} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </span>
                <button type="button" onClick={() => zmazFotku(i)} aria-label={`Odstrániť fotku ${i + 1}`}
                  style={{ position: "absolute", right: 2, top: 2, width: 18, height: 18, lineHeight: "16px", textAlign: "center", borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 12, padding: 0 }}>×</button>
                {i === uvodna && (
                  <span style={{ position: "absolute", left: 2, bottom: 2, fontSize: 9, fontWeight: 800, color: "#06281d", background: ZELENA, borderRadius: RADIUS.pill, padding: "1px 5px" }}>ÚVODNÁ</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.textTer, marginBottom: SPACE.xs }}>
            Klikni na fotku, ktorá má byť úvodná. {fotky.length} / {MAX_FOTIEK} fotiek.
          </div>
        </>
      )}
      {!fotky.length && <div style={{ fontSize: 11, color: C.textTer, marginBottom: SPACE.xs }}>Bez fotky sa použije logo organizácie. Vlastné fotky z vašej práce chytia darcu viac.</div>}

      {/* video zbierky */}
      <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Video zbierky</div>
            <div style={{ fontSize: 11, color: C.textTer }}>Nepovinné · do {VIDEO_SEKUND} s. Tvár a hlas presvedčia viac než text.</div>
          </div>
          {profil.video
            ? <button type="button" onClick={zmazVideoZbierky} style={{ ...pilulka, background: C.surface, color: C.textSec, border: `1px solid ${C.line}` }}>Odstrániť</button>
            : <label style={{ ...pilulka, background: ZELENA, color: "#06281d" }}>
                Pridať video
                <input type="file" accept="video/*" hidden onChange={(e) => void nahrajVideo(e.target.files)} />
              </label>}
        </div>
        {profil.video && jeVideo(profil.video) && (
          <div style={{ borderRadius: RADIUS.xs, overflow: "hidden", marginTop: SPACE.xs }}>
            <MediaNahlad src={profil.video} popis="Video zbierky" ovladanie style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
          </div>
        )}
      </div>
      {nahravam && <div style={{ fontSize: 11.5, color: C.textSec, marginBottom: SPACE.xs }}>Spracúvam súbor…</div>}

      {/* názov + popis */}
      <input value={profil.nazov} onChange={(e) => zmen({ nazov: e.target.value })} maxLength={60}
        placeholder="Názov zbierky" style={{ ...vstup, fontWeight: 700, marginBottom: SPACE.xs }} />
      <textarea value={profil.popis} onChange={(e) => zmen({ popis: e.target.value })} maxLength={220} rows={3}
        placeholder="Na čo peniaze idú, keď darca nevyberá konkrétnu zbierku. Dve-tri vety."
        style={{ ...vstup, resize: "vertical" }} />
      <div style={{ fontSize: 10.5, color: C.textTer, textAlign: "right", marginTop: 2 }}>{profil.popis.length} / 220</div>

      {bar && <div style={{ marginTop: SPACE.sm }}>{bar}</div>}
      {deti}
    </>
  );
}

/** náhľad karty tak, ako ju uvidí darca vo feede */
export function NahladKarty({ profil, logo, vyzbierane, dolozene, ludia, sipka, dobrovolne }: {
  profil: ProfilZbierky; logo?: string; vyzbierane: number; dolozene: number; ludia?: number;
  /** centrálna zbierka — dokladovanie dobrovoľné (bonus k dôvere, nie povinnosť) */
  dobrovolne?: boolean;
  /** karta je rozbaľovacia (verejný profil) — šípka ako pri ostatných zbierkach */
  sipka?: "zavreta" | "otvorena";
}) {
  const titulna = uvodnaFotka(profil) ?? logo;
  const dalsie = Math.max(0, fotkyZbierky(profil).length - 1);
  return (
    <div style={{ background: C.surface2, border: `1px solid ${tint(ZELENA, .25)}`, borderRadius: RADIUS.md, overflow: "hidden" }}>
      {titulna && (
        <div style={{ position: "relative" }}>
          <img src={titulna} alt="" style={{ width: "100%", aspectRatio: "16 / 9", maxHeight: 280, objectFit: "cover", display: "block" }} />
          {(dalsie > 0 || profil.video) && (
            <span style={{ position: "absolute", right: SPACE.xs, bottom: SPACE.xs, fontSize: 11, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,.6)", borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px` }}>
              {profil.video ? "▶ video" : ""}{profil.video && dalsie > 0 ? " · " : ""}{dalsie > 0 ? `📷 +${dalsie}` : ""}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: SPACE.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 800 }}>{profil.nazov || "Bez názvu"}</div>
          {sipka && <span style={{ flex: "none", color: C.textTer, fontSize: 15, transform: sipka === "otvorena" ? "rotate(90deg)" : "none", transition: "transform .18s ease" }}>›</span>}
        </div>
        {profil.popis && <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.45, margin: `2px 0 ${SPACE.sm}px` }}>{profil.popis}</div>}
        <MilnikBar vyzbierane={vyzbierane} dolozene={dolozene} ludia={ludia} dobrovolne={dobrovolne} />
      </div>
    </div>
  );
}

/** galéria zbierky pre darcu — fotky a video pod platobným modulom */
export function GaleriaZbierky({ profil }: { profil: ProfilZbierky }) {
  const fotky = fotkyZbierky(profil);
  const [otvorena, setOtvorena] = useState<number | null>(null);
  if (fotky.length < 2 && !profil.video) return null;
  return (
    <div style={{ marginTop: SPACE.sm }}>
      {profil.video && jeVideo(profil.video) && (
        <div style={{ borderRadius: RADIUS.sm, overflow: "hidden", marginBottom: SPACE.xs }}>
          <MediaNahlad src={profil.video} popis="Video zbierky" ovladanie style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
        </div>
      )}
      {fotky.length > 1 && (
        <div style={{ display: "flex", gap: SPACE.xxs, overflowX: "auto" }}>
          {fotky.map((f, i) => (
            <span key={i} {...pressable(() => setOtvorena(otvorena === i ? null : i), `Fotka ${i + 1}`)}
              style={{ flex: "none", width: otvorena === i ? "100%" : 96, height: otvorena === i ? "auto" : 60, borderRadius: RADIUS.xs, overflow: "hidden", cursor: "pointer" }}>
              <img src={f} alt="" style={{ width: "100%", height: otvorena === i ? "auto" : "100%", objectFit: "cover", display: "block" }} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
