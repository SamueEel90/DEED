// ============================================================
// DEED · Split QR (produkčný) — §10 QR systém × §9 Reťaz dobra
// SplitQrSheet  = autor/influencer nastaví pomer (SplitConfigStep) → qr_split_create
//                 → QrModal ukáže REÁLNY /split/{slug} + rozpis.
// SplitLanding  = živá „kópia príspevku" (view) na ktorú QR odkazuje: príspevok +
//                 pomer + „koľko cez tento QR išlo organizáciám" + prispieť (qr_split_pay).
// Beží nad qr_split / platba_split (0018). Bez DB (mock) → placeholder QR.
// ============================================================
import { useState } from "react";
import { C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { qrUrl } from "@/lib/qr";
import { Sheet } from "@/components/sheet";
import { QrModal } from "@/components/qr";
import { Foto } from "@/components/media";
import { PlatbaModal } from "@/components/platba";
import { PlatobnyModul } from "@/components/platobnymodul";
import { IkonaFajka } from "@/components/icons";
import { SplitConfigStep, splitValid, splitOwnerPct, splitCielePayload, splitPreQrModal, SPLIT_MIN, type SplitCiel, type SplitLabely } from "@/components/splitconfig";
import { useQrSplitCreate, useQrSplitGet, useQrSplitPay } from "@/data";
import { usePouzivatel } from "@/lib/pouzivatel";
import type { QrSplitRow } from "@/types";

const GREEN = "var(--a-green)";
const idemKluc = (slug: string) => { try { return `split:${slug}:${crypto.randomUUID()}`; } catch { return `split:${slug}:${Date.now()}-${Math.round(Math.random() * 1e9)}`; } };
// case_id je uuid FK na prispevok — fixné demo karty majú sémantické id (nie uuid) → null
const jeUuid = (v?: string | null): v is string => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ============================================================
// SplitQrSheet — vytvorenie QR (autorský alebo osobný)
// ============================================================
// variant = prekryv pre nešpecifické split (farársky „Rozdeliť dar": Rodine ↔ Kostolu).
// Bez variantu = pôvodné influencer správanie (owner drží zvyšok, príspevok pripnutý 70 %).
export type SplitVariant = {
  nadpis: string;          // titulok sheetu (napr. „Rozdeliť dar")
  emoji?: string;          // ikona sheetu (napr. 🕯)
  podnadpis?: string;      // riadok pod titulkom
  ownerLabel: string;      // vlastník = príjemca zvyšku (napr. „Rodine (pozostalí)")
  preset: SplitCiel[];     // predvyplnení príjemcovia (napr. kostol 5 %, odstrániteľný)
  qrPopis?: string;        // popis v QrModal
  labely?: SplitLabely;    // texty/ikony do SplitConfigStep
  minPct?: number;         // minimálny podiel — Viera dáva 0 (0 % povolené, bez fronty)
};

interface SplitQrSheetProps {
  titul?: string;                    // čo sa rozdeľuje (skutok / charita / event)
  caseId?: string | null;            // zdrojový príspevok (landing odkazuje naň)
  zdroj?: "autor" | "osobny";
  odkaz?: string;                    // fallback do QR (mock)
  variant?: SplitVariant;            // farársky variant (Rozdeliť dar) — inak influencer
  onClose?: () => void;
  toast?: (m: string) => void;
}

export function SplitQrSheet({ titul = "Skutok", caseId = null, zdroj = "osobny", odkaz = "https://deed.good/split/demo", variant, onClose, toast }: SplitQrSheetProps) {
  const { ucetId, celeMeno } = usePouzivatel();
  const influencer = celeMeno && celeMeno.trim() ? celeMeno : "Ty (tvorca)";
  const owner = variant?.ownerLabel ?? influencer;
  const create = useQrSplitCreate();
  const [krok, setKrok] = useState<"nastav" | "hotovo">("nastav");
  // influencer: tento príspevok je predvyplnený ako prvý príjemca (owner drží zvyšok).
  // variant (farársky): predvyplnení príjemcovia z variant.preset (napr. kostol 3 %).
  const [ciele, setCiele] = useState<SplitCiel[]>(() =>
    variant ? variant.preset
      : titul && titul.trim() ? [{ id: caseId ?? "__case__", komu: titul, pct: 70, pinned: true }] : []
  );
  const [vytvoreny, setVytvoreny] = useState<QrSplitRow | null>(null);
  const [vyrabam, setVyrabam] = useState(false);
  const minPct = variant?.minPct ?? SPLIT_MIN;
  const validne = splitValid(ciele, minPct);

  async function vytvor() {
    setVyrabam(true);
    try {
      const row = await create.mutateAsync({
        caseId: jeUuid(caseId) ? caseId : null, owner: ucetId, ownerText: owner,
        ownerPodiel: +(splitOwnerPct(ciele) / 100).toFixed(5),
        ciele: splitCielePayload(ciele), zdroj, mena: "DEED",
      });
      setVytvoreny(row);
    } catch { /* offline/mock → placeholder QR */ }
    setVyrabam(false);
    setKrok("hotovo");
    toast?.("Split QR vytvorený · % zafixované");
  }

  // ---- KROK 2: hotový split QR ----
  if (krok === "hotovo") {
    return (
      <QrModal typ="rozdelenie" titul={`Split QR · ${titul}`} popis={variant?.qrPopis ?? "Reťaz dobra — rozdelenie platby medzi príjemcov"}
        odkaz={vytvoreny?.slug ? qrUrl("split", vytvoreny.slug) : odkaz}
        split={splitPreQrModal(owner, ciele)} onClose={onClose} toast={toast} />
    );
  }

  // ---- KROK 1: nastav pomer ----
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xxs }}>
        <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(GREEN, .16), color: GREEN, fontSize: 18 }}>{variant?.emoji ?? "🎬"}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{variant?.nadpis ?? "Reťaz dobra — rozdeliť platbu"}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{variant?.podnadpis ?? `${titul} · nastav aká časť ide komu`}</div>
        </div>
      </div>

      <SplitConfigStep ownerLabel={owner} ciele={ciele} onCiele={setCiele} ownerColor={GREEN} labely={variant?.labely} minPct={minPct} />

      <button onClick={vytvor} disabled={!validne || vyrabam}
        style={{ width: "100%", height: 50, borderRadius: RADIUS.md, border: "none", marginTop: SPACE.gutter, fontWeight: 700, fontSize: 15, fontFamily: "inherit",
          background: validne && !vyrabam ? GRAD_ZELENY : "rgba(var(--glass-rgb),.06)", color: validne && !vyrabam ? "#fff" : C.textTer, cursor: validne && !vyrabam ? "pointer" : "not-allowed",
          boxShadow: validne && !vyrabam ? "0 8px 26px rgba(31,191,143,.32)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
        <IkonaFajka size={18} color={validne && !vyrabam ? "#fff" : C.textTer} /> {vyrabam ? "Vyrábam QR…" : "Vygenerovať split QR"}
      </button>
    </Sheet>
  );
}

// ============================================================
// SplitLanding — živá „kópia príspevku", na ktorú QR odkazuje
// ============================================================
export function SplitLanding({ splitId, onClose, toast }: { splitId: string; onClose?: () => void; toast?: (m: string) => void }) {
  const { data, isLoading } = useQrSplitGet(splitId);
  const pay = useQrSplitPay();
  const { ucetId, celeMeno } = usePouzivatel();
  const [platba, setPlatba] = useState<string | null>(null);

  const posli = (suma: number, kanal: string) => {
    if (!data?.slug) { toast?.("Demo režim — platba sa nezapíše"); return; }
    pay.mutate({ slug: data.slug, idem: idemKluc(data.slug), suma, kanal,
      mena: kanal === "fiat" ? "EUR" : "DEED", odosielatel: ucetId, odosielatelText: celeMeno },
      { onSuccess: () => toast?.(`Odoslané cez QR · ${data.owner_podiel * 100}% ${data.owner_text ?? "tvorcovi"}, zvyšok organizáciám`) });
  };

  const p = data?.prispevok;
  const t = data?.totals;
  const ownerPct = Math.round((data?.owner_podiel ?? 0) * 100);
  const mena = data?.mena ?? "DEED";
  const fotky = (p?.fotky as string[] | undefined) ?? [];

  return (
    <>
    <Sheet onClose={onClose}>
      {isLoading || !data ? (
        <div style={{ padding: SPACE.xl, textAlign: "center", color: C.textTer, fontSize: 13 }}>Načítavam QR…</div>
      ) : (
        <>
          {/* čí QR + pomer */}
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
            <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(GREEN, .16), fontSize: 18 }}>🎬</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.owner_text || "QR tvorcu"}</div>
              <div style={{ fontSize: 11.5, color: C.textTer }}>QR kód · {ownerPct}% tvorcovi · {100 - ownerPct}% organizáciám</div>
            </div>
          </div>

          {/* príspevok (živá kópia) */}
          <div style={{ borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${C.line}`, background: C.surface2 }}>
            <div style={{ position: "relative", height: 150 }}>
              <Foto src={fotky[0]} emoji={p?.emoji || "🎬"} h={150} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.4), transparent 55%)", pointerEvents: "none" }} />
              <span style={{ position: "absolute", bottom: 10, left: 12, color: "#fff", fontSize: 13, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>{p?.autor_nazov}{p?.lok ? ` · ${p.lok}` : ""}</span>
            </div>
            <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.gutter}px` }}>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{p?.titul || "Príspevok"}</div>
              {p?.popis && <div style={{ fontSize: 13, color: C.textSec, marginTop: SPACE.xs, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.popis}</div>}
            </div>
          </div>

          {/* koľko cez tento QR išlo organizáciám */}
          <div style={{ marginTop: SPACE.gutter, background: "rgba(31,191,143,.07)", border: "1px solid rgba(31,191,143,.25)", borderRadius: RADIUS.md, padding: `${SPACE.gutter}px ${SPACE.md}px`, textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: ".4px", color: C.textTer, fontWeight: 700 }}>CEZ TENTO QR ODOSLANÉ ORGANIZÁCIÁM</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: GREEN, marginTop: SPACE.xxs }}>{Math.round(t?.org_total ?? 0).toLocaleString("sk")} {mena}</div>
            <div style={{ fontSize: 11.5, color: C.textSec, marginTop: SPACE.xxs }}>{t?.pocet ?? 0} platieb · {Math.round(t?.owner_total ?? 0).toLocaleString("sk")} {mena} tvorcovi</div>
          </div>

          {/* rozdelenie */}
          <div style={{ marginTop: SPACE.sm, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, marginBottom: SPACE.xxs }}>ROZDELENIE</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: `${SPACE.xxs}px 0` }}><span>🎬 {data.owner_text || "Tvorca"}</span><span style={{ fontWeight: 800, color: GREEN }}>{ownerPct}%</span></div>
            {data.ciele.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: `${SPACE.xxs}px 0` }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {c.prijemca_text}</span><span style={{ flex: "none", fontWeight: 800, color: GREEN }}>{Math.round(c.podiel * 100)}%</span></div>
            ))}
          </div>

          {/* prispieť cez tento QR */}
          <div style={{ marginTop: SPACE.gutter }}>
            {/* vnorený modul v QR sheete — bez riadku Obľúbené/QR/Reťaz (bol by rekurzívny) */}
            <PlatobnyModul bezOblubenych
              onShare={() => toast?.("Zdieľať: odkaz skopírovaný · siete")}
              upvotes={0} onUpvote={() => toast?.("Palec hore")}
              onPodpor={(s: number) => posli(s, "deed")}
              onKanal={(k: string) => setPlatba(k)} accent={GREEN} />
          </div>
        </>
      )}
    </Sheet>
    {platba && data && <PlatbaModal split kanal={platba} komu={data.owner_text || "cez QR"} onClose={() => setPlatba(null)}
      onDone={(s: number) => posli(s, platba === "EUR" ? "fiat" : "deed")} />}
    </>
  );
}
