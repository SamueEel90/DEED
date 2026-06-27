import { useState, useEffect } from "react";
import { C, GRAD, GRAD_ZELENY } from "@/theme";
import { toast, Sheet, AvatarUroven, useScrollHore, useViac, useMotiv, useTvorbaGate, QrModal, IkonaMenu, IkonaNastavenia, IkonaSipVlavo, IkonaPenazenka, IkonaHviezda, IkonaFajka, IkonaDoska, IkonaUsmev, IkonaPin, IkonaSlnko, IkonaMesiac, IkonaStit, SkeletonRiadky, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { RetazDobraSheet } from "@/features/retaz/RetazDobra";
import { clearSession } from "@/lib/session";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Nastavenia as NotifNastavenia } from "@/features/notifikacie/Notifikacie";
import GlassIcons from "@/components/GlassIcons";
import type { Toast as ToastFn, WideProps, PrevodTuple, MojSkutokTuple, ZiadostPriatelstvo, CestaPriatelstva, RezimNastavenia } from "@/types";
import { useProfilPrevody, useProfilMojeSkutky, useProfilKarma, useProfilStatistiky } from "@/data";
import { TEMY } from "./mock";

/*
  ============================================================
  MODUL PROFIL — port z deed_prototype.html
  profil (karma, úrovne) → peňaženka / moje skutky / štatistiky
  / priatelia / nastavenia
  ============================================================
*/

type ProfilProps = WideProps & { walletReq?: number };

export default function ModulProfil({ wide, walletReq = 0 }: ProfilProps) {
  const [screen, setScreen] = useState("profil"); // profil | wallet | sub | nastavenia | notif
  const [subNazov, setSubNazov] = useState<string | null>(null);

  // pri prepnutí obrazovky odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  // ☰ menu → Peňaženka: otvor peňaženku (walletReq sa zvýši pri kliknutí)
  useEffect(() => { if (walletReq) setScreen("wallet"); }, [walletReq]);

  const sub = (n: string) => { setSubNazov(n); setScreen("sub"); };
  const obal = (el: React.ReactNode) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;

  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "profil" && obal(<ProfilHlavny toast={toast} naWallet={() => setScreen("wallet")} naSub={sub} naNastavenia={() => setScreen("nastavenia")} naPriatelia={() => setScreen("priatelia")} />)}
      {screen === "wallet" && obal(<Penazenka toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "sub" && obal(<SubScreen nazov={subNazov} toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "priatelia" && obal(<PriateliaScreen toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "nastavenia" && obal(<NastaveniaScreen toast={toast} onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />)}
      {screen === "notif" && obal(
        <div style={{ paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
            <div onClick={() => setScreen("nastavenia")} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>
            <h3 style={{ fontSize: 17, margin: 0 }}>Notifikácie</h3>
          </div>
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column" }}><NotifNastavenia embedded toast={toast} /></div>
        </div>
      )}
      </ScreenSwitch>
    </div>
  );
}

// ===================== PROFIL =====================
type ProfilHlavnyProps = {
  toast: ToastFn;
  naWallet: () => void;
  naSub: (n: string) => void;
  naNastavenia: () => void;
  naPriatelia: () => void;
};

function ProfilHlavny({ toast, naWallet, naSub, naNastavenia, naPriatelia }: ProfilHlavnyProps) {
  const otvorViac = useViac();
  const ja = usePouzivatel();
  const dlazdice: [string, string, string, string, React.ReactNode, () => void][] = [
    ["Peňaženka", "1 240 DEED", "rgba(91,168,240,.14)", "var(--a-info)", <IkonaPenazenka size={26} />, naWallet],
    ["Karma a úrovne", "7 modulov", "rgba(169,139,240,.15)", "var(--a-plum)", <IkonaHviezda size={26} />, () => naSub("Karma a úrovne")],
    ["Moje skutky", "48 skutkov", "rgba(61,214,140,.13)", "var(--a-green)", <IkonaFajka size={26} />, () => naSub("Moje skutky")],
    ["Štatistiky", "umiestnenie", "rgba(61,214,206,.13)", "var(--a-teal)", <IkonaDoska size={24} />, () => naSub("Štatistiky a umiestnenie")],
    ["Priatelia", "nájdi známych", "rgba(231,199,102,.14)", "var(--a-gold)", <IkonaUsmev size={26} />, naPriatelia],
    ["Nastavenia", "vzhľad, jazyk", "rgba(154,160,168,.16)", C.textTer, <IkonaNastavenia size={26} />, naNastavenia],
  ];

  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px 10px" }}>
        <span onClick={otvorViac} title="Menu modulov" style={{ display: "flex", alignItems: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaMenu size={22} color={C.textSec} /></span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>Môj profil</span>
        <span onClick={naNastavenia} style={{ marginLeft: "auto", display: "flex", color: C.textSec, cursor: "pointer" }}><IkonaNastavenia size={19} color={C.textSec} /></span>
      </div>

      <div style={{ margin: "8px 16px 0", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
        <AvatarUroven ini={ja.iniciala} tint={ja.tint} tier={ja.tier} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{ja.celeMeno}</div>
          {ja.demo ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(231,199,102,.14)", border: "1px solid rgba(200,162,58,.5)", color: "var(--a-gold)", fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 9, marginTop: 6 }}>★ Gold</div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(231,199,102,.14)", border: "1px solid rgba(200,162,58,.5)", color: "var(--a-gold)", fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 9, marginTop: 6 }}>★ {String(ja.tier).replace(/\s*·\s*L\d+/, "")}{ja.poradoveCislo ? ` · člen #${ja.poradoveCislo}` : ""}</div>
          )}
          <div style={{ marginTop: 6 }}>
            <span style={{ display: "inline-flex", fontSize: 9.5, color: ja.rezim === "anonym" ? C.textTer : "var(--a-green)", background: ja.rezim === "anonym" ? "rgba(154,160,168,.14)" : "rgba(61,214,140,.13)", border: `1px solid ${ja.rezim === "anonym" ? "rgba(154,160,168,.4)" : "rgba(46,125,82,.45)"}`, padding: "3px 8px", borderRadius: 7, marginRight: 8 }}>{ja.rezim === "anonym" ? "anonym" : "verejný"}</span>
            <span onClick={naNastavenia} style={{ fontSize: 9.5, color: "var(--a-info)", cursor: "pointer" }}>zmeniť v nastaveniach</span>
          </div>
        </div>
      </div>

      {ja.demo ? (
        <div style={{ margin: "14px 16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textTer }}>
            <span>Do ďalšej úrovne (Platinum)</span><span style={{ color: "var(--a-gold)" }}>72 %</span>
          </div>
          <div style={{ height: 8, background: "rgba(var(--glass-rgb),.1)", borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
            <div style={{ height: "100%", width: "72%", background: "linear-gradient(90deg, #F0C75A, #F09A5E)", borderRadius: 4, boxShadow: "0 0 12px rgba(240,199,90,.4)" }} />
          </div>
        </div>
      ) : (
        <div style={{ margin: "14px 16px 0", fontSize: 12.5, color: C.textTer, lineHeight: 1.5 }}>
          {ja.mesto && ja.mesto !== "—" ? `${ja.mesto} · ` : ""}Nový účet — karma a úroveň pribúdajú overenými skutkami.
        </div>
      )}

      <div style={{ padding: 16 }}>
        <GlassIcons columns={3} items={dlazdice.map((d) => ({ icon: d[4], color: d[3], label: d[0], sub: d[1], onClick: d[5] }))} />
      </div>
    </div>
  );
}

// ===================== PEŇAŽENKA =====================
type PenazenkaProps = { toast: ToastFn; onBack: () => void };

function Penazenka({ toast, onBack }: PenazenkaProps) {
  const { data: PREVODY = [], isLoading, isError, refetch } = useProfilPrevody();
  const [honorar, setHonorar] = useState(false); // Reťaz dobra — Cesta B (honorár tvorcu)
  const prevody: PrevodTuple[] = PREVODY;
  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
        <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>
        <h3 style={{ fontSize: 17, margin: 0 }}>Peňaženka</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(150deg, rgba(91,155,255,.22), rgba(139,124,255,.16) 55%, rgba(67,224,200,.13))", border: "1px solid rgba(116,166,255,.35)", borderRadius: 20, padding: 18, boxShadow: "0 14px 40px rgba(0,0,0,.35), 0 0 36px rgba(91,124,255,.14), inset 0 1px 0 rgba(255,255,255,.12)" }}>
          <div style={{ position: "absolute", top: -50, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,124,255,.3), transparent 70%)", filter: "blur(28px)", pointerEvents: "none" }} />
          <div style={{ fontSize: 12, color: C.textSec }}>Zostatok</div>
          <div style={{ marginTop: 4 }}><span style={{ fontSize: 30, fontWeight: 800 }}>1 240</span> <span style={{ color: "#5B86FF", fontWeight: 800 }}>DEED</span></div>
          <div style={{ fontSize: 10, color: C.textTer, marginTop: 4 }}>≈ 62 € · Base L2 · ERC-4337</div>
        </div>

        {/* REŤAZOVÁ ČASŤ — akumulovaná oddelene, zamknutá (§5.2, §9) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, background: "rgba(31,191,143,.07)", border: "1px solid rgba(31,191,143,.25)", borderRadius: 15, padding: "12px 14px" }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,191,143,.14)", color: "var(--a-green)", fontSize: 18 }}>♻</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Reťazová časť · <span style={{ color: "var(--a-green)" }}>248 DEED</span> <span style={{ fontSize: 10, color: C.gold }}>🔒 zamknutá</span></div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>Odošle sa pri prahu 1000 DEED alebo o 30 dní</div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div style={{ fontSize: 9.5, color: C.textTer }}>Generosity</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>+142</div>
          </div>
        </div>

        {/* CESTA B — nastav reťaz na honorár (tvorca) */}
        <div onClick={() => setHonorar(true)} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.25)", borderRadius: 15, padding: "12px 14px", cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(91,155,255,.14)", color: "var(--a-info)", fontSize: 17 }}>⛓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Nastav reťaz na honorár</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>% z honoráru ide ďalej · QR pod video/knihu</div>
          </div>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[["↑", "Poslať", "rgba(61,214,140,.13)", "rgba(46,125,82,.5)", "var(--a-green)", "Poslať DEED (demo)"],
            ["↓", "Prijať", "rgba(91,168,240,.14)", "rgba(42,94,142,.5)", "var(--a-info)", "Prijať (demo)"],
            ["＋", "Kúpiť", "rgba(169,139,240,.15)", "rgba(122,91,216,.5)", "var(--a-plum)", "Kúpiť DEED (demo)"]].map((b, i) => (
            <div key={i} onClick={() => toast(b[5])} style={{ flex: 1, height: 58, borderRadius: 11, background: b[2], border: `1px solid ${b[3]}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: b[4] }}>{b[0]}</div>
              <div style={{ fontSize: 10, color: C.textTer, marginTop: 2 }}>{b[1]}</div>
            </div>
          ))}
        </div>

        <div style={sekciaLabel}>KÚPIŤ DEED</div>
        <div onClick={() => toast("Burza DEED/USDC (demo)")} style={subItem}><span>▣ Cez burzu (DEED/USDC)</span><span style={{ color: C.textTer }}>›</span></div>
        <div onClick={() => toast("Platba kartou (demo)")} style={subItem}><span>▢ Platobnou kartou</span><span style={{ color: C.textTer }}>›</span></div>

        <div style={sekciaLabel}>POSLEDNÉ PREVODY</div>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <SkeletonRiadky count={4} />
        ) : prevody.length === 0 ? (
          <EmptyState emoji="💸" title="Žiadne prevody" text="Tvoje DEED prevody sa zobrazia tu." />
        ) : (
          prevody.map((r, i) => (
            <div key={i} style={subItem}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", marginRight: 8, background: r[2] }} />{r[0]}</span>
              <span style={{ fontWeight: 700, color: r[2], flex: "none", marginLeft: 8 }}>{r[1]} DEED</span>
            </div>
          ))
        )}
      </div>

      {/* Reťaz dobra — Cesta B (§9): honorár tvorcu */}
      {honorar && (
        <RetazDobraSheet mode="honorar" odmena={0} titulOdkaz="Honorár"
          odkaz="https://deed.app/h/martin-k"
          onClose={() => setHonorar(false)}
          onDone={() => toast("Reťaz na honorár aktívna · QR pripravený")}
          toast={toast} />
      )}
    </div>
  );
}

// ===================== PODSTRÁNKY =====================
type SubScreenProps = { nazov: string | null; toast: ToastFn; onBack: () => void };

function SubScreen({ nazov, toast, onBack }: SubScreenProps) {
  const { data: MOJE_SKUTKY = [], isLoading: skutkyLoad, isError: skutkyErr, refetch: skutkyRefetch } = useProfilMojeSkutky();
  const { data: KARMA = [], isLoading: karmaLoad, isError: karmaErr, refetch: karmaRefetch } = useProfilKarma();
  const { data: STATISTIKY = [], isLoading: statLoad, isError: statErr, refetch: statRefetch } = useProfilStatistiky();
  const [retaz, setRetaz] = useState<{ odmena: number } | null>(null); // ručná Reťaz dobra pri menšom skutku {odmena}

  // aktívna sekcia → stavy načítania zoznamu
  const aktiv = nazov === "Moje skutky"
    ? { isLoading: skutkyLoad, isError: skutkyErr, refetch: skutkyRefetch, empty: MOJE_SKUTKY.length === 0, emoji: "✅", title: "Žiadne skutky", text: "Tvoje overené skutky sa zobrazia tu." }
    : nazov === "Karma a úrovne"
    ? { isLoading: karmaLoad, isError: karmaErr, refetch: karmaRefetch, empty: KARMA.length === 0, emoji: "⭐", title: "Žiadna karma", text: "Karma pribúda overenými skutkami." }
    : { isLoading: statLoad, isError: statErr, refetch: statRefetch, empty: STATISTIKY.length === 0, emoji: "📊", title: "Žiadne štatistiky", text: "Štatistiky a umiestnenie sa zobrazia tu." };

  let obsah: React.ReactNode;
  if (aktiv.isError) {
    obsah = <ErrorState onRetry={() => aktiv.refetch()} />;
  } else if (aktiv.isLoading) {
    obsah = <SkeletonRiadky count={4} />;
  } else if (aktiv.empty) {
    obsah = <EmptyState emoji={aktiv.emoji} title={aktiv.title} text={aktiv.text} />;
  } else if (nazov === "Moje skutky") {
    obsah = MOJE_SKUTKY.map((r, i) => (
      <div key={i} style={{ ...subItem, gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[0]}</span>
        <span onClick={() => setRetaz({ odmena: Math.abs(parseInt(r[1], 10)) || 30 })} title="Reťaz dobra — pošli časť ďalej"
          style={{ flex: "none", fontSize: 11, fontWeight: 700, color: "var(--a-green)", border: "1px solid rgba(31,191,143,.4)", background: "rgba(31,191,143,.08)", borderRadius: 9, padding: "4px 8px", cursor: "pointer" }}>♻ Reťaz</span>
        <span style={{ fontWeight: 700, color: r[2], flex: "none" }}>{r[1]}</span>
      </div>
    ));
  } else if (nazov === "Karma a úrovne") {
    obsah = KARMA.map((r, i) => (
      <div key={i} style={subItem}><span>{r[0]}</span><span style={{ fontWeight: 700, color: r[2] }}>{r[1]}</span></div>
    ));
  } else {
    obsah = STATISTIKY.map((r, i) => (
      <div key={i} style={subItem}><span>{r[0]}</span><span style={{ fontWeight: 700, color: r[2] }}>{r[1]}</span></div>
    ));
  }

  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
        <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>
        <h3 style={{ fontSize: 17, margin: 0 }}>{nazov}</h3>
      </div>
      <div style={{ padding: "0 16px" }}>{obsah}</div>

      {/* ručná Reťaz dobra pri menšom skutku (§9) */}
      {retaz && (
        <RetazDobraSheet odmena={retaz.odmena} mode="skutok" titulOdkaz="Tvoj skutok"
          onClose={() => setRetaz(null)}
          onDone={() => toast("Reťaz dobra spustená — časť ide ďalej")}
          toast={toast} />
      )}
    </div>
  );
}

// ===================== PRIDÁVANIE PRIATEĽA (§7) =====================
type PriateliaScreenProps = { toast: ToastFn; onBack: () => void };

function PriateliaScreen({ toast, onBack }: PriateliaScreenProps) {
  const { gate } = useTvorbaGate(); // pridávanie priateľa = iniciovanie vzťahu (create)
  const [qr, setQr] = useState<"pozvanka" | "osobny" | null>(null);
  const [ziadosti, setZiadosti] = useState<ZiadostPriatelstvo[]>([{ id: "p1", meno: "Peter K.", ini: "P", info: "3 spoloční priatelia" }]);
  const vybav = (id: string, ok: boolean) => { setZiadosti((z) => z.filter((x) => x.id !== id)); toast(ok ? "Priateľstvo prijaté — vzájomný súhlas" : "Žiadosť odmietnutá"); };

  const cesty: CestaPriatelstva[] = [
    ["📇", "Telefónne kontakty", "Nájdi známych, čo už majú DEED", "Čísla sa hashujú · GDPR súhlas · dá sa vypnúť", () => toast("Hľadám v kontaktoch (hashované, GDPR)…")],
    ["🔍", "Vyhľadávanie", "Len verejné profily a tvorcovia", "Súkromná osoba sa nedá nájsť (ochrana)", () => toast("Otvor lupu hore — hľadanie verejných profilov")],
    ["🔗", "Pozvánka odkazom / QR", "Aj pre tých, čo DEED ešte nemajú", "Akvizícia — vedie len na žiadosť o priateľstvo", () => setQr("pozvanka")],
    ["⚡", "Osobný QR (naživo)", "Naskenuj si telefóny pri stretnutí", "Rotujúci kód · vedie len na žiadosť", () => setQr("osobny")],
  ];

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
        <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>
        <h3 style={{ fontSize: 17, margin: 0 }}>Priatelia</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        {/* žiadosti o priateľstvo */}
        {ziadosti.length > 0 && (<>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "8px 0 8px" }}>ŽIADOSTI O PRIATEĽSTVO</div>
          {ziadosti.map((z) => (
            <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 11, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 13px", marginBottom: 9 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", flex: "none", background: "var(--a-plum)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>{z.ini}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{z.meno}</div><div style={{ fontSize: 11, color: C.textTer }}>{z.info}</div></div>
              <span onClick={() => vybav(z.id, true)} style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "#fff", background: GRAD, borderRadius: 10, padding: "7px 12px", cursor: "pointer" }}>Prijať</span>
              <span onClick={() => vybav(z.id, false)} style={{ flex: "none", fontSize: 12, fontWeight: 700, color: C.textSec, border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 10px", cursor: "pointer" }}>✕</span>
            </div>
          ))}
        </>)}

        {/* cesty pridania */}
        <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>AKO PRIDAŤ PRIATEĽA</div>
        {cesty.map((c, i) => (
          <div key={i} onClick={gate(c[4])} style={{ display: "flex", alignItems: "center", gap: 13, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 14px", marginBottom: 9, cursor: "pointer" }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(var(--glass-rgb),.06)" }}>{c[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c[1]}</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{c[2]}</div>
              <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 3 }}>{c[3]}</div>
            </div>
            <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
          </div>
        ))}

        {/* ochrana */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 6, padding: "11px 13px", borderRadius: 12, background: "rgba(91,155,255,.06)", border: "1px solid rgba(91,155,255,.2)" }}>
          🛡 QR/odkaz vedie <b>len na žiadosť o priateľstvo</b> — nie na otvorený profil ani skutky. Priateľstvo je vždy vzájomné (so súhlasom) a <b>neodomyká</b> súkromnú časť.
        </div>
      </div>

      {qr === "pozvanka" && <QrModal typ="skutok" titul="Pozvánka do DEED" popis="Vedie len na žiadosť o priateľstvo" odkaz="https://deed.app/pozvanka/martin-k" onClose={() => setQr(null)} toast={toast} />}
      {qr === "osobny" && <QrModal typ="identita" titul="Môj osobný QR" popis="Naživo · rotujúci · žiadosť o priateľstvo" odkaz="https://deed.app/u/martin-k" onClose={() => setQr(null)} toast={toast} />}
    </div>
  );
}

// ===================== NASTAVENIA (§12) =====================
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ width: 42, height: 25, borderRadius: 20, flex: "none", cursor: "pointer", padding: 3,
      background: on ? "linear-gradient(90deg,#1FBF8F,#5CE6B8)" : "rgba(var(--glass-rgb),.14)", transition: "background .2s ease" }}>
      <span style={{ display: "block", width: 19, height: 19, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.35)", transform: on ? "translateX(17px)" : "none", transition: "transform .2s ease" }} />
    </span>
  );
}

type NastaveniaScreenProps = { toast: ToastFn; onBack: () => void; onNotif: () => void };

function NastaveniaScreen({ toast, onBack, onNotif }: NastaveniaScreenProps) {
  const { svetly, prepni } = useMotiv();
  const [jazyk, setJazyk] = useState("SK");
  const [rezim, setRezim] = useState<RezimNastavenia>("verejny");  // verejný / anonym (§13.1 ochrana)
  const [uroven, setUroven] = useState(true);             // zobrazovať moju úroveň (dá sa skryť)
  const [gps, setGps] = useState(true);
  const [ochrana, setOchrana] = useState(false);          // §13.1 anti-sociálny kredit (modal)
  const [temy, setTemy] = useState<string[]>(["Šport", "Eko", "Zdravie", "Art"]);
  const toggleTema = (t: string) => setTemy((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t]);

  const Sekcia = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "18px 0 8px" }}>{children}</div>;
  const Riadok = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 8, fontSize: 14.5, cursor: onClick ? "pointer" : "default" }}>{children}</div>;

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
        <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>
        <h3 style={{ fontSize: 17, margin: 0 }}>Nastavenia</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        {/* VZHĽAD */}
        <Sekcia>VZHĽAD</Sekcia>
        <Riadok onClick={prepni}>
          <span style={{ flex: 1 }}>Téma</span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: "var(--a-info)" }}>{svetly ? <IkonaSlnko size={16} color="var(--a-info)" /> : <IkonaMesiac size={16} color="var(--a-info)" />} {svetly ? "Day" : "Dark"} ▾</span>
        </Riadok>
        <Riadok onClick={() => setJazyk((j) => j === "SK" ? "EN" : j === "EN" ? "Auto" : "SK")}>
          <span style={{ flex: 1 }}>Jazyk</span>
          <span style={{ fontWeight: 700 }}>{jazyk === "Auto" ? "Auto (podľa krajiny)" : jazyk} ▾</span>
        </Riadok>

        {/* SÚKROMIE A PROFIL */}
        <Sekcia>SÚKROMIE A PROFIL</Sekcia>
        <Riadok onClick={() => setRezim((r) => r === "verejny" ? "anonym" : "verejny")}>
          <span style={{ flex: 1 }}>Režim profilu</span>
          <span style={{ fontWeight: 700, color: rezim === "verejny" ? "var(--a-green)" : "var(--a-plum)" }}>{rezim === "verejny" ? "Verejný" : "Anonym"} ▾</span>
        </Riadok>
        <Riadok><span style={{ flex: 1 }}>Zobrazovať moju úroveň</span><Switch on={uroven} onClick={() => setUroven((u) => !u)} /></Riadok>
        <Riadok>
          <span style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}><IkonaPin size={16} color={C.textTer} /> Poloha (GPS)</span>
          <Switch on={gps} onClick={() => setGps((g) => !g)} />
        </Riadok>
        <Riadok onClick={() => setOchrana(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}><IkonaStit size={16} color="var(--a-green)" /> Ochrana osoby (anti-sociálny kredit)</span>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </Riadok>

        {/* NOTIFIKÁCIE → podobrazovka (§8.1) */}
        <Sekcia>NOTIFIKÁCIE</Sekcia>
        <Riadok onClick={onNotif}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}><IkonaNastavenia size={16} color={C.textTer} /> Nastavenie oznámení</span>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </Riadok>

        {/* MOJE TÉMY (vyňaté z filtra feedu) */}
        <Sekcia>MOJE TÉMY (ZÁUJMY)</Sekcia>
        <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.5, marginBottom: 10 }}>Záujmy ladia odporúčania — sú vyňaté z filtra feedu (feed ostáva pestrý mix).</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TEMY.map((t) => {
            const on = temy.includes(t);
            return <span key={t} onClick={() => toggleTema(t)} style={{ padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer",
              background: on ? "rgba(91,155,255,.14)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.5)" : C.line}`, color: on ? "var(--a-info)" : C.textSec }}>{on ? "✓ " : ""}{t}</span>;
          })}
        </div>

        {/* ÚČET */}
        <Sekcia>ÚČET</Sekcia>
        <Riadok onClick={() => toast("Zamestnávateľ (B2B) — odložené do B2B")}><span style={{ flex: 1 }}>Zamestnávateľ (B2B)</span><span style={{ color: C.textTer, fontWeight: 600 }}>Nenastavený ›</span></Riadok>
        <Riadok onClick={() => toast("Peňaženka a bezpečnosť — biometria/KYC až pri výbere hodnoty")}><span style={{ flex: 1 }}>Peňaženka a bezpečnosť</span><span style={{ color: C.textTer, fontSize: 16 }}>›</span></Riadok>
        <Riadok onClick={() => toast("O aplikácii · podpora")}><span style={{ flex: 1 }}>O aplikácii · podpora</span><span style={{ color: C.textTer, fontSize: 16 }}>›</span></Riadok>
        <button onClick={() => { toast("Odhlásené"); clearSession(); }} style={{ width: "100%", height: 50, borderRadius: 14, marginTop: 6, border: "1px solid rgba(242,112,111,.4)", background: "rgba(242,112,111,.08)", color: "var(--a-danger)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Odhlásiť sa</button>
      </div>

      {/* §13.1 — Ochrana osoby (anti-sociálny kredit) */}
      {ochrana && (
        <Sheet onClose={() => setOchrana(false)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(61,214,140,.14)" }}><IkonaStit size={19} color="var(--a-green)" /></span>
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>Ochrana osoby</div><div style={{ fontSize: 11.5, color: C.textTer }}>Opak sociálneho kreditu</div></div>
          </div>
          <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.55, margin: "0 0 12px" }}>
            Si vidieť len tak, ako chceš. Systém o tebe vie (aby si dostal odmeny), ale navonok ťa nikto nevie lustrovať. Voľba <b>verejný / anonym</b> je v sekcii vyššie.
          </p>
          {/* kontrolný náhľad */}
          <div style={{ background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.25)", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-info)", letterSpacing: ".3px" }}>KONTROLNÝ NÁHĽAD (napr. polícia)</div>
            {[["Karma", "jemne nad priemerom appky"], ["Skutky", "v norme komunity"], ["Dôveryhodnosť", "mierne nad priemerom"]].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", fontSize: 12.5, borderBottom: i < 2 ? `1px solid ${C.line2}` : "none" }}>
                <span style={{ color: C.textTer }}>{r[0]}</span><span style={{ fontWeight: 600, color: "var(--a-green)" }}>{r[1]}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.5, marginTop: 12 }}>
            Pri kontrole sa karta automaticky vyrovná „jemne nad priemer" — <b>nie je to vypínač</b>, takže sa nedá preukázať nízke skóre proti tebe. Princíp: <b style={{ color: C.text }}>za výšku odmena, za nulu nezničíme.</b>
          </div>
          <button onClick={() => setOchrana(false)} style={{ width: "100%", height: 48, borderRadius: 14, marginTop: 16, border: "none", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Rozumiem</button>
        </Sheet>
      )}
    </div>
  );
}

const spatBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 17 };
const subItem: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "15px 14px", marginBottom: 8, fontSize: 14.5 };
const sekciaLabel: React.CSSProperties = { fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" };
