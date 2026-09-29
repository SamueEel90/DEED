// KARTA 18 · bod 3 — Upraviť profil (osoba) + Ochrana osoby.
// Poradie: Fotky · Meno (zamknuté) · Ako sa ukážeš pri dare · Miesto, kde sa zdržiavam · O mne · Súkromie · [Uložiť].
// Uložiť je zašednuté, kým nie je zmena alebo chýba ulica či mesto.
import { useState, type ReactNode } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajPredvolbu, ulozPredvolbu, type VerziaIdentity } from "@/lib/darcovia";
import { nacitajOsobny, ulozOsobny, type OsobnyProfil } from "@/lib/osobnyProfil";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { FotoProfiluObsah } from "@/components/fotoprofilu";
import { toast } from "@/components/toast";
import { Harok } from "@/features/zbierka/Zdielat";
import "@/styles/platba.css";

type Stav = OsobnyProfil & { verzia: VerziaIdentity };

const nadpis = (t: ReactNode) => <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{t}</div>;
const pomoc = (t: ReactNode) => <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ink4)" }}>{t}</div>;
const pole = { height: 50, minWidth: 0, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" } as const;
const Prepinac = ({ on }: { on: boolean }) => (
  <span style={{ width: 48, height: 28, borderRadius: 14, background: on ? "var(--green)" : "#C9C4B8", position: "relative", transition: "background .2s ease", flex: "none" }}>
    <span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transform: on ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>);
const Riadok = ({ t, s, on, onClick, hore }: { t: string; s: string; on: boolean; onClick: () => void; hore?: boolean }) => (
  <div onClick={onClick} role="switch" aria-checked={on} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, cursor: "pointer", borderTop: hore ? "1px solid var(--cardBd)" : "none" }}>
    <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
    <Prepinac on={on} />
  </div>);
const Sipka = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>;
const Stit = ({ size = 17 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>;

export function UpravOsobnyProfil({ onClose }: { onClose: () => void }) {
  const ja = usePouzivatel();
  const [mojeFotky, zmenMojeFotky] = useFotkyEntity(klucEntity("ja", ja.ucetId || "demo"));
  const [fotka, setFotka] = useState(false);
  const [ochrana, setOchrana] = useState(false);
  const [povodny] = useState<Stav>(() => {
    const o = nacitajOsobny(), p = nacitajPredvolbu();
    return { ...o, mesto: o.mesto || (ja.mesto && ja.mesto !== "—" ? ja.mesto : ""), prezyvka: o.prezyvka || ja.nick || "",
      verzia: (p.verzia === 5 ? 1 : p.verzia) as VerziaIdentity };
  });
  const [e, setE] = useState<Stav>(povodny);
  const set = <K extends keyof Stav>(k: K, v: Stav[K]) => setE((x) => ({ ...x, [k]: v }));
  const zmena = JSON.stringify(e) !== JSON.stringify(povodny);
  const moze = zmena && e.ulica.trim().length > 0 && e.mesto.trim().length > 0;

  const meno = ja.meno || "Člen", priezv = ja.priezvisko || "";
  const inic = `${meno}${priezv ? ` ${priezv[0]}.` : ""}`;
  const MOZNOSTI: [VerziaIdentity, string, string][] = [[1, "Celé meno", `${meno} ${priezv}`.trim()], [2, "Meno a iniciála", inic], [3, "Prezývka", "vymyslíš si ju"], [4, "Anonymne", "Anonymný darca"]];
  const nahlad = e.verzia === 1 ? `${meno} ${priezv}`.trim() : e.verzia === 2 ? inic : e.verzia === 3 ? (e.prezyvka || "Prezývka") : "Anonymný darca";
  const foto = e.verzia !== 4 && e.fotoPriDare;
  const ini = `${meno[0] ?? ""}${priezv[0] ?? ""}`.toUpperCase();

  const uloz = () => {
    if (!moze) return;
    const { verzia, ...osobny } = e;
    ulozOsobny(osobny);
    ulozPredvolbu({ ...nacitajPredvolbu(), verzia });
    toast("Profil uložený");
    onClose();
  };

  return (
    <>
      <Harok onClose={onClose} zatvorText="Zrušiť" plnaVyska hlavicka={<span style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>Upraviť profil</span>}
        paticka={<button type="button" onClick={uloz} disabled={!moze} style={{ flex: 1, height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: moze ? "pointer" : "default", background: "var(--gGrad)", opacity: moze ? 1 : .45, transition: "opacity .2s ease", fontFamily: "inherit" }}>Uložiť</button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis("FOTKY")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setFotka(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", minHeight: 60, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: ja.foto ? `url(${ja.foto}) center/cover` : "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flex: "none" }}>{ja.foto ? "" : ini}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>Profilová</span>
              </button>
              <button type="button" onClick={() => setFotka(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", minHeight: 60, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ width: 52, height: 30, borderRadius: 7, background: mojeFotky.cover ? `url(${mojeFotky.cover}) center/cover` : "linear-gradient(135deg,#C9D5BC,#E2D7BF)", flex: "none" }} />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>Titulná</span>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis("MENO")}
            <div style={{ ...pole, display: "flex", alignItems: "center", gap: 10, color: "var(--ink2)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>{ja.celeMeno}</div>
            {pomoc("Overené pri registrácii. Zmenu mena rieši podpora.")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis("AKO SA UKÁŽEŠ PRI DARE")}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {MOZNOSTI.map(([k, t, s]) => {
                const on = e.verzia === k;
                return (
                  <div key={k} onClick={() => set("verzia", k)} role="radio" aria-checked={on} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "8px 14px", borderRadius: 14, cursor: "pointer", background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}` }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", border: `2px solid ${on ? "var(--green)" : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
                  </div>);
              })}
            </div>
            {e.verzia === 3 && <input value={e.prezyvka} onChange={(x) => set("prezyvka", x.target.value.slice(0, 24))} placeholder="Tvoja prezývka" maxLength={24} style={pole} />}
            {e.verzia !== 4 && <Riadok t="Zobraziť fotku pri dare" s="inak sa ukáže iniciála" on={e.fotoPriDare} onClick={() => set("fotoPriDare", !e.fotoPriDare)} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "var(--card)" }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: foto ? (ja.foto ? `url(${ja.foto}) center/cover` : "linear-gradient(135deg,#8FA98A,#5F7F5A)") : "var(--gSoft)", color: foto ? "#fff" : "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flex: "none", border: foto ? "2px solid #fff" : "none", boxSizing: "border-box" }}>
                {e.verzia === 4 ? "?" : foto ? (ja.foto ? "" : "foto") : (nahlad[0] || "M")}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{nahlad}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>takto ťa uvidia v zozname darcov</span></span>
            </div>
            {pomoc("Pri každom dare to môžeš zmeniť, toto je predvolené.")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis("MIESTO, KDE SA ZDRŽIAVAM")}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 108px", gap: 8 }}>
              <input value={e.ulica} onChange={(x) => set("ulica", x.target.value)} placeholder="Ulica" autoComplete="address-line1" style={pole} />
              <input value={e.cislo} onChange={(x) => set("cislo", x.target.value.slice(0, 10))} placeholder="Číslo" style={{ ...pole, fontVariantNumeric: "tabular-nums" }} />
            </div>
            <input value={e.mesto} onChange={(x) => set("mesto", x.target.value)} placeholder="Mesto alebo obec" autoComplete="address-level2" style={pole} />
            {pomoc("Nemusí to byť adresa z občianskeho. Číslo domu je nepovinné. Adresu nikto nevidí, podľa nej ti ukážeme skutky a pomoc z tvojej štvrte.")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>{nadpis("O MNE")}<span style={{ fontSize: 12, color: "var(--ink4)", fontVariantNumeric: "tabular-nums" }}>{e.oMne.length} / 150</span></div>
            <textarea value={e.oMne} onChange={(x) => set("oMne", x.target.value.slice(0, 150))} maxLength={150} rows={3} placeholder="Napr. Rád pomôžem so záhradou aj s počítačom."
              style={{ ...pole, height: "auto", padding: "12px 14px", fontSize: 15, lineHeight: 1.45, resize: "none" }} />
            {pomoc("Nepovinné. Ukáže sa pod menom na tvojom profile.")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {nadpis("SÚKROMIE")}
            <Riadok t="Verejný profil" s={e.verejny ? "profil a skutky vidia ostatní" : "pri daroch si Anonymný darca"} on={e.verejny} onClick={() => set("verejny", !e.verejny)} />
            <Riadok hore t="Ukazovať môj štít" s="pri mene, v zozname darcov a na profile" on={e.ukazStit} onClick={() => set("ukazStit", !e.ukazStit)} />
            <div onClick={() => setOchrana(true)} role="button" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, cursor: "pointer", borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Stit /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>Ochrana osoby</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>tvoje skóre nikdy nepoužijeme proti tebe</span></span>
              <Sipka />
            </div>
          </div>
        </div>
      </Harok>
      {ochrana && <OchranaOsoby onClose={() => setOchrana(false)} />}
      {fotka && (
        // OPRAVY 72: fotky ako hárok NAD Upraviť profil (vyššia vrstva); hárok pod ním sa nehýbe, Späť zavrie len fotky
        <Harok z={170} onClose={() => setFotka(false)} zatvorText="Späť" hlavicka={<span style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>Fotky môjho profilu</span>}>
          <FotoProfiluObsah titul="Fotky môjho profilu" popis="" bezHlavicky foto={ja.foto} nahrada={ja.iniciala}
            onZmena={(url) => { ja.nastavFoto?.(url); toast(url ? "Profilová fotka uložená" : "Profilová fotka odstránená"); }}
            cover={mojeFotky.cover} coverPopis="Široká fotka na pozadí hlavičky profilu."
            onCover={(url) => { zmenMojeFotky({ cover: url }); toast(url ? "Titulná fotka uložená" : "Titulná fotka odstránená"); }} />
        </Harok>
      )}
    </>
  );
}

/** Ochrana osoby — potvrdenie o človeku vyzerá vždy rovnako (nie vypínač) */
export function OchranaOsoby({ onClose }: { onClose: () => void }) {
  const r = (k: string, v: string, prvy?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: prvy ? "11px 0 9px" : "9px 0", marginTop: prvy ? 6 : 0, borderTop: "1px solid var(--cardBd)", fontSize: 14.5 }}><span>{k}</span><b style={{ color: "var(--gInk)" }}>{v}</b></div>);
  return (
    <Harok onClose={onClose} hlavicka={<>
      <span style={{ width: 44, height: 44, borderRadius: 13, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Stit size={22} /></span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 20, fontWeight: 800 }}>Ochrana osoby</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>Tvoje skóre nikdy nepoužijeme proti tebe.</span></span>
    </>} paticka={<button type="button" onClick={onClose} style={{ flex: 1, height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" }}>Rozumiem</button>}>
      <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Karmu a skutky vidíš len ty. Systém ich potrebuje, aby si dostal odmeny, ale nikto iný si ich nevie pozrieť ani porovnať.</div>
      <div style={{ padding: "14px 16px 12px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--blue)" }}>KEĎ NIEKTO CHCE POTVRDENIE O TEBE</div>
        <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 3 }}>napr. úrad alebo zamestnávateľ, teraz ani v budúcnosti</div>
        {r("Karma", "nad priemerom", true)}{r("Skutky", "v norme komunity")}{r("Dôveryhodnosť", "nad priemerom")}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Toto potvrdenie vyzerá rovnako pre každého. Nedá sa ním dokázať nízke skóre. <b style={{ color: "var(--ink)" }}>Za skutky ťa odmeníme, za ich nedostatok nikdy nepotrestáme.</b></div>
    </Harok>
  );
}
