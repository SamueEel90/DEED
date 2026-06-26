// ============================================================
// DEED · Registrácia — zdieľaný UI kit
// Vizuál zladený s appkou (theme C/GRAD, shared Hlavicka/Otazka).
// Univerzálne kroky (telefón+SMS, zámok) sa podľa špecifikácie
// stavajú RAZ a používa ich osoba aj charita (§4).
// ============================================================
import { useState, type ReactNode, type CSSProperties } from "react";
import { C, GRAD, btn, inp, infoBox, glassTmavy } from "@/theme";
import { Hlavicka, Otazka, IkonaFajka, IkonaSipDole } from "@/shared";
import { vytvorUcet, nastavZabezpecenie, posliOtp } from "@/lib/db";

// ---- škrupina kroku: hlavička + scroll obsah + sticky pätička ----
export function Shell({
  title,
  step,
  total,
  onBack,
  children,
  footer,
}: {
  title: string;
  step?: number;
  total?: number;
  onBack?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <Hlavicka title={title} step={step} total={total} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "18px 16px 22px" }}>{children}</div>
      {footer && (
        <div style={{ padding: "10px 16px 16px", ...glassTmavy(18, 0.6), borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ---- pätičkové tlačidlá (Späť / hlavná akcia) ----
export function Patka({
  onBack,
  onNext,
  next = "Pokračovať",
  canNext = true,
  loading,
}: {
  onBack?: () => void;
  onNext?: () => void;
  next?: string;
  canNext?: boolean;
  loading?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {onBack && <button onClick={onBack} style={{ ...btn("ghost"), flex: "0 0 auto", padding: "15px 22px" }}>Späť</button>}
      <button
        onClick={canNext && !loading ? onNext : undefined}
        disabled={!canNext || loading}
        style={btn(canNext && !loading ? "primary" : "disabled")}
      >
        {loading ? "Pracujem…" : next}
      </button>
    </div>
  );
}

// ---- popisok poľa ----
export function Pole({ label, hint, children }: { label?: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textTer, marginBottom: 6 }}>{label}</div>}
      {children}
      {hint && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 5, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

export function TextPole({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <Pole label={label} hint={hint}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        style={{ ...inp(), minHeight: 0 }}
      />
    </Pole>
  );
}

// ---- prepínač (toggle) ----
export function Prepinac({ on, onToggle, title, desc }: { on?: boolean; onToggle?: () => void; title?: ReactNode; desc?: ReactNode }) {
  return (
    <div
      onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 13, border: `1px solid ${C.line}`, background: "rgba(var(--glass-rgb),.04)", cursor: "pointer", marginBottom: 10 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ width: 44, height: 26, borderRadius: 14, flex: "0 0 auto", background: on ? GRAD : "rgba(var(--glass-rgb),.14)", position: "relative", transition: "background .2s ease" }}>
        <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s ease", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
      </div>
    </div>
  );
}

// ---- výberová položka (zaškrtnutie) ----
function CheckRiadok({ label, on, onClick, akcent }: { label?: ReactNode; on?: boolean; onClick?: () => void; akcent: string }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 4px", cursor: "pointer" }}>
      <span style={{ width: 21, height: 21, borderRadius: 6, flex: "0 0 auto", border: `1.5px solid ${on ? akcent : "rgba(var(--glass-rgb),.22)"}`, background: on ? akcent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on && <IkonaFajka size={13} color="#fff" />}
      </span>
      <span style={{ fontSize: 14, color: on ? C.text : C.textSec }}>{label}</span>
    </div>
  );
}

// ============================================================
// ACCORDION (oblasť/sektor → pod-položky) — §6 osoba aj charita
// skupiny: [{ nazov, polozky: [{ hodnota, ... }] }]
// jeVybrane(nazov, hodnota) -> bool · onToggle(nazov, hodnota) · onVlastny(nazov, text)
// ============================================================
type AccPolozka = { hodnota: string; [k: string]: any };
type AccSkupina = { nazov: string; polozky: AccPolozka[] };

export function Accordion({
  skupiny,
  jeVybrane,
  onToggle,
  onVlastny,
  akcent = C.blueL,
}: {
  skupiny: AccSkupina[];
  jeVybrane: (nazov: string, hodnota: string) => boolean;
  onToggle: (nazov: string, hodnota: string) => void;
  onVlastny?: (nazov: string, text: string) => void;
  akcent?: string;
}) {
  const [otvorene, setOtvorene] = useState<string | null>(null);
  return (
    <>
      {skupiny.map((s) => {
        const open = otvorene === s.nazov;
        const pocet = s.polozky.filter((p) => jeVybrane(s.nazov, p.hodnota)).length;
        return (
          <div key={s.nazov} style={{ border: `1px solid ${C.line}`, borderRadius: 14, marginBottom: 9, overflow: "hidden", background: "rgba(var(--glass-rgb),.03)" }}>
            <div
              onClick={() => setOtvorene(open ? null : s.nazov)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", cursor: "pointer" }}
            >
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{s.nazov}</span>
              {pocet > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: akcent, background: "rgba(116,166,255,.14)", borderRadius: 9, padding: "2px 8px" }}>{pocet}</span>
              )}
              <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s ease", display: "flex", color: C.textTer }}>
                <IkonaSipDole size={16} color={C.textTer} />
              </span>
            </div>
            {open && (
              <div style={{ padding: "2px 12px 12px", borderTop: `1px solid ${C.line2}` }}>
                {s.polozky.map((p) => (
                  <CheckRiadok key={p.hodnota} label={p.hodnota} on={jeVybrane(s.nazov, p.hodnota)} onClick={() => onToggle(s.nazov, p.hodnota)} akcent={akcent} />
                ))}
                {onVlastny && <VlastnaPolozka onAdd={(t) => onVlastny(s.nazov, t)} akcent={akcent} />}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function VlastnaPolozka({ onAdd, akcent }: { onAdd: (text: string) => void; akcent: string }) {
  const [t, setT] = useState("");
  const pridaj = () => {
    const v = t.trim();
    if (!v) return;
    onAdd(v);
    setT("");
  };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input
        value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && pridaj()}
        placeholder="dopísať vlastný…"
        style={{ ...inp(), minHeight: 0, padding: "10px 12px", fontSize: 13.5 }}
      />
      <button onClick={pridaj} style={{ flex: "0 0 auto", padding: "0 16px", borderRadius: 11, border: `1px solid ${akcent}`, background: "transparent", color: akcent, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
        Pridať
      </button>
    </div>
  );
}

// ============================================================
// UNIVERZÁLNY KROK 1 — Telefón + SMS (kľúč k účtu, §4.1)
// vyzadujEmail=true pre charitu (§2.1). onHotovo(ucet) → ucet z DB.
// ============================================================
export function KrokTelefonSms({
  step,
  total,
  onBack,
  typ = "aktivny",
  vyzadujEmail = false,
  onHotovo,
  toast,
}: {
  step?: number;
  total?: number;
  onBack?: () => void;
  typ?: string;
  vyzadujEmail?: boolean;
  onHotovo: (ucet: any) => void;
  toast?: (msg: string) => void;
}) {
  const [faza, setFaza] = useState("zadanie"); // zadanie | overenie
  const [tel, setTel] = useState("+421 ");
  const [email, setEmail] = useState("");
  const [kod, setKod] = useState("");
  const [demoKod, setDemoKod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const telOk = tel.replace(/\D/g, "").length >= 9;
  const emailOk = !vyzadujEmail || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const posli = async () => {
    setLoading(true);
    try {
      const { kod } = await posliOtp(tel);
      setDemoKod(kod);
      setFaza("overenie");
    } catch (e: any) {
      toast?.("Chyba pri odoslaní SMS: " + e.message);
    }
    setLoading(false);
  };

  const over = async () => {
    if (kod !== demoKod) {
      toast?.("Nesprávny kód (DEMO: " + demoKod + ")");
      return;
    }
    setLoading(true);
    try {
      const ucet: any = await vytvorUcet({ typ, telefon: tel.trim(), email: vyzadujEmail ? email.trim() : null });
      if (ucet.obnovene) toast?.("Účet obnovený — pokračuješ tam, kde si skončil.");
      onHotovo(ucet);
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Telefón + SMS"
      step={step}
      total={total}
      onBack={faza === "overenie" ? () => setFaza("zadanie") : onBack}
      footer={
        faza === "zadanie" ? (
          <Patka onNext={posli} canNext={telOk && emailOk} loading={loading} next="Poslať kód" />
        ) : (
          <Patka onBack={() => setFaza("zadanie")} onNext={over} canNext={kod.length === 6} loading={loading} next="Overiť a pokračovať" />
        )
      }
    >
      {faza === "zadanie" ? (
        <>
          <Otazka>Telefón je kľúč k tvojmu účtu</Otazka>
          <TextPole label="Telefónne číslo" value={tel} onChange={setTel} placeholder="+421 9XX XXX XXX" inputMode="tel" />
          {vyzadujEmail && (
            <TextPole label="Oficiálny email organizácie (overený)" value={email} onChange={setEmail} placeholder="info@charita.sk" inputMode="email" />
          )}
          <div style={infoBox}>Účet vznikne hneď po overení čísla — ak appka spadne, pokračuješ tam, kde si skončil (priebežné ukladanie).</div>
        </>
      ) : (
        <>
          <Otazka>Zadaj kód z SMS</Otazka>
          <TextPole label={"Kód poslaný na " + tel} value={kod} onChange={(v) => setKod(v.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" inputMode="numeric" maxLength={6} />
          {demoKod && (
            <div style={{ ...infoBox, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.3)", color: C.gold } as CSSProperties}>
              DEMO režim — žiadna reálna SMS sa neposiela. Tvoj kód je <b>{demoKod}</b>.
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

// ============================================================
// UNIVERZÁLNY KROK 2 — Zabezpečenie účtu (PIN + biometria, §4.2)
// ============================================================
export function KrokZabezpecenie({
  step,
  total,
  onBack,
  ucetId,
  onHotovo,
  toast,
}: {
  step?: number;
  total?: number;
  onBack?: () => void;
  ucetId: string;
  onHotovo: () => void;
  toast?: (msg: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [bio, setBio] = useState(false);
  const [loading, setLoading] = useState(false);

  const ok = pin.length >= 4 && pin === pin2;

  const uloz = async () => {
    setLoading(true);
    try {
      await nastavZabezpecenie(ucetId, { pin, biometria: bio });
      onHotovo();
    } catch (e: any) {
      toast?.("Chyba: " + e.message);
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Zabezpečenie účtu"
      step={step}
      total={total}
      onBack={onBack}
      footer={<Patka onBack={onBack} onNext={uloz} canNext={ok} loading={loading} />}
    >
      <Otazka>Nastav si zámok, ktorým sa do účtu vraciaš</Otazka>
      <TextPole label="PIN / heslo (min. 4 znaky)" value={pin} onChange={setPin} placeholder="••••" type="password" inputMode="numeric" />
      <TextPole label="Zopakuj pre potvrdenie" value={pin2} onChange={setPin2} placeholder="••••" type="password" inputMode="numeric" />
      {pin2 && pin !== pin2 && <div style={{ fontSize: 12.5, color: C.red, marginTop: -6, marginBottom: 10 }}>PIN sa nezhoduje.</div>}
      <Prepinac on={bio} onToggle={() => setBio((b) => !b)} title="Biometria (odtlačok / Face ID)" desc="Voliteľné — rýchly návrat do účtu na tomto zariadení." />
      <div style={infoBox}>Karma je viazaná na overenie (KYC), nie na mobil. Pri citlivých akciách (výber, zmena účtu) sa pýta heslo znova + 2FA.</div>
    </Shell>
  );
}
