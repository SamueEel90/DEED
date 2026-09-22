import { useMemo, type ReactElement } from "react";
import QRCode from "qrcode";

// ============================================================
// DEED QR — jednotný vzhľad všetkých QR v appke („D“ rám + odznak).
// Odznak vľavo hore: D+ = osoba · D++ = organizácia/firma · reťaz = tvorca.
// Zelená pilulka = suma (potvrdenie príspevku) · spodná pilulka = delenie.
// Geometria podľa návrhu DEED_D_final (viewBox 1000×1000).
// ============================================================

export type DeedOdznak = "D+" | "D++";
export type DeedQrVariant = "svetly" | "inverzny";

const ZELENA = "#2E7D4F";
const TMAVA = "#161D16";

// plocha QR vnútri rámu (súradnice skupiny)
const QX = 146, QY = 196, QS = 656;

function Retaz({ x, y, farba }: { x: number; y: number; farba: string }) {
  // dve zaoblené očká pod 45°
  return (
    <g transform={`translate(${x} ${y}) rotate(-45)`} fill="none" stroke={farba} strokeWidth={8}>
      <rect x={-30} y={-11} width={34} height={22} rx={11} />
      <rect x={-4} y={-11} width={34} height={22} rx={11} />
    </g>
  );
}

export function DeedQr({ data, odznak = "D+", retaz = false, suma, delenie, variant = "svetly", size = 260 }: {
  data: string; odznak?: DeedOdznak; retaz?: boolean; suma?: string | null; delenie?: string | null;
  variant?: DeedQrVariant; size?: number;
}) {
  const inv = variant === "inverzny";
  const ramik = inv ? "#ffffff" : ZELENA;
  const pozadie = inv ? TMAVA : "#ffffff";
  const pillBg = inv ? "#ffffff" : TMAVA;
  const pillText = inv ? TMAVA : "#ffffff";

  const mriezka = useMemo(() => {
    try {
      const q = QRCode.create(data || "deed", { errorCorrectionLevel: "H" });
      return { n: q.modules.size, d: q.modules.data as Uint8Array };
    } catch { return null; }
  }, [data]);

  const moduly: ReactElement[] = [];
  const findery: ReactElement[] = [];
  if (mriezka) {
    const { n, d } = mriezka;
    const p = QS / n;
    const vFinderi = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!d[r * n + c] || vFinderi(r, c)) continue;
      moduly.push(<rect key={`${r}-${c}`} x={QX + c * p + p * 0.04} y={QY + r * p + p * 0.04} width={p * 0.92} height={p * 0.92} rx={p * 0.25} fill={TMAVA} />);
    }
    for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      const x = QX + c * p, y = QY + r * p;
      findery.push(
        <g key={`f${r}-${c}`}>
          <rect x={x} y={y} width={7 * p} height={7 * p} rx={1.6 * p} fill={ZELENA} />
          <rect x={x + p} y={y + p} width={5 * p} height={5 * p} rx={1.1 * p} fill="#ffffff" />
          <rect x={x + 2 * p} y={y + 2 * p} width={3 * p} height={3 * p} rx={0.7 * p} fill={ZELENA} />
        </g>,
      );
    }
  }

  // odznak vľavo hore — šírka podľa obsahu
  const odznakW = (odznak === "D++" ? 180 : 150) + (retaz ? 80 : 0);
  const textX = retaz ? 137 + 30 : 137 + odznakW / 2;
  const sumaW = suma ? Math.max(150, 40 + suma.length * 22) : 0;
  const delenieW = delenie ? Math.min(560, Math.max(260, 60 + delenie.length * 17)) : 0;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width={size} height={size} role="img" aria-label={`DEED QR ${odznak}${retaz ? " reťaz" : ""}`} style={{ display: "block", borderRadius: size * 0.04 }}>
      <rect width={1000} height={1000} fill={pozadie} />
      <g transform="translate(-31.5,-12)">
        <rect x={64} y={72} width={14} height={880} rx={7} fill={ramik} />
        <path d="M 90 56 H 580 C 800 56 999 249.84 999 512 C 999 774.16 800 977 580 977 H 90 V 951 H 580 C 796 951 973 747.04 973 512 C 973 276.96 796 64 580 64 H 90 Z" fill={ramik} />
        <path d="M 86 56 L 86 977 L 94 977 Q 106 512 94 56 Z" fill={ramik} />
        {inv && <rect x={QX - 22} y={QY - 22} width={QS + 44} height={QS + 44} rx={40} fill="#ffffff" />}
        {moduly}
        {findery}
        {/* odznak */}
        <rect x={137} y={78} width={odznakW} height={66} rx={33} fill={pillBg} />
        <text x={textX} y={121} textAnchor={retaz ? "start" : "middle"} fontFamily="Arial, Helvetica, sans-serif" fontSize={34} fontWeight="bold" fill={pillText}>{odznak}</text>
        {retaz && <Retaz x={137 + odznakW - 50} y={111} farba={pillText} />}
        {/* suma — potvrdenie príspevku */}
        {suma && (
          <g>
            <rect x={137 + odznakW + 60} y={78} width={sumaW} height={66} rx={33} fill={ZELENA} />
            <text x={137 + odznakW + 60 + sumaW / 2} y={121} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize={34} fontWeight="bold" fill="#ffffff">{suma}</text>
          </g>
        )}
        {/* delenie — koľko % a komu */}
        {delenie && (
          <g>
            <rect x={474 - delenieW / 2} y={874} width={delenieW} height={56} rx={28} fill={pillBg} />
            <text x={474} y={911} textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize={27} fontWeight="bold" fill={pillText}>{delenie}</text>
          </g>
        )}
      </g>
    </svg>
  );
}
