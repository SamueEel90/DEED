import { useState, useEffect } from "react";
import { SIRKA, C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { toast, Sheet, AvatarUroven, useScrollPamat, useViac, useMotiv, useLayout, useTvorbaGate, obalSiroky, QrModal, pressable, IkonaMenu, IkonaNastavenia, IkonaSipVlavo, IkonaSipDole, IkonaPenazenka, IkonaHviezda, IkonaFajka, IkonaDoska, IkonaUsmev, IkonaOsoba, IkonaPin, IkonaSlnko, IkonaMesiac, IkonaStit, SkeletonRiadky, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { RetazDobraSheet } from "@/features/retaz/RetazDobra";
import { IntroPruvodca } from "@/components/intro";
import { nacitajZostatok as nacitajZostatokDB, dobitPenazenku as dobitPenazenkuDB } from "@/lib/osobne";
import { MojaRetaz } from "@/features/retaz/MojaRetaz";
import { signOut } from "@/lib/auth";
import { qrUrl } from "@/lib/qr";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useVrstva } from "@/lib/urlnav";
import { usePersonalizacia } from "@/lib/personalizacia";
import { ZAUJMY_KATALOG } from "@/lib/personalizaciaStore";
import { Nastavenia as NotifNastavenia } from "@/features/notifikacie/Notifikacie";
import GlassIcons from "@/components/GlassIcons";
import type { Toast as ToastFn, WideProps, PrevodTuple, MojSkutokTuple, ZiadostPriatelstvo, CestaPriatelstva, RezimNastavenia } from "@/types";
import { useProfilPrevody, useProfilMojeSkutky, useProfilKarma, useProfilStatistiky } from "@/data";

/*
  ============================================================
  MODUL PROFIL — port z deed_prototype.html
  profil (karma, úrovne) → peňaženka / moje skutky / štatistiky
  / priatelia / nastavenia
  ============================================================
*/

type ProfilProps = WideProps & { walletReq?: number };

export default function ModulProfil({ wide, walletReq = 0 }: ProfilProps) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState("profil"); // profil | wallet | sub | nastavenia | notif
  const [subNazov, setSubNazov] = useState<string | null>(null);
  // pod-obrazovka = vrstva histórie → browser Back sa vráti na profil (nie von z appky)
  useVrstva(screen !== "profil", () => setScreen("profil"), screen);

  // pri prepnutí obrazovky odscrolluj appku hore
  useScrollPamat(screen); // pamäť scrollu — „Späť" obnoví pozíciu (nie skok hore)

  // ☰ menu → Peňaženka: otvor peňaženku (walletReq sa zvýši pri kliknutí)
  useEffect(() => { if (walletReq) setScreen("wallet"); }, [walletReq]);

  const sub = (n: string) => { setSubNazov(n); setScreen("sub"); };
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  // DESKTOP — profesionálny 2-panel layout: bočná navigácia (identita + sekcie) + obsahový panel
  if (desktop) return <ProfilDesktop screen={screen} subNazov={subNazov} setScreen={setScreen} onSub={sub} />;

  // MOBIL — pôvodný tok (dlaždice → pod-obrazovky cez ScreenSwitch)
  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "profil" && obal(<ProfilHlavny toast={toast} naWallet={() => setScreen("wallet")} naSub={sub} naNastavenia={() => setScreen("nastavenia")} naPriatelia={() => setScreen("priatelia")} />)}
      {screen === "wallet" && obal(<Penazenka toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "sub" && obal(<SubScreen nazov={subNazov} toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "priatelia" && obal(<PriateliaScreen toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "nastavenia" && obal(<NastaveniaScreen toast={toast} onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />)}
      {screen === "notif" && obal(<NotifObrazovka onBack={() => setScreen("nastavenia")} />)}
      </ScreenSwitch>
    </div>
  );
}

// ===================== DESKTOP — bočná navigácia + obsahový panel =====================
const PROFIL_NAV: { key: string; nazov?: string; label: string; ikona: React.ReactNode }[] = [
  { key: "profil", label: "Prehľad", ikona: <IkonaOsoba size={18} /> },
  { key: "wallet", label: "Peňaženka", ikona: <IkonaPenazenka size={18} /> },
  { key: "sub", nazov: "Karma a úrovne", label: "Karma a úrovne", ikona: <IkonaHviezda size={18} /> },
  { key: "sub", nazov: "Moje skutky", label: "Moje skutky", ikona: <IkonaFajka size={18} /> },
  { key: "sub", nazov: "Štatistiky a umiestnenie", label: "Štatistiky", ikona: <IkonaDoska size={18} /> },
  { key: "priatelia", label: "Priatelia", ikona: <IkonaUsmev size={18} /> },
  { key: "nastavenia", label: "Nastavenia", ikona: <IkonaNastavenia size={18} /> },
];

function ProfilDesktop({ screen, subNazov, setScreen, onSub }: { screen: string; subNazov: string | null; setScreen: (s: string) => void; onSub: (n: string) => void }) {
  const naNastavenia = () => setScreen("nastavenia");
  const jeAktivny = (it: (typeof PROFIL_NAV)[number]) => screen === it.key && (it.key !== "sub" || subNazov === it.nazov);

  let obsah: React.ReactNode;
  if (screen === "wallet") obsah = <Penazenka toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "sub") obsah = <SubScreen nazov={subNazov} toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "priatelia") obsah = <PriateliaScreen toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "nastavenia") obsah = <NastaveniaScreen toast={toast} desktop onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />;
  else if (screen === "notif") obsah = <NotifObrazovka desktop onBack={() => setScreen("nastavenia")} />;
  else obsah = (
    <div style={{ padding: `${SPACE.md}px ${SPACE.md}px ${SPACE.lg}px` }}>
      <h3 style={{ fontSize: 18, margin: `0 0 ${SPACE.gutter}px` }}>Prehľad</h3>
      <PrehladZaujmy />
    </div>
  );

  return (
    <div style={{ maxWidth: SIRKA.plocha, margin: "0 auto", padding: `${SPACE.md}px ${SPACE.md}px ${SPACE.lg}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `0 ${SPACE.xxs}px ${SPACE.gutter}px` }}>
        <span style={{ fontSize: 20, fontWeight: 800 }}>Môj profil</span>
      </div>
      <div style={{ display: "flex", gap: SPACE.lg, alignItems: "flex-start" }}>
        <aside style={{ width: 300, flex: "0 0 300px", minWidth: 0, position: "sticky", top: SPACE.md, display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <IdentitaKarta naNastavenia={naNastavenia} />
          <nav style={{ display: "flex", flexDirection: "column", gap: SPACE.xxs, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.xs }}>
            {PROFIL_NAV.map((it) => {
              const on = jeAktivny(it);
              return (
                <button key={it.label} onClick={() => (it.key === "sub" ? onSub(it.nazov!) : setScreen(it.key))}
                  style={{ display: "flex", alignItems: "center", gap: SPACE.sm, width: "100%", textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit",
                    borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, fontSize: 14, fontWeight: on ? 800 : 600,
                    background: on ? "color-mix(in srgb, var(--a-green) 16%, transparent)" : "transparent", color: on ? C.text : C.textSec, transition: "background .15s ease" }}>
                  <span style={{ display: "flex", color: on ? "var(--a-green)" : C.textTer }}>{it.ikona}</span>
                  {it.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <main style={{ flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.lg, overflow: "hidden", minHeight: 420 }}>
          {obsah}
        </main>
      </div>
    </div>
  );
}

function NotifObrazovka({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 8px" }}>
        {!desktop && <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>}
        <h3 style={{ fontSize: 17, margin: 0 }}>Notifikácie</h3>
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column" }}><NotifNastavenia embedded toast={toast} /></div>
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
  const dlazdice: [string, string, string, string, React.ReactNode, () => void][] = [
    ["Peňaženka", "1 240 DEED", "color-mix(in srgb, var(--a-info) 14%, transparent)", "var(--a-info)", <IkonaPenazenka size={26} />, naWallet],
    ["Karma a úrovne", "7 modulov", "rgba(169,139,240,.15)", "var(--a-plum)", <IkonaHviezda size={26} />, () => naSub("Karma a úrovne")],
    ["Moje skutky", "48 skutkov", "rgba(61,214,140,.13)", "var(--a-green)", <IkonaFajka size={26} />, () => naSub("Moje skutky")],
    ["Štatistiky", "umiestnenie", "rgba(61,214,206,.13)", "var(--a-teal)", <IkonaDoska size={24} />, () => naSub("Štatistiky a umiestnenie")],
    ["Priatelia", "nájdi známych", "rgba(231,199,102,.14)", "var(--a-gold)", <IkonaUsmev size={26} />, naPriatelia],
    ["Nastavenia", "vzhľad, jazyk", "rgba(154,160,168,.16)", C.textTer, <IkonaNastavenia size={26} />, naNastavenia],
  ];

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 10px" }}>
        <span onClick={otvorViac} title="Menu modulov" style={{ display: "flex", alignItems: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaMenu size={22} color={C.textSec} /></span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>Môj profil</span>
        <span onClick={naNastavenia} style={{ marginLeft: "auto", display: "flex", color: C.textSec, cursor: "pointer" }}><IkonaNastavenia size={19} color={C.textSec} /></span>
      </div>
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <div style={{ marginTop: SPACE.sm }}><IdentitaKarta naNastavenia={naNastavenia} /></div>
        <div style={{ marginTop: SPACE.md }}><PrehladZaujmy /></div>
      </div>
      <div style={{ padding: SPACE.md }}>
        <GlassIcons columns={3} items={dlazdice.map((d) => ({ icon: d[4], color: d[3], label: d[0], sub: d[1], onClick: d[5] }))} />
      </div>
    </div>
  );
}

// identita (avatar, úroveň, režim, progres) — zdieľaná mobilom (ProfilHlavny) aj desktopom (bočný panel)
function IdentitaKarta({ naNastavenia }: { naNastavenia: () => void }) {
  const ja = usePouzivatel();
  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.md, display: "flex", gap: SPACE.gutter, alignItems: "center" }}>
        <AvatarUroven ini={ja.iniciala} tint={ja.tint} tier={ja.tier} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{ja.celeMeno}</div>
          {ja.demo ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: SPACE.xxs, background: "rgba(231,199,102,.14)", border: "1px solid rgba(200,162,58,.5)", color: "var(--a-gold)", fontSize: 10, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, marginTop: SPACE.xs }}>★ Gold</div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: SPACE.xxs, background: "rgba(231,199,102,.14)", border: "1px solid rgba(200,162,58,.5)", color: "var(--a-gold)", fontSize: 10, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, marginTop: SPACE.xs }}>★ {String(ja.tier).replace(/\s*·\s*L\d+/, "")}{ja.poradoveCislo ? ` · člen #${ja.poradoveCislo}` : ""}</div>
          )}
          <div style={{ marginTop: SPACE.xs }}>
            <span style={{ display: "inline-flex", fontSize: 9.5, color: ja.rezim === "anonym" ? C.textTer : "var(--a-green)", background: ja.rezim === "anonym" ? "rgba(154,160,168,.14)" : "rgba(61,214,140,.13)", border: `1px solid ${ja.rezim === "anonym" ? "rgba(154,160,168,.4)" : "rgba(46,125,82,.45)"}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, marginRight: SPACE.xs }}>{ja.rezim === "anonym" ? "anonym" : "verejný"}</span>
            <span onClick={naNastavenia} style={{ fontSize: 9.5, color: "var(--a-info)", cursor: "pointer" }}>zmeniť v nastaveniach</span>
          </div>
        </div>
      </div>

      {ja.demo ? (
        <div style={{ marginTop: SPACE.gutter }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textTer }}>
            <span>Do ďalšej úrovne (Platinum)</span><span style={{ color: "var(--a-gold)" }}>72 %</span>
          </div>
          <div style={{ height: 8, background: "rgba(var(--glass-rgb),.1)", borderRadius: 4, overflow: "hidden", marginTop: SPACE.xs }}>
            <div style={{ height: "100%", width: "72%", background: "linear-gradient(90deg, #F0C75A, #F09A5E)", borderRadius: 4, boxShadow: "0 0 12px rgba(240,199,90,.4)" }} />
          </div>
        </div>
      ) : (
        <div style={{ marginTop: SPACE.gutter, fontSize: 12.5, color: C.textTer, lineHeight: 1.5 }}>
          {ja.mesto && ja.mesto !== "—" ? `${ja.mesto} · ` : ""}Nový účet — karma a úroveň pribúdajú overenými skutkami.
        </div>
      )}
    </div>
  );
}

// prehľad (sledujem / podporujem / záujmy) + accordion záujmov — zdieľaný mobilom aj desktopom
function PrehladZaujmy() {
  const { maZaujem, toggleZaujem, sledovani, podpory, zaujmy } = usePersonalizacia();
  const [otvorenaOblast, setOtvorenaOblast] = useState<string | null>(null);
  return (
    <>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        {[[String(sledovani.length), "sledujem"], [String(podpory.length), "podporujem"], [String(zaujmy.length), "záujmy"]].map((x, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px` }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{x[0]}</div>
            <div style={{ fontSize: 10, color: C.textTer, marginTop: SPACE.xxs }}>{x[1]}</div>
          </div>
        ))}
      </div>

      {/* TVOJE ZÁUJMY — accordion: kategória → detailné pod-položky (číselník z registrácie §6.2). */}
      <div style={{ marginTop: SPACE.md }}>
        <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "0 0 9px", textAlign: "center" }}>TVOJE ZÁUJMY</div>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
          {ZAUJMY_KATALOG.map((z) => {
            const otvor = otvorenaOblast === z.oblast;
            const vybrane = zaujmy.filter((x) => x.oblast === z.oblast);
            const celaOblast = vybrane.some((x) => x.pod_polozka === "*");
            const pocetPod = vybrane.filter((x) => x.pod_polozka !== "*").length;
            const aktiv = vybrane.length > 0;
            return (
              <div key={z.oblast} style={{ border: `1px solid ${aktiv ? "color-mix(in srgb, var(--a-info) 45%, transparent)" : C.line}`, borderRadius: RADIUS.md, overflow: "hidden", background: aktiv ? "color-mix(in srgb, var(--a-info) 7%, transparent)" : C.surface2, transition: "background .2s ease, border-color .2s ease" }}>
                <div {...pressable(() => setOtvorenaOblast(otvor ? null : z.oblast), `${z.label} — detail`)} aria-expanded={otvor} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
                  <span style={{ fontSize: 16 }}>{z.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: aktiv ? "var(--a-info)" : C.text }}>{z.label}</span>
                  {(celaOblast || pocetPod > 0) && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-info)", background: "color-mix(in srgb, var(--a-info) 15%, transparent)", borderRadius: RADIUS.pill, padding: `1px ${SPACE.xs}px` }}>{celaOblast ? "✓ celé" : `${pocetPod}`}</span>
                  )}
                  <span style={{ marginLeft: "auto", display: "flex", transform: otvor ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}><IkonaSipDole size={16} color={C.textTer} /></span>
                </div>
                {otvor && (
                  <div style={{ padding: `0 ${SPACE.gutter}px ${SPACE.sm}px`, display: "flex", flexWrap: "wrap", gap: SPACE.xxs }}>
                    <PodChip label="Celá oblasť" on={celaOblast} onClick={() => toggleZaujem(z.oblast)} />
                    {z.podpolozky.map((p) => (
                      <PodChip key={p} label={p} on={maZaujem(z.oblast, p)} onClick={() => toggleZaujem(z.oblast, p)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.sm, textAlign: "center" }}>Ladia odporúčania v „Okolí" a napĺňajú „Môj DEED". Vyňaté z filtra feedu — feed ostáva pestrý.</div>
      </div>
    </>
  );
}

// pod-chip v dropdowne záujmov — jedna pod-položka (výber = ladí feed + „Môj DEED")
function PodChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <span {...pressable(onClick, label)} aria-pressed={on} style={{
      padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.pill, fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
      background: on ? "color-mix(in srgb, var(--a-info) 16%, transparent)" : C.surface, border: `1px solid ${on ? "color-mix(in srgb, var(--a-info) 50%, transparent)" : C.line}`, color: on ? "var(--a-info)" : C.textSec,
    }}>{on ? "✓ " : ""}{label}</span>
  );
}

// ===================== PEŇAŽENKA =====================
type PenazenkaProps = { toast: ToastFn; onBack: () => void; desktop?: boolean };

function Penazenka({ toast, onBack, desktop }: PenazenkaProps) {
  const { data: PREVODY = [], isLoading, isError, refetch } = useProfilPrevody();
  const { podpory } = usePersonalizacia();
  const [honorar, setHonorar] = useState(false); // Reťaz dobra — Cesta B (honorár tvorcu)
  const [zostatok, setZostatok] = useState<number>(1240); // DEED zostatok (DB/localStorage) — načíta sa async
  const [dobit, setDobit] = useState(false);   // kúpiť DEED kartou (mock top-up)
  const [prijat, setPrijat] = useState(false); // prijať DEED = ukáž svoj QR
  useEffect(() => { let z = false; nacitajZostatokDB().then((v) => { if (!z) setZostatok(v); }); return () => { z = true; }; }, []);
  async function dobite(eur: number) {
    const deed = eur * 20;
    setDobit(false);
    const nove = await dobitPenazenkuDB(deed);   // kurz 1 € ≈ 20 DEED
    setZostatok(nove);
    toast(`Dobité +${deed.toLocaleString("sk")} DEED (${eur} € kartou) · demo bez reálnej platby`);
  }
  const prevody: PrevodTuple[] = PREVODY;
  // reálne odvodené z DB (Fáza D) — agregát „Čo podporujem". Zostatok peňaženky
  // (dole) je zatiaľ placeholder do event-sourced wallet/karma modelu.
  const darovaneDeed = podpory.filter((p) => (p.kanal || "DEED") !== "EUR").reduce((s, p) => s + (p.suma || 0), 0);
  const darovaneEur = podpory.filter((p) => p.kanal === "EUR").reduce((s, p) => s + (p.suma || 0), 0);
  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 8px" }}>
        {!desktop && <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>}
        <h3 style={{ fontSize: 17, margin: 0 }}>Peňaženka</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(150deg, color-mix(in srgb, var(--a-info) 22%, transparent), color-mix(in srgb, var(--a-plum) 16%, transparent) 55%, color-mix(in srgb, var(--a-teal) 13%, transparent))", border: "1px solid color-mix(in srgb, var(--a-info) 35%, transparent)", borderRadius: RADIUS.lg, padding: SPACE.md, boxShadow: "0 14px 40px rgba(0,0,0,.35), 0 0 36px color-mix(in srgb, var(--a-green) 14%, transparent), inset 0 1px 0 rgba(255,255,255,.12)" }}>
          <div style={{ position: "absolute", top: -50, right: -40, width: 160, height: 160, borderRadius: RADIUS.round, background: "radial-gradient(circle, color-mix(in srgb, var(--a-plum) 30%, transparent), transparent 70%)", filter: "blur(28px)", pointerEvents: "none" }} />
          <div style={{ fontSize: 12, color: C.textSec }}>Zostatok</div>
          <div style={{ marginTop: SPACE.xxs }}><span style={{ fontSize: 30, fontWeight: 800 }}>{zostatok.toLocaleString("sk")}</span> <span style={{ color: "#5B86FF", fontWeight: 800 }}>DEED</span></div>
          <div style={{ fontSize: 10, color: C.textTer, marginTop: SPACE.xxs }}>≈ {Math.round(zostatok / 20).toLocaleString("sk")} € · Base L2 · ERC-4337</div>
        </div>

        {/* DAROVANÉ SPOLU — reálne z DB (agregát podpôr „Čo podporujem") */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.sm, background: "color-mix(in srgb, var(--a-info) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 22%, transparent)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--a-info) 14%, transparent)", color: "var(--a-info)", fontSize: 18 }}>💚</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Darované spolu · <span style={{ color: "var(--a-info)" }}>{darovaneDeed} DEED{darovaneEur ? ` · ${darovaneEur} €` : ""}</span></div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{podpory.length} {podpory.length === 1 ? "podporená zbierka" : "podporených zbierok"} · z tvojej stopy</div>
          </div>
        </div>

        {/* REŤAZOVÁ ČASŤ — akumulovaná oddelene, zamknutá (§5.2, §9) */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.sm, background: "rgba(31,191,143,.07)", border: "1px solid rgba(31,191,143,.25)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,191,143,.14)", color: "var(--a-green)", fontSize: 18 }}>♻</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Reťazová časť · <span style={{ color: "var(--a-green)" }}>248 DEED</span> <span style={{ fontSize: 10, color: C.gold }}>🔒 zamknutá</span></div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>Odošle sa pri prahu 1000 DEED alebo o 30 dní</div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div style={{ fontSize: 9.5, color: C.textTer }}>Generosity</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>+142</div>
          </div>
        </div>

        {/* CESTA B — Moja reťaz (FRONTA honoráru, správca) */}
        <div onClick={() => setHonorar(true)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.sm, background: "color-mix(in srgb, var(--a-info) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 25%, transparent)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--a-info) 14%, transparent)", color: "var(--a-info)", fontSize: 17 }}>⛓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Moja reťaz · fronta honoráru</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>Zoradené zbierky · % ku každej · po naplnení sa QR prehodí ďalej</div>
          </div>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </div>

        <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.gutter }}>
          {([["↑", "Poslať", "rgba(61,214,140,.13)", "rgba(46,125,82,.5)", "var(--a-green)", () => toast("Poslať DEED — naskenuj QR príjemcu (podpora priamo z detailu príspevku)")],
            ["↓", "Prijať", "color-mix(in srgb, var(--a-info) 14%, transparent)", "rgba(42,94,142,.5)", "var(--a-info)", () => setPrijat(true)],
            ["＋", "Kúpiť", "rgba(169,139,240,.15)", "rgba(122,91,216,.5)", "var(--a-plum)", () => setDobit(true)]] as [string, string, string, string, string, () => void][]).map((b, i) => (
            <div key={i} {...pressable(b[5], b[1])} style={{ flex: 1, height: 58, borderRadius: RADIUS.sm, background: b[2], border: `1px solid ${b[3]}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: b[4] }}>{b[0]}</div>
              <div style={{ fontSize: 10, color: C.textTer, marginTop: SPACE.xxs }}>{b[1]}</div>
            </div>
          ))}
        </div>

        <div style={sekciaLabel}>KÚPIŤ DEED</div>
        <div onClick={() => toast("Burza DEED/USDC — príde s reálnym walletom (Fáza 5)")} style={subItem}><span>▣ Cez burzu (DEED/USDC)</span><span style={{ color: C.textTer }}>›</span></div>
        <div {...pressable(() => setDobit(true), "Kúpiť DEED platobnou kartou")} style={{ ...subItem, cursor: "pointer" }}><span>▢ Platobnou kartou</span><span style={{ color: C.textTer }}>›</span></div>

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
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: RADIUS.round, display: "inline-block", marginRight: SPACE.xs, background: r[2] }} />{r[0]}</span>
              <span style={{ fontWeight: 700, color: r[2], flex: "none", marginLeft: SPACE.xs }}>{r[1]} DEED</span>
            </div>
          ))
        )}
      </div>

      {/* Moja reťaz — FRONTA (§5.1) — nahrádza paralelný split viacerých zbierok pre tvorcu */}
      {honorar && <MojaRetaz onClose={() => setHonorar(false)} toast={toast} />}

      {/* dobitie kartou — mock top-up (reálna platba príde s walletom) */}
      {dobit && <DobitSheet onDobit={dobite} onClose={() => setDobit(false)} />}

      {/* prijať DEED = ukáž svoj osobný QR */}
      {prijat && <QrModal typ="identita" titul="Prijať DEED" popis="Ukáž QR — druhá strana ho naskenuje a pošle ti DEED"
        odkaz={qrUrl("handle", "martin-k")} onClose={() => setPrijat(false)} toast={toast} />}
    </div>
  );
}

// mock top-up sheet — výber sumy v €, pripíše DEED (kurz 1 € ≈ 20 DEED)
function DobitSheet({ onDobit, onClose }: { onDobit: (eur: number) => void; onClose: () => void }) {
  const [eur, setEur] = useState(20);
  return (
    <Sheet onClose={onClose} label="Kúpiť DEED kartou">
      <div style={{ fontSize: 15, fontWeight: 800 }}>▢ Kúpiť DEED kartou</div>
      <div style={{ fontSize: 12, color: C.textTer, marginTop: SPACE.xxs, marginBottom: SPACE.sm }}>Kurz 1 € ≈ 20 DEED · demo — karta sa nezaťaží</div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        {[10, 20, 50, 100].map((s) => (
          <button key={s} onClick={() => setEur(s)} style={{ flex: 1, padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, border: `1px solid ${eur === s ? "var(--a-green)" : C.line}`, background: eur === s ? "rgba(61,214,140,.12)" : C.surface, color: eur === s ? "var(--a-green)" : C.text }}>{s} €</button>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: C.textSec, marginTop: SPACE.sm }}>Dostaneš <b style={{ color: C.text }}>{(eur * 20).toLocaleString("sk")} DEED</b></div>
      <button onClick={() => onDobit(eur)} style={{ width: "100%", height: 48, marginTop: SPACE.sm, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 15, background: GRAD_ZELENY, color: "#06281d" }}>Zaplatiť {eur} € kartou</button>
    </Sheet>
  );
}

// ===================== PODSTRÁNKY =====================
type SubScreenProps = { nazov: string | null; toast: ToastFn; onBack: () => void; desktop?: boolean };

function SubScreen({ nazov, toast, onBack, desktop }: SubScreenProps) {
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
      <div key={i} style={{ ...subItem, gap: SPACE.xs }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[0]}</span>
        <span onClick={() => setRetaz({ odmena: Math.abs(parseInt(r[1], 10)) || 30 })} title="Reťaz dobra — pošli časť ďalej"
          style={{ flex: "none", fontSize: 11, fontWeight: 700, color: "var(--a-green)", border: "1px solid rgba(31,191,143,.4)", background: "rgba(31,191,143,.08)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px`, cursor: "pointer" }}>♻ Reťaz</span>
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
    <div style={{ paddingBottom: SPACE.gutter }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 8px" }}>
        {!desktop && <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>}
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
type PriateliaScreenProps = { toast: ToastFn; onBack: () => void; desktop?: boolean };

function PriateliaScreen({ toast, onBack, desktop }: PriateliaScreenProps) {
  const { gate } = useTvorbaGate(); // pridávanie priateľa = iniciovanie vzťahu (create)
  const ja = usePouzivatel();        // ucetId → reálny rotujúci token Identity Card (Fáza 3)
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
    <div style={{ paddingBottom: SPACE.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 8px" }}>
        {!desktop && <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>}
        <h3 style={{ fontSize: 17, margin: 0 }}>Priatelia</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        {/* žiadosti o priateľstvo */}
        {ziadosti.length > 0 && (<>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "8px 0 8px" }}>ŽIADOSTI O PRIATEĽSTVO</div>
          {ziadosti.map((z) => (
            <div key={z.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs }}>
              <div style={{ width: 40, height: 40, borderRadius: RADIUS.round, flex: "none", background: "var(--a-plum)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>{z.ini}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{z.meno}</div><div style={{ fontSize: 11, color: C.textTer }}>{z.info}</div></div>
              <span onClick={() => vybav(z.id, true)} style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "#fff", background: GRAD, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: "pointer" }}>Prijať</span>
              <span onClick={() => vybav(z.id, false)} style={{ flex: "none", fontSize: 12, fontWeight: 700, color: C.textSec, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: "pointer" }}>✕</span>
            </div>
          ))}
        </>)}

        {/* cesty pridania */}
        <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>AKO PRIDAŤ PRIATEĽA</div>
        {cesty.map((c, i) => (
          <div key={i} onClick={gate(c[4])} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
            <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(var(--glass-rgb),.06)" }}>{c[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c[1]}</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: SPACE.xxs }}>{c[2]}</div>
              <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs }}>{c[3]}</div>
            </div>
            <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
          </div>
        ))}

        {/* ochrana */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.xs, fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.xs, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "color-mix(in srgb, var(--a-info) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 20%, transparent)" }}>
          🛡 QR/odkaz vedie <b>len na žiadosť o priateľstvo</b> — nie na otvorený profil ani skutky. Priateľstvo je vždy vzájomné (so súhlasom) a <b>neodomyká</b> súkromnú časť.
        </div>
      </div>

      {qr === "pozvanka" && <QrModal typ="skutok" titul="Pozvánka do DEED" popis="Vedie len na žiadosť o priateľstvo" odkaz={qrUrl("handle", "martin-k")} onClose={() => setQr(null)} toast={toast} />}
      {qr === "osobny" && <QrModal typ="identita" titul="Môj osobný QR" popis="Naživo · rotujúci · žiadosť o priateľstvo" odkaz={qrUrl("handle", "martin-k")} eventId={ja.ucetId ?? undefined} onClose={() => setQr(null)} toast={toast} />}
    </div>
  );
}

// ===================== NASTAVENIA (§12) =====================
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ width: 42, height: 25, borderRadius: RADIUS.lg, flex: "none", cursor: "pointer", padding: 3,
      background: on ? "linear-gradient(90deg,#1FBF8F,#5CE6B8)" : "rgba(var(--glass-rgb),.14)", transition: "background .2s ease" }}>
      <span style={{ display: "block", width: 19, height: 19, borderRadius: RADIUS.round, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.35)", transform: on ? "translateX(17px)" : "none", transition: "transform .2s ease" }} />
    </span>
  );
}

type NastaveniaScreenProps = { toast: ToastFn; onBack: () => void; onNotif: () => void; desktop?: boolean };

function NastaveniaScreen({ toast, onBack, onNotif, desktop }: NastaveniaScreenProps) {
  const { svetly, prepni } = useMotiv();
  const [jazyk, setJazyk] = useState("SK");
  const [rezim, setRezim] = useState<RezimNastavenia>("verejny");  // verejný / anonym (§13.1 ochrana)
  const [uroven, setUroven] = useState(true);             // zobrazovať moju úroveň (dá sa skryť)
  const [gps, setGps] = useState(true);
  const [ochrana, setOchrana] = useState(false);          // §13.1 anti-sociálny kredit (modal)
  const [oAppke, setOAppke] = useState(false);            // O aplikácii · podpora
  const [ako, setAko] = useState(false);                  // sprievodca „Ako DEED funguje"

  const Sekcia = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "18px 0 8px" }}>{children}</div>;
  const Riadok = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, fontSize: 14.5, cursor: onClick ? "pointer" : "default" }}>{children}</div>;

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 8px" }}>
        {!desktop && <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>}
        <h3 style={{ fontSize: 17, margin: 0 }}>Nastavenia</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        {/* VZHĽAD */}
        <Sekcia>VZHĽAD</Sekcia>
        <Riadok onClick={prepni}>
          <span style={{ flex: 1 }}>Téma</span>
          <span style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontWeight: 700, color: "var(--a-info)" }}>{svetly ? <IkonaSlnko size={16} color="var(--a-info)" /> : <IkonaMesiac size={16} color="var(--a-info)" />} {svetly ? "Day" : "Dark"} ▾</span>
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
          <span style={{ display: "flex", alignItems: "center", gap: SPACE.xs, flex: 1 }}><IkonaPin size={16} color={C.textTer} /> Poloha (GPS)</span>
          <Switch on={gps} onClick={() => setGps((g) => !g)} />
        </Riadok>
        <Riadok onClick={() => setOchrana(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: SPACE.xs, flex: 1 }}><IkonaStit size={16} color="var(--a-green)" /> Ochrana osoby (anti-sociálny kredit)</span>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </Riadok>

        {/* NOTIFIKÁCIE → podobrazovka (§8.1) */}
        <Sekcia>NOTIFIKÁCIE</Sekcia>
        <Riadok onClick={onNotif}>
          <span style={{ display: "flex", alignItems: "center", gap: SPACE.xs, flex: 1 }}><IkonaNastavenia size={16} color={C.textTer} /> Nastavenie oznámení</span>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </Riadok>

        {/* ÚČET */}
        <Sekcia>ÚČET</Sekcia>
        <Riadok onClick={() => toast("Zamestnávateľ (B2B) — odložené do B2B")}><span style={{ flex: 1 }}>Zamestnávateľ (B2B)</span><span style={{ color: C.textTer, fontWeight: 600 }}>Nenastavený ›</span></Riadok>
        <Riadok onClick={() => toast("Peňaženka a bezpečnosť — biometria/KYC až pri výbere hodnoty")}><span style={{ flex: 1 }}>Peňaženka a bezpečnosť</span><span style={{ color: C.textTer, fontSize: 16 }}>›</span></Riadok>
        <Riadok onClick={() => setOAppke(true)}><span style={{ flex: 1 }}>O aplikácii · podpora</span><span style={{ color: C.textTer, fontSize: 16 }}>›</span></Riadok>
        <button onClick={() => { toast("Odhlásené"); void signOut(); }} style={{ width: "100%", height: 50, borderRadius: RADIUS.md, marginTop: SPACE.xs, border: "1px solid rgba(242,112,111,.4)", background: "rgba(242,112,111,.08)", color: "var(--a-danger)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Odhlásiť sa</button>
      </div>

      {/* §13.1 — Ochrana osoby (anti-sociálny kredit) */}
      {ochrana && (
        <Sheet onClose={() => setOchrana(false)}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
            <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(61,214,140,.14)" }}><IkonaStit size={19} color="var(--a-green)" /></span>
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>Ochrana osoby</div><div style={{ fontSize: 11.5, color: C.textTer }}>Opak sociálneho kreditu</div></div>
          </div>
          <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.55, margin: "0 0 12px" }}>
            Si vidieť len tak, ako chceš. Systém o tebe vie (aby si dostal odmeny), ale navonok ťa nikto nevie lustrovať. Voľba <b>verejný / anonym</b> je v sekcii vyššie.
          </p>
          {/* kontrolný náhľad */}
          <div style={{ background: "color-mix(in srgb, var(--a-info) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 25%, transparent)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-info)", letterSpacing: ".3px" }}>KONTROLNÝ NÁHĽAD (napr. polícia)</div>
            {[["Karma", "jemne nad priemerom appky"], ["Skutky", "v norme komunity"], ["Dôveryhodnosť", "mierne nad priemerom"]].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, fontSize: 12.5, borderBottom: i < 2 ? `1px solid ${C.line2}` : "none" }}>
                <span style={{ color: C.textTer }}>{r[0]}</span><span style={{ fontWeight: 600, color: "var(--a-green)" }}>{r[1]}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.sm }}>
            Pri kontrole sa karta automaticky vyrovná „jemne nad priemer" — <b>nie je to vypínač</b>, takže sa nedá preukázať nízke skóre proti tebe. Princíp: <b style={{ color: C.text }}>za výšku odmena, za nulu nezničíme.</b>
          </div>
          <button onClick={() => setOchrana(false)} style={{ width: "100%", height: 48, borderRadius: RADIUS.md, marginTop: SPACE.md, border: "none", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Rozumiem</button>
        </Sheet>
      )}

      {/* O aplikácii · podpora */}
      {oAppke && (
        <Sheet onClose={() => setOAppke(false)} label="O aplikácii">
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
            <span style={{ width: 44, height: 44, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: GRAD, color: "#fff", fontWeight: 800, fontSize: 20 }}>D⁺</span>
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>DEED — platforma dobra</div><div style={{ fontSize: 11.5, color: C.textTer }}>Skutky, nie reči.</div></div>
          </div>
          {([["Verzia", "pilot (pred-produkčná)"], ["Platby", "demo — žiadne reálne peniaze"], ["Komentáre", "nikdy (železné pravidlo)"]] as [string, string][]).map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, fontSize: 12.5, borderBottom: `1px solid ${C.line2}` }}>
              <span style={{ color: C.textTer }}>{r[0]}</span><span style={{ fontWeight: 600 }}>{r[1]}</span>
            </div>
          ))}
          <button onClick={() => { setOAppke(false); setAko(true); }} style={{ width: "100%", height: 48, borderRadius: RADIUS.md, marginTop: SPACE.md, border: "none", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Ako DEED funguje — sprievodca</button>
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center", marginTop: SPACE.sm, lineHeight: 1.5 }}>Spätnú väzbu a problémy nahlás cez vlajku 🚩 pri obsahu alebo autorovi projektu.</div>
        </Sheet>
      )}

      {/* sprievodca „Ako DEED funguje" (rovnaký ako pri prvom spustení) */}
      {ako && <IntroPruvodca onClose={() => setAko(false)} />}
    </div>
  );
}

const spatBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: RADIUS.round, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 17 };
const subItem: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.md}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, fontSize: 14.5 };
const sekciaLabel: React.CSSProperties = { fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" };
