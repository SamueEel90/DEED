// ============================================================
// DEED · Upraviť profil subjektu (charita, tvorca, B2B)
// O nás (editor) · logo (tvar, vloženie, pozadie, kvalita, náhľady) · titulná fotka
// (kvalita, bezpečné zóny). Všetko je KONCEPT, kým sa neklikne „Uložiť profil".
// ============================================================
import { useRef, useState, type ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet } from "@/components/sheet";
import { FotoUpload } from "@/components/fotoupload";
import { OrezFotky } from "@/components/orezfotky";
import { RichTextInput } from "@/components/richtext";
import { cistyText } from "@/lib/richtext";
import { usePouzivatel } from "@/lib/pouzivatel";
import { AVATAR_SIRKA } from "@/lib/fotoprofilu";
import { spracujLogo, rozmeryFotky, LOGO_CFG, COVER_CFG, type LogoRezim, type LogoPozadie } from "@/lib/obrazok";
import { SUBJEKTY } from "./mock";
import { nacitajKontakt, SIETE, MAX_TEL, MAX_EMAIL, chybaSiete, chybaWebu, chybaEmailu, chybaTel, type Kontakt } from "./kontakt";
import { nacitajOnas, nacitajTvarLoga, ONAS_MAX, type Pozicia, type TvarLoga } from "./stav";

export interface ProfilZmeny { onas: string; logo: string | null; tvar: TvarLoga; cover: string | null; kontakt: Kontakt }

const Nadpis = ({ children }: { children: ReactNode }) => (
  <div style={{ fontSize: 10.5, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>{children}</div>
);

function Volba<T extends string>({ moznosti, value, onChange }: { moznosti: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: SPACE.xxs, marginBottom: SPACE.xs }}>
      {moznosti.map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
          style={{ flex: 1, height: 34, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${value === k ? "var(--a-info)" : C.line}`, background: value === k ? "var(--a-info)" : "transparent", color: value === k ? "#fff" : C.textSec }}>
          {label}
        </button>
      ))}
    </div>
  );
}

const vstup: React.CSSProperties = {
  width: "100%", minWidth: 0, height: 38, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`,
  background: "rgba(var(--glass-rgb),.05)", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const stitok: React.CSSProperties = { flex: "none", width: 78, fontSize: 12, fontWeight: 700, color: C.textSec };

const Pole = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ marginBottom: SPACE.xs }}>
    <div style={{ fontSize: 11, color: C.textTer, marginBottom: 3 }}>{label}</div>
    {children}
  </div>
);

function Riadok({ chyba, onZmaz, children }: { chyba?: string | null; onZmaz?: () => void; children: ReactNode }) {
  return (
    <div style={{ marginBottom: SPACE.xs }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
        {children}
        {onZmaz && (
          <button type="button" onClick={onZmaz} aria-label="Odstrániť"
            style={{ flex: "none", width: 32, height: 38, border: "none", background: "transparent", color: C.textTer, fontSize: 18, cursor: "pointer" }}>×</button>
        )}
      </div>
      {chyba && <div style={{ fontSize: 11, color: "var(--a-danger)", marginTop: 2 }}>{chyba}</div>}
    </div>
  );
}

const Pridat = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick}
    style={{ border: "none", background: "transparent", color: "var(--a-info)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: `2px 0 ${SPACE.xs}px`, fontFamily: "inherit" }}>
    {children}
  </button>
);

export function UpravProfilSheet({ pozicia, logo, cover, toast, onUloz, onClose }: {
  pozicia: Pozicia; logo: string | null; cover?: string | null; toast: (m: string) => void;
  onUloz: (z: ProfilZmeny) => void; onClose: () => void;
}) {
  const s = SUBJEKTY[pozicia];
  const ja = usePouzivatel();
  const maLogo = pozicia !== "tvorca"; // tvorca vystupuje pod vlastnou fotkou osoby

  const [povodne] = useState<ProfilZmeny>(() => ({ onas: nacitajOnas(pozicia) ?? s.onas, logo, tvar: nacitajTvarLoga(pozicia), cover: cover ?? null, kontakt: nacitajKontakt(pozicia) }));
  const [kontakt, setKontakt] = useState<Kontakt>(povodne.kontakt);
  const zmenK = (z: Partial<Kontakt>) => setKontakt((k) => ({ ...k, ...z }));
  const chybyKontaktu = [
    ...kontakt.telefony.map((t) => chybaTel(t.cislo)),
    ...kontakt.emaily.map((e) => chybaEmailu(e.adresa)),
    chybaWebu(kontakt.web),
    ...SIETE.map((x) => chybaSiete(x.k, kontakt.siete[x.k] ?? "")),
  ].filter(Boolean);
  const [onas, setOnas] = useState(povodne.onas);
  const [logoD, setLogoD] = useState<string | null>(logo);
  const [tvar, setTvar] = useState<TvarLoga>(povodne.tvar);
  const [coverD, setCoverD] = useState<string | null>(cover ?? null);
  const [foto, setFoto] = useState<string | null>(ja.foto ?? null);

  // logo: pôvodný súbor držíme, aby sa pri zmene vloženia/pozadia dal spracovať znova
  const [logoSubor, setLogoSubor] = useState<File | null>(null);
  const [rezim, setRezim] = useState<LogoRezim>("cele");
  const [pozadie, setPozadie] = useState<LogoPozadie>("biele");
  const [logoInfo, setLogoInfo] = useState<string | null>(null);
  const [pracujem, setPracujem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // titulka: vybraný súbor sa najprv otvorí vo výreze (posun, zoom, celá fotka)
  const [coverSubor, setCoverSubor] = useState<File | null>(null);
  const [coverInfo, setCoverInfo] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  async function vyberCover(f: File) {
    if (f.size > COVER_CFG.maxMB * 1024 * 1024) { toast(`Fotka má ${(f.size / 1024 / 1024).toFixed(1)} MB — limit je ${COVER_CFG.maxMB} MB.`); return; }
    try {
      const { w, h } = await rozmeryFotky(f);
      setCoverInfo(w < COVER_CFG.minSirka || h < COVER_CFG.minVyska
        ? `⚠ Fotka má ${w} × ${h} px — odporúčame aspoň ${COVER_CFG.minSirka} × ${COVER_CFG.minVyska} px, inak bude rozmazaná.`
        : `✓ ${w} × ${h} px — kvalita v poriadku`);
      setCoverSubor(f);
    } catch (e) { toast(e instanceof Error ? e.message : "Fotku sa nepodarilo načítať."); }
  }

  async function spracuj(f: File, r: LogoRezim, p: LogoPozadie) {
    setPracujem(true);
    try {
      const { w, h } = await rozmeryFotky(f);
      setLogoD(await spracujLogo(f, { rezim: r, pozadie: p }));
      setLogoInfo(Math.min(w, h) < LOGO_CFG.minPx && r === "vyplnit" || Math.max(w, h) < LOGO_CFG.minPx
        ? `⚠ Logo má ${w} × ${h} px — odporúčame aspoň ${LOGO_CFG.minPx} px, inak bude rozmazané.`
        : `✓ ${w} × ${h} px — kvalita v poriadku`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nahranie loga zlyhalo.");
    } finally { setPracujem(false); }
  }
  const zmenRezim = (r: LogoRezim) => { setRezim(r); if (logoSubor) void spracuj(logoSubor, r, pozadie); };
  const zmenPozadie = (p: LogoPozadie) => { setPozadie(p); if (logoSubor) void spracuj(logoSubor, rezim, p); };

  const dlhy = cistyText(onas).length > ONAS_MAX;
  const zmenene = JSON.stringify(kontakt) !== JSON.stringify(povodne.kontakt) || onas !== povodne.onas || logoD !== povodne.logo || tvar !== povodne.tvar
    || coverD !== povodne.cover || (!maLogo && foto !== (ja.foto ?? null));

  const uloz = () => {
    if (dlhy) { toast(`O nás je dlhšie ako ${ONAS_MAX} znakov — skráť ho.`); return; }
    if (chybyKontaktu.length) { toast("V kontakte je chyba — oprav červeno označené pole."); return; }
    if (!maLogo && foto !== (ja.foto ?? null)) ja.nastavFoto?.(foto);
    onUloz({ onas, logo: logoD, tvar, cover: coverD, kontakt: {
      ...kontakt,
      telefony: kontakt.telefony.filter((t) => t.cislo.trim()),
      emaily: kontakt.emaily.filter((e) => e.adresa.trim()),
    } });
    toast("Profil uložený");
    onClose();
  };

  const radius = tvar === "stvorec" ? "22%" : "50%";
  const nahlad = logoD ?? (maLogo ? null : foto);

  return (
    <Sheet onClose={onClose} label="Upraviť profil">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Upraviť profil</div>
      <div style={{ fontSize: 11.5, color: C.textTer }}>{s.nazov} · text, logo a titulná fotka</div>

      {/* ---- O NÁS ---- */}
      <Nadpis>O NÁS</Nadpis>
      <RichTextInput value={onas} maxZnakov={ONAS_MAX} minH={140}
        nastroje={["bold", "italic", "insertUnorderedList", "emoji"]}
        placeholder="Kto ste a komu pomáhate…" onChange={setOnas} />
      <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs, lineHeight: 1.45 }}>
        Prvé 3 riadky sa ukážu v hlavičke profilu, zvyšok pod „viac". Prvé dve vety nech povedia, kto ste.
      </div>

      {/* ---- LOGO / PROFILOVÁ FOTKA ---- */}
      {maLogo ? (
        <>
          <Nadpis>LOGO</Nadpis>
          <Volba moznosti={[["kruh", "◯ Kruh"], ["stvorec", "▢ Štvorec"]]} value={tvar} onChange={setTvar} />
          <Volba moznosti={[["cele", "Celé logo"], ["vyplnit", "Vyplniť (orez)"]]} value={rezim} onChange={zmenRezim} />
          {rezim === "cele" && (
            <Volba moznosti={[["biele", "Biele pozadie"], ["tmave", "Tmavé"], ["priehladne", "Priehľadné"]]} value={pozadie} onChange={zmenPozadie} />
          )}

          {/* náhľad v troch veľkostiach — ako logo naozaj uvidia ostatní */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: SPACE.md, padding: SPACE.sm, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs }}>
            {[[68, "Profil"], [40, "Feed"], [28, "Adresár"]].map(([px, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <span style={{ width: px as number, height: px as number, borderRadius: radius, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: C.surface, border: `1px solid ${C.line}`, fontSize: Math.round((px as number) * .36), fontWeight: 800, margin: "0 auto" }}>
                  {nahlad ? <img src={nahlad} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : s.iniciacky}
                </span>
                <div style={{ fontSize: 10, color: C.textTer, marginTop: 4 }}>{label}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={pracujem}
              style={{ height: 36, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.sm, border: "none", background: "var(--a-info)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              {pracujem ? "Spracúvam…" : logoD ? "Zmeniť logo" : "Nahrať logo"}
            </button>
          </div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) { setLogoSubor(f); void spracuj(f, rezim, pozadie); } }} />
          <div style={{ fontSize: 10.5, color: logoInfo?.startsWith("⚠") ? "var(--a-danger)" : C.textTer, lineHeight: 1.45 }}>
            {logoInfo ?? `PNG (ideálne priehľadné) · JPG · WebP — aspoň ${LOGO_CFG.minPx} × ${LOGO_CFG.minPx} px, max ${LOGO_CFG.maxMB} MB. Široké logo daj „Celé logo" — neoreže sa.`}
          </div>
          {logoD && (
            <button type="button" onClick={() => { setLogoD(null); setLogoSubor(null); setLogoInfo(null); }}
              style={{ width: "100%", height: 34, marginTop: SPACE.xs, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "transparent", color: C.textSec, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Odstrániť logo
            </button>
          )}
        </>
      ) : (
        <>
          <Nadpis>PROFILOVÁ FOTKA</Nadpis>
          <FotoUpload value={foto ?? undefined} onZmena={setFoto} pomer={1} vyska={130} maxSirka={AVATAR_SIRKA} tvar="kruh" minRozmer={{ w: LOGO_CFG.minPx, h: LOGO_CFG.minPx }} />
          <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs, lineHeight: 1.45 }}>Tvorca vystupuje pod vlastnou fotkou — tá istá ako v osobnom profile.</div>
        </>
      )}

      {/* ---- TITULNÁ FOTKA ---- */}
      <Nadpis>TITULNÁ FOTKA (16:9)</Nadpis>
      {coverSubor ? (
        <OrezFotky subor={coverSubor} pomer={16 / 9} zony
          onHotovo={(url) => { setCoverD(url); setCoverSubor(null); }}
          onZrusit={() => setCoverSubor(null)} />
      ) : (
        <div onClick={() => coverRef.current?.click()} role="button" aria-label="Nahrať titulnú fotku"
          style={{ position: "relative", aspectRatio: "16/9", borderRadius: RADIUS.sm, overflow: "hidden", cursor: "pointer", border: `1px solid ${C.line}` }}>
          {(coverD ?? s.cover) && <img src={coverD ?? s.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(8,11,18,.6)", borderRadius: RADIUS.xs, padding: "3px 8px" }}>📷 Nahrať novú</span>
        </div>
      )}
      <input ref={coverRef} type="file" accept="image/*,.heic,.heif" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) void vyberCover(f); }} />
      {coverInfo && <div style={{ fontSize: 10.5, marginTop: SPACE.xxs, color: coverInfo.startsWith("⚠") ? "var(--a-danger)" : "var(--a-green)" }}>{coverInfo}</div>}
      <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs, lineHeight: 1.45 }}>
        Aspoň {COVER_CFG.minSirka} × {COVER_CFG.minVyska} px, max {COVER_CFG.maxMB} MB. Do označených miest (logo, štít) nedávaj nič dôležité. Fotka bez textu vyzerá na mobile najlepšie.
      </div>
      {coverD && (
        <button type="button" onClick={() => setCoverD(null)}
          style={{ width: "100%", height: 34, marginTop: SPACE.xs, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "transparent", color: C.textSec, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Vrátiť pôvodnú titulnú fotku
        </button>
      )}

      {/* ---- KONTAKT — predvyplnený z registrácie, tu sa len mení a dopĺňa ---- */}
      <Nadpis>KONTAKT</Nadpis>
      <Pole label="Sídlo (z registrácie, overené cez IČO)">
        <div style={{ ...vstup, display: "flex", alignItems: "center", gap: 6, color: C.textSec, background: "rgba(var(--glass-rgb),.04)" }}>🔒 {kontakt.sidlo}</div>
      </Pole>
      <Pole label="Adresa pre verejnosť (ak sa líši od sídla — výdajňa, kancelária)">
        <input style={vstup} value={kontakt.adresaVerejna} placeholder="napr. Hviezdoslavova 12, Trenčín"
          onChange={(e) => zmenK({ adresaVerejna: e.target.value })} />
      </Pole>

      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 ${SPACE.xxs}px` }}>Telefóny <span style={{ fontWeight: 500, color: C.textTer }}>· číslo uvidí každý návštevník</span></div>
      {kontakt.telefony.map((t, i) => (
        <Riadok key={`t${i}`} chyba={chybaTel(t.cislo)} onZmaz={kontakt.telefony.length > 1 ? () => zmenK({ telefony: kontakt.telefony.filter((_, j) => j !== i) }) : undefined}>
          <input style={{ ...vstup, flex: 3 }} value={t.cislo} placeholder="+421 …" inputMode="tel"
            onChange={(e) => zmenK({ telefony: kontakt.telefony.map((x, j) => (j === i ? { ...x, cislo: e.target.value } : x)) })} />
          <input style={{ ...vstup, flex: 2 }} value={t.popis} placeholder="Kancelária"
            onChange={(e) => zmenK({ telefony: kontakt.telefony.map((x, j) => (j === i ? { ...x, popis: e.target.value } : x)) })} />
        </Riadok>
      ))}
      {kontakt.telefony.length < MAX_TEL && (
        <Pridat onClick={() => zmenK({ telefony: [...kontakt.telefony, { cislo: "", popis: "" }] })}>+ Pridať telefón</Pridat>
      )}

      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 ${SPACE.xxs}px` }}>E-maily</div>
      {kontakt.emaily.map((m, i) => (
        <Riadok key={`e${i}`} chyba={chybaEmailu(m.adresa)} onZmaz={kontakt.emaily.length > 1 ? () => zmenK({ emaily: kontakt.emaily.filter((_, j) => j !== i) }) : undefined}>
          <input style={{ ...vstup, flex: 3 }} value={m.adresa} placeholder="info@…" inputMode="email"
            onChange={(e) => zmenK({ emaily: kontakt.emaily.map((x, j) => (j === i ? { ...x, adresa: e.target.value } : x)) })} />
          <input style={{ ...vstup, flex: 2 }} value={m.popis} placeholder="napr. Zbierky"
            onChange={(e) => zmenK({ emaily: kontakt.emaily.map((x, j) => (j === i ? { ...x, popis: e.target.value } : x)) })} />
        </Riadok>
      ))}
      {kontakt.emaily.length < MAX_EMAIL && (
        <Pridat onClick={() => zmenK({ emaily: [...kontakt.emaily, { adresa: "", popis: "" }] })}>+ Pridať e-mail</Pridat>
      )}

      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSec, margin: `${SPACE.sm}px 0 ${SPACE.xxs}px` }}>Web a sociálne siete</div>
      <Riadok chyba={chybaWebu(kontakt.web)}>
        <span style={stitok}>Web</span>
        <input style={{ ...vstup, flex: 1 }} value={kontakt.web} placeholder="www.vasastranka.sk" inputMode="url"
          onChange={(e) => zmenK({ web: e.target.value })} />
      </Riadok>
      {SIETE.map((x) => (
        <Riadok key={x.k} chyba={chybaSiete(x.k, kontakt.siete[x.k] ?? "")}>
          <span style={stitok}>{x.label}</span>
          <input style={{ ...vstup, flex: 1 }} value={kontakt.siete[x.k] ?? ""} placeholder={`${x.domeny[0]}/…`} inputMode="url"
            onChange={(e) => zmenK({ siete: { ...kontakt.siete, [x.k]: e.target.value } })} />
        </Riadok>
      ))}

      {/* ---- ULOŽIŤ ---- */}
      <div style={{ position: "sticky", bottom: 0, paddingTop: SPACE.sm, paddingBottom: SPACE.sm, marginTop: SPACE.md, background: "var(--c-bg)", display: "flex", gap: SPACE.xs }}>
        <button type="button" onClick={onClose}
          style={{ flex: 1, height: 44, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "transparent", color: C.textSec, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          Zrušiť
        </button>
        <button type="button" onClick={uloz} disabled={!zmenene || dlhy || chybyKontaktu.length > 0}
          style={{ flex: 2, height: 44, borderRadius: RADIUS.sm, border: "none", background: zmenene && !dlhy && !chybyKontaktu.length ? "var(--a-green)" : "rgba(var(--glass-rgb),.15)", color: zmenene && !dlhy && !chybyKontaktu.length ? "#fff" : C.textTer, fontWeight: 800, fontSize: 14, cursor: zmenene && !dlhy && !chybyKontaktu.length ? "pointer" : "default", fontFamily: "inherit" }}>
          Uložiť profil
        </button>
      </div>
    </Sheet>
  );
}
