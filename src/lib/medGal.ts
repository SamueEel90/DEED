// OPRAVY 270: fotky položky (GaleriaEditor) v poradí s popismi, video prvé — pre prehliadač fotiek (bod 261)
import type { MediumGalerie } from "@/components/celaGaleria";

const zive = (u?: string | null) => !!u && !/^blob:/.test(u);
export const medGal = (f?: (string | undefined)[], p?: string[], video?: string): MediumGalerie[] => [
  ...(video ? [{ typ: "video" as const, src: video }] : []),
  ...(f ?? []).map((src, i) => ({ typ: "foto" as const, src: src ?? "", popis: p?.[i] || undefined })).filter((m) => zive(m.src)),
];
