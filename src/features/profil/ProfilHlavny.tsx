// KARTA 18 · Môj profil — hlavná obrazovka (prototyp „Moj profil.dc.html").
// Hlavička · karta identity · karta štítu · karma (len vlastník) · čísla · dlaždice 2 × 3 · Moje záujmy (10 oblastí).
// Bez L-úrovní, percent, emoji a anglických názvov štítov.
import { useState } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { usePersonalizacia } from "@/lib/personalizacia";
import { ZAUJMY_KATALOG } from "@/lib/personalizaciaStore";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { useViac } from "@/components/context";
import { StityRad, StitZoom } from "@/components/stit";
import { MOJE_STITY } from "@/lib/stityOblasti";
import { useVazbyOsoby } from "@/lib/zamestnanci";
import { ZvacsenaFotka } from "./MojQr";
import type { StitLevel } from "@/components/stit";
import { Harok } from "@/features/zbierka/Zdielat";
import { MOJA_KARMA, MOJE_SKUTKY_POCET } from "./mock";
import { useOsobnyProfil } from "@/lib/osobnyProfil";
import "@/styles/platba.css";
import { vetaStitu } from "@/features/zbierka/hlasky";

export const STIT_SK: Record<StitLevel, string> = { Bronze: "Bronzový", Silver: "Strieborný", Gold: "Zlatý", Platinum: "Platinový", Legend: "Legenda" };
const STIT_SUBOR: Record<StitLevel, string> = { Bronze: "bronze", Silver: "silver", Gold: "gold", Platinum: "platinum", Legend: "legend" };
/** kruh okolo avatara podľa štítu (Zlatý = z karty 18, ostatné v rovnakom duchu) */
const KRUH: Record<StitLevel, string> = {
  Bronze: "linear-gradient(135deg,#D6A77A,#8A5A33)", Silver: "linear-gradient(135deg,#E3E6EA,#98A1A9)",
  Gold: "linear-gradient(135deg,#E2C174,#A8842A)", Platinum: "linear-gradient(135deg,#F1F3F5,#AEB9C4)", Legend: "linear-gradient(135deg,#F3D97E,#B0781E)",
};
export const stitUzivatela = (demo: boolean): StitLevel => (demo ? "Gold" : "Bronze");

const Ik = ({ d, size = 19, farba = "currentColor" }: { d: string; size?: number; farba?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={farba} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);
const IK = {
  budova: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4",
  menu: "M4 7h16M4 12h16M4 17h16",
  kamera: "M4 8h3l2-3h6l2 3h3v11H4zM15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z",
  oko: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  ceruzka: "M4 20h4L19 9l-4-4L4 16z",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3M21 14v7h-7",
  zamok: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h.01",
  nastavenia: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  skutky: "M20 6 9 17l-5-5",
  priatelia: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  stity: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  stat: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  ozubene: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};
/** ikony oblastí záujmov (z prototypu) */
const IK_OBLAST: Record<string, string> = {
  Komunita: IK.priatelia,
  Hudba: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  Sport: "M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12",
  Zdravie: "M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z",
  Priroda: "M11 20A7 7 0 0 1 4 13c0-5 5-9 16-9 0 11-4 16-9 16zM4 20l8-8",
  Zvierata: "M11 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 11a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 12c-3 0-6 3.5-6 6 0 1.7 1.3 2.5 3 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-.8 3-2.5 0-2.5-3-6-6-6z",
  Art: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.3-1-1.5-1-2.5s.7-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11h.01M10 7h.01M15 7h.01",
  Ucenie: "M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM20 19v2H6",
  Pomoc: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6",
  Viera: "M12 2v6M9 5h6M5 22V12l7-4 7 4v10M9 22v-5h6v5",
};

const karta = { borderRadius: 24, background: "var(--card)", border: "1px solid var(--cardBd)" } as const;
const btn = { height: 46, borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 14.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", padding: "0 8px" } as const;

export type ProfilAkcie = {
  naWallet: () => void; naNastavenia: () => void; naPriatelia: () => void; naSub: (n: string) => void;
  naUpravit: () => void; naQr: () => void; naFirma: () => void;
};

/** karta identity (fotky sa menia len v Upraviť profil; ťuk na avatar fotku zväčší): titulná fotka, avatar so zlatým kruhom, meno, mesto, verejný/anonymný, Upraviť profil · Môj QR */
export function IdentitaKarta18({ naUpravit, naQr }: { naUpravit: () => void; naQr: () => void }) {
  const ja = usePouzivatel();
  const [fotka, setFotka] = useState(false);
  const [mojeFotky] = useFotkyEntity(klucEntity("ja", ja.ucetId || "demo"));
  const stit = stitUzivatela(!!ja.demo);
  const ini = `${(ja.meno || "?")[0]}${(ja.priezvisko || "")[0] ?? ""}`.toUpperCase();
  const osobny = useOsobnyProfil();
  const anonym = !osobny.verejny;
  const mesto = osobny.mesto || (ja.mesto && ja.mesto !== "—" ? ja.mesto : "");
  return (
    <div style={{ ...karta, overflow: "hidden" }}>
      <div aria-hidden="true" style={{ height: 150, background: mojeFotky.cover ? `url(${mojeFotky.cover}) center/cover` : "linear-gradient(135deg,#C9D5BC 0%,#DCD3BE 55%,#E2D7BF 100%)" }} />
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 14, marginTop: -38 }}>
          <button type="button" onClick={() => setFotka(true)} aria-label="Zväčšiť profilovú fotku"
            style={{ position: "relative", flex: "none", width: 84, height: 84, borderRadius: "50%", padding: 3, background: KRUH[stit], cursor: "pointer" }}>
            <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: ja.foto ? `url(${ja.foto}) center/cover` : "color-mix(in srgb, var(--a-green) 16%, var(--c-bg))", border: "3px solid var(--bg)", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "var(--gInk)", boxSizing: "border-box" }}>{ja.foto ? "" : ini}</span>
          </button>
          <div style={{ minWidth: 0, paddingTop: 50 }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ja.celeMeno}</div>
            {mesto && <div style={{ fontSize: 13.5, color: "var(--ink3)", marginTop: 2 }}>{mesto}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "var(--ink3)" }}>
          <Ik d={IK.oko} size={15} farba="var(--green)" />
          {anonym ? <span>Profil je <b style={{ color: "var(--gInk)" }}>anonymný</b> · pri daroch si Anonymný darca</span>
            : <span>Profil je <b style={{ color: "var(--gInk)" }}>verejný</b> · meno pri daroch vidia ostatní</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={naUpravit} style={btn}><Ik d={IK.ceruzka} size={15} />Upraviť profil</button>
          <button type="button" onClick={naQr} style={btn}><Ik d={IK.qr} size={15} />Môj QR</button>
        </div>
      </div>
      {fotka && <ZvacsenaFotka onClose={() => setFotka(false)} />}
    </div>
  );
}

/** karta štítu — zlaté pozadie, štít so žiarou, slovenský názov */
export function StitKarta18() {
  const ja = usePouzivatel();
  const stit = stitUzivatela(!!ja.demo);
  const veta = vetaStitu(stit, dniNaStite(!!ja.demo));
  const [zoom, setZoom] = useState(false);
  const oblasti = ja.demo ? MOJE_STITY : []; // karta 26: rad všetkých získaných štítov oblastí (vidia ich aj ostatní)
  return (
    <div style={{ position: "relative", borderRadius: 24, background: "var(--goldBg)", border: "1px solid var(--sek-oBd)", boxShadow: "var(--d-hl, none)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", color: "var(--d-ink, var(--ink))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button type="button" onClick={() => setZoom(true)} aria-label={`Zväčšiť ${STIT_SK[stit]} štít`} style={{ position: "relative", width: 132, height: 154, flex: "none", border: "none", background: "none", padding: 0, cursor: "zoom-in", boxShadow: "none" }}>
          <div className="pf-ziara" style={{ position: "absolute", left: "50%", top: "50%", width: 190, height: 190, margin: "-95px 0 0 -95px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,231,163,.85) 0%,rgba(246,183,60,.25) 40%,rgba(246,183,60,0) 70%)" }} />
          <img src={`/odznaky/${STIT_SUBOR[stit]}.png`} alt="" style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain" }} />
        </button>
        <div style={{ position: "relative", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--sek-o)" }}>ŠTÍT</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, color: "var(--d-ink, var(--ink))" }}>{STIT_SK[stit]}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))", marginTop: 4 }}>{veta}</div>
        </div>
      </div>
      {oblasti.length > 0 && <StityRad variant="profil" hlavny={stit} oblasti={oblasti} />}
      {zoom && <StitZoom level={stit} nazov={STIT_SK[stit]} popis={veta} onClose={() => setZoom(false)} />}
    </div>
  );
}

/** koľko dní je používateľ na terajšom štíte (lokálne, kým to nevráti server) */
function dniNaStite(demo: boolean): number {
  try {
    let od = Number(localStorage.getItem("deed.stit.od"));
    if (!od) { od = demo ? Date.now() - 40 * 86400000 : Date.now(); localStorage.setItem("deed.stit.od", String(od)); }
    return Math.floor((Date.now() - od) / 86400000);
  } catch { return 0; }
}

/** Moje záujmy — 10 oblastí v mriežke 2 × 5, ťuk → hárok (Celá oblasť + pod-položky) */
export function MojeZaujmy() {
  const { zaujmy, setZaujmy } = usePersonalizacia();
  const [otvorena, setOtvorena] = useState<string | null>(null);
  const vybrane = (o: string) => zaujmy.filter((z) => z.oblast === o).map((z) => z.pod_polozka);
  const cela = (o: string) => vybrane(o).includes("*");
  const nastav = (o: string, pod: string[]) => setZaujmy([...zaujmy.filter((z) => z.oblast !== o), ...pod.map((p) => ({ oblast: o, pod_polozka: p, vlastny: false }))]);
  const aktivne = ZAUJMY_KATALOG.filter((z) => vybrane(z.oblast).length).length;
  const o = otvorena ? ZAUJMY_KATALOG.find((z) => z.oblast === otvorena) ?? null : null;
  return (
    <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>Moje záujmy</span>
        <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{aktivne} z {ZAUJMY_KATALOG.length} oblastí</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)", marginTop: -6 }}>Podľa nich ti DEED skladá nástenku, pozvánky a ponuky z okolia. Feed skutkov ich nečíta.</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>
        {ZAUJMY_KATALOG.map((z) => {
          const v = vybrane(z.oblast), a = v.length > 0;
          const popis = cela(z.oblast) ? "celá oblasť" : a ? v.join(", ") : "nevybraté";
          return (
            <button key={z.oblast} type="button" onClick={() => setOtvorena(z.oblast)}
              style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 58, padding: "8px 10px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", background: a ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${a ? "var(--gBd)" : "var(--cardBd)"}` }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: a ? "#fff" : "var(--card)", color: a ? "var(--green)" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK_OBLAST[z.oblast] ?? IK.stity} size={17} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: a ? "var(--gInk)" : "var(--ink)" }}>{z.label}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{popis}</span>
              </span>
            </button>);
        })}
      </div>
      {o && (
        <Harok onClose={() => setOtvorena(null)} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{o.label}</span>}
          paticka={<button type="button" onClick={() => setOtvorena(null)} style={{ flex: 1, height: 54, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Hotovo</button>}>
          <div onClick={() => nastav(o.oblast, cela(o.oblast) ? [] : ["*"])} role="switch" aria-checked={cela(o.oblast)}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "8px 14px", borderRadius: 14, cursor: "pointer", background: cela(o.oblast) ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${cela(o.oblast) ? "var(--gBd)" : "var(--cardBd)"}` }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>Celá oblasť</span>
            <span style={{ width: 48, height: 28, borderRadius: 14, background: cela(o.oblast) ? "var(--green)" : "#C9C4B8", position: "relative", transition: "background .2s ease", flex: "none" }}>
              <span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transform: cela(o.oblast) ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {o.podpolozky.map((p) => {
              const on = cela(o.oblast) || vybrane(o.oblast).includes(p);
              return (
                <button key={p} type="button" onClick={() => {
                  const cur = cela(o.oblast) ? o.podpolozky.slice() : vybrane(o.oblast).slice();
                  const nx = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
                  nastav(o.oblast, nx.length === o.podpolozky.length ? ["*"] : nx);
                }} style={{ display: "flex", alignItems: "center", minHeight: 40, padding: "0 14px", borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink2)" }}>{p}</button>);
            })}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Vyber celú oblasť alebo len to, čo ťa naozaj zaujíma. Zmeniť to môžeš kedykoľvek.</div>
        </Harok>
      )}
    </div>
  );
}

/** hlavná obrazovka profilu (mobil) */
export function ProfilHlavny18(a: ProfilAkcie) {
  const otvorViac = useViac();
  const { sledovani, podpory } = usePersonalizacia();
  const ja = usePouzivatel();
  const firmy = useVazbyOsoby(ja.celeMeno);
  const firmaPod = firmy.some((v) => v.stav === "potvrdeny") ? firmy.filter((v) => v.stav === "potvrdeny").map((v) => v.firma).join(", ") : firmy.length ? "čaká na potvrdenie" : "prepoj sa s firmou";
  const dlazdice: [string, string, string, string, string, () => void][] = [
    ["Peňaženka", "1 240 DEED", IK.wallet, "var(--bSoft)", "var(--blue)", a.naWallet],
    ["Nastavenia", "vzhľad, súkromie", IK.nastavenia, "var(--card)", "var(--ink2)", a.naNastavenia],
    ["Moje skutky", `${MOJE_SKUTKY_POCET} skutkov`, IK.skutky, "var(--gSoft)", "var(--green)", () => a.naSub("Moje skutky")],
    ["Priatelia", "nájdi známych", IK.priatelia, "var(--bSoft)", "var(--blue)", a.naPriatelia],
    ["Karma a štíty", "štíty podľa oblastí", IK.stity, "var(--goldBg)", "var(--sek-o)", () => a.naSub("Karma a štíty")],
    ["Štatistiky", "tento mesiac +9", IK.stat, "var(--gSoft)", "var(--green)", () => a.naSub("Štatistiky")],
    ["Zamestnávateľ", firmaPod, IK.budova, "var(--sek-oBg)", "var(--sek-o)", a.naFirma],
  ];
  const pocty: [number, string][] = [[sledovani.length, "sledujem"], [podpory.length, "podporujem"], [MOJE_SKUTKY_POCET, "skutkov"]];
  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 56 }}>
        <button type="button" onClick={otvorViac} aria-label="Menu modulov" style={{ width: 44, height: 44, marginLeft: -10, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink2)" }}><Ik d={IK.menu} size={22} /></button>
        <span style={{ fontSize: 19, fontWeight: 800 }}>Môj profil</span>
        <button type="button" onClick={a.naNastavenia} aria-label="Nastavenia" style={{ marginLeft: "auto", marginRight: -8, width: 44, height: 44, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink2)" }}><Ik d={IK.ozubene} size={21} /></button>
      </div>
      <IdentitaKarta18 naUpravit={a.naUpravit} naQr={a.naQr} />
      <StitKarta18 />
      <button type="button" onClick={() => a.naSub("Karma a štíty")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.zamok} size={18} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>Tvoja karma · vidíš ju len ty</span>
          <span style={{ display: "block", fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{MOJA_KARMA.toLocaleString("sk-SK")}</span>
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)" }}>Detail ›</span>
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        {pocty.map(([n, l], i) => (
          <div key={l} style={{ padding: "12px 4px", textAlign: "center", borderLeft: i ? "1px solid var(--cardBd)" : "none" }}>
            <div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("sk-SK")}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{l}</div>
          </div>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {dlazdice.map(([t, s, ic, bg, c, onClick]) => (
          <button key={t} type="button" onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", minHeight: 104, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ic} /></span>
            <span><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{s}</span></span>
          </button>))}
      </div>
      <MojeZaujmy />
    </div>
  );
}

