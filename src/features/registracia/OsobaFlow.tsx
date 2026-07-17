// ============================================================
// DEED · Registrácia — Fyzická osoba (§13)
// Aktívny tok (9 krokov, plný účet) — auth-first. Pasívny režim už nie je
// voľbou v registrácii (ideme rovno aktívnym tokom).
// Pôvodný krok „záujmy" SA RUŠÍ (Pozvánky/Záujmy v1.1 §1) — nahradili ho
// dva kroky: Sekcie (moduly appky) + Pozvánky z okolia (body záujmu).
// Stavový automat (krok) v tomto súbore; univerzálne kroky
// (telefón+SMS, zabezpečenie) sa preberajú z RegKit.
// ============================================================
import { useEffect, useState } from "react";
import { C, GRAD, infoBox, SPACE, RADIUS } from "@/theme";
import { Vyber, Otazka, Oslava, Suhrn } from "@/shared";
import { setSession } from "@/lib/session";
import * as db from "@/lib/db";
import {
  Shell,
  Patka,
  TextPole,
  Prepinac,
  Accordion,
  KrokTelefonSms,
  KrokZabezpecenie,
} from "./RegKit";
import { ZOBRAZENIE_VOLBY, type ZobrazenieRezim } from "./mock";
import { CISELNIK_V2, UKAZKA_OZNAMU, UKAZKA_OZNAMU_FALLBACK, SEKCIE_MODULY } from "./ciselnikV2";
import { ulozSekcie } from "@/lib/personalizaciaStore";

// ---- stavový automat ----
type Krok =
  | "vidlicka"
  | "a1"
  | "a2"
  | "a3"
  | "a4"
  | "a5"
  | "a6"
  | "a7"
  | "a8"
  | "a9";

// účet po vytvorení (RegKit → KrokTelefonSms)
interface Ucet {
  id: string;
  typ?: string;
  poradove_cislo?: number | string;
  stav_registracie?: string;
  [k: string]: any;
}

type ToastFn = ((msg: string) => void) | undefined;

interface OsobaFlowProps {
  onHotovo?: () => void;
  onSpat?: () => void;
  toast?: ToastFn;
  /** Kde tok začať. „a1" = rovno aktívny tok (legacy upgrade pasívny → aktívny). */
  startKrok?: Krok;
  /** Supabase Auth identita (auth-first) — preskočí telefón-OTP (a1) + PIN (a2). */
  authId?: string;
  email?: string | null;
}

// best-effort priebežné ukladanie stavu — nikdy neblokuje navigáciu
async function ulozStavTicho(ucetId: string, stav: string) {
  try {
    await db.ulozStav(ucetId, stav);
  } catch {
    /* priebežné ukladanie je best-effort */
  }
}

export function OsobaFlow({ onHotovo, onSpat, toast, startKrok = "vidlicka", authId, email }: OsobaFlowProps) {
  // ---- stavový automat ----
  //  "vidlicka"  — prechodný štart (auth-first auto-skip do aktívneho toku)
  //  "a1".."a8"  — aktívny tok (číslované 1..8)
  const [krok, setKrok] = useState<Krok>(startKrok);
  const [ucet, setUcet] = useState<Ucet | null>(null); // { id, typ, poradove_cislo, stav_registracie }
  const [robim, setRobim] = useState(false); // ochrana proti dvojkliku pri tvorbe účtu

  // profil meno si držíme pre záverečnú session
  const [profilMeno, setProfilMeno] = useState("");

  const goto = (k: Krok) => setKrok(k);

  // auth-first: vytvor/načítaj ucet naviazaný na auth usera (idempotentné) a choď na a3
  const zacniAktivnyAuth = async () => {
    if (!authId || robim) return;
    setRobim(true);
    try {
      const u = await db.vytvorUcetAuth({ authId, typ: "aktivny", email });
      setUcet(u);
      goto("a3");
    } catch (e: any) {
      toast?.("Chyba: " + (e?.message || e));
    } finally {
      setRobim(false);
    }
  };

  // auth-first: hneď ako máme auth identitu, vytvor/načítaj ucet a skoč do aktívneho
  // toku (a3). Pokrýva čerstvú registráciu aj resume (rozrobený účet po refreshi).
  // Rozcestník pasívny/aktívny je z registrácie odstránený — vždy ideme aktívnym tokom.
  useEffect(() => {
    if (authId && !ucet && !robim) zacniAktivnyAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authId]);

  // kým sa ucet nevytvorí (a neskočíme na a3), drž jemný loader — žiadny flash medzikroku
  if (authId && (!ucet || krok === "vidlicka")) {
    return (
      <Shell title="Fyzická osoba">
        <div style={{ padding: "40px 0", textAlign: "center", color: C.textTer, fontSize: 14 }}>Načítavam tvoj účet…</div>
      </Shell>
    );
  }

  // ---------------------------------------------------------
  // AKTÍVNY TOK — 8 číslovaných krokov
  // ---------------------------------------------------------

  // KROK 1 — Telefón + SMS (univerzálny)
  if (krok === "a1") {
    return (
      <KrokTelefonSms
        step={1}
        total={9}
        typ="aktivny"
        onBack={onSpat}
        onHotovo={(u: Ucet) => {
          setUcet(u);
          ulozStavTicho(u.id, "zabezpecenie");
          goto("a2");
        }}
        toast={toast}
      />
    );
  }

  // KROK 2 — Zabezpečenie účtu (univerzálny)
  if (krok === "a2") {
    return (
      <KrokZabezpecenie
        step={2}
        total={9}
        ucetId={ucet?.id ?? ""}
        onBack={() => goto("a1")}
        onHotovo={() => {
          if (ucet) ulozStavTicho(ucet.id, "udaje");
          goto("a3");
        }}
        toast={toast}
      />
    );
  }

  // KROK 3 — Povinné údaje
  if (krok === "a3") {
    return (
      <KrokUdaje
        ucet={ucet}
        toast={toast}
        onBack={authId ? () => onSpat?.() : () => goto("a2")}
        onNext={(meno) => {
          setProfilMeno(meno);
          if (ucet) ulozStavTicho(ucet.id, "zaujmy");
          goto("a4");
        }}
      />
    );
  }

  // KROK 4 — Sekcie (Pozvánky/Záujmy v1.1 §1 krok A)
  if (krok === "a4") {
    return (
      <KrokSekcie
        onBack={() => goto("a3")}
        onNext={() => {
          if (ucet) ulozStavTicho(ucet.id, "zaujmy");
          goto("a5");
        }}
      />
    );
  }

  // KROK 5 — Pozvánky z okolia (v1.1 §1 krok B, nepovinný)
  if (krok === "a5") {
    return (
      <KrokPozvanky
        ucet={ucet}
        toast={toast}
        onBack={() => goto("a4")}
        onNext={() => {
          if (ucet) ulozStavTicho(ucet.id, "zobrazenie");
          goto("a6");
        }}
      />
    );
  }

  // KROK 6 — Zobrazenie
  if (krok === "a6") {
    return (
      <KrokZobrazenie
        ucet={ucet}
        toast={toast}
        onBack={() => goto("a5")}
        onNext={() => {
          if (ucet) ulozStavTicho(ucet.id, "foto");
          goto("a7");
        }}
      />
    );
  }

  // KROK 7 — Foto (nepovinné)
  if (krok === "a7") {
    return (
      <KrokFoto
        meno={profilMeno}
        onBack={() => goto("a6")}
        onNext={() => {
          if (ucet) ulozStavTicho(ucet.id, "kyc");
          goto("a8");
        }}
      />
    );
  }

  // KROK 8 — KYC
  if (krok === "a8") {
    return (
      <KrokKyc
        ucet={ucet}
        toast={toast}
        onBack={() => goto("a7")}
        onNext={() => {
          if (ucet) ulozStavTicho(ucet.id, "vyhlasenie");
          goto("a9");
        }}
      />
    );
  }

  // KROK 9 — Čestné vyhlásenie + briefing
  if (krok === "a9") {
    return (
      <KrokVyhlasenie
        ucet={ucet}
        meno={profilMeno}
        toast={toast}
        onBack={() => goto("a8")}
        onHotovo={onHotovo}
      />
    );
  }

  return null;
}

// ============================================================
// KROK 3 — Povinné údaje
// ============================================================
interface KrokUdajeProps {
  ucet: Ucet | null;
  toast?: ToastFn;
  onBack: () => void;
  onNext: (meno: string) => void;
}

function KrokUdaje({ ucet, toast, onBack, onNext }: KrokUdajeProps) {
  const [f, setF] = useState({
    meno: "",
    druhe_meno: "",
    priezvisko: "",
    titul: "",
    rok_narodenia: "",
    ulica: "",
    popisne_cislo: "",
    mesto: "",
    psc: "",
    krajina: "Slovensko",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const canNext =
    !!f.meno.trim() && !!f.priezvisko.trim() && !!f.rok_narodenia.trim() && !!f.mesto.trim();

  const uloz = async () => {
    if (!ucet) return;
    setLoading(true);
    try {
      await db.ulozProfil(ucet.id, {
        meno: f.meno.trim(),
        druhe_meno: f.druhe_meno.trim() || null,
        priezvisko: f.priezvisko.trim(),
        titul: f.titul.trim() || null,
        rok_narodenia: f.rok_narodenia ? Number(f.rok_narodenia) : null,
        ulica: f.ulica.trim() || null,
        popisne_cislo: f.popisne_cislo.trim() || null,
        mesto: f.mesto.trim(),
        psc: f.psc.trim() || null,
        krajina: f.krajina.trim() || "Slovensko",
        profilovka_url: null,
      });
      await db.ulozLokalitu(ucet.id, {
        mesto: f.mesto.trim(),
        region: f.mesto.trim(),
        zdroj: "manual",
      });
      onNext(f.meno.trim());
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Tvoje údaje"
      step={3}
      total={8}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={uloz} canNext={canNext} loading={loading} />}
    >
      <Otazka>Základné údaje k overeniu</Otazka>
      <TextPole label="Meno *" value={f.meno} onChange={set("meno")} placeholder="Martin" />
      <TextPole label="Druhé meno (nepovinné)" value={f.druhe_meno} onChange={set("druhe_meno")} placeholder="" />
      <TextPole label="Priezvisko *" value={f.priezvisko} onChange={set("priezvisko")} placeholder="Stoffa" />
      <TextPole label="Titul (nepovinné)" value={f.titul} onChange={set("titul")} placeholder="Ing." />
      <TextPole
        label="Rok narodenia *"
        value={f.rok_narodenia}
        onChange={(v: string) => set("rok_narodenia")(v.replace(/\D/g, "").slice(0, 4))}
        placeholder="1990"
        inputMode="numeric"
        maxLength={4}
      />
      <TextPole label="Ulica" value={f.ulica} onChange={set("ulica")} placeholder="Hlavná" />
      <TextPole label="Popisné číslo (nepovinné)" value={f.popisne_cislo} onChange={set("popisne_cislo")} placeholder="12/A" />
      <TextPole label="Mesto *" value={f.mesto} onChange={set("mesto")} placeholder="Trenčín" />
      <TextPole label="PSČ" value={f.psc} onChange={set("psc")} placeholder="911 01" inputMode="numeric" />
      <TextPole label="Krajina" value={f.krajina} onChange={set("krajina")} placeholder="Slovensko" />
      <div style={infoBox}>Doklad nečítame — pri overení len porovnáme, že údaje sedia.</div>
    </Shell>
  );
}

// ============================================================
// KROK 4 — Sekcie (Pozvánky/Záujmy v1.1 §1 krok A)
// Prepínače modulov — čo chceš v appke vidieť. Default všetko zapnuté,
// meniteľné v profile. Mock: localStorage (deed.me.sekcie.v1).
// ============================================================
function KrokSekcie({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [sekcie, setSekcie] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SEKCIE_MODULY.map((m) => [m.id, true]))
  );
  const toggle = (id: string) => setSekcie((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Shell
      title="Sekcie"
      step={4}
      total={9}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={() => { ulozSekcie(sekcie); onNext(); }} canNext />}
    >
      <Otazka>Čo chceš v appke vidieť?</Otazka>
      {SEKCIE_MODULY.map((m) => (
        <Prepinac
          key={m.id}
          on={!!sekcie[m.id]}
          onToggle={() => toggle(m.id)}
          title={`${m.emoji} ${m.label}`}
          desc={m.desc}
        />
      ))}
      <div style={infoBox}>Všetko je predvolene zapnuté — kedykoľvek to zmeníš v profile.</div>
    </Shell>
  );
}

// ============================================================
// KROK 5 — Pozvánky z okolia (v1.1 §1 krok B, nepovinný)
// „Nevyberáš si, čo budeš pozerať — vyberáš si, kam ťa smú pozvať."
// Číselník v2 (vetva appka + pozvánková), ukážka oznamu pri prvom
// zakliknutí (raz za session), vlastný tag = SÚKROMNÝ, Preskočiť viditeľné.
// Témy ovplyvňujú VÝHRADNE nástenku a oznamy — feed skutkov ich nečíta.
// ============================================================
interface ZaujemVyber {
  oblast: string;
  pod_polozka: string;
  vlastny: boolean;
}

const UKAZKA_SESSION_KLUC = "deed.reg.ukazkaOznamu.v1"; // raz za session

interface KrokPozvankyProps {
  ucet: Ucet | null;
  toast?: ToastFn;
  onBack: () => void;
  onNext: () => void;
}

function KrokPozvanky({ ucet, toast, onBack, onNext }: KrokPozvankyProps) {
  const [vyber, setVyber] = useState<ZaujemVyber[]>([]); // [{oblast, pod_polozka, vlastny}]
  const [ukazka, setUkazka] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ukážka oznamu pri prvom zakliknutí témy — mock podľa zakliknutej témy, raz za session
  const ukazUkazku = (oblast: string) => {
    try {
      if (sessionStorage.getItem(UKAZKA_SESSION_KLUC)) return;
      sessionStorage.setItem(UKAZKA_SESSION_KLUC, "1");
    } catch { /* private mode — ukážku len zobrazíme */ }
    setUkazka(UKAZKA_OZNAMU[oblast] ?? UKAZKA_OZNAMU_FALLBACK);
  };

  const jeVybrane = (o: string, h: string) =>
    vyber.some((x) => x.oblast === o && x.pod_polozka === h);
  const onToggle = (o: string, h: string) =>
    setVyber((s) => {
      const uz = s.some((x) => x.oblast === o && x.pod_polozka === h);
      if (!uz) ukazUkazku(o);
      return uz
        ? s.filter((x) => !(x.oblast === o && x.pod_polozka === h))
        : [...s, { oblast: o, pod_polozka: h, vlastny: false }];
    });
  const onVlastny = (o: string, t: string) => {
    const v = t.trim();
    if (!v) return;
    setVyber((s) =>
      s.some((x) => x.oblast === o && x.pod_polozka === v)
        ? s
        : [...s, { oblast: o, pod_polozka: v, vlastny: true }]
    );
  };

  const uloz = async () => {
    if (!ucet || vyber.length === 0) return onNext(); // nič nevybraté = preskočenie
    setLoading(true);
    try {
      await db.ulozZaujmy(ucet.id, vyber);
      onNext();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Pozvánky z okolia"
      step={5}
      total={9}
      onBack={onBack}
      footer={
        <div style={{ display: "flex", gap: SPACE.sm }}>
          {/* Preskočiť — viditeľné, bez guilt-tripu (spec §1 krok B) */}
          <button
            onClick={onNext}
            disabled={loading}
            style={{ flex: "0 0 auto", padding: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.md, background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}`, fontWeight: 700, fontSize: 15.5, cursor: "pointer", fontFamily: "inherit" }}
          >
            Preskočiť
          </button>
          <button
            onClick={uloz}
            disabled={loading}
            style={{ flex: 1, padding: `${SPACE.md}px 0`, borderRadius: RADIUS.md, background: GRAD, color: "#fff", border: "none", fontWeight: 700, fontSize: 15.5, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1, boxShadow: "0 8px 26px color-mix(in srgb, var(--a-green) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.25)" }}
          >
            {loading ? "Ukladám…" : "Pokračovať"}
          </button>
        </div>
      }
    >
      {/* úvodný text — kánon, presné znenie (spec §1 krok B) */}
      <Otazka>Chceš dostávať oznámenia o akciách a podujatiach z tvojho okolia? Ak áno, vyber si svoje body záujmu.</Otazka>
      <div style={{ fontSize: 13, color: C.textTer, lineHeight: 1.5, margin: `-4px 0 ${SPACE.gutter}px` }}>
        Nepovinné — kedykoľvek sa k tomu vrátiš vo svojom profile.
      </div>

      {/* ukážka oznamu — mock notifikácia podľa prvej zakliknutej témy */}
      {ukazka && (
        <div style={{ display: "flex", gap: SPACE.sm, alignItems: "flex-start", background: "color-mix(in srgb, var(--a-info) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 28%, transparent)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.gutter }}>
          <span style={{ fontSize: 16, flex: "none" }}>🔔</span>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.blueL, letterSpacing: ".4px", marginBottom: 2 }}>TAKTO BUDE VYZERAŤ OZNAM</div>
            <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>{ukazka}</div>
          </div>
        </div>
      )}

      <Accordion skupiny={CISELNIK_V2} jeVybrane={jeVybrane} onToggle={onToggle} onVlastny={onVlastny} />

      {/* vlastný tag je SÚKROMNÝ + dôveryhodnostná veta (spec §1 krok B) */}
      <div style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.sm }}>
        Chýba ti niečo? Dopíš si vlastné — dáme ti vedieť, keď sa k tomu v okolí bude niečo konať. Vlastné tagy sú súkromné, nikto ich nevidí.
      </div>
      <div style={infoBox}>
        Pozvánky posielajú organizátori podujatí, nie my. Vždy z tvojho okolia, vypneš jedným ťukom.
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 6 — Zobrazenie (ako ťa vidí komunita)
// ============================================================
interface KrokZobrazenieProps {
  ucet: Ucet | null;
  toast?: ToastFn;
  onBack: () => void;
  onNext: () => void;
}

function KrokZobrazenie({ ucet, toast, onBack, onNext }: KrokZobrazenieProps) {
  const [rezim, setRezim] = useState<ZobrazenieRezim>("anonym");
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);

  const canNext = rezim !== "nick" || !!nick.trim();

  const uloz = async () => {
    if (!ucet) return;
    setLoading(true);
    try {
      await db.ulozZobrazenie(ucet.id, { rezim, nick: rezim === "nick" ? nick.trim() : null });
      onNext();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Ako ťa vidia"
      step={6}
      total={9}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={uloz} canNext={canNext} loading={loading} />}
    >
      <Otazka>Ako sa zobrazíš v komunite?</Otazka>
      {ZOBRAZENIE_VOLBY.map((v) => (
        <div key={v.rezim}>
          <Vyber
            emoji={v.emoji}
            title={v.title}
            desc={v.desc}
            active={rezim === v.rezim}
            onClick={() => setRezim(v.rezim)}
          />
          {v.rezim === "nick" && rezim === "nick" && (
            <div style={{ margin: "-2px 0 10px" }}>
              <TextPole
                label="Prezývka"
                value={nick}
                onChange={setNick}
                placeholder="napr. DobrákMaťo"
                maxLength={24}
              />
            </div>
          )}
        </div>
      ))}
      <div style={{ ...infoBox, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.3)", color: C.gold }}>
        Pri žiadosti v Help sa VŽDY zobrazí plné meno + ulica + mesto (dôvera komunity). Súkromie → cez Charitu.
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 7 — Foto (nepovinné, bez uploadu)
// ============================================================
interface KrokFotoProps {
  meno: string;
  onBack: () => void;
  onNext: () => void;
}

function KrokFoto({ meno, onBack, onNext }: KrokFotoProps) {
  const iniciala = (meno || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <Shell
      title="Profilová fotka"
      step={7}
      total={9}
      onBack={onBack}
      footer={
        <div style={{ display: "flex", gap: SPACE.sm }}>
          <button
            onClick={onNext}
            style={{
              flex: "0 0 auto",
              padding: `${SPACE.md}px ${SPACE.lg}px`,
              borderRadius: RADIUS.md,
              background: "rgba(var(--glass-rgb),.05)",
              color: C.textSec,
              border: `1px solid ${C.line}`,
              fontWeight: 700,
              fontSize: 15.5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Preskočiť
          </button>
          <button
            onClick={onNext}
            style={{
              flex: 1,
              padding: `${SPACE.md}px 0`,
              borderRadius: RADIUS.md,
              background: GRAD,
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: 15.5,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 8px 26px color-mix(in srgb, var(--a-green) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.25)",
            }}
          >
            Pokračovať
          </button>
        </div>
      }
    >
      <Otazka>Pridaj si tvár (nepovinné)</Otazka>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.gutter, padding: `${SPACE.md}px 0 ${SPACE.xs}px` }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: RADIUS.round,
            background: GRAD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 800,
            color: "#fff",
            boxShadow: "0 10px 30px color-mix(in srgb, var(--a-green) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.25)",
          }}
        >
          {iniciala}
        </div>
        <div style={{ fontSize: 13.5, color: C.textSec, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
          Foto je nepovinné — pokojne ho doplníš neskôr v profile.
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 8 — KYC (Didit, mock)
// ============================================================
type KycSposob = "nove" | "reusable";

interface KrokKycProps {
  ucet: Ucet | null;
  toast?: ToastFn;
  onBack: () => void;
  onNext: () => void;
}

function KrokKyc({ ucet, toast, onBack, onNext }: KrokKycProps) {
  const [sposob, setSposob] = useState<KycSposob | null>(null); // "nove" | "reusable"
  const [loading, setLoading] = useState(false);
  const [overene, setOverene] = useState(false);

  const over = async () => {
    if (!sposob || !ucet) return;
    setLoading(true);
    try {
      const r = await db.spustiKyc(ucet.id, sposob);
      if (r?.vysledok === "sedi") {
        setOverene(true);
      } else {
        toast?.("Overenie neprešlo — skús znova.");
      }
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
    }
    setLoading(false);
  };

  return (
    <Shell
      title="Overenie identity"
      step={8}
      total={9}
      onBack={onBack}
      footer={
        overene ? (
          <Patka onBack={onBack} onNext={onNext} canNext next="Pokračovať" />
        ) : (
          <Patka onBack={onBack} onNext={over} canNext={!!sposob} loading={loading} next="Overiť" />
        )
      }
    >
      <Otazka>Over sa — odomkneš plné DEED</Otazka>
      <Vyber
        emoji="📷"
        title="Overiť teraz (doklad + selfie)"
        desc="Klasické overenie cez Didit."
        active={sposob === "nove"}
        onClick={() => !overene && setSposob("nove")}
      />
      <Vyber
        emoji="♻️"
        title="Použiť existujúce overenie (reusable / EUDI)"
        desc="Máš overenú digitálnu identitu."
        active={sposob === "reusable"}
        onClick={() => !overene && setSposob("reusable")}
      />

      {!overene && sposob === "nove" && (
        <div style={{ marginTop: SPACE.sm }}>
          <Suhrn rows={[["1 · Odfoť doklad", "OP / pas"], ["2 · Selfie", "otoč hlavu"]]} />
        </div>
      )}

      {overene && (
        <div
          style={{
            marginTop: SPACE.gutter,
            display: "flex",
            alignItems: "center",
            gap: SPACE.sm,
            padding: `${SPACE.sm}px ${SPACE.gutter}px`,
            borderRadius: RADIUS.sm,
            background: "rgba(31,191,143,.1)",
            border: "1px solid rgba(31,191,143,.4)",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: RADIUS.round,
              flex: "0 0 auto",
              background: C.green,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            ✓
          </span>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.greenL }}>
            Overené — odomyká DEED + peňaženku
          </div>
        </div>
      )}

      <div style={infoBox}>Didit porovná údaje a tvár. Doklad neukladáme.</div>
    </Shell>
  );
}

// ============================================================
// KROK 9 — Čestné vyhlásenie + bezpečnostný briefing
// ============================================================
interface KrokVyhlasenieProps {
  ucet: Ucet | null;
  meno: string;
  toast?: ToastFn;
  onBack: () => void;
  onHotovo?: () => void;
}

function KrokVyhlasenie({ ucet, meno, toast, onBack, onHotovo }: KrokVyhlasenieProps) {
  const [briefing, setBriefing] = useState(false);
  const [pravda, setPravda] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hotovo, setHotovo] = useState(false);

  const canNext = briefing && pravda;

  const dokonci = async () => {
    if (!ucet) return;
    setLoading(true);
    try {
      await db.ulozSuhlas(ucet.id, "briefing", true);
      await db.ulozSuhlas(ucet.id, "cestne_vyhlasenie", true);
      await db.dokonciRegistraciu(ucet.id);
      setHotovo(true);
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  const zatvorOslavu = () => {
    setSession({
      ucet_id: ucet?.id ?? "",
      typ: "aktivny",
      poradove_cislo: (ucet?.poradove_cislo as number) ?? null,
      meno: meno || "",
    });
    onHotovo?.();
  };

  if (hotovo) {
    return (
      <Oslava
        emoji="🎉"
        title="Vitaj v DEED"
        text="Tvoj účet je pripravený."
        onClose={zatvorOslavu}
      />
    );
  }

  return (
    <Shell
      title="Posledný krok"
      step={9}
      total={9}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={dokonci} canNext={canNext} loading={loading} next="Vitaj v DEED →" />}
    >
      <Otazka>Bezpečnosť a čestné vyhlásenie</Otazka>
      <Prepinac
        on={briefing}
        onToggle={() => setBriefing((b) => !b)}
        title="Rozumiem a beriem na vedomie"
        desc="DEED účet = digitálna identita. Chráň ho ako účet v banke — nikdy nezdieľaj PIN ani prístup."
      />
      <Prepinac
        on={pravda}
        onToggle={() => setPravda((b) => !b)}
        title="Potvrdzujem, že všetky údaje sú pravdivé"
        desc="Meno, dátum, adresa aj overenie zodpovedajú skutočnosti."
      />
      <div style={{ ...infoBox, background: C.redBg, border: "1px solid rgba(242,112,111,.3)", color: C.red }}>
        Pri vedomom zadaní falošných údajov hrozí trvalý ban.
      </div>
    </Shell>
  );
}
