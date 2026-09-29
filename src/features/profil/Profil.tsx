import { useState, useEffect } from "react";
import { SIRKA, C, GRAD, SPACE, RADIUS } from "@/theme";
import { toast, Sheet, StitRiadok, DozivotnyChip, useScrollPamat, useMotiv, useLayout, useTvorbaGate, obalSiroky, IkonaNastavenia, IkonaSipVlavo, IkonaPenazenka, IkonaHviezda, IkonaFajka, IkonaDoska, IkonaUsmev, IkonaOsoba, IkonaPin, IkonaSlnko, IkonaMesiac, IkonaStit, IkonaInstitucia, IkonaObalka, IkonaFoto, FotoProfiluSheet, MenuSkupina, MenuPolozka, MenuPrepinac, SkeletonRiadky, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { MojDeedFiremny } from "@/features/rola/MojDeedFiremny";
import { MojZamestnavatelSheet } from "@/features/rola/MojZamestnavatel";
import { useVazbaOsoby } from "@/lib/zamestnanci";
import { RetazDobraSheet } from "@/features/retaz/RetazDobra";
import { IntroPruvodca } from "@/components/intro";
import { signOut } from "@/lib/auth";
import { usePouzivatel } from "@/lib/pouzivatel";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { useVrstva } from "@/lib/urlnav";
import { Nastavenia as NotifNastavenia } from "@/features/notifikacie/Notifikacie";
import type { Toast as ToastFn, WideProps, ZiadostPriatelstvo, CestaPriatelstva, RezimNastavenia } from "@/types";
import { useProfilMojeSkutky, useProfilKarma, useProfilStatistiky } from "@/data";
import { MODULOVA_KARMA, DOZIVOTNE_ZISKANE } from "./mock";
import { ProfilHlavny18, IdentitaKarta18, StitKarta18, MojeZaujmy } from "./ProfilHlavny";
import { UpravOsobnyProfil } from "./UpravOsobnyProfil";
import { MojQr } from "./MojQr";
import { Penazenka18 } from "./Penazenka18";

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
      {screen === "sub" && obal(<SubScreen nazov={subNazov} toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "priatelia" && obal(<PriateliaScreen toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "nastavenia" && obal(<NastaveniaScreen toast={toast} onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />)}
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
  else if (screen === "sub") obsah = <SubScreen nazov={subNazov} toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "priatelia") obsah = <PriateliaScreen toast={toast} desktop onBack={() => setScreen("profil")} />;
  else if (screen === "nastavenia") obsah = <NastaveniaScreen toast={toast} desktop onBack={() => setScreen("profil")} onNotif={() => setScreen("notif")} />;
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
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column" }}><NotifNastavenia embedded /></div>
    </div>
  );
}

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
          style={{ flex: "none", fontSize: 11, fontWeight: 700, color: "var(--a-green)", border: "1px solid rgba(31,191,143,.4)", background: "rgba(31,191,143,.08)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px`, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>Reťaz</span>
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

      {/* ručná Reťaz dobra pri menšom skutku (§9) */}
      {retaz && (
        <RetazDobraSheet odmena={retaz.odmena} mode="skutok"
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

// ===================== NASTAVENIA =====================
type NastaveniaScreenProps = { toast: ToastFn; onBack: () => void; onNotif: () => void; desktop?: boolean };

function NastaveniaScreen({ toast, onBack, onNotif, desktop }: NastaveniaScreenProps) {
  const { svetly, prepni } = useMotiv();
  const ja = usePouzivatel();
  const [fotka, setFotka] = useState(false);              // sheet „Fotky profilu"
  const [mojeFotky, zmenMojeFotky] = useFotkyEntity(klucEntity("ja", ja.ucetId || "demo"));
  const [jazyk, setJazyk] = useState("SK");
  const [rezim, setRezim] = useState<RezimNastavenia>("verejny");  // verejný / anonym (§13.1 ochrana)
  const [uroven, setUroven] = useState(true);             // zobrazovať moju úroveň (dá sa skryť)
  const [gps, setGps] = useState(true);
  const [ochrana, setOchrana] = useState(false);          // §13.1 anti-sociálny kredit (modal)
  const [zamestnavatel, setZamestnavatel] = useState(false);  // väzba človek ↔ firma (obojstranná)
  const vazbaFirmy = useVazbaOsoby(ja.celeMeno);
  const [oAppke, setOAppke] = useState(false);            // O aplikácii · podpora
  const [ako, setAko] = useState(false);                  // sprievodca „Ako DEED funguje"

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: "16px 18px 8px" }}>
        {!desktop && <div onClick={onBack} style={spatBtn}><IkonaSipVlavo size={18} color={C.textSec} /></div>}
        <h3 style={{ fontSize: 17, margin: 0 }}>Nastavenia</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        <MenuSkupina nadpis="VZHĽAD" style={{ marginTop: SPACE.xs }}>
          <MenuPolozka ikona={svetly ? <IkonaSlnko size={16} /> : <IkonaMesiac size={16} />} farba="var(--a-info)"
            label="Téma" hodnota={svetly ? "Svetlá" : "Tmavá"} onClick={prepni} />
          <MenuPolozka ikona={<span style={{ fontSize: 13, fontWeight: 800 }}>SK</span>} farba="var(--a-plum)"
            label="Jazyk" hodnota={jazyk === "Auto" ? "Auto (podľa krajiny)" : jazyk}
            onClick={() => setJazyk((j) => j === "SK" ? "EN" : j === "EN" ? "Auto" : "SK")} posledna />
        </MenuSkupina>

        <MenuSkupina nadpis="SÚKROMIE A PROFIL">
          <MenuPolozka ikona={<IkonaFoto size={16} />} farba="var(--a-teal)"
            label="Profilová a titulná fotka" popis="Nahraj z galérie alebo odfoť — EXIF/GPS sa odstráni"
            hodnota={ja.foto && mojeFotky.cover ? "Obe" : ja.foto ? "Profilová" : mojeFotky.cover ? "Titulná" : "Bez fotky"}
            onClick={() => setFotka(true)} />
          <MenuPolozka ikona={<IkonaOsoba size={16} />} farba={rezim === "verejny" ? "var(--a-green)" : "var(--a-plum)"}
            label="Režim profilu" hodnota={rezim === "verejny" ? "Verejný" : "Anonym"}
            onClick={() => setRezim((r) => r === "verejny" ? "anonym" : "verejny")} />
          <MenuPrepinac ikona={<IkonaHviezda size={16} />} farba="var(--a-gold)" label="Zobrazovať moju úroveň" on={uroven} onChange={() => setUroven((u) => !u)} />
          <MenuPrepinac ikona={<IkonaPin size={16} />} farba="var(--a-info)" label="Poloha (GPS)" on={gps} onChange={() => setGps((g) => !g)} />
          <MenuPolozka ikona={<IkonaStit size={16} />} farba="var(--a-green)" label="Ochrana osoby" popis="Si vidieť len tak, ako chceš" onClick={() => setOchrana(true)} posledna />
        </MenuSkupina>

        <MenuSkupina nadpis="NOTIFIKÁCIE">
          <MenuPolozka ikona={<IkonaNastavenia size={16} />} farba="var(--a-info)" label="Nastavenie oznámení" popis="Ktoré upozornenia chceš dostávať" onClick={onNotif} posledna />
        </MenuSkupina>

        <MenuSkupina nadpis="ÚČET">
          <MenuPolozka ikona={<IkonaInstitucia size={16} />} farba="var(--a-gold)" label="Zamestnávateľ (B2B)"
            hodnota={vazbaFirmy?.stav === "potvrdeny" ? vazbaFirmy.firma
              : vazbaFirmy?.stav === "pozvany" ? "Pozvánka čaká"
              : vazbaFirmy?.stav === "ziadost" ? "Čaká na firmu" : "Nenastavený"}
            onClick={() => setZamestnavatel(true)} />
          <MenuPolozka ikona={<IkonaPenazenka size={16} />} farba="var(--a-info)" label="Peňaženka a bezpečnosť" popis="Biometria a overenie pri výbere hodnoty" onClick={() => toast("Peňaženka a bezpečnosť — čoskoro")} />
          <MenuPolozka ikona={<IkonaObalka size={16} />} farba="var(--a-plum)" label="O aplikácii · podpora" onClick={() => setOAppke(true)} posledna />
        </MenuSkupina>

        <button onClick={() => { toast("Odhlásené"); void signOut(); }} style={{ width: "100%", height: 50, borderRadius: RADIUS.md, marginTop: SPACE.xs, border: "1px solid rgba(242,112,111,.4)", background: "rgba(242,112,111,.08)", color: "var(--a-danger)", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Odhlásiť sa</button>
      </div>

      {/* väzba človek ↔ firma — obojstranná, dobrovoľná */}
      {zamestnavatel && <MojZamestnavatelSheet osoba={ja.celeMeno} toast={toast} onClose={() => setZamestnavatel(false)} />}

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

      {/* fotky profilu — tá istá cesta ako klik na avatar v identite */}
      {fotka && (
        <FotoProfiluSheet
          titul="Fotky môjho profilu"
          foto={ja.foto} nahrada={ja.iniciala}
          onZmena={(url) => { ja.nastavFoto?.(url); toast(url ? "Profilová fotka uložená" : "Profilová fotka odstránená"); }}
          cover={mojeFotky.cover}
          onCover={(url) => { zmenMojeFotky({ cover: url }); toast(url ? "Titulná fotka uložená" : "Titulná fotka odstránená"); }}
          onClose={() => setFotka(false)} />
      )}

      {/* sprievodca „Ako DEED funguje" (rovnaký ako pri prvom spustení) */}
      {ako && <IntroPruvodca onClose={() => setAko(false)} />}
    </div>
  );
}

const spatBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: RADIUS.round, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 17 };
const subItem: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.md}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, fontSize: 14.5 };
const sekciaLabel: React.CSSProperties = { fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" };
