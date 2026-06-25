// ============================================================
// DEED · Registrácia — Charita / OZ (§11)
// 8 číslovaných krokov, plný organizačný účet.
// Stavový automat (krok) v tomto súbore; univerzálne kroky
// (telefón+SMS+email, zabezpečenie) sa preberajú z RegKit.
// Štatutár sa overuje ako osoba (KYC) — closed loop; org cez KYB (Didit).
// ============================================================
import { useEffect, useState } from "react";
import { C, GRAD, infoBox } from "../theme";
import { Vyber, Otazka, Oslava, Suhrn } from "../shared";
import { setSession } from "../lib/session";
import * as db from "../lib/db";
import {
  Shell,
  Patka,
  TextPole,
  Prepinac,
  Accordion,
  KrokTelefonSms,
  KrokZabezpecenie,
} from "./RegKit";

// charita akcent (fialová) — odlišuje organizačný tok od osobného
const AKCENT = "#A98BF0";

// best-effort priebežné ukladanie stavu — nikdy neblokuje navigáciu
async function ulozStavTicho(ucetId, stav) {
  try {
    await db.ulozStav(ucetId, stav);
  } catch {
    /* priebežné ukladanie je best-effort */
  }
}

export function CharitaFlow({ onHotovo, onSpat, toast }) {
  // ---- stavový automat ----
  //  "k1".."k8" — číslované 1..8
  const [krok, setKrok] = useState("k1");
  const [org, setOrg] = useState(null); // { id, typ, poradove_cislo, stav_registracie }
  const [nazov, setNazov] = useState(""); // názov organizácie z registra (KYB) — pre session

  const goto = (k) => setKrok(k);

  // KROK 1 — Kontaktné kanály (telefón + SMS + email) — univerzálny, vytvorí org účet
  if (krok === "k1") {
    return (
      <KrokTelefonSms
        step={1}
        total={8}
        typ="charita"
        vyzadujEmail={true}
        onBack={() => onSpat()}
        onHotovo={(u) => {
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
        ucetId={org.id}
        onBack={() => goto("k1")}
        onHotovo={() => {
          ulozStavTicho(org.id, "kyb");
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
        org={org}
        toast={toast}
        onBack={() => goto("k2")}
        onNext={(menoOrg) => {
          setNazov(menoOrg);
          ulozStavTicho(org.id, "profil");
          goto("k4");
        }}
      />
    );
  }

  // KROK 4 — Profil charity
  if (krok === "k4") {
    return (
      <KrokProfil
        org={org}
        nazov={nazov}
        toast={toast}
        onBack={() => goto("k3")}
        onNext={() => {
          ulozStavTicho(org.id, "dobrovolnictvo");
          goto("k5");
        }}
      />
    );
  }

  // KROK 5 — Záujem o dobrovoľníkov
  if (krok === "k5") {
    return (
      <KrokDobrovolnictvo
        org={org}
        toast={toast}
        onBack={() => goto("k4")}
        onNext={() => {
          ulozStavTicho(org.id, "segmenty");
          goto("k6");
        }}
      />
    );
  }

  // KROK 6 — Sektory a segmenty
  if (krok === "k6") {
    return (
      <KrokSegmenty
        org={org}
        toast={toast}
        onBack={() => goto("k5")}
        onNext={() => {
          ulozStavTicho(org.id, "pobocky");
          goto("k7");
        }}
      />
    );
  }

  // KROK 7 — Pobočky (voliteľné)
  if (krok === "k7") {
    return (
      <KrokPobocky
        org={org}
        toast={toast}
        onBack={() => goto("k6")}
        onNext={() => {
          ulozStavTicho(org.id, "balik");
          goto("k8");
        }}
      />
    );
  }

  // KROK 8 — Balíky + dokončenie
  if (krok === "k8") {
    return (
      <KrokBaliky
        org={org}
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
function KrokKyb({ org, toast, onBack, onNext }) {
  const [ico, setIco] = useState("");
  const [reg, setReg] = useState(null); // { ico, nazov, sidlo, datum_vzniku, pravna_forma }
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
    } catch (e) {
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
    } catch (e) {
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
          <Patka onBack={onBack} onNext={() => onNext(reg.nazov)} canNext next="Pokračovať" />
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
        onChange={(v) => setIco(v.replace(/\D/g, "").slice(0, 10))}
        placeholder="napr. 36123456"
        inputMode="numeric"
        maxLength={10}
      />

      {reg && (
        <div style={{ marginTop: 6 }}>
          <Suhrn
            rows={[
              ["Názov", reg.nazov],
              ["Sídlo", reg.sidlo],
              ["Dátum vzniku", reg.datum_vzniku],
              ["Právna forma", reg.pravna_forma],
            ]}
          />
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 7, lineHeight: 1.4 }}>
            Údaje z registra sa nedajú ručne meniť.
          </div>

          {/* doklad — stanovy (mock upload) */}
          <div style={{ marginTop: 12 }}>
            <div
              onClick={nahrajStanovy}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: stanovyNahrate ? "rgba(31,191,143,.1)" : "rgba(var(--glass-rgb),.04)",
                border: `1px solid ${stanovyNahrate ? "rgba(31,191,143,.4)" : C.line}`,
                borderRadius: 13,
                padding: "12px 13px",
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
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "13px 14px",
            borderRadius: 13,
            background: "rgba(31,191,143,.1)",
            border: "1px solid rgba(31,191,143,.4)",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
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
function KrokProfil({ org, nazov, toast, onBack, onNext }) {
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
    } catch (e) {
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
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, marginBottom: 6 }}>
          Názov (z registra)
        </div>
        <div
          style={{
            width: "100%",
            padding: 15,
            borderRadius: 13,
            background: "rgba(var(--glass-rgb),.03)",
            border: `1px solid ${C.line}`,
            color: C.textSec,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
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
      <div style={{ marginTop: 4, marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textTer, marginBottom: 6 }}>
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
const DOBRO_TYPY = [
  { kluc: "jednorazové", title: "Jednorazové", desc: "Akcie a brigády podľa potreby." },
  { kluc: "dlhodobé", title: "Dlhodobé", desc: "Pravidelná spolupráca." },
  { kluc: "odborné/skill-based", title: "Odborné / skill-based", desc: "Konkrétne zručnosti (IT, právo, dizajn…)." },
  { kluc: "podľa potreby", title: "Podľa potreby", desc: "Flexibilne, keď treba." },
];

function KrokDobrovolnictvo({ org, toast, onBack, onNext }) {
  const [zaujem, setZaujem] = useState(false);
  const [typy, setTypy] = useState([]); // string[]
  const [loading, setLoading] = useState(false);

  const prepniTyp = (k) =>
    setTypy((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const uloz = async () => {
    setLoading(true);
    try {
      await db.ulozDobrovolnictvo(org.id, { zaujem, typ: zaujem ? typy : [] });
      onNext();
    } catch (e) {
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
        <div style={{ marginTop: 4 }}>
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
function KrokSegmenty({ org, toast, onBack, onNext }) {
  const [skupiny, setSkupiny] = useState(null); // null = načítava sa
  const [vyber, setVyber] = useState([]); // [{sektor, pod_segment, vlastny}]
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let zive = true;
    (async () => {
      try {
        const data = await db.nacitajCiselnikSektorov();
        if (zive) setSkupiny(data || []);
      } catch (e) {
        toast?.("Chyba: " + e.message);
        if (zive) setSkupiny([]);
      }
    })();
    return () => {
      zive = false;
    };
  }, []);

  const jeVybrane = (s, h) => vyber.some((x) => x.sektor === s && x.pod_segment === h);
  const onToggle = (s, h) =>
    setVyber((v) =>
      v.some((x) => x.sektor === s && x.pod_segment === h)
        ? v.filter((x) => !(x.sektor === s && x.pod_segment === h))
        : [...v, { sektor: s, pod_segment: h, vlastny: false }]
    );
  const onVlastny = (s, t) => {
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
    } catch (e) {
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
const POBOCKA_REZIMY = [
  { rezim: "samostatna", emoji: "🏢", title: "Samostatná — vlastné IČO/účet", desc: "Pobočka s vlastnou identitou." },
  { rezim: "pod_centralou", emoji: "🏠", title: "Pod centrálou", desc: "Vedená pod ústredím." },
];

function KrokPobocky({ org, toast, onBack, onNext }) {
  const [mesto, setMesto] = useState("");
  const [rezim, setRezim] = useState("samostatna");
  const [zoznam, setZoznam] = useState([]); // [{mesto, rezim}]
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

  const zmaz = (i) => setZoznam((s) => s.filter((_, k) => k !== i));

  const dalej = async () => {
    setLoading(true);
    try {
      for (const p of zoznam) {
        await db.pridajPobocku(org.id, { mesto: p.mesto, rezim: p.rezim, ico: null, bankovyUcet: null });
      }
      onNext();
    } catch (e) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  const rezimLabel = (r) => (r === "samostatna" ? "Samostatná" : "Pod centrálou");

  return (
    <Shell
      title="Pobočky"
      step={7}
      total={8}
      onBack={onBack}
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={loading ? undefined : dalej}
            disabled={loading}
            style={{
              flex: "0 0 auto",
              padding: "15px 22px",
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

      <div style={{ marginTop: 14 }}>
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
            padding: "13px 0",
            borderRadius: 13,
            border: `1px solid ${AKCENT}`,
            background: "transparent",
            color: AKCENT,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            marginTop: 4,
          }}
        >
          ＋ Pridať pobočku
        </button>
      </div>

      {zoznam.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, marginBottom: 8 }}>
            Pridané pobočky ({zoznam.length})
          </div>
          {zoznam.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 13px",
                borderRadius: 13,
                background: "rgba(var(--glass-rgb),.04)",
                border: `1px solid ${C.line}`,
                marginBottom: 8,
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
const BALIKY = [
  { plan: "FREE", emoji: "🆓", title: "FREE — 0 €", desc: "Overenie + profil + 10 sektorov + základný badge." },
  { plan: "BASIC", emoji: "⭐", title: "BASIC — 400 €", desc: "Pod-segmenty, výzvy pre dobrovoľníkov, väčšia viditeľnosť." },
  { plan: "PRO", emoji: "🚀", title: "PRO — 1 500 €", desc: "Pobočky, rozšírené funkcie a dosah." },
  { plan: "ENTERPRISE", emoji: "🏛️", title: "ENTERPRISE — 2 990 €", desc: "Plný balík pre veľké organizácie." },
];

function KrokBaliky({ org, nazov, toast, onBack, onHotovo }) {
  const [plan, setPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);
  const [hotovo, setHotovo] = useState(false);

  const dokonci = async () => {
    setLoading(true);
    try {
      await db.ulozBalik(org.id, plan.toLowerCase());
      await db.dokonciRegistraciu(org.id);
      setHotovo(true);
    } catch (e) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  const zatvorOslavu = () => {
    setSession({
      ucet_id: org.id,
      typ: "charita",
      poradove_cislo: org.poradove_cislo,
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
