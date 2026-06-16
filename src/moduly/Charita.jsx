import { useState, useEffect } from "react";
import { U, AV, GRAD, GRAD_ZELENY } from "../theme";
import { Foto, Avatar, FotoPrispevku, MiniFotky, Modal, ModulHlavicka, PodporaSekcia, Toast, useGaleria, useScrollHore, Rebricky, StatRiadok, MoniBar, FeedStlpce, SekcieBar, Lupa, Zvon } from "../shared";

/*
  ============================================================
  MODUL CHARITA — port z DEED_Charita_Prototyp_v1.html
  feed (urgentné / topované / dobrovoľníctvo / materiál)
  → detail zbierky → podpora + pravidelná podpora
  + sheet Pridať + Adresár charít & OZ
  ============================================================
*/

// ---- lokálna paleta modulu (Aura — priesvitné glass tóny) ----
const K = {
  bg: "transparent", bg2: "rgba(var(--glass-rgb),.03)", card: "rgba(var(--glass-rgb),.045)",
  warmEdge: "rgba(245,158,90,.3)", warmBg: "rgba(245,158,90,.06)",
  blue: "#5B9BFF", blueBg: "rgba(91,155,255,.1)", blueEdge: "rgba(116,166,255,.38)",
  green: "#3DD68C", greenBg: "rgba(52,211,153,.08)", greenEdge: "rgba(52,211,153,.32)",
  gold: "#F0C75A", goldBg: "rgba(240,199,90,.07)",
  diamond: "#74A6FF",
  purple: "#8B7CFF",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
  line: "rgba(var(--glass-rgb),.08)",
};

// ---- hlavná zbierka (detail) ----
const ZBIERKA = {
  nazov: "Rodina Kováčová", lok: "Trenčín · Zámostie", karma: "Silver",
  pribeh: "V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme provizórne bývanie a základné veci.",
  suma: 1430, ciel: 2200, ludia: 38, avatar: AV(47),
  fotky: [U("photo-1542856391-010fb87dcfed"), "/img/dom.jpg", U("photo-1500382017468-9049fed747ef")],
};

const ZOFIA_FOTKY = [U("photo-1471864190281-a93a3070b6de"), U("photo-1584308666744-24d5c474f2ae")];

// ---- adresár charít & OZ (vzorka z 50) ----
const ADRESAR = [
  { sekcia: "Zdravie & pacienti", chipy: ["Zdravie"], polozky: [
    ["LR", "Liga proti rakovine", "Onkopacienti · celé SR", "Legend", "💶 🙋"],
    ["PL", "Plamienok", "Detský hospic · SR", "Gold", "💶"],
    ["DA", "Dobrý anjel", "Rodiny s vážnou chorobou · SR", "Gold", "💶"],
    ["SP", "Svetielko pomoci", "Deti s rakovinou · Košice", "Silver", "💶 📦"],
  ]},
  { sekcia: "Deti & mládež", chipy: ["Deti"], polozky: [
    ["ÚD", "Úsmev ako dar", "Deti v náhradnej starostlivosti · SR", "Gold", "💶 🙋"],
    ["SOS", "SOS detské dedinky", "Opustené deti · SR", "Gold", "💶 🙋"],
    ["DM", "Divé maky", "Talentované rómske deti · SR", "Silver", "💶"],
  ]},
  { sekcia: "Zvieratá", chipy: ["Zvieratá"], polozky: [
    ["SZ", "Sloboda zvierat", "Útulky · SR", "Gold", "💶 🙋 📦"],
    ["TL", "OZ Túlavá labka", "Záchrana psov a mačiek · Trenčín", "Silver", "💶 📦"],
    ["DŠ", "OZ Druhá šanca", "Týrané zvieratá · Bardejov", "Bronze", "💶 📦"],
  ]},
  { sekcia: "Príroda & ekológia", chipy: ["Príroda"], polozky: [
    ["GP", "Greenpeace Slovensko", "Klíma, lesy · SR", "Silver", "💶 🙋"],
    ["ST", "Stromosvet", "Výsadba stromov · SR", "Bronze", "💶 🙋"],
  ]},
  { sekcia: "Sociálne & humanitárna", chipy: ["Sociálne", "Humanitárna"], polozky: [
    ["DP", "Depaul Slovensko", "Ľudia bez domova · Bratislava", "Silver", "💶 📦 🙋"],
    ["VG", "Vagus", "Ľudia bez domova · Bratislava", "Silver", "💶 🙋"],
    ["SKCH", "Slovenská katolícka charita", "Núdza, humanitárna · SR", "Gold", "💶 📦 🙋"],
    ["ČvO", "Človek v ohrození", "Humanitárna a rozvojová · SR", "Gold", "💶"],
    ["SČK", "Slovenský Červený kríž", "Humanitárna, krv · SR", "Gold", "💶 🙋"],
  ]},
  { sekcia: "Nevidiaci & hendikep", chipy: ["Sociálne"], polozky: [
    ["ÚN", "Únia nevidiacich a slabozrakých", "Zrakovo postihnutí · SR", "Gold", "💶 🙋"],
    ["MJ", "Maják n.o.", "Hluchoslepí · Bratislava", "Bronze", "💶 🙋"],
  ]},
];

const SEG_BG = ["rgba(242,112,111,.16)", "rgba(91,155,255,.16)", "rgba(61,214,140,.16)", "rgba(120,200,90,.16)", "rgba(231,199,102,.16)", "rgba(91,140,240,.16)", "rgba(139,124,255,.16)"];
const lvlFarba = (l) => ({ Legend: "#f5c542", Gold: "#f5c542", Silver: "#94a3b8", Bronze: "#b87333" }[l] || "#94a3b8");

// ===================== MODUL =====================
export default function ModulCharita({ wide, otvorModul }) {
  const [screen, setScreen] = useState("feed"); // feed | detail
  const [sheet, setSheet] = useState(null); // add | reg | dir
  const [hlaska, setHlaska] = useState(null);

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  const toast = (m) => { setHlaska(m); setTimeout(() => setHlaska((x) => (x === m ? null : x)), 2300); };
  const obal = (el) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;

  return (
    <div style={{ minHeight: "100%", color: K.txt }}>
      {screen === "feed" && <CharitaFeed wide={wide} toast={toast} onDetail={() => setScreen("detail")} onSheet={setSheet} />}
      {screen === "detail" && obal(<CharitaDetail toast={toast} onBack={() => setScreen("feed")} onReg={() => setSheet("reg")} />)}

      {sheet === "add" && <SheetPridat toast={toast} otvorModul={otvorModul} onClose={() => setSheet(null)} />}
      {sheet === "reg" && <SheetReg toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "dir" && <SheetAdresar toast={toast} onClose={() => setSheet(null)} />}

      {hlaska && <Toast text={hlaska} />}
    </div>
  );
}

// ===================== FEED =====================
function CharitaFeed({ wide, toast, onDetail, onSheet }) {
  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Charita" right={
        <>
          <span onClick={() => toast("Vyhľadávanie (demo)")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={K.txt2} /></span>
          <span onClick={() => toast("Upozornenia (demo)")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Zvon size={20} color={K.txt2} /></span>
        </>
      } />

      {/* ticker */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", fontSize: 13.5, color: K.txt2, borderTop: `1px solid ${K.line}`, borderBottom: `1px solid ${K.line}`, background: K.bg2 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: K.green, flexShrink: 0, animation: "pulse 1.6s infinite" }} />
        Liga proti rakovine <b style={{ color: K.green }}>&nbsp;práve dostala 100 DEED&nbsp;</b> → Marek
      </div>

      {/* jednotná sekcia skratiek */}
      <SekcieBar onTalent={() => toast("Ukáž svoj talent (demo)")} onBoard={() => toast("Nástenka (demo)")} onAdd={() => onSheet("add")} />

      {/* jednotný rebríček ocenení (s úvodným kachlíkom Adresár) */}
      <div>
        <Rebricky
          pred={
            <div onClick={() => onSheet("dir")} style={{ minWidth: 84, background: K.blueBg, border: `1px solid ${K.blueEdge}`, borderRadius: 13, padding: "8px 5px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", flex: "0 0 auto", color: K.blue }}>
              <div style={{ fontSize: 16, lineHeight: 1 }}>🏛</div>
              <div style={{ fontSize: 7.5, letterSpacing: ".4px", fontWeight: 700 }}>CHARITA & OZ</div>
              <div style={{ fontSize: 9.5, fontWeight: 700 }}>Adresár</div>
            </div>
          }
          ocenenia={[
            { ic: "🛡", col: "#74A6FF", label: "PARTNER", name: "Lidl", onClick: () => toast("Rebríček: Top partner") },
            { ic: "👑", col: "#E7C766", label: "TOP", name: "Liga", onClick: () => toast("Rebríček: Top charita") },
            { ic: "⭐", col: "#E58A6A", label: "TOP", name: "Plamienok", onClick: () => toast("Rebríček: Top charita") },
          ]}
          ludia={[{ ini: "Ty", name: "Ty", col: "#74A6FF" }, { ini: "A", name: "Anna" }, { ini: "P", name: "Peter" }]}
        />
      </div>

      {/* jednotný štatistický riadok (dnes + okruh) */}
      <StatRiadok stat="Dnes 412 · Mesiac 12 840" onOkruh={() => onSheet("dir")} />

      {/* feed — na tablete/PC: zapoj sa vľavo, zbierky vpravo */}
      <FeedStlpce wide={wide} padding="4px 14px 12px"
        labelSkutky="Zapoj sa" labelZiadosti="Zbierky"
        jednoStlpec={[<ZapojSa key="z1" wide={wide} toast={toast} />, <ZbierkyUrgent key="u" wide={wide} onDetail={onDetail} />, <ZbierkyTop key="t" wide={wide} toast={toast} />, <ZbierkyMala key="m" wide={wide} toast={toast} />, <Material key="z2" wide={wide} toast={toast} />]}
        skutky={[<ZapojSa key="z1" wide={wide} toast={toast} />, <Material key="z2" wide={wide} toast={toast} />]}
        ziadosti={[<ZbierkyUrgent key="u" wide={wide} onDetail={onDetail} />, <ZbierkyTop key="t" wide={wide} toast={toast} />, <ZbierkyMala key="m" wide={wide} toast={toast} />]}
      />

      <div style={{ fontSize: 10, color: K.txt3, textAlign: "center", padding: 6 }}>↑ feed je pestrý — veľké urgentné, topované, dobrovoľnícke, materiál ↑</div>
    </div>
  );
}

// ---- karty feedu (rozdelené do komponentov kvôli dvojstĺpcu skutky/žiadosti) ----
function ZbierkyUrgent({ wide, onDetail }) {
  return (
    <div onClick={onDetail} style={{ background: K.warmBg, border: `1px solid ${K.warmEdge}`, borderRadius: 16, overflow: "hidden", marginBottom: wide ? 0 : 12, cursor: "pointer" }}>
      <div style={{ position: "relative" }}>
        <FotoPrispevku fotky={ZBIERKA.fotky} emoji="🔥" h={150} disableGaleria />
        <span style={badge({ top: 9, left: 9, color: K.gold })}>🔥 URGENTNÉ</span>
        <span style={badge({ top: 9, right: 9, color: K.diamond, background: "rgba(96,165,250,.18)" })}>🛡 Lidl · 500 €</span>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>Rodina Kováčová <Overena /></div>
        <div style={{ fontSize: 13, color: K.txt2, lineHeight: 1.5, margin: "5px 0 10px" }}>V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebuje…</div>
        <MoniBar vyzbierane={1430} ciel={2200} mini />
      </div>
    </div>
  );
}
function ZbierkyTop({ wide, toast }) {
  return (
    <div onClick={() => toast("Detail zbierky — Plamienok")} style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: 16, padding: "13px 14px", marginBottom: wide ? 0 : 12, cursor: "pointer" }}>
      <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>Plamienok <span style={{ fontSize: 10, color: K.diamond, border: `1px solid ${K.blueEdge}`, background: "rgba(96,165,250,.08)", padding: "1px 7px", borderRadius: 99, fontWeight: 500 }}>⭐ TOP</span></div>
      <div style={{ fontSize: 13, color: K.txt2, lineHeight: 1.5, margin: "5px 0 9px" }}>Detský hospic — pomôžte nám zabezpečiť mobilnú paliatívnu starostlivosť pre rodiny.</div>
      <MoniBar vyzbierane={8200} ciel={15000} mini />
    </div>
  );
}
function ZbierkyMala({ wide, toast }) {
  return (
    <div onClick={() => toast("Detail zbierky — Žofia K.")} style={{ background: K.warmBg, border: `1px solid ${K.warmEdge}`, borderRadius: 16, overflow: "hidden", marginBottom: wide ? 0 : 12, cursor: "pointer" }}>
      <div style={{ position: "relative" }}>
        <FotoPrispevku fotky={ZOFIA_FOTKY} emoji="🩺" h={120} disableGaleria />
        <span style={badge({ top: 9, right: 9, color: K.green, background: "rgba(52,211,153,.18)" })}>D+</span>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>Žofia K. <Overena /></div>
        <div style={{ fontSize: 13, color: K.txt2, lineHeight: 1.5, margin: "5px 0 9px" }}>Po úraze tri mesiace bez príjmu, potrebujem na lieky.</div>
        <MoniBar vyzbierane={520} ciel={800} mini />
      </div>
    </div>
  );
}
function ZapojSa({ wide, toast }) {
  return (
    <RiadokKarta wide={wide} onClick={() => toast("Otvorila by sa výzva na dobrovoľníctvo")}
      ikona="🌳" ikonaBg={K.greenBg} ikonaCol={K.green}
      nazov="Stromosvet" tag="DOBROVOĽNÍCTVO" tagBg="rgba(52,211,153,.14)" tagCol={K.green}
      popis="Hľadá 10 dobrovoľníkov · výsadba stromov · sobota, Brezina" />
  );
}
function Material({ wide, toast }) {
  return (
    <RiadokKarta wide={wide} onClick={() => toast("Zbierka materiálu — Zelená plus")}
      ikona="ZP" ikonaBg={K.blueBg} ikonaCol={K.diamond} ikonaText
      nazov="Zelená plus" tag="MATERIÁL" tagBg="rgba(96,165,250,.14)" tagCol={K.diamond}
      popis="Triedenie a zber šatstva pre útulok · streda, Juh" />
  );
}

function badge({ top, left, right, color, background }) {
  return { position: "absolute", top, left, right, fontSize: 10, padding: "3px 8px", borderRadius: 7, fontWeight: 600, color, background: background || "rgba(10,13,20,.78)", pointerEvents: "none" };
}
function Overena() {
  return <span style={{ fontSize: 10, color: K.green, border: `1px solid ${K.greenEdge}`, padding: "1px 7px", borderRadius: 99, fontWeight: 500 }}>overená</span>;
}
function RiadokKarta({ wide, onClick, ikona, ikonaBg, ikonaCol, ikonaText, nazov, tag, tagBg, tagCol, popis }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, background: K.card, border: `1px solid ${K.line}`, borderRadius: 14, padding: "11px 13px", marginBottom: wide ? 0 : 10, cursor: "pointer" }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: ikonaBg, color: ikonaCol, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ikonaText ? 12 : 18, fontWeight: ikonaText ? 700 : 400, flexShrink: 0 }}>{ikona}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>{nazov} <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, fontWeight: 600, background: tagBg, color: tagCol }}>{tag}</span></div>
        <div style={{ fontSize: 13, color: K.txt2, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popis}</div>
      </div>
    </div>
  );
}

// ===================== DETAIL ZBIERKY =====================
function CharitaDetail({ toast, onBack, onReg }) {
  const z = ZBIERKA;
  const [suma, setSuma] = useState(z.suma);
  const [ludia, setLudia] = useState(z.ludia);
  const [potvrd, setPotvrd] = useState(null); // {kanal, suma}
  const otvorGaleriu = useGaleria();
  const pct = Math.min(100, Math.round(suma / z.ciel * 100));

  function podpor(hodnota, text) {
    setSuma((s) => s + hodnota * 0.01);
    setLudia((l) => l + 1);
    toast(text);
  }
  function potvrdVlastnu() {
    setSuma((s) => s + Number(potvrd.suma || 0) * (potvrd.kanal === "EUR" ? 1 : 0.01));
    setLudia((l) => l + 1);
    toast(`Odoslané ${potvrd.suma} ${potvrd.kanal === "EUR" ? "€" : "DEED"} · ${z.nazov}`);
    setPotvrd(null);
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        <span onClick={onBack} style={{ width: 32, height: 32, flex: "0 0 auto", borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${K.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: K.txt2, cursor: "pointer" }}>←</span>
        <span style={{ fontSize: 12, color: K.diamond, background: K.blueBg, border: `1px solid ${K.blueEdge}`, padding: "3px 9px", borderRadius: 7, fontWeight: 700, letterSpacing: ".02em" }}>12 000 / 47</span>
        <span style={{ fontSize: 12, color: K.txt2 }}>Liga proti rakovine</span>
        <span style={{ marginLeft: "auto", color: K.txt2 }}>↗&nbsp;&nbsp;🚩</span>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* hero foto — klik = celá obrazovka + swipe */}
        <div style={{ position: "relative" }}>
          <Foto src={z.fotky[0]} emoji="🔥" h={200} radius={14} onClick={() => otvorGaleriu(z.fotky, 0)} />
          <span style={badge({ top: 9, right: 9, color: K.txt })}>📷 foto z prípadu</span>
          <span style={{ position: "absolute", bottom: 9, right: 9, background: "rgba(0,0,0,.6)", borderRadius: 12, padding: "3px 9px", fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {z.fotky.length} · klikni na foto</span>
        </div>
      </div>
      <MiniFotky fotky={z.fotky} />

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Avatar src={z.avatar} emoji="RK" size={38} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>{z.nazov} <Overena /></div>
            <div style={{ fontSize: 11.5, color: K.txt2, marginTop: 2 }}><span style={{ color: K.gold }}>⭐ {z.karma}</span> · 📍 {z.lok} · 1 deň</div>
          </div>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.55, margin: "10px 0 14px" }}>{z.pribeh}</div>

        {/* progres */}
        <div style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: K.green, float: "right" }}>{pct} %</span>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{Math.round(suma)} € <small style={{ fontSize: 13, color: K.txt2, fontWeight: 400 }}>z {z.ciel} €</small></div>
          <div style={{ height: 9, background: "rgba(var(--glass-rgb),.1)", borderRadius: 99, overflow: "hidden", margin: "10px 0 8px" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, transition: "width .6s ease", boxShadow: "0 0 12px rgba(43,212,155,.5)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: K.txt2 }}>
            <span>👥 {ludia} ľudí pomohlo</span><span style={{ color: K.green }}>● rastie live</span>
          </div>
        </div>

        {/* jednotná sekcia podpory */}
        <div style={{ marginBottom: 14 }}>
          <PodporaSekcia
            onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
            upvotes={140} onUpvote={() => toast("Palec hore")}
            onPodpor={(s) => podpor(s, `Ďakujeme za ${s} DEED pre ${z.nazov}`)} onSms={() => podpor(100, "SMS podpora")}
            onKanal={(k) => setPotvrd({ kanal: k, suma: "" })} />
        </div>

        {/* pravidelná podpora */}
        <div onClick={onReg} style={{ width: "100%", border: `2px solid ${K.blueEdge}`, background: K.blueBg, borderRadius: 13, padding: 14, textAlign: "center", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          🔁 Pravidelná podpora
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: K.txt2, borderTop: `1px solid ${K.line}`, paddingTop: 11 }}>
          <span>✓ 100 % žiadateľovi · ⛓ blockchain</span><span>VS 8842 0471 · 28 dní</span>
        </div>
      </div>

      {/* potvrdenie vlastnej sumy */}
      {potvrd && (
        <Modal onClose={() => setPotvrd(null)}>
          <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 10 }}>Vlastná suma — {potvrd.kanal}</div>
          <input autoFocus type="number" placeholder={potvrd.kanal === "EUR" ? "suma v €" : "počet DEED"} value={potvrd.suma}
            onChange={(e) => setPotvrd({ ...potvrd, suma: e.target.value })}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 12, background: "rgba(0,0,0,.3)", border: `1px solid ${K.line}`, color: K.txt, fontSize: 16, marginBottom: 12, outline: "none" }} />
          <div style={{ fontSize: 12, color: K.txt3, marginBottom: 14 }}>Skontroluj sumu pred odoslaním (proti preklepu).</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPotvrd(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "transparent", color: K.txt2, border: `1px solid ${K.line}` }}>Späť</button>
            <button onClick={potvrdVlastnu} disabled={!potvrd.suma} style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: potvrd.suma ? "pointer" : "not-allowed", background: potvrd.suma ? GRAD : "rgba(255,255,255,.05)", color: potvrd.suma ? "#fff" : K.txt3, border: "none", boxShadow: potvrd.suma ? "0 8px 26px rgba(99,134,255,.32)" : "none" }}>Potvrdiť a odoslať</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PayBtn({ flex, bg, bd, col, e, v, onClick }) {
  return (
    <div onClick={onClick} style={{ flex, background: bg, border: `1px solid ${bd}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "9px 0", cursor: "pointer", gap: 2 }}>
      <span style={{ fontSize: 18, color: col }}>{e}</span><span style={{ fontSize: 11, fontWeight: 600, color: col }}>{v}</span>
    </div>
  );
}

// ===================== SHEETY =====================
function SheetObal({ title, onClose, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(var(--panel-rgb),.92)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", zIndex: 50, display: "flex", flexDirection: "column", animation: "fadeUp .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: `1px solid ${K.line}` }}>
        <span onClick={onClose} style={{ fontSize: 22, color: K.txt2, cursor: "pointer" }}>✕</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>{children}</div>
    </div>
  );
}

function SheetPridat({ toast, otvorModul, onClose }) {
  const moznosti = [
    ["💶", "Žiadosť o pomoc", "Finančná zbierka — krátka alebo dlhodobá", () => { onClose(); otvorModul && otvorModul("help"); }],
    ["🙋", "Žiadosť na dobrovoľníctvo", "Nábor — počet, miesto, dĺžka, QR", () => toast("Sprievodca dobrovoľníckej výzvy (6 krokov)")],
    ["📦", "Iná nefinančná pomoc", "Materiál (deky, krmivo…) — fáza 2", () => toast("Materiál — fáza 2")],
    ["📎", "Dôkaz / update", "Dokladovanie použitia k bežiacej žiadosti", () => toast("Pridať dôkaz / update k bežiacej zbierke")],
    ["✨", "Skutok „takto sme pomohli“", "Dopad / výsledok → Talent", () => toast("Pridať skutok „takto sme pomohli“ → Talent")],
  ];
  return (
    <SheetObal title="Pridať" onClose={onClose}>
      {moznosti.map((m, i) => (
        <div key={i} onClick={m[3]} style={{ display: "flex", alignItems: "center", gap: 13, background: K.card, border: `1px solid ${K.line}`, borderRadius: 14, padding: 15, marginBottom: 11, cursor: "pointer" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: K.blueBg, color: K.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{m[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m[1]}</div>
            <div style={{ fontSize: 11.5, color: K.txt2, marginTop: 2 }}>{m[2]}</div>
          </div>
          <span style={{ color: K.txt3, fontSize: 16 }}>›</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: K.txt3, textAlign: "center", padding: 6 }}>finančná žiadosť otvorí sprievodcu v module Help</div>
    </SheetObal>
  );
}

function SheetReg({ toast, onClose }) {
  return (
    <SheetObal title="Pravidelná podpora" onClose={onClose}>
      <div onClick={() => toast("Podporujem → frekvencia → suma → EUR/DEED → potvrď")} style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: 14, padding: 15, marginBottom: 12, cursor: "pointer" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>💶 Túto žiadosť</div>
        <div style={{ fontSize: 12, color: K.txt2, marginTop: 4, lineHeight: 1.45 }}>Pravidelne podporuješ konkrétnu zbierku (Rodina Kováčová). Odhadovaná doba: dlhodobá.</div>
      </div>
      <div onClick={() => toast("Podporujem segment → frekvencia → suma → potvrď")} style={{ background: K.goldBg, border: `1px solid rgba(240,199,90,.4)`, borderRadius: 14, padding: 15, marginBottom: 12, cursor: "pointer" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>🗂 Segment charity</div>
        <div style={{ fontSize: 12, color: K.txt2, marginTop: 4, lineHeight: 1.45 }}>Podporuješ tému (napr. „onkopacienti“). Charita rozdelí podľa svojho kľúča.</div>
        <div style={{ fontSize: 11, color: K.gold, marginTop: 6 }}>⚠️ Tu nevieme presne deklarovať použitie peňazí.</div>
      </div>
      <div onClick={() => toast("Podporujem charitu → frekvencia → suma → potvrď")} style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: 14, padding: 15, marginBottom: 12, cursor: "pointer" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>🏛 Celá charita</div>
        <div style={{ fontSize: 12, color: K.txt2, marginTop: 4, lineHeight: 1.45 }}>Paušálna podpora charity — ona sa stará. Sleduješ jej dôveryhodnosť (badge/karma).</div>
      </div>
      <div style={{ fontSize: 10, color: K.txt3, textAlign: "center", padding: 6 }}>na pozadí má každá voľba svoj QR/ID · pri výzve sa nastaví prechod 1→2</div>
    </SheetObal>
  );
}

function SheetAdresar({ toast, onClose }) {
  const [chip, setChip] = useState("Všetko");
  const [hladaj, setHladaj] = useState("");
  const chipy = ["Všetko", "Zdravie", "Deti", "Zvieratá", "Príroda", "Sociálne", "Humanitárna"];

  const filtrovane = ADRESAR
    .filter((s) => chip === "Všetko" || s.chipy.includes(chip))
    .map((s) => ({ ...s, polozky: s.polozky.filter((p) => !hladaj || (p[1] + " " + p[2]).toLowerCase().includes(hladaj.toLowerCase())) }))
    .filter((s) => s.polozky.length);

  return (
    <SheetObal title="Charita & OZ" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, background: K.card, border: `1px solid ${K.line}`, borderRadius: 11, padding: "4px 13px", marginBottom: 12 }}>
        <span style={{ color: K.txt3 }}>🔍</span>
        <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder="Hľadať charitu, oblasť, mesto…"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: K.txt, fontSize: 13, padding: "8px 0" }} />
      </div>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 8, marginBottom: 6 }}>
        {chipy.map((c) => (
          <span key={c} onClick={() => setChip(c)} style={{ whiteSpace: "nowrap", fontSize: 12, padding: "5px 13px", borderRadius: 99, cursor: "pointer", background: chip === c ? K.txt : K.card, color: chip === c ? K.bg : K.txt2, fontWeight: chip === c ? 600 : 400, border: `1px solid ${chip === c ? K.txt : K.line}` }}>{c}</span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: K.txt3, marginBottom: 10, display: "flex", gap: 12 }}>
        <span>📍 Trenčín · 20 km</span><span>⚙ Typ pomoci</span><span style={{ marginLeft: "auto" }}>dôvera + blízkosť</span>
      </div>

      {filtrovane.map((s, si) => (
        <div key={s.sekcia}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.blue, textTransform: "uppercase", letterSpacing: ".04em", margin: "14px 0 6px" }}>{s.sekcia}</div>
          {s.polozky.map((p, pi) => (
            <div key={pi} onClick={() => toast("Profil charity — " + p[1])} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 4px", borderBottom: `1px solid ${K.line}`, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: SEG_BG[(si + pi) % SEG_BG.length], color: K.txt }}>{p[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{p[1]}</div>
                <div style={{ fontSize: 12.5, color: K.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p[2]}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: lvlFarba(p[3]) }}>⬢ {p[3]}</div>
                <div style={{ fontSize: 12, color: K.txt3, marginTop: 2 }}>{p[4]}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
      {!filtrovane.length && <div style={{ textAlign: "center", color: K.txt3, fontSize: 13, padding: 30 }}>Nič sa nenašlo pre „{hladaj}“</div>}
    </SheetObal>
  );
}
