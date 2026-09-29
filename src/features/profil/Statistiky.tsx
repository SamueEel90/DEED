// KARTA 27 · Štatistiky (vidí len vlastník) — nahrádza „Štatistiky a umiestnenie".
// Tento rok | Od začiatku · čísla 2 × 3 · séria (len informácia, bez tlaku) · skutky po mesiacoch · kde pomáhaš ·
// tvoj dosah · cesta môjho daru · môj rok v DEED (zdieľanie 1080 × 1350, bez karmy a súm).
// Zmazané: umiestnenia v meste/štvrti, sledujúci, farebné bodky, emoji. Neporovnávame s inými.
import { useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { SkeletonRiadky, ErrorState } from "@/shared";
import { useProfilStatistiky } from "@/data";
import { StitObr } from "@/components/stit";
import { MOJ_HLAVNY, MOJE_STITY, STIT_SK, oblastObr, odNajvyssieho } from "@/lib/stityOblasti";
import { MOJA_CESTA, suhrn, zastavokTvar, krajinTvar } from "@/lib/cestaDaru";
import { zdielajCanvas, ramObrazka } from "@/lib/zdielajObrazok";
import type { StatObdobie } from "./mock";
import { CestaDaru, MiniMapka } from "./CestaDaru";
import "@/styles/platba.css";

const MES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MES_CELE = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];
const lbl = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" } as const;
const karta = { borderRadius: 18, background: "var(--d-card, var(--card))", border: "1px solid var(--d-cardBd, var(--cardBd))" } as const;
const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const skutkovTvar = (n: number) => (n === 1 ? "skutok" : n > 1 && n < 5 ? "skutky" : "skutkov");

export function Statistiky({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const { data, isLoading, isError, refetch } = useProfilStatistiky();
  const [tab, setTab] = useState<"rok" | "vsetko">("rok");
  const [cesta, setCesta] = useState(false);
  const rok = new Date().getFullYear();
  const mesNow = new Date().getMonth();

  const hlavicka = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
      {!desktop && <SpatTlacidlo onClick={onBack} />}
      <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Štatistiky</h1>
    </div>);
  if (isError) return <div className="deed-platba" style={{ padding: "0 16px 30px", color: "var(--ink)" }}>{hlavicka}<ErrorState onRetry={() => refetch()} /></div>;
  if (isLoading || !data) return <div className="deed-platba" style={{ padding: "0 16px 30px", color: "var(--ink)" }}>{hlavicka}<SkeletonRiadky count={4} /></div>;

  const d: StatObdobie = data[tab];
  const cisla: [string, string, boolean?][] = [
    [String(d.skutkov), skutkovTvar(d.skutkov)], [`${d.hodin} h`, "času pre druhých"], [eur(d.darovaneEur), "darované", true],
    [String(d.ludi), "podporených ľudí"], [String(d.zbierok), "zbierok"], [String(d.oblasti), "oblastí"],
  ];
  const maxMes = Math.max(1, ...(d.mesiace ?? [1]));
  const maxKde = Math.max(1, ...d.kde.map(([, n]) => n));
  const c = suhrn(MOJA_CESTA.zastavky);
  const z = MOJA_CESTA.zastavky;
  const r = data.rok;

  const zdielajRok = async () => {
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350;
    const x = cv.getContext("2d")!;
    await ramObrazka(x, 1080, 1350);
    x.fillStyle = "#876712"; x.font = "800 36px 'Plus Jakarta Sans', sans-serif"; x.fillText(`MÔJ ROK ${rok} V DEED`, 72, 120);
    const nacitaj = (src: string) => new Promise<HTMLImageElement | null>((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    const hl = await nacitaj(`/stity/${MOJ_HLAVNY.toLowerCase()}.png`);
    if (hl) { const h = 420, w = h * (hl.width / hl.height); x.drawImage(hl, (1080 - w) / 2, 170, w, h); }
    x.textAlign = "center"; x.fillStyle = "#1D211B"; x.font = "800 56px 'Plus Jakarta Sans', sans-serif"; x.fillText(`${STIT_SK[MOJ_HLAVNY]} štít`, 540, 650);
    const obl = odNajvyssieho(MOJE_STITY).slice(0, 5);
    const imgs = await Promise.all(obl.map((o) => { const s = oblastObr(o.oblast, o.level, "v"); return s ? nacitaj(s.png) : Promise.resolve(null); }));
    const h2 = 150, sirky = imgs.map((i) => (i ? h2 * (i.width / i.height) : 0)), spolu = sirky.reduce((a, b) => a + b, 0) + 24 * (imgs.length - 1);
    let xx = (1080 - spolu) / 2;
    imgs.forEach((i, k) => { if (i) x.drawImage(i, xx, 700, sirky[k], h2); xx += sirky[k] + 24; });
    const cc: [string, string][] = [[String(r.skutkov), skutkovTvar(r.skutkov)], [`${r.hodin} h`, "pre druhých"], [String(r.ludi), "podporených ľudí"]];
    cc.forEach(([h, l], k) => { const cx = 200 + k * 340; x.fillStyle = "#1D211B"; x.font = "800 76px 'Plus Jakarta Sans', sans-serif"; x.fillText(h, cx, 990); x.fillStyle = "#4A4C43"; x.font = "600 30px 'Plus Jakarta Sans', sans-serif"; x.fillText(l, cx, 1034); });
    x.textAlign = "left";
    const v = await zdielajCanvas(cv, `moj-rok-${rok}.png`, `Môj rok ${rok} v DEED`);
    if (v === "stiahnute") toast("Obrázok je stiahnutý");
  };

  return (
    <div className="deed-platba" style={{ padding: "0 16px 34px", display: "flex", flexDirection: "column", gap: 18, color: "var(--ink)" }}>
      {hlavicka}
      <div role="tablist" aria-label="Obdobie" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([["rok", "Tento rok"], ["vsetko", "Od začiatku"]] as const).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={tab === k ? "seg-on" : undefined}
            style={{ minHeight: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", ...(tab === k ? {} : { background: "transparent", color: "var(--ink3)", boxShadow: "none" }) }}>{t}</button>))}
      </div>

      <div role="tabpanel" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {cisla.map(([h, l, g]) => (
            <div key={l} style={{ ...karta, padding: "14px 14px 12px" }}>
              <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: g ? "var(--gInk)" : "var(--ink)" }}>{h}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink3)", marginTop: 2 }}>{l}</div>
            </div>))}
        </div>

        {/* séria — len informácia, ktorá poteší (skutok alebo dar v daný deň), žiadny tlak */}
        <div style={{ ...karta, background: "var(--field)", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 11, background: "var(--goldBg)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2 2.5-1-2.5 0-5.5 1-8z" /></svg></span>
          <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>Najdlhšia séria: <b style={{ color: "var(--ink)" }}>{data.seria.najdlhsia} dní v rade</b>. Teraz {data.seria.teraz} {data.seria.teraz === 1 ? "deň" : data.seria.teraz < 5 ? "dni" : "dní"}.</span>
        </div>

        {tab === "rok" && d.mesiace && <div>
          <div style={lbl}>SKUTKY PO MESIACOCH · {rok}</div>
          <div style={{ ...karta, padding: "14px 12px 10px" }}>
            <div role="img" aria-label={`Skutky po mesiacoch: ${d.mesiace.map((n, i) => `${MES_CELE[i]} ${n}`).join(", ")}`} style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 6, alignItems: "end", height: 120 }}>
              {MES.map((m, i) => { const n = d.mesiace![i]; const ma = n != null; const v = ma ? Math.max(4, Math.round((n / maxMes) * 96)) : 3; return (
                <div key={i} aria-hidden="true" style={{ position: "relative", height: "100%" }}>
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, borderRadius: 5, background: ma ? (i === mesNow ? "var(--green)" : "color-mix(in srgb, var(--green) 45%, transparent)") : "var(--d-trackOff, var(--track))", transformOrigin: "bottom", transform: `scaleY(${v / 96})`, transition: "transform .5s ease" }} />
                  {ma && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", fontSize: 11, fontWeight: 800, lineHeight: "14px", color: "var(--ink2)", transform: `translateY(-${v + 4}px)`, transition: "transform .5s ease" }}>{n}</span>}
                </div>); })}
            </div>
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 6, marginTop: 6 }}>{MES.map((m, i) => <span key={i} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>{m}</span>)}</div>
          </div>
        </div>}

        <div>
          <div style={lbl}>KDE POMÁHAŠ</div>
          <ul style={{ ...karta, listStyle: "none", margin: 0, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {d.kde.map(([o, n]) => (
              <li key={o}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5 }}><b>{o}</b><span style={{ fontWeight: 700, color: "var(--ink2)" }}>{n} {skutkovTvar(n)}</span></div>
                <div aria-hidden="true" style={{ height: 8, borderRadius: 4, background: "var(--d-trackOff, var(--track))", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--green)", transformOrigin: "left", transform: `scaleX(${n / maxKde})`, transition: "transform .5s ease" }} /></div>
              </li>))}
          </ul>
        </div>

        <div>
          <div style={lbl}>TVOJ DOSAH</div>
          <div style={{ ...karta, padding: "0 14px" }}>
            {([["ľudí overilo tvoje skutky", d.dosah[0]], ["darov prišlo cez tvoje skutky a reťaz", d.dosah[1]], ["ľudí sa pridalo na tvoju pozvánku", d.dosah[2]]] as const).map(([t, n], i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, borderTop: i ? "1px solid var(--d-sep, var(--cardBd))" : "none" }}>
                <span style={{ flex: 1, fontSize: 14.5, color: "var(--ink2)" }}>{t}</span><b style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("sk-SK")}</b></div>))}
          </div>
        </div>

        {/* cesta môjho daru (karta 28) */}
        {z.length > 1 ? (
          <button type="button" onClick={() => setCesta(true)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, background: "color-mix(in srgb, var(--blue) 12%, var(--card))", border: "1px solid var(--bBd)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
            <MiniMapka />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gInk)" }}>CESTA MÔJHO DARU</span>
              <span style={{ display: "block", fontSize: 17, fontWeight: 800, marginTop: 2 }}>{z[0].mesto} → {z[z.length - 1].mesto}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{c.zastavok} {zastavokTvar(c.zastavok)} · {c.krajin} {krajinTvar(c.krajin)} · {c.km.toLocaleString("sk-SK")} km</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        ) : (
          <div style={{ ...karta, padding: 14, fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Keď niekto daruje ďalej, uvidíš tu, kam tvoj dar doputoval.</div>
        )}

        {tab === "rok" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 22, background: "linear-gradient(150deg,var(--gSoft) 0%,var(--goldBg) 100%)", border: "1px solid var(--goldBd)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <StitObr level={MOJ_HLAVNY} h={64} />
              <span><span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gold)" }}>MÔJ ROK {rok} V DEED</span>
                <span style={{ display: "block", fontSize: 18, fontWeight: 800, marginTop: 2 }}>{r.skutkov} {skutkovTvar(r.skutkov)} · {r.hodin} h · {r.ludi} ľudí</span></span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Ročný súhrn na zdieľanie. Bez karmy a bez súm, len tvoje skutky a štíty.</div>
            <button type="button" onClick={() => { void zdielajRok(); }} style={{ minHeight: 50, borderRadius: 15, border: "none", fontSize: 15.5, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" }}>Zdieľať môj rok</button>
            <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>Celý súhrn bude hotový 31. 12. Dovtedy sa priebežne dopĺňa.</div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center", padding: "4px 12px 0" }}>Štatistiky vidíš len ty. Neporovnávame ťa s inými, len s tebou samým.</div>
      {cesta && <CestaDaru onBack={() => setCesta(false)} />}
    </div>
  );
}
