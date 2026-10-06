// KARTA 18 · bod 3 — Upraviť profil (osoba) + Ochrana osoby.
// Poradie: Fotky · Meno (zamknuté) · Ako sa ukážeš pri dare · Miesto, kde sa zdržiavam · O mne · Súkromie · [Uložiť].
// Uložiť je zašednuté, kým nie je zmena alebo chýba ulica či mesto.
import { useEffect, useState, type ReactNode } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajPredvolbu, ulozPredvolbu, type VerziaIdentity } from "@/lib/darcovia";
import { nacitajOsobny, ulozOsobny, type OsobnyProfil } from "@/lib/osobnyProfil";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { FotoProfiluObsah } from "@/components/fotoprofilu";
import { toast } from "@/components/toast";
import { nacitajVRebricku, nastavVRebricku } from "@/lib/db";
import { Harok } from "@/features/zbierka/Zdielat";
import { useT } from "@/i18n";
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
  const tr = useT();
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
  // 0061: súhlas byť v rebríčkoch žije na serveri (predvolene vypnutý)
  const [rebricekPovodny, setRebricekPovodny] = useState(false);
  const [rebricek, setRebricek] = useState(false);
  useEffect(() => {
    let zive = true;
    void nacitajVRebricku(ja.ucetId || "").then((v) => { if (zive) { setRebricekPovodny(v); setRebricek(v); } });
    return () => { zive = false; };
  }, [ja.ucetId]);
  const set = <K extends keyof Stav>(k: K, v: Stav[K]) => setE((x) => ({ ...x, [k]: v }));
  const zmena = JSON.stringify(e) !== JSON.stringify(povodny) || rebricek !== rebricekPovodny;
  const moze = zmena && e.ulica.trim().length > 0 && e.mesto.trim().length > 0;

  const meno = ja.meno || tr("upravit.clen"), priezv = ja.priezvisko || "";
  const inic = `${meno}${priezv ? ` ${priezv[0]}.` : ""}`;
  const MOZNOSTI: [VerziaIdentity, string, string][] = [[1, tr("upravit.celeMeno"), `${meno} ${priezv}`.trim()], [2, tr("upravit.menoIniciala"), inic], [3, tr("upravit.prezyvka"), tr("upravit.prezyvka.s")], [4, tr("upravit.anonymne"), tr("upravit.anonymnyDarca")]];
  const nahlad = e.verzia === 1 ? `${meno} ${priezv}`.trim() : e.verzia === 2 ? inic : e.verzia === 3 ? (e.prezyvka || tr("upravit.prezyvka")) : tr("upravit.anonymnyDarca");
  const foto = e.verzia !== 4 && e.fotoPriDare;
  const ini = `${meno[0] ?? ""}${priezv[0] ?? ""}`.toUpperCase();

  const uloz = () => {
    if (!moze) return;
    const { verzia, ...osobny } = e;
    ulozOsobny(osobny);
    ulozPredvolbu({ ...nacitajPredvolbu(), verzia });
    if (rebricek !== rebricekPovodny) void nastavVRebricku(rebricek).catch(() => toast(tr("upravit.vRebricku.chyba")));
    toast(tr("upravit.ulozeny"));
    onClose();
  };

  return (
    <>
      <Harok onClose={onClose} zatvorText={tr("sp.zrusit")} plnaVyska hlavicka={<span style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>{tr("profil.upravit")}</span>}
        paticka={<button type="button" onClick={uloz} disabled={!moze} style={{ flex: 1, height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: moze ? "pointer" : "default", background: "var(--gGrad)", opacity: moze ? 1 : .45, transition: "opacity .2s ease", fontFamily: "inherit" }}>{tr("sp.ulozit")}</button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis(tr("upravit.fotky"))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => setFotka(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", minHeight: 60, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: ja.foto ? `url(${ja.foto}) center/cover` : "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flex: "none" }}>{ja.foto ? "" : ini}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{tr("upravit.profilova")}</span>
              </button>
              <button type="button" onClick={() => setFotka(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", minHeight: 60, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ width: 52, height: 30, borderRadius: 7, background: mojeFotky.cover ? `url(${mojeFotky.cover}) center/cover` : "linear-gradient(135deg,#C9D5BC,#E2D7BF)", flex: "none" }} />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{tr("upravit.titulna")}</span>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis(tr("upravit.meno"))}
            <div style={{ ...pole, display: "flex", alignItems: "center", gap: 10, color: "var(--ink2)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>{ja.celeMeno}</div>
            {pomoc(tr("upravit.menoPomoc"))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis(tr("upravit.priDare"))}
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
            {e.verzia === 3 && <input value={e.prezyvka} onChange={(x) => set("prezyvka", x.target.value.slice(0, 24))} placeholder={tr("upravit.tvojaPrezyvka")} maxLength={24} style={pole} />}
            {e.verzia !== 4 && <Riadok t={tr("upravit.fotkaPriDare")} s={tr("upravit.fotkaPriDare.s")} on={e.fotoPriDare} onClick={() => set("fotoPriDare", !e.fotoPriDare)} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "var(--card)" }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: foto ? (ja.foto ? `url(${ja.foto}) center/cover` : "linear-gradient(135deg,#8FA98A,#5F7F5A)") : "var(--gSoft)", color: foto ? "#fff" : "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flex: "none", border: foto ? "2px solid #fff" : "none", boxSizing: "border-box" }}>
                {e.verzia === 4 ? "?" : foto ? (ja.foto ? "" : tr("upravit.foto")) : (nahlad[0] || "M")}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{nahlad}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>{tr("upravit.nahlad")}</span></span>
            </div>
            {pomoc(tr("upravit.predvolene"))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nadpis(tr("upravit.miesto"))}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 108px", gap: 8 }}>
              <input value={e.ulica} onChange={(x) => set("ulica", x.target.value)} placeholder={tr("upravit.ulica")} autoComplete="address-line1" style={pole} />
              <input value={e.cislo} onChange={(x) => set("cislo", x.target.value.slice(0, 10))} placeholder={tr("upravit.cislo")} style={{ ...pole, fontVariantNumeric: "tabular-nums" }} />
            </div>
            <input value={e.mesto} onChange={(x) => set("mesto", x.target.value)} placeholder={tr("upravit.mesto")} autoComplete="address-level2" style={pole} />
            {pomoc(tr("upravit.miestoPomoc"))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>{nadpis(tr("upravit.oMne"))}<span style={{ fontSize: 12, color: "var(--ink4)", fontVariantNumeric: "tabular-nums" }}>{e.oMne.length} / 150</span></div>
            <textarea value={e.oMne} onChange={(x) => set("oMne", x.target.value.slice(0, 150))} maxLength={150} rows={3} placeholder={tr("upravit.oMnePlaceholder")}
              style={{ ...pole, height: "auto", padding: "12px 14px", fontSize: 15, lineHeight: 1.45, resize: "none" }} />
            {pomoc(tr("upravit.oMnePomoc"))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {nadpis(tr("upravit.sukromie"))}
            <Riadok t={tr("upravit.verejny")} s={e.verejny ? tr("upravit.verejny.on") : tr("upravit.verejny.off")} on={e.verejny} onClick={() => set("verejny", !e.verejny)} />
            <Riadok hore t={tr("upravit.ukazStit")} s={tr("upravit.ukazStit.s")} on={e.ukazStit} onClick={() => set("ukazStit", !e.ukazStit)} />
            <Riadok hore t={tr("upravit.vRebricku")} s={rebricek ? tr("upravit.vRebricku.on") : tr("upravit.vRebricku.off")} on={rebricek} onClick={() => setRebricek(!rebricek)} />
            <div onClick={() => setOchrana(true)} role="button" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, cursor: "pointer", borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Stit /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{tr("upravit.ochrana")}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{tr("upravit.ochrana.s")}</span></span>
              <Sipka />
            </div>
          </div>
        </div>
      </Harok>
      {ochrana && <OchranaOsoby onClose={() => setOchrana(false)} />}
      {fotka && (
        // OPRAVY 72: fotky ako hárok NAD Upraviť profil (vyššia vrstva); hárok pod ním sa nehýbe, Späť zavrie len fotky
        <Harok z={170} onClose={() => setFotka(false)} zatvorText={tr("sp.spat")} hlavicka={<span style={{ flex: 1, fontSize: 19, fontWeight: 800 }}>{tr("upravit.fotkyProfilu")}</span>}>
          <FotoProfiluObsah titul={tr("upravit.fotkyProfilu")} popis="" bezHlavicky foto={ja.foto} nahrada={ja.iniciala}
            onZmena={(url) => { ja.nastavFoto?.(url); toast(url ? tr("upravit.fotkaUlozena") : tr("upravit.fotkaOdstranena")); }}
            cover={mojeFotky.cover} coverPopis={tr("upravit.coverPopis")}
            onCover={(url) => { zmenMojeFotky({ cover: url }); toast(url ? tr("upravit.titulnaUlozena") : tr("upravit.titulnaOdstranena")); }} />
        </Harok>
      )}
    </>
  );
}

/** Ochrana osoby — potvrdenie o človeku vyzerá vždy rovnako (nie vypínač) */
export function OchranaOsoby({ onClose }: { onClose: () => void }) {
  const tr = useT();
  const r = (k: string, v: string, prvy?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: prvy ? "11px 0 9px" : "9px 0", marginTop: prvy ? 6 : 0, borderTop: "1px solid var(--cardBd)", fontSize: 14.5 }}><span>{k}</span><b style={{ color: "var(--gInk)" }}>{v}</b></div>);
  return (
    <Harok onClose={onClose} hlavicka={<>
      <span style={{ width: 44, height: 44, borderRadius: 13, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Stit size={22} /></span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 20, fontWeight: 800 }}>{tr("upravit.ochrana")}</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>{tr("upravit.ochrana.veta")}</span></span>
    </>} paticka={<button type="button" onClick={onClose} style={{ flex: 1, height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" }}>{tr("upravit.rozumiem")}</button>}>
      <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{tr("upravit.ochrana.popis")}</div>
      <div style={{ padding: "14px 16px 12px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--blue)" }}>{tr("upravit.potvrdenie")}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 3 }}>{tr("upravit.potvrdenie.s")}</div>
        {r(tr("upravit.r.karma"), tr("upravit.r.nadPriemerom"), true)}{r(tr("upravit.r.skutky"), tr("upravit.r.vNorme"))}{r(tr("upravit.r.doveryhodnost"), tr("upravit.r.nadPriemerom"))}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{tr("upravit.rovnake")}<b style={{ color: "var(--ink)" }}>{tr("upravit.odmenime")}</b></div>
    </Harok>
  );
}
