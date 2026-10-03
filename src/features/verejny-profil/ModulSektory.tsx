// KARTA 43 · platobný modul navrchu: centrálna zbierka + 3 sektory (2 × 2).
// Ťuk na dlaždicu ju zväčší (foto, na čo išlo minulý mesiac v meste človeka, „Uvidíš…")
// a hneď pod ňou platba: 1 / 5 / 10 / 25 / 50 € (1 € cez DEED), „Len v meste / Kde treba najviac",
// „S menom / Anonymne", dorovnanie a tlačidlo „Poslať 10 € · <sektor> v <meste>".
// Len transform/opacity, ťukacie plochy od 44 px, slovenský formát čísel, farby z tokenov.
import { useState, type CSSProperties } from "react";
import { pressable } from "@/components/pressable";
import { PlatobneOkno } from "@/features/zbierka/Platba";
import type { KanalPlatby } from "@/features/zbierka/Sumy";
import { pridajDar } from "@/lib/darcovia";
import { eur, mestoTextu, type Lokalita, type Mesto, type TestProfil, type TestSektor } from "@/lib/testProfily";
import { vMeste, karta, nadpisSekcie } from "./casti";

const SUMY = [1, 5, 10, 25, 50];
type Kde = "mesto" | "najviac";

export function ModulSektory({ profil, lok, domace }: { profil: TestProfil; lok: Lokalita; domace: Mesto }) {
  const mesto = mestoTextu(lok, domace);
  const dlazdice: (TestSektor & { centralna?: boolean })[] = [{ ...profil.centralna, centralna: true }, ...profil.sektory];
  const [otv, setOtv] = useState<string>(dlazdice[0].id);
  return (
    <div style={{ ...karta, padding: 16, display: "grid", gap: 14 }}>
      <div>
        <div style={nadpisSekcie}>Podporiť {profil.meno}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>Vyber, ako blízko chceš vidieť</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {dlazdice.map((s) => {
          const vybrane = otv === s.id;
          return (
            <button key={s.id} {...pressable()} onClick={() => setOtv(s.id)} aria-pressed={vybrane}
              style={{ textAlign: "left", minHeight: 44, padding: 12, borderRadius: 14, cursor: "pointer",
                background: vybrane ? "var(--gSoft)" : "var(--field)",
                border: `1px solid ${vybrane ? "var(--gBd)" : "var(--cardBd)"}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink4)" }}>{s.centralna ? "CENTRÁLNA ZBIERKA" : "SEKTOR"}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: vybrane ? "var(--gInk)" : "var(--ink)", marginTop: 2 }}>{s.nazov}</div>
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{s.mesta[mesto].dlazdica}</div>
            </button>
          );
        })}
      </div>
      <Zvacsena s={dlazdice.find((d) => d.id === otv)!} profil={profil} lok={lok} domace={domace} />
    </div>
  );
}

function Zvacsena({ s, profil, lok, domace }: { s: TestSektor & { centralna?: boolean }; profil: TestProfil; lok: Lokalita; domace: Mesto }) {
  const mesto = mestoTextu(lok, domace);
  const txt = s.mesta[mesto];
  const [suma, setSuma] = useState(10);
  const [kde, setKde] = useState<Kde>("najviac");
  const [anonym, setAnonym] = useState(false);
  const [platba, setPlatba] = useState<{ kanal: KanalPlatby; suma: number } | null>(null);
  const kanal: KanalPlatby = suma === 1 ? "deed" : "eur";
  const cielText = s.centralna ? "celá činnosť" : s.nazov.toLowerCase();
  const kdeText = kde === "mesto" ? ` v ${vMeste(mesto)}` : "";
  const dorovna = profil.typ === "firma" ? null : profil.typ === "tvorca" ? null : "Pekáreň Dobrota zdvojnásobí dar";

  return (
    <div style={{ ...karta, background: "var(--panel)", padding: 16, display: "grid", gap: 14 }}>
      <div style={{ height: 150, borderRadius: 12, background: `center/cover no-repeat url("${s.foto}")` }} />
      <div>
        <div style={nadpisSekcie}>{s.centralna ? "Centrálna zbierka" : "Sektor"}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>{s.nazov}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", marginTop: 6 }}>{txt.minulyMesiac}</div>
      </div>
      <Rozpis data={txt.rozpis} />
      <div style={{ fontSize: 12, color: "var(--ink4)" }}>{txt.uvidis}</div>
      {dorovna && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--gSoft)" }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--gold)", color: "#fff", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center" }}>PD</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>{dorovna}{suma > 1 ? ` · z ${eur(suma)} bude ${eur(suma * 2)}` : ""}</span>
      </div>}

      <Riadok titulok="Koľko">
        {SUMY.map((n) => (
          <Chip key={n} aktivne={suma === n} onClick={() => setSuma(n)}
            pod={n === 1 ? "cez DEED" : n === 10 ? "najčastejšie" : undefined}>{eur(n)}</Chip>
        ))}
      </Riadok>
      <Riadok titulok="Kde">
        <Chip aktivne={kde === "mesto"} onClick={() => setKde("mesto")}>Len v {vMeste(mesto)}</Chip>
        <Chip aktivne={kde === "najviac"} onClick={() => setKde("najviac")}>Kde treba najviac</Chip>
      </Riadok>
      <Riadok titulok="Meno">
        <Chip aktivne={!anonym} onClick={() => setAnonym(false)}>S menom</Chip>
        <Chip aktivne={anonym} onClick={() => setAnonym(true)}>Anonymne</Chip>
      </Riadok>

      <button {...pressable()} onClick={() => setPlatba({ kanal, suma })}
        style={{ minHeight: 48, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
        Poslať {eur(suma)} · {cielText}{kdeText}
      </button>
      <div style={{ fontSize: 12, color: "var(--ink4)", textAlign: "center" }}>
        {suma === 1 ? "1 € ide cez DEED." : "Karta, Apple Pay alebo DEED."} {anonym ? "V zozname darcov budeš ako anonymný." : "V zozname darcov budeš s menom."}
      </div>

      {platba && (
        <PlatobneOkno kanal={platba.kanal} suma={platba.suma} nazov={`${s.nazov}${kdeText}`} registrovany
          pred={{ vyzbierane: s.vyzbierane, ciel: null, pocetDarov: s.darcovia, darovDnes: 0 }}
          onClose={() => setPlatba(null)}
          onHotovo={(v) => pridajDar({ refId: s.id, suma: v.eur, kanal: v.kanal === "eur" ? "psp" : "deed", registrovany: true, volba: v.volba })} />
      )}
    </div>
  );
}

function Rozpis({ data }: { data: [string, number][] }) {
  const far = ["var(--green)", "var(--gold)", "var(--blue)"];
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ height: 8, borderRadius: 999, overflow: "hidden", display: "flex" }}>
        {data.map(([k, v], i) => <div key={k} style={{ width: `${v}%`, background: far[i % far.length] }} />)}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ink3)" }}>
        {data.map(([k, v], i) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: far[i % far.length] }} />{v} % {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function Riadok({ titulok, children }: { titulok: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink4)" }}>{titulok.toUpperCase()}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Chip({ children, aktivne, onClick, pod }: { children: React.ReactNode; aktivne: boolean; onClick: () => void; pod?: string }) {
  const s: CSSProperties = { minHeight: 44, padding: pod ? "6px 14px" : "0 16px", borderRadius: 12, cursor: "pointer",
    display: "grid", placeItems: "center", lineHeight: 1.1,
    background: aktivne ? "var(--green)" : "var(--field)", color: aktivne ? "#fff" : "var(--ink)",
    border: `1px solid ${aktivne ? "var(--green)" : "var(--cardBd)"}`, fontSize: 14, fontWeight: 800 };
  return (
    <button {...pressable()} onClick={onClick} aria-pressed={aktivne} style={s}>
      <span>{children}</span>
      {pod && <span style={{ fontSize: 10, fontWeight: 700, opacity: .8 }}>{pod}</span>}
    </button>
  );
}
