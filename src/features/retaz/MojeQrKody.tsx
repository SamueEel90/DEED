// ============================================================
// DEED · Moje QR kódy — správca (prerobené „Nastav reťaz na honorár")
// Zoznam VŠETKÝCH mojich QR splitov + aký pomer som nastavil + koľko cez
// každý išlo organizáciám. Vyhľadávanie príspevkov + vytvorenie nového QR
// (SplitConfigStep → qr_split_create). Beží nad qr_split (0018).
// ============================================================
import { Emo } from "@/components/icons";
import { useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { qrUrl } from "@/lib/qr";
import { zdielaj } from "@/lib/zdielanie";
import { Sheet } from "@/components/sheet";
import { PocitadloSheet } from "@/features/overlay/PocitadloSheet";
import { QrModal } from "@/components/qr";
import { Lupa, IkonaFajka, Zdielanie } from "@/components/icons";
import { SplitConfigStep, splitValid, splitOwnerPct, splitCielePayload, type SplitCiel } from "@/components/splitconfig";
import { useQrSplitList, useQrSplitCreate, useGoodFeed } from "@/data";
import { usePouzivatel } from "@/lib/pouzivatel";
import type { QrSplitListItem } from "@/types";

const GREEN = "var(--a-green)";

export function MojeQrKody({ onClose, toast }: { onClose?: () => void; toast?: (m: string) => void }) {
  // počítadlo do streamu sa viaže na konkrétny QR (split), nie na zbierku
  const [pocitadlo, setPocitadlo] = useState<{ splitId: string; nazov?: string } | null>(null);
  const { ucetId, celeMeno } = usePouzivatel();
  const { data: moje = [], isLoading } = useQrSplitList(ucetId);
  const { data: POSTY = [] } = useGoodFeed();
  const create = useQrSplitCreate();

  const [krok, setKrok] = useState<"list" | "novy">("list");
  const [openQr, setOpenQr] = useState<QrSplitListItem | null>(null);
  const [post, setPost] = useState<{ id: string; titul: string; emoji?: string } | null>(null);
  const [ciele, setCiele] = useState<SplitCiel[]>([]);
  const [q, setQ] = useState("");
  const [vyrabam, setVyrabam] = useState(false);

  const jeUuid = (v?: string | null): v is string => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  async function vytvor() {
    if (!post) return;
    setVyrabam(true);
    try {
      await create.mutateAsync({
        caseId: jeUuid(post.id) ? post.id : null, ownerText: celeMeno,
        ownerPodiel: +(splitOwnerPct(ciele) / 100).toFixed(5), ciele: splitCielePayload(ciele), zdroj: "osobny", mena: "DEED",
      });
      toast?.("QR vytvorený · % zafixované");
      setKrok("list"); setPost(null); setCiele([]); setQ("");
    } catch { toast?.("Nepodarilo sa — skús znova"); }
    setVyrabam(false);
  }

  const inpS: React.CSSProperties = { width: "100%", padding: `${SPACE.sm}px ${SPACE.sm}px ${SPACE.sm}px ${SPACE.xxl}px`, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };

  // ---- otvorený QR (QrModal so split rozpisom + reálny slug) ----
  if (openQr) {
    const split = [{ komu: celeMeno || "Ty", pct: Math.round(openQr.owner_podiel * 100) },
      ...openQr.ciele.map((c) => ({ komu: c.prijemca_text || "organizácia", pct: Math.round(c.podiel * 100) }))];
    return (
      <QrModal odznak="D++" typ="rozdelenie" titul={`QR · ${openQr.titul || "Príspevok"}`}
        popis={`Odoslané organizáciám: ${Math.round(openQr.org_odoslane).toLocaleString("sk")} ${openQr.mena}`}
        odkaz={qrUrl("split", openQr.slug)} split={split} onClose={() => setOpenQr(null)} toast={toast} />
    );
  }

  // ---- vytvoriť nový QR: vyhľadaj príspevok → nastav pomer ----
  if (krok === "novy") {
    const zoznam = q ? POSTY.filter((p: any) => (`${p.titul} ${p.autor}`).toLowerCase().includes(q.toLowerCase())) : POSTY.slice(0, 12);
    return (
      <Sheet onClose={() => { setKrok("list"); setPost(null); setCiele([]); setQ(""); }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
          <SpatTlacidlo onClick={() => { setKrok("list"); setPost(null); }} />
          <div style={{ fontSize: 16, fontWeight: 800 }}>{post ? "Nastav pomer" : "Vyber príspevok"}</div>
        </div>

        {!post ? (
          <>
            <div style={{ position: "relative", marginBottom: SPACE.sm }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Lupa size={16} color={C.textTer} /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať príspevok (skutok / zbierka)…" style={inpS} />
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto", margin: "0 -2px" }}>
              {zoznam.map((p: any) => (
                <div key={p.id} onClick={() => { setPost({ id: String(p.id), titul: p.titul, emoji: p.emoji }); setCiele([{ id: String(p.id), komu: p.titul, pct: 70, pinned: true }]); }}
                  style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, cursor: "pointer", background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}` }}>
                  <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: "rgba(var(--glass-rgb),.06)" }}>{p.emoji || "🤝"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titul}</div>
                    <div style={{ fontSize: 11, color: C.textTer }}>{p.autor}{p.lok ? ` · ${p.lok}` : ""}</div>
                  </div>
                  <span style={{ flex: "none", fontSize: 18, color: GREEN }}>›</span>
                </div>
              ))}
              {zoznam.length === 0 && <div style={{ textAlign: "center", color: C.textTer, fontSize: 12.5, padding: SPACE.md }}>Nič sa nenašlo.</div>}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs }}>
              <span style={{ fontSize: 18 }}>{post.emoji || "🤝"}</span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.titul}</div>
              <span onClick={() => { setPost(null); setCiele([]); }} style={{ fontSize: 11.5, color: "var(--a-info)", fontWeight: 700, cursor: "pointer", flex: "none" }}>zmeniť</span>
            </div>
            <SplitConfigStep ownerLabel={celeMeno || "Ty"} ciele={ciele} onCiele={setCiele} ownerColor={GREEN} />
            <button onClick={vytvor} disabled={!splitValid(ciele) || vyrabam}
              style={{ width: "100%", height: 50, borderRadius: RADIUS.md, border: "none", marginTop: SPACE.gutter, fontWeight: 700, fontSize: 15, fontFamily: "inherit",
                background: splitValid(ciele) && !vyrabam ? GRAD_ZELENY : "rgba(var(--glass-rgb),.06)", color: splitValid(ciele) && !vyrabam ? "#fff" : C.textTer, cursor: splitValid(ciele) && !vyrabam ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
              <IkonaFajka size={18} color={splitValid(ciele) && !vyrabam ? "#fff" : C.textTer} /> {vyrabam ? "Vyrábam QR…" : "Vytvoriť QR"}
            </button>
          </>
        )}
      </Sheet>
    );
  }

  if (pocitadlo) return (
    <PocitadloSheet splitId={pocitadlo.splitId} nazov={pocitadlo.nazov}
      toast={toast ?? (() => undefined)} onClose={() => setPocitadlo(null)} />
  );

  // ---- zoznam mojich QR ----
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(GREEN, .16), fontSize: 18 }}><Emo e="⛓" /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Moje QR kódy</div>
          <div style={{ fontSize: 11.5, color: C.textTer }}>Rozdelenie honoráru · % ku každému QR</div>
        </div>
      </div>

      <button onClick={() => setKrok("novy")} style={{ width: "100%", height: 46, borderRadius: RADIUS.md, border: "none", marginBottom: SPACE.gutter, fontWeight: 700, fontSize: 14.5, fontFamily: "inherit", background: GRAD_ZELENY, color: "#fff", cursor: "pointer", boxShadow: "0 8px 26px rgba(31,191,143,.3)" }}>＋ Vytvoriť nový QR</button>

      {isLoading ? (
        <div style={{ padding: SPACE.lg, textAlign: "center", color: C.textTer, fontSize: 13 }}>Načítavam…</div>
      ) : moje.length === 0 ? (
        <div style={{ padding: `${SPACE.lg}px ${SPACE.md}px`, textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>🎬</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: SPACE.xs }}>Zatiaľ žiadne QR</div>
          <div style={{ fontSize: 12, color: C.textTer, marginTop: SPACE.xxs, lineHeight: 1.5 }}>Vytvor si QR k príspevku — nastavíš, koľko % ide tebe a koľko organizáciám. Cez QR potom vidíš, koľko sa vyzbieralo.</div>
        </div>
      ) : (
        moje.map((s) => {
          const ownerPct = Math.round(s.owner_podiel * 100);
          return (
            <div key={s.id} style={{ background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
                <span style={{ fontSize: 18, flex: "none" }}>{s.emoji || "🤝"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.titul || "Príspevok"}</div>
                  <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{ownerPct}% mne · {100 - ownerPct}% organizáciám ({s.ciele.length})</div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: GREEN }}>{Math.round(s.org_odoslane).toLocaleString("sk")} {s.mena}</div>
                  <div style={{ fontSize: 10, color: C.textTer }}>organizáciám</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm }}>
                <button onClick={() => setOpenQr(s)} style={{ flex: 1, height: 38, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Otvoriť QR</button>
                <button onClick={() => setPocitadlo({ splitId: s.slug, nazov: s.titul || undefined })} aria-label="Počítadlo do streamu" style={{ flex: "none", height: 38, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>📺 Do streamu</button>
                <button onClick={() => zdielaj({ titul: s.titul || "DEED+ QR", url: qrUrl("split", s.slug) }, toast)} aria-label="Zdieľať QR odkaz" style={{ flex: "none", width: 44, height: 38, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Zdielanie size={16} color={C.textSec} /></button>
              </div>
            </div>
          );
        })
      )}
    </Sheet>
  );
}
