// ============================================================
// Centrálna zbierka organizácie — spustenie zo správy (charita od T1).
// Údaje z registrácie → hotová za minútu. Charita tu rozhodne o krypto daroch
// (platí pre všetky jej zbierky) a potvrdí segmenty podľa stanov.
// ============================================================
import { useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet } from "@/components/sheet";
import { PlatobnyModul } from "@/components/platobnymodul";
import { ProgresBox } from "@/components/ui";
import { SUBJEKTY } from "./mock";
import { segmentyZRegistracie, segmentyCharity, nastavSegmenty } from "./registracia";
import { nacitajKryptoOrg, ulozKryptoOrg, nacitajCentralnu, ulozCentralnu } from "./stav";

export function CentralnaZbierkaSheet({ toast, onClose }: { toast: (m: string) => void; onClose: () => void }) {
  const s = SUBJEKTY.charita;
  const [krypto, setKrypto] = useState(() => nacitajKryptoOrg("charita"));
  const zRegistracie = segmentyZRegistracie();
  const [vybrane, setVybrane] = useState<string[]>(() => segmentyCharity());
  // vlastné segmenty dopísané charitou (mimo číselníka) — ostávajú v zozname aj po odškrtnutí
  const [vlastne, setVlastne] = useState<string[]>(() => segmentyCharity().filter((x) => !zRegistracie.includes(x)));
  const vsetky = [...zRegistracie, ...vlastne];
  const [novy, setNovy] = useState("");
  const pridaj = () => {
    const t = novy.trim();
    if (!t) return;
    if (vsetky.some((x) => x.toLowerCase() === t.toLowerCase())) { toast("Tento segment už v zozname je"); return; }
    setVlastne((v) => [...v, t]);
    setVybrane((v) => [...v, t]);
    setNovy("");
  };
  const [potvrdene, setPotvrdene] = useState(false);
  const spustena = nacitajCentralnu("charita");

  const prepni = (sg: string) => setVybrane((v) => (v.includes(sg) ? v.filter((x) => x !== sg) : [...v, sg]));
  const spusti = () => {
    ulozKryptoOrg("charita", krypto);
    nastavSegmenty(vybrane);
    ulozCentralnu("charita", true);
    toast(spustena ? "Centrálna zbierka upravená" : "Centrálna zbierka spustená — je na vašom profile");
    onClose();
  };

  const nadpis = (t: string) => <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>{t}</div>;
  const volba = (aktivna: boolean): React.CSSProperties => ({
    flex: 1, height: 38, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700,
    border: `1px solid ${aktivna ? "var(--a-green)" : C.line}`, background: aktivna ? "var(--a-green)" : "transparent", color: aktivna ? "#fff" : C.textSec,
  });

  return (
    <Sheet onClose={onClose} label="Centrálna zbierka organizácie">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🚀 Centrálna zbierka organizácie</div>
      <div style={{ fontSize: 12, color: C.textTer, marginTop: 2 }}>Zbierka na vašu činnosť · údaje z registrácie · hotová za minútu</div>

      {nadpis("TAKTO JU UVIDIA DARCOVIA")}
      <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.sm }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: SPACE.xs }}>{s.nazov}</div>
        <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={0} ciel={12000} ludia={0} /></div>
        <PlatobnyModul zbalene kryptoOtvorene krypto={krypto ? "EURC" : "nie"}
          onShare={() => undefined} upvotes={0} onUpvote={() => undefined}
          onPodpor={() => undefined} onKanal={() => undefined} toast={() => undefined}
          opakovana={{ popis: "Segment alebo celá organizácia · len pre registrovaných", onClick: () => undefined }} />
      </div>

      {nadpis("DARY V KRYPTOMENE")}
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: SPACE.xs }}>Chcete prijímať dary v kryptomene EURC?</div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        <button type="button" style={volba(krypto)} onClick={() => setKrypto(true)}>Áno</button>
        <button type="button" style={volba(!krypto)} onClick={() => setKrypto(false)}>Nie</button>
      </div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.xxs }}>
        {krypto ? "EURC je digitálne euro 1 : 1." : "Dary v krypte sa nebudú zobrazovať v žiadnej vašej zbierke."} Platí pre všetky vaše zbierky, zmeniť to môžete kedykoľvek.
      </div>

      {nadpis("SKONTROLUJTE SVOJE SEGMENTY")}
      <div style={{ fontSize: 12, color: C.textSec, marginBottom: SPACE.xs }}>Darcovia ich vidia pri pravidelnej podpore. Nechajte len tie, na ktoré máte oprávnenie podľa stanov.</div>
      {vsetky.map((sg) => (
        <label key={sg} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={vybrane.includes(sg)} onChange={() => prepni(sg)} style={{ width: 18, height: 18, accentColor: "var(--a-green)" }} />
          {sg}{vlastne.includes(sg) && <span style={{ fontSize: 11, color: C.textTer }}>· vlastný</span>}
        </label>
      ))}
      {/* doplniť ďalší segment vlastným textom */}
      <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.xs }}>
        <input value={novy} onChange={(e) => setNovy(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") pridaj(); }}
          placeholder="Doplniť segment, napr. Sociálne · výdajňa potravín" maxLength={60}
          style={{ flex: 1, minWidth: 0, height: 38, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "rgba(var(--glass-rgb),.05)", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
        <button type="button" onClick={pridaj} disabled={!novy.trim()}
          style={{ flex: "none", height: 38, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.sm, border: "none", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
            background: novy.trim() ? "var(--a-green)" : "rgba(var(--glass-rgb),.15)", color: novy.trim() ? "#fff" : C.textTer, cursor: novy.trim() ? "pointer" : "default" }}>
          + Pridať
        </button>
      </div>
      <div style={{ background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.xs, fontSize: 12.5, lineHeight: 1.5, color: C.text }}>
        <b>Upozornenie:</b> segment, na ktorý nemáte oprávnenie, považujeme za pokus o podvod. Pri zistení môžete byť v aplikácii zablokovaní, aj dlhodobo.
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: SPACE.sm, marginTop: SPACE.sm, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={potvrdene} onChange={(e) => setPotvrdene(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--a-green)" }} />
        Potvrdzujem, že vybrané segmenty zodpovedajú stanovám našej organizácie.
      </label>

      <button type="button" onClick={spusti} disabled={!potvrdene || vybrane.length === 0}
        style={{ width: "100%", height: 46, marginTop: SPACE.md, marginBottom: SPACE.sm, borderRadius: RADIUS.sm, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 800,
          background: potvrdene && vybrane.length ? "var(--a-green)" : "rgba(var(--glass-rgb),.15)", color: potvrdene && vybrane.length ? "#fff" : C.textTer, cursor: potvrdene && vybrane.length ? "pointer" : "default" }}>
        {spustena ? "Uložiť zmeny" : "Spustiť centrálnu zbierku"}
      </button>
    </Sheet>
  );
}
