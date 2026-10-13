// OPRAVY 204: QR na parte sa generuje z odkazu zbierky (data URL — v obrázku parte sa načíta aj mimo appky).
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export const qrObrazok = (odkaz: string): Promise<string> => QRCode.toDataURL(odkaz, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#14110B", light: "#FFFFFF" } });

/** QR obrázok pre odkaz; kým sa nevytvorí, undefined */
export function useQrObrazok(odkaz: string | null | undefined): string | undefined {
  const [src, setSrc] = useState<{ k: string; s: string } | null>(null);
  useEffect(() => {
    if (!odkaz) return;
    let ziva = true;
    void qrObrazok(odkaz).then((s) => { if (ziva) setSrc({ k: odkaz, s }); }).catch(() => undefined);
    return () => { ziva = false; };
  }, [odkaz]);
  return src && src.k === odkaz ? src.s : undefined;
}
