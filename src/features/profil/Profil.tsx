import { useState, useEffect } from "react";
import { SIRKA, C, GRAD, SPACE, RADIUS } from "@/theme";
import { toast, StitRiadok, DozivotnyChip, useScrollPamat, useLayout, useTvorbaGate, obalSiroky, IkonaNastavenia, IkonaSipVlavo, IkonaPenazenka, IkonaHviezda, IkonaFajka, IkonaDoska, IkonaUsmev, IkonaOsoba, SkeletonRiadky, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { MojDeedFiremny } from "@/features/rola/MojDeedFiremny";
import { useVrstva } from "@/lib/urlnav";
import { Nastavenia as NotifNastavenia } from "@/features/notifikacie/Notifikacie";
import type { Toast as ToastFn, WideProps, ZiadostPriatelstvo, CestaPriatelstva } from "@/types";
import { useProfilKarma, useProfilStatistiky } from "@/data";
import { MODULOVA_KARMA, DOZIVOTNE_ZISKANE } from "./mock";
import { ProfilHlavny18, IdentitaKarta18, StitKarta18, MojeZaujmy } from "./ProfilHlavny";
import { UpravOsobnyProfil } from "./UpravOsobnyProfil";
import { MojQr } from "./MojQr";
import { Penazenka18 } from "./Penazenka18";
import { Nastavenia20 } from "./Nastavenia20";
import { MojeSkutky21 } from "./MojeSkutky21";

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
  const [qr, setQr] = useState(false); // Môj QR (karta 18 bod 4 príde samostatne)
  const [uprava, setUprava] = useState(false); // Upraviť profil (karta 18 bod 3)
  const upravaHarok = uprava && <UpravOsobnyProfil onClose={() => setUprava(false)} />;
  const qrModal = qr && <MojQr onClose={() => setQr(false)} />;
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  // DESKTOP — profesionálny 2-panel layout: bočná navigácia (identita + sekcie) + obsahový panel
  if (desktop) return <>{qrModal}{upravaHarok}<ProfilDesktop screen={screen} subNazov={subNazov} setScreen={setScreen} onSub={sub} onQr={() => setQr(true)} onUpravit={() => setUprava(true)} /></>;

  // MOBIL — pôvodný tok (dlaždice → pod-obrazovky cez ScreenSwitch)
  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "profil" && obal(<ProfilHlavny18 naWallet={() => setScreen("wallet")} naSub={sub} naNastavenia={() => setScreen("nastavenia")} naPriatelia={() => setScreen("priatelia")}
        naUpravit={() => setUprava(true)} naQr={() => setQr(true)} />)}
      {screen === "wallet" && obal(<Penazenka18 onBack={() => setScreen("profil")} />)}
      {screen === "firemny" && obalSiroky(<MojDeedFiremny onBack={() => setScreen("profil")} toast={toast} />, { wide, desktop, max: SIRKA.stlpec })}
      {screen === "sub" && (subNazov === "Moje skutky" ? <MojeSkutky21 onBack={() => setScreen("profil")} /> : obal(<SubScreen nazov={subNazov} toast={toast} onBack={() => setScreen("profil")} />))}
      {screen === "priatelia" && obal(<PriateliaScreen toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "nastavenia" && obal(<Nastavenia20 onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />)}
      {screen === "notif" && obal(<NotifObrazovka onBack={() => setScreen("nastavenia")} />)}
      </ScreenSwitch>
      {qrModal}{upravaHarok}
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

function ProfilDesktop({ screen, subNazov, setScreen, onSub, onQr, onUpravit }: { screen: string; subNazov: string | null; setScreen: (s: string) => void; onSub: (n: string) => void; onQr: () => void; onUpravit: () => void }) {
  const jeAktivny = (it: (typeof PROFIL_NAV)[number]) => screen === it.key && (it.key !== "sub" || subNazov === it.nazov);

  let obsah: React.ReactNode;
  if (screen === "wallet") obsah = <Penazenka18 desktop onBack={() => setScreen("profil")} />;
  else if (screen === "firemny") obsah = <MojDeedFiremny onBack={() => setScreen("profil")} toast={toast} />;
  else if (screen === "sub") obsah = subNazov === "Moje skutky" ? <MojeSkutky21 onBack={() => setScreen("profil")} /> : <SubScreen nazov={subNazov} toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "priatelia") obsah = <PriateliaScreen toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "nastavenia") obsah = <Nastavenia20 desktop onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />;
  else if (screen === "notif") obsah = <NotifObrazovka desktop onBack={() => setScreen("nastavenia")} />;
  else obsah = (
    <div style={{ padding: `${SPACE.md}px ${SPACE.md}px ${SPACE.lg}px` }}>
      <div className="deed-platba" style={{ display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)" }}>
        <StitKarta18 />
        <MojeZaujmy />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: SIRKA.plocha, margin: "0 auto", padding: `${SPACE.md}px ${SPACE.md}px ${SPACE.lg}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `0 ${SPACE.xxs}px ${SPACE.gutter}px` }}>
        <span style={{ fontSize: 20, fontWeight: 800 }}>Môj profil</span>
      </div>
      <div style={{ display: "flex", gap: SPACE.lg, alignItems: "flex-start" }}>
        <aside style={{ width: 300, flex: "0 0 300px", minWidth: 0, position: "sticky", top: SPACE.md, display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <div className="deed-platba" style={{ color: "var(--ink)" }}><IdentitaKarta18 naUpravit={onUpravit} naQr={onQr} /></div>
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
        <main style={{ flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.lg, overflow: "clip", minHeight: 420 }}>
          {obsah}
        </main>
      </div>
    </div>
  );
}

function NotifObrazovka({ onBack }: { onBack: () => void; desktop?: boolean }) {
  return <div style={{ minHeight: "100%" }}><NotifNastavenia onBack={onBack} /></div>;
}

type SubScreenProps = { nazov: string | null; toast: ToastFn; onBack: () => void; desktop?: boolean };

function SubScreen({ nazov, onBack, desktop }: SubScreenProps) {
  const { data: KARMA = [], isLoading: karmaLoad, isError: karmaErr, refetch: karmaRefetch } = useProfilKarma();
  const { data: STATISTIKY = [], isLoading: statLoad, isError: statErr, refetch: statRefetch } = useProfilStatistiky();

  // aktívna sekcia → stavy načítania zoznamu
  const aktiv = nazov === "Karma a úrovne"
    ? { isLoading: karmaLoad, isError: karmaErr, refetch: karmaRefetch, empty: KARMA.length === 0, emoji: "⭐", title: "Žiadna karma", text: "Karma pribúda overenými skutkami." }
    : { isLoading: statLoad, isError: statErr, refetch: statRefetch, empty: STATISTIKY.length === 0, emoji: "📊", title: "Žiadne štatistiky", text: "Štatistiky a umiestnenie sa zobrazia tu." };

  let obsah: React.ReactNode;
  if (aktiv.isError) {
    obsah = <ErrorState onRetry={() => aktiv.refetch()} />;
  } else if (aktiv.isLoading) {
    obsah = <SkeletonRiadky count={4} />;
  } else if (aktiv.empty) {
    obsah = <EmptyState emoji={aktiv.emoji} title={aktiv.title} text={aktiv.text} />;
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

      {/* modulová karma = hladké štíty so symbolom + doživotné badge ako textové
          chipy (DEED_Stity §2–§5) — žiadny progres/percentá, len štít + text */}
      {nazov === "Karma a úrovne" && (
        <div style={{ padding: "0 16px" }}>
          <div style={sekciaLabel}>MODULOVÉ ŠTÍTY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACE.xs }}>
            {MODULOVA_KARMA.map((m) => (
              <div key={m.symbol} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
                <StitRiadok level={m.level} trieda="modul" symbol={m.symbol} size={36} titul={m.titul ? `${m.titul} · ${m.label}` : m.label} />
              </div>
            ))}
          </div>
          {DOZIVOTNE_ZISKANE.length > 0 && (<>
            <div style={sekciaLabel}>DOŽIVOTNÉ OCENENIA</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs }}>
              {DOZIVOTNE_ZISKANE.map((id) => <DozivotnyChip key={id} id={id} />)}
            </div>
          </>)}
          <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.sm }}>
            Štíty aj ocenenia sú zaslúžené overenými skutkami — nedajú sa kúpiť a nikde neuvidíš percentá do ďalšieho stupňa.
          </div>
        </div>
      )}

    </div>
  );
}

// ===================== PRIDÁVANIE PRIATEĽA (§7) =====================
type PriateliaScreenProps = { toast: ToastFn; onBack: () => void; desktop?: boolean };

function PriateliaScreen({ toast, onBack, desktop }: PriateliaScreenProps) {
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

      {qr === "pozvanka" && <MojQr zalozka="pozvanka" onClose={() => setQr(null)} />}
      {qr === "osobny" && <MojQr zalozka="akcia" onClose={() => setQr(null)} />}
    </div>
  );
}

const spatBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: RADIUS.round, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 17 };
const subItem: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.md}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, fontSize: 14.5 };
const sekciaLabel: React.CSSProperties = { fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" };
