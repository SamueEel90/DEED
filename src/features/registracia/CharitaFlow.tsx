// ============================================================
// DEED · Registrácia — Charita / OZ (§11)
// 8 číslovaných krokov, plný organizačný účet.
// Stavový automat (krok) v tomto súbore; univerzálne kroky
// (telefón+SMS+email, zabezpečenie) sa preberajú z RegKit.
// Štatutár sa overuje ako osoba (KYC) — closed loop; org cez KYB (Didit).
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
import { DOBRO_TYPY, POBOCKA_REZIMY, BALIKY } from "./mock";

// charita akcent (fialová) — odlišuje organizačný tok od osobného
const AKCENT = "var(--a-plum)";

// org účet vytvorený v KROKu 1 (KrokTelefonSms)
interface OrgUcet {
  id: string;
  typ?: string;
  poradove_cislo?: number | string;
  stav_registracie?: string;
}

// údaje z registra (KYB)
interface RegUdaje {
  ico: string;
  nazov: string;
  sidlo: string;
  datum_vzniku: string;
  pravna_forma: string;
}

interface CharitaFlowProps {
  onHotovo?: () => void;
  onSpat: () => void;
  toast?: (text: string) => void;
  /** Supabase Auth identita (auth-first) — preskočí telefón-OTP (k1) + PIN (k2), rovno KYB (k3). */
  authId?: string;
  email?: string | null;
  /** auth resume — pre charitu rovnaký auth-first tok (org ucet je idempotentný na auth_id). */
  resume?: boolean;
}

// best-effort priebežné ukladanie stavu — nikdy neblokuje navigáciu
async function ulozStavTicho(ucetId: string, stav: string) {
  try {
    await db.ulozStav(ucetId, stav);
  } catch {
    /* priebežné ukladanie je best-effort */
  }
}

export function CharitaFlow({ onHotovo, onSpat, toast, authId, email }: CharitaFlowProps) {
  // ---- stavový automat ----
  //  "k1".."k8" — číslované 1..8 (auth-first: k1/k2 preskočené → štart k3)
  const [krok, setKrok] = useState(authId ? "k3" : "k1");
  const [org, setOrg] = useState<OrgUcet | null>(null); // { id, typ, poradove_cislo, stav_registracie }
  const [nazov, setNazov] = useState(""); // názov organizácie z registra (KYB) — pre session

  const goto = (k: string) => setKrok(k);

  // auth-first: vytvor/načítaj org účet naviazaný na auth usera (idempotentné na auth_id)
  useEffect(() => {
    if (!authId || org) return;
    (async () => {
      try {
        const u = await db.vytvorUcetAuth({ authId, typ: "charita", email, stav: "kyb" });
        setOrg(u);
      } catch (e: any) {
        toast?.("Chyba: " + (e?.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authId]);

  // auth-first: kým sa org účet nevytvorí, drž jemný loader (k3 číta org!.id)
  if (authId && !org) {
    return (
      <Shell title="Charita / OZ">
        <div style={{ padding: "40px 0", textAlign: "center", color: C.textTer, fontSize: 14 }}>Pripravujem registráciu…</div>
      </Shell>
    );
  }

  // KROK 1 — Kontaktné kanály (telefón + SMS + email) — univerzálny, vytvorí org účet
  if (krok === "k1") {
    return (
      <KrokTelefonSms
        step={1}
        total={8}
        typ="charita"
        vyzadujEmail={true}
        onBack={() => onSpat()}
        onHotovo={(u: OrgUcet) => {
          setOrg(u);
          ulozStavTicho(u.id, "zabezpecenie");
          goto("k2");
        }}
        toast={toast}
      />
    );
  }

  // KROK 2 — Zabezpečenie účtu (univerzálny)
  if (krok === "k2") {
    return (
      <KrokZabezpecenie
        step={2}
        total={8}
        ucetId={org!.id}
        onBack={() => goto("k1")}
        onHotovo={() => {
          ulozStavTicho(org!.id, "kyb");
          goto("k3");
        }}
        toast={toast}
      />
    );
  }

  // KROK 3 — Overenie organizácie (KYB)
  if (krok === "k3") {
    return (
      <KrokKyb
        org={org!}
        toast={toast}
        onBack={authId ? onSpat : () => goto("k2")}
        onNext={(menoOrg) => {
          setNazov(menoOrg);
          ulozStavTicho(org!.id, "profil");
          goto("k4");
        }}
      />
    );
  }

  // KROK 4 — Profil charity
  if (krok === "k4") {
    return (
      <KrokProfil
        org={org!}
        nazov={nazov}
        toast={toast}
        onBack={() => goto("k3")}
        onNext={() => {
          ulozStavTicho(org!.id, "dobrovolnictvo");
          goto("k5");
        }}
      />
    );
  }

  // KROK 5 — Záujem o dobrovoľníkov
  if (krok === "k5") {
    return (
      <KrokDobrovolnictvo
        org={org!}
        toast={toast}
        onBack={() => goto("k4")}
        onNext={() => {
          ulozStavTicho(org!.id, "segmenty");
          goto("k6");
        }}
      />
    );
  }

  // KROK 6 — Sektory a segmenty
  if (krok === "k6") {
    return (
      <KrokSegmenty
        org={org!}
        toast={toast}
        onBack={() => goto("k5")}
        onNext={() => {
          ulozStavTicho(org!.id, "pobocky");
          goto("k7");
        }}
      />
    );
  }

  // KROK 7 — Pobočky (voliteľné)
  if (krok === "k7") {
    return (
      <KrokPobocky
        org={org!}
        toast={toast}
        onBack={() => goto("k6")}
        onNext={() => {
          ulozStavTicho(org!.id, "balik");
          goto("k8");
        }}
      />
    );
  }

  // KROK 8 — Balíky + dokončenie
  if (krok === "k8") {
    return (
      <KrokBaliky
        org={org!}
        nazov={nazov}
        toast={toast}
        onBack={() => goto("k7")}
        onHotovo={onHotovo}
      />
    );
  }

  return null;
}

// ============================================================
// KROK 3 — Overenie organizácie (KYB · Didit, mock)
// ============================================================
interface KrokKybProps {
  org: OrgUcet;
  toast?: (text: string) => void;
  onBack: () => void;
  onNext: (nazov: string) => void;
}

function KrokKyb({ org, toast, onBack, onNext }: KrokKybProps) {
  const [ico, setIco] = useState("");
  const [reg, setReg] = useState<RegUdaje | null>(null); // { ico, nazov, sidlo, datum_vzniku, pravna_forma }
  const [stanovyNahrate, setStanovyNahrate] = useState(false);
  const [overene, setOverene] = useState(false);
  const [loadReg, setLoadReg] = useState(false); // doťahovanie z registra
  const [loadKyb, setLoadKyb] = useState(false); // overenie organizácie

  const icoCifry = ico.replace(/\D/g, "");
  const canDotiahnut = icoCifry.length >= 6;

  const dotiahni = async () => {
    setLoadReg(true);
    try {
      const r = await db.najdiIco(ico);
      setReg(r);
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
    }
    setLoadReg(false);
  };

  const nahrajStanovy = () => {
    setStanovyNahrate(true);
    toast?.("Stanovy nahrané (demo)");
  };

  const over = async () => {
    if (!reg) return;
    setLoadKyb(true);
    try {
      await db.spustiKyb(org.id, { stanovyRef: stanovyNahrate ? "stanovy.pdf" : null });
      await db.ulozOrganizaciu(org.id, {
        ico: reg.ico,
        nazov: reg.nazov,
        sidlo: reg.sidlo,
        datum_vzniku: reg.datum_vzniku,
        pravna_forma: reg.pravna_forma,
        z_registra: true,
      });
      await db.prepojStatutara(org.id, null, "štatutár (z registra)");
      setOverene(true);
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
    }
    setLoadKyb(false);
  };

  return (
    <Shell
      title="Overenie organizácie"
      step={3}
      total={8}
      onBack={onBack}
      footer={
        overene ? (
          <Patka onBack={onBack} onNext={() => onNext(reg!.nazov)} canNext next="Pokračovať" />
        ) : reg ? (
          <Patka onBack={onBack} onNext={over} canNext loading={loadKyb} next="Overiť organizáciu" />
        ) : (
          <Patka onBack={onBack} onNext={dotiahni} canNext={canDotiahnut} loading={loadReg} next="Doťiahnuť z registra" />
        )
      }
    >
      <Otazka>Over organizáciu cez verejný register (KYB)</Otazka>
      <TextPole
        label="IČO"
        value={ico}
        onChange={(v: string) => setIco(v.replace(/\D/g, "").slice(0, 10))}
        placeholder="napr. 36123456"
        inputMode="numeric"
        maxLength={10}
      />

      {reg && (
        <div style={{ marginTop: SPACE.xs }}>
          <Suhrn
            rows={[
              ["Názov", reg.nazov],
              ["Sídlo", reg.sidlo],
              ["Dátum vzniku", reg.datum_vzniku],
              ["Právna forma", reg.pravna_forma],
            ]}
          />
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.4 }}>
            Údaje z registra sa nedajú ručne meniť.
          </div>

          {/* doklad — stanovy (mock upload) */}
          <div style={{ marginTop: SPACE.sm }}>
            <div
              onClick={nahrajStanovy}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: stanovyNahrate ? "rgba(31,191,143,.1)" : "rgba(var(--glass-rgb),.04)",
                border: `1px solid ${stanovyNahrate ? "rgba(31,191,143,.4)" : C.line}`,
                borderRadius: RADIUS.sm,
                padding: `${SPACE.sm}px ${SPACE.sm}px`,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <span>Stanovy (dôkaz na kontrolu)</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: stanovyNahrate ? C.greenL : AKCENT }}>
                {stanovyNahrate ? "✓ nahrané" : "＋ doložiť"}
              </span>
            </div>
          </div>
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
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.greenL }}>Organizácia overená</div>
        </div>
      )}

      <div style={infoBox}>
        Štatutár sa overuje ako osoba (KYC) — closed loop. Vendor Didit KYB (demo).
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 4 — Profil charity
// ============================================================
interface KrokProfilProps {
  org: OrgUcet;
  nazov: string;
  toast?: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function KrokProfil({ org, nazov, toast, onBack, onNext }: KrokProfilProps) {
  const [misia, setMisia] = useState("");
  const [iban, setIban] = useState("");
  const [web, setWeb] = useState("");
  const [loading, setLoading] = useState(false);

  const filled = [misia.trim(), iban.trim(), web.trim()].filter(Boolean).length;
  const uplnost = 40 + filled * 20; // {misia, účet, web} → 40..100 %
  const canNext = !!misia.trim();

  const uloz = async () => {
    setLoading(true);
    try {
      await db.ulozProfilCharity(org.id, {
        misia: misia.trim(),
        web: web.trim() || null,
        siete: [],
        uplnost,
      });
      // IBAN patrí na organizáciu (profil_charity nemá bankový stĺpec)
      await db.ulozOrganizaciu(org.id, { bankovy_ucet: iban.trim() || null });
      onNext();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Profil charity"
      step={4}
      total={8}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={uloz} canNext={canNext} loading={loading} />}
    >
      <Otazka>Predstav sa adresáru</Otazka>

      {/* uzamknutý názov z registra */}
      <div style={{ marginBottom: SPACE.gutter }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, marginBottom: SPACE.xs }}>
          Názov (z registra)
        </div>
        <div
          style={{
            width: "100%",
            padding: SPACE.md,
            borderRadius: RADIUS.sm,
            background: "rgba(var(--glass-rgb),.03)",
            border: `1px solid ${C.line}`,
            color: C.textSec,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: SPACE.sm,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nazov || "—"}
          </span>
          <span style={{ fontSize: 12, color: C.textTer, flex: "0 0 auto" }}>🔒</span>
        </div>
      </div>

      <TextPole
        label="Krátky opis / misia"
        value={misia}
        onChange={setMisia}
        placeholder="Čomu sa venujete a pre koho ste tu?"
      />
      <TextPole
        label="Bankový účet (IBAN)"
        value={iban}
        onChange={setIban}
        placeholder="SK.. .... .... ...."
      />
      <TextPole
        label="web · FB · IG"
        value={web}
        onChange={setWeb}
        placeholder="www.charita.sk"
      />

      {/* úplnosť profilu */}
      <div style={{ marginTop: SPACE.xxs, marginBottom: SPACE.xxs }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textTer, marginBottom: SPACE.xs }}>
          <span>Úplnosť profilu</span>
          <span style={{ fontWeight: 700, color: AKCENT }}>{uplnost} %</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "rgba(var(--glass-rgb),.08)", overflow: "hidden" }}>
          <div style={{ height: 6, width: `${uplnost}%`, background: GRAD, borderRadius: 4, transition: "width .3s ease" }} />
        </div>
      </div>

      <div style={infoBox}>
        Čím kompletnejšie údaje, tým vyššia dôvera v adresári. Dôvera sa NEkupuje — len viditeľnosť.
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 5 — Záujem o dobrovoľníkov
// ============================================================
interface KrokDobrovolnictvoProps {
  org: OrgUcet;
  toast?: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function KrokDobrovolnictvo({ org, toast, onBack, onNext }: KrokDobrovolnictvoProps) {
  const [zaujem, setZaujem] = useState(false);
  const [typy, setTypy] = useState<string[]>([]); // string[]
  const [loading, setLoading] = useState(false);

  const prepniTyp = (k: string) =>
    setTypy((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const uloz = async () => {
    setLoading(true);
    try {
      await db.ulozDobrovolnictvo(org.id, { zaujem, typ: zaujem ? typy : [] });
      onNext();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Dobrovoľníci"
      step={5}
      total={8}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={uloz} canNext loading={loading} />}
    >
      <Otazka>Hľadáte dobrovoľníkov?</Otazka>
      <Prepinac
        on={zaujem}
        onToggle={() => setZaujem((b) => !b)}
        title="Máme záujem o dobrovoľníkov"
        desc="Zapneš párovanie s ľuďmi, ktorí chcú pomáhať."
      />

      {zaujem && (
        <div style={{ marginTop: SPACE.xxs }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, margin: "6px 0 8px" }}>
            Aký typ dobrovoľníctva?
          </div>
          {DOBRO_TYPY.map((t) => (
            <Prepinac
              key={t.kluc}
              on={typy.includes(t.kluc)}
              onToggle={() => prepniTyp(t.kluc)}
              title={t.title}
              desc={t.desc}
            />
          ))}
        </div>
      )}

      <div style={infoBox}>
        Bez príznaku na oboch stranách niet čo párovať. Organizovanie výziev je platená funkcia (od BASIC); samotný záujem je free.
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 6 — Sektory a segmenty (accordion z číselníka)
// ============================================================
interface SegmentVyber {
  sektor: string;
  pod_segment: string;
  vlastny: boolean;
}

interface KrokSegmentyProps {
  org: OrgUcet;
  toast?: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function KrokSegmenty({ org, toast, onBack, onNext }: KrokSegmentyProps) {
  const [skupiny, setSkupiny] = useState<any[] | null>(null); // null = načítava sa
  const [vyber, setVyber] = useState<SegmentVyber[]>([]); // [{sektor, pod_segment, vlastny}]
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let zive = true;
    (async () => {
      try {
        const data = await db.nacitajCiselnikSektorov();
        if (zive) setSkupiny(data || []);
      } catch (e: any) {
        toast?.("Chyba: " + e.message);
        if (zive) setSkupiny([]);
      }
    })();
    return () => {
      zive = false;
    };
  }, []);

  const jeVybrane = (s: string, h: string) =>
    vyber.some((x) => x.sektor === s && x.pod_segment === h);
  const onToggle = (s: string, h: string) =>
    setVyber((v) =>
      v.some((x) => x.sektor === s && x.pod_segment === h)
        ? v.filter((x) => !(x.sektor === s && x.pod_segment === h))
        : [...v, { sektor: s, pod_segment: h, vlastny: false }]
    );
  const onVlastny = (s: string, t: string) => {
    const val = t.trim();
    if (!val) return;
    setVyber((v) =>
      v.some((x) => x.sektor === s && x.pod_segment === val)
        ? v
        : [...v, { sektor: s, pod_segment: val, vlastny: true }]
    );
  };

  const uloz = async () => {
    setLoading(true);
    try {
      await db.ulozSegmenty(org.id, vyber);
      onNext();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Sektory a segmenty"
      step={6}
      total={8}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={uloz} canNext={vyber.length >= 1} loading={loading} />}
    >
      <Otazka>V akých oblastiach pôsobíte?</Otazka>
      {skupiny === null ? (
        <div style={{ textAlign: "center", padding: "30px 14px", color: C.textTer, fontSize: 13.5 }}>
          Načítavam sektory…
        </div>
      ) : skupiny.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 14px", color: C.textTer, fontSize: 13.5 }}>
          Číselník je zatiaľ prázdny.
        </div>
      ) : (
        <Accordion skupiny={skupiny} jeVybrane={jeVybrane} onToggle={onToggle} onVlastny={onVlastny} akcent={AKCENT} />
      )}
      <div style={infoBox}>
        Vyber podľa stanov — nie vymýšľaj. 10 sektorov je free, pod-segmenty od BASIC. Citlivé segmenty = prísnejšia spätná kontrola.
      </div>
    </Shell>
  );
}

// ============================================================
// KROK 7 — Pobočky (voliteľné)
// ============================================================
interface PobockaPolozka {
  mesto: string;
  rezim: string;
}

interface KrokPobockyProps {
  org: OrgUcet;
  toast?: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function KrokPobocky({ org, toast, onBack, onNext }: KrokPobockyProps) {
  const [mesto, setMesto] = useState("");
  const [rezim, setRezim] = useState("samostatna");
  const [zoznam, setZoznam] = useState<PobockaPolozka[]>([]); // [{mesto, rezim}]
  const [loading, setLoading] = useState(false);

  const pridaj = () => {
    const m = mesto.trim();
    if (!m) {
      toast?.("Zadaj mesto pobočky.");
      return;
    }
    setZoznam((s) => [...s, { mesto: m, rezim }]);
    setMesto("");
    setRezim("samostatna");
  };

  const zmaz = (i: number) => setZoznam((s) => s.filter((_, k) => k !== i));

  const dalej = async () => {
    setLoading(true);
    try {
      for (const p of zoznam) {
        await db.pridajPobocku(org.id, { mesto: p.mesto, rezim: p.rezim, ico: null, bankovyUcet: null });
      }
      onNext();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  const rezimLabel = (r: string) => (r === "samostatna" ? "Samostatná" : "Pod centrálou");

  return (
    <Shell
      title="Pobočky"
      step={7}
      total={8}
      onBack={onBack}
      footer={
        <div style={{ display: "flex", gap: SPACE.sm }}>
          <button
            onClick={loading ? undefined : dalej}
            disabled={loading}
            style={{
              flex: "0 0 auto",
              padding: `${SPACE.md}px ${SPACE.lg}px`,
              borderRadius: 14,
              background: "rgba(var(--glass-rgb),.05)",
              color: C.textSec,
              border: `1px solid ${C.line}`,
              fontWeight: 700,
              fontSize: 15.5,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Preskočiť
          </button>
          <Patka onNext={dalej} canNext loading={loading} />
        </div>
      }
    >
      <Otazka>Máte pobočky? (voliteľné)</Otazka>
      <div style={infoBox}>Pobočky pridáva len overená centrála (od PRO).</div>

      <div style={{ marginTop: SPACE.gutter }}>
        <TextPole label="Mesto pobočky" value={mesto} onChange={setMesto} placeholder="napr. Žilina" />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, margin: "4px 0 8px" }}>Režim</div>
        {POBOCKA_REZIMY.map((r) => (
          <Vyber
            key={r.rezim}
            emoji={r.emoji}
            title={r.title}
            desc={r.desc}
            active={rezim === r.rezim}
            onClick={() => setRezim(r.rezim)}
          />
        ))}
        <button
          onClick={pridaj}
          style={{
            width: "100%",
            padding: `${SPACE.sm}px 0`,
            borderRadius: RADIUS.sm,
            border: `1px solid ${AKCENT}`,
            background: "transparent",
            color: AKCENT,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            marginTop: SPACE.xxs,
          }}
        >
          ＋ Pridať pobočku
        </button>
      </div>

      {zoznam.length > 0 && (
        <div style={{ marginTop: SPACE.md }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, marginBottom: SPACE.xs }}>
            Pridané pobočky ({zoznam.length})
          </div>
          {zoznam.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: SPACE.sm,
                padding: `${SPACE.sm}px ${SPACE.sm}px`,
                borderRadius: RADIUS.sm,
                background: "rgba(var(--glass-rgb),.04)",
                border: `1px solid ${C.line}`,
                marginBottom: SPACE.xs,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.mesto}</div>
                <div style={{ fontSize: 12, color: C.textTer, marginTop: 2 }}>{rezimLabel(p.rezim)}</div>
              </div>
              <span
                onClick={() => zmaz(i)}
                style={{ fontSize: 12, fontWeight: 700, color: C.red, cursor: "pointer", flex: "0 0 auto" }}
              >
                Odstrániť
              </span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

// ============================================================
// KROK 8 — Balíky + dokončenie
// ============================================================
interface KrokBalikyProps {
  org: OrgUcet;
  nazov: string;
  toast?: (text: string) => void;
  onBack: () => void;
  onHotovo?: () => void;
}

function KrokBaliky({ org, nazov, toast, onBack, onHotovo }: KrokBalikyProps) {
  const [plan, setPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);
  const [hotovo, setHotovo] = useState(false);

  const dokonci = async () => {
    setLoading(true);
    try {
      await db.ulozBalik(org.id, plan.toLowerCase());
      await db.dokonciRegistraciu(org.id);
      setHotovo(true);
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  const zatvorOslavu = () => {
    setSession({
      ucet_id: org.id,
      typ: "charita",
      poradove_cislo: (org.poradove_cislo as number) ?? null,
      meno: nazov || "",
    });
    onHotovo?.();
  };

  if (hotovo) {
    return (
      <Oslava
        emoji="🎉"
        title="Ste overení"
        text="Vitajte v DEED."
        onClose={zatvorOslavu}
      />
    );
  }

  return (
    <Shell
      title="Balík"
      step={8}
      total={8}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={dokonci} canNext loading={loading} next="Dokončiť" />}
    >
      <Otazka>Vyber balík (ponuku môžeš preskočiť — FREE stačí)</Otazka>
      {BALIKY.map((b) => (
        <Vyber
          key={b.plan}
          emoji={b.emoji}
          title={b.title}
          desc={b.desc}
          active={plan === b.plan}
          onClick={() => setPlan(b.plan)}
        />
      ))}
      <div style={infoBox}>
        Overenie + profil + 10 sektorov + základný badge = vždy FREE. Platené = funkcie a viditeľnosť, nie dôvera.
      </div>
    </Shell>
  );
}
