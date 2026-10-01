import { useState, useEffect } from "react";
import { MojeStranky, KonasAkoLista } from "./MojeStranky";
import type { Stranka } from "@/lib/mojeStranky";
import { ulozPoziciu, nacitajTypStranky, type TypStranky } from "@/features/rola/stav";
import { useVazbyOsoby } from "@/lib/zamestnanci";
import { useMojaFirma, dataFirmy } from "@/lib/mojaFirma";
import { usePouzivatel } from "@/lib/pouzivatel";
import { SIRKA, C, SPACE, RADIUS } from "@/theme";
import { toast, useScrollPamat, useLayout, obalSiroky, IkonaNastavenia, IkonaPenazenka, IkonaHviezda, IkonaFajka, IkonaDoska, IkonaUsmev, IkonaOsoba, ScreenSwitch } from "@/shared";
import { MojDeedFiremny } from "@/features/rola/MojDeedFiremny";
import { SpravaStranky } from "@/features/rola/SpravaStranky";
import { UKAZKOVE_STRANKY, cakaOtvorenieSpravy, zrusOtvorenieSpravy } from "@/lib/mojeStranky";
import { useVrstva } from "@/lib/urlnav";
import { Nastavenia as NotifNastavenia } from "@/features/notifikacie/Notifikacie";
import type { WideProps } from "@/types";
import { ProfilHlavny18, IdentitaKarta18, StitKarta18, MojeZaujmy, StatVSkratke, PoslednePohyby } from "./ProfilHlavny";
import { UpravitDlazdice, type Dlazdica } from "./Dlazdice";
import { RozpracovanySkutok, PrveKroky, Podakovania } from "./ProfilKarty";
import { UpravOsobnyProfil } from "./UpravOsobnyProfil";
import { MojQr } from "./MojQr";
import { Penazenka18 } from "./Penazenka18";
import { Nastavenia20 } from "./Nastavenia20";
import { KarmaStity } from "./KarmaStity";
import { Statistiky } from "./Statistiky";
import { Zamestnavatel, IK_BUDOVA } from "./Zamestnavatel";
import { MojeSkutky21 } from "./MojeSkutky21";
import { Priatelia, type PriateliaTab } from "./Priatelia";
import type { Oblast } from "@/lib/stityOblasti";
import { useDlazdice, type DlazdicaId } from "@/lib/dlazdice";
import { SpatTlacidlo } from "@/components/cesta";
import { useT } from "@/i18n";

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
  // KARTA 34: po registrácii charity sa otvorí rovno Správa charity
  const [screen, setScreen] = useState(() => (cakaOtvorenieSpravy() ? "sprava" : "profil")); // profil | wallet | sub | nastavenia | notif | sprava
  useEffect(() => { zrusOtvorenieSpravy(); }, []); // príznak platí len raz
  const [subNazov, setSubNazov] = useState<string | null>(null);
  // pod-obrazovka = vrstva histórie → browser Back sa vráti na profil (nie von z appky)
  useVrstva(screen !== "profil", () => setScreen("profil"), screen);

  // pri prepnutí obrazovky odscrolluj appku hore
  useScrollPamat(screen); // pamäť scrollu — „Späť" obnoví pozíciu (nie skok hore)

  // ☰ menu → Peňaženka: otvor peňaženku (walletReq sa zvýši pri kliknutí)
  useEffect(() => { if (walletReq) setScreen("wallet"); }, [walletReq]);

  const [skOblast, setSkOblast] = useState<Oblast | undefined>(undefined); // Moje skutky s filtrom oblasti (z detailu oblasti)
  // OPRAVY 75: Moje stránky → Spravovať = rolový panel danej stránky (nahrádza „Môj DEED+ firemný" v Charite)
  // KARTA 36: Spravovať → jedna správa s typom stránky (charita, firma, tvorca …); MojDeedFiremny ostáva, len sa sem neprepína
  const [stranka, setStranka] = useState<Stranka>(UKAZKOVE_STRANKY[0]);
  // typ správy: zo stránky, po registrácii z výberu typu organizácie (KARTA 36)
  const [typSpravy, setTypSpravy] = useState<TypStranky>(() => (cakaOtvorenieSpravy() ? nacitajTypStranky() ?? "charita" : "charita"));
  const spravovat = (s: Stranka) => { ulozPoziciu(s.pozicia); setStranka(s); setTypSpravy(s.typ); setScreen("sprava"); };
  const sprava = <SpravaStranky key={`${stranka.k}-${typSpravy}`} typ={typSpravy} strankaId={stranka.k} nazov={stranka.n} inicialy={stranka.i} onBack={() => setScreen("profil")} />;
  const sub = (n: string) => { setSubNazov(n); setSkOblast(undefined); setScreen("sub"); };
  const skutkyOblasti = (o: Oblast) => { setSubNazov("Moje skutky"); setSkOblast(o); setScreen("sub"); };
  const spatZoSkutkov = () => { if (skOblast) { setSkOblast(undefined); setSubNazov("Karma a štíty"); } else setScreen("profil"); };
  const [pTab, setPTab] = useState<PriateliaTab>("priatelia"); // KARTA 29: „sledujem / podporujem" v profile otvorí príslušnú záložku
  const priatelia = (t: PriateliaTab = "priatelia") => { setPTab(t); setScreen("priatelia"); };
  const [qr, setQr] = useState(false); // Môj QR (karta 18 bod 4 príde samostatne)
  const [uprava, setUprava] = useState(false); // Upraviť profil (karta 18 bod 3)
  const upravaHarok = uprava && <UpravOsobnyProfil onClose={() => setUprava(false)} />;
  const qrModal = qr && <MojQr onClose={() => setQr(false)} />;
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  // DESKTOP — profesionálny 2-panel layout: bočná navigácia (identita + sekcie) + obsahový panel
  if (desktop && screen === "sprava") return sprava;
  if (desktop) return <>{qrModal}{upravaHarok}<ProfilDesktop screen={screen} subNazov={subNazov} setScreen={setScreen} onSub={sub} onQr={() => setQr(true)} onUpravit={() => setUprava(true)} pTab={pTab} onPriatelia={priatelia} onStranka={spravovat} skOblast={skOblast} skutkyOblasti={skutkyOblasti} spatZoSkutkov={spatZoSkutkov} /></>;

  // MOBIL — pôvodný tok (dlaždice → pod-obrazovky cez ScreenSwitch)
  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "profil" && obal(<ProfilHlavny18 naWallet={() => setScreen("wallet")} naSub={sub} naNastavenia={() => setScreen("nastavenia")} naPriatelia={() => priatelia()} naPriatelia2={priatelia} naStranku={spravovat} naFirma={() => setScreen("firma")}
        naUpravit={() => setUprava(true)} naQr={() => setQr(true)} />)}
      {screen === "wallet" && obal(<Penazenka18 onBack={() => setScreen("profil")} />)}
      {screen === "sprava" && sprava}
      {screen === "firemny" && obalSiroky(<MojDeedFiremny onBack={() => setScreen("profil")} toast={toast} />, { wide, desktop, max: SIRKA.stlpec })}
      {screen === "sub" && (subNazov === "Moje záujmy" ? obal(<ZaujmyObrazovka onBack={() => setScreen("profil")} />) : subNazov === "Moje skutky" ? <MojeSkutky21 key={skOblast ?? "vsetky"} oblastStitu={skOblast} onBack={spatZoSkutkov} /> : subNazov === "Karma a štíty" ? obal(<KarmaStity naSkutky={skutkyOblasti} onBack={() => setScreen("profil")} />) : obal(<Statistiky onBack={() => setScreen("profil")} />))}
      {screen === "priatelia" && obal(<Priatelia tab={pTab} onBack={() => setScreen("profil")} />)}
      {screen === "firma" && obal(<Zamestnavatel onBack={() => setScreen("profil")} />)}
      {screen === "nastavenia" && obal(<Nastavenia20 onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} onUpravProfil={() => setUprava(true)} />)}
      {screen === "notif" && obal(<NotifObrazovka onBack={() => setScreen("nastavenia")} />)}
      </ScreenSwitch>
      {qrModal}{upravaHarok}
    </div>
  );
}

// ===================== DESKTOP — bočná navigácia + obsahový panel =====================
// OPRAVY 62: poradie a skryté položky podľa Upraviť dlaždice (rovnaké ako dlaždice v mobile)
const PROFIL_NAV: { id: DlazdicaId; key: string; nazov?: string; /** kľúč prekladu */ label: string; ikona: React.ReactNode }[] = [
  { id: "nastavenia", key: "nastavenia", label: "dlazdice.nastavenia", ikona: <IkonaNastavenia size={18} /> },
  { id: "wallet", key: "wallet", label: "dlazdice.penazenka", ikona: <IkonaPenazenka size={18} /> },
  { id: "skutky", key: "sub", nazov: "Moje skutky", label: "dlazdice.skutky", ikona: <IkonaFajka size={18} /> },
  { id: "zaujmy", key: "sub", nazov: "Moje záujmy", label: "dlazdice.zaujmy", ikona: <IkonaOsoba size={18} /> },
  { id: "firma", key: "firma", label: "dlazdice.firma", ikona: <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IK_BUDOVA} /></svg> },
  { id: "stat", key: "sub", nazov: "Štatistiky", label: "dlazdice.stat", ikona: <IkonaDoska size={18} /> },
  { id: "priatelia", key: "priatelia", label: "dlazdice.priatelia", ikona: <IkonaUsmev size={18} /> },
  { id: "karma", key: "sub", nazov: "Karma a štíty", label: "dlazdice.karma", ikona: <IkonaHviezda size={18} /> },
];

/** Moje záujmy ako samostatná obrazovka (dlaždica / položka menu) */
function ZaujmyObrazovka({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const t = useT();
  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t("profil.zaujmy.titul")}</h1>
      </div>
      <MojeZaujmy />
    </div>);
}

function ProfilDesktop({ screen, subNazov, setScreen, onSub, onQr, onUpravit, pTab, onPriatelia, onStranka, skOblast, skutkyOblasti, spatZoSkutkov }: { screen: string; subNazov: string | null; setScreen: (s: string) => void; onSub: (n: string) => void; onQr: () => void; onUpravit: () => void; pTab: PriateliaTab; onPriatelia: (t?: PriateliaTab) => void; onStranka: (s: Stranka) => void; skOblast?: Oblast; skutkyOblasti: (o: Oblast) => void; spatZoSkutkov: () => void }) {
  // OPRAVY 61: zlatá bodka pri Zamestnávateľovi len keď firma čaká na odpoveď (pozvánka, „Stále pracuješ…?")
  const t = useT();
  const ja = usePouzivatel();
  const vazby = useVazbyOsoby(ja.celeMeno);
  const mf = useMojaFirma();
  const firmaCaka = vazby.some((v) => v.stav === "pozvany") || vazby.some((v) => v.stav === "potvrdeny" && dataFirmy(v.firma).oznamy.some((o) => o.typ === "kontrola" && !mf.vybavene.includes(o.id)));
  const jeAktivny = (it: (typeof PROFIL_NAV)[number]) => screen === it.key && (it.key !== "sub" || subNazov === it.nazov);
  const dl = useDlazdice();
  const [uprava, setUprava] = useState(false);
  const dostupne = PROFIL_NAV.filter((it) => it.id !== "firma" || vazby.length > 0);
  const nav = dl.poradie.map((id) => dostupne.find((it) => it.id === id)).filter((it): it is (typeof PROFIL_NAV)[number] => !!it && !dl.skryte.includes(it.id));
  const otvor = (it: (typeof PROFIL_NAV)[number]) => (it.key === "sub" ? onSub(it.nazov!) : it.key === "priatelia" ? onPriatelia() : setScreen(it.key));
  const doUpravy: Dlazdica[] = dostupne.map((it) => ({ id: it.id, t: t(it.label), s: "", ikona: it.ikona, bg: "var(--btn)", c: "var(--ink2)", onClick: () => otvor(it) }));
  const sekcie: Partial<Record<DlazdicaId, React.ReactNode>> = { zaujmy: <MojeZaujmy />, stat: <StatVSkratke onOtvor={() => onSub("Štatistiky")} />, wallet: <PoslednePohyby onOtvor={() => setScreen("wallet")} /> };
  const rozbalene = dl.poradie.filter((id) => dl.rozbalene.includes(id) && !dl.skryte.includes(id) && sekcie[id]);

  let obsah: React.ReactNode;
  if (screen === "wallet") obsah = <Penazenka18 desktop onBack={() => setScreen("profil")} />;
  else if (screen === "firemny") obsah = <MojDeedFiremny onBack={() => setScreen("profil")} toast={toast} />;
  else if (screen === "sub") obsah = subNazov === "Moje záujmy" ? <ZaujmyObrazovka desktop onBack={() => setScreen("profil")} /> : subNazov === "Moje skutky" ? <MojeSkutky21 key={skOblast ?? "vsetky"} oblastStitu={skOblast} onBack={spatZoSkutkov} /> : subNazov === "Karma a štíty" ? <KarmaStity desktop naSkutky={skutkyOblasti} onBack={() => setScreen("profil")} /> : <Statistiky desktop onBack={() => setScreen("profil")} />;
  else if (screen === "priatelia") obsah = <Priatelia key={pTab} tab={pTab} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "firma") obsah = <Zamestnavatel desktop onBack={() => setScreen("profil")} />;
  else if (screen === "nastavenia") obsah = <Nastavenia20 desktop onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} onUpravProfil={onUpravit} />;
  else if (screen === "notif") obsah = <NotifObrazovka desktop onBack={() => setScreen("nastavenia")} />;
  else obsah = (
    <div style={{ padding: `${SPACE.md}px ${SPACE.md}px ${SPACE.lg}px` }}>
      <div className="deed-platba" style={{ display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)" }}>
        <MojeStranky naSpravovat={onStranka} />
        <StitKarta18 />
        <RozpracovanySkutok />
        {!ja.demo && <PrveKroky naZaujmy={() => onSub("Moje záujmy")} naPriatelia={() => onPriatelia()} />}
        <Podakovania ukazka={!!ja.demo} />
        {rozbalene.map((id) => <div key={id}>{sekcie[id]}</div>)}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: SIRKA.plocha, margin: "0 auto", padding: `${SPACE.md}px ${SPACE.md}px ${SPACE.lg}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `0 ${SPACE.xxs}px ${SPACE.gutter}px` }}>
        <span style={{ fontSize: 20, fontWeight: 800 }}>{t("profil.titul")}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}><KonasAkoLista /></span>
      </div>
      <div style={{ display: "flex", gap: SPACE.lg, alignItems: "flex-start" }}>
        <aside style={{ width: 300, flex: "0 0 300px", minWidth: 0, position: "sticky", top: SPACE.md, display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <div className="deed-platba" style={{ color: "var(--ink)" }}><IdentitaKarta18 naUpravit={onUpravit} naQr={onQr} /></div>
          <nav style={{ display: "flex", flexDirection: "column", gap: SPACE.xxs, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.xs }}>
            {nav.map((it) => {
              const on = jeAktivny(it);
              return (
                <button key={it.label} onClick={() => otvor(it)}
                  style={{ display: "flex", alignItems: "center", gap: SPACE.sm, width: "100%", textAlign: "left", border: "none", cursor: "pointer", fontFamily: "inherit",
                    borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, fontSize: 14, fontWeight: on ? 800 : 600,
                    background: on ? "color-mix(in srgb, var(--a-green) 16%, transparent)" : "transparent", color: on ? C.text : C.textSec, transition: "background .15s ease" }}>
                  <span style={{ display: "flex", color: on ? "var(--a-green)" : C.textTer }}>{it.ikona}</span>
                  {t(it.label)}
                  {it.key === "firma" && firmaCaka && <span role="status" aria-label={t("profil.firmaCaka")} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--a-gold)", marginLeft: "auto", flex: "none" }} />}
                </button>
              );
            })}
          </nav>
          <div className="deed-platba" style={{ display: "flex", flexDirection: "column", color: "var(--ink)" }}>
            <button type="button" onClick={() => setUprava(true)} style={{ alignSelf: "center", minHeight: 44, padding: "0 16px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "transparent", boxShadow: "none", color: "var(--ink2)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>{t("dlazdice.upravit")}</button>
            {uprava && <UpravitDlazdice dostupne={doUpravy} onClose={() => setUprava(false)} maSekciu={(id) => !!sekcie[id]} />}
          </div>
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

