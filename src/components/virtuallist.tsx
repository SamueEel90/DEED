// ============================================================
// DEED · VirtualList — threshold-aktivovaná virtualizácia plochých
// zoznamov (@tanstack/react-virtual). Cieľ: appka ostane svižná aj
// keď reálne dáta (Fáza 4) narastú na stovky/tisíce položiek.
//
// KĽÚČOVÉ: pod `threshold` položkami renderuje BEŽNE (`items.map`) —
// dnešné malé mock zoznamy sa správajú 1:1 ako predtým, nulové riziko.
// Nad prahom prepne na virtualizáciu (renderuje len viditeľné + overscan)
// vo vnútri daného scroll kontajnera (`scrollRef`), s dynamickým meraním
// výšky riadkov (rôzne vysoké karty). Riadky nech používajú `borderBottom`
// nie `marginBottom` (margin nie je v meranej výške → medzery).
// ============================================================
import type { ReactElement, RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
  items: T[];
  /** vykreslí jeden riadok — MUSÍ vrátiť element s vlastným `key` (rovnako ako pôvodný .map) */
  renderItem: (item: T, index: number) => ReactElement;
  /** scroll kontajner (element s `overflowY:auto`) — virtualizér podľa neho ráta okno */
  scrollRef: RefObject<HTMLElement | null>;
  /** odhad výšky riadku (px) — spresní sa meraním po vykreslení */
  estimateSize?: number;
  /** koľko riadkov navyše mimo okna (plynulý scroll) */
  overscan?: number;
  /** pod týmto počtom = bežný render bez virtualizácie (default 60) */
  threshold?: number;
  /** stabilný kľúč riadku (pre virtualizovaný obal); inak index */
  getKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({ items, renderItem, scrollRef, estimateSize = 72, overscan = 8, threshold = 60, getKey }: VirtualListProps<T>) {
  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  // Pod prahom: identické správanie ako pôvodný `items.map(renderItem)`.
  // (Hooky sú vždy zavolané vyššie — žiadne podmienené volanie hooku.)
  if (items.length < threshold) {
    return <>{items.map((it, i) => renderItem(it, i))}</>;
  }

  const rows = virt.getVirtualItems();
  return (
    <div style={{ position: "relative", height: virt.getTotalSize(), width: "100%" }}>
      {rows.map((vr) => (
        <div
          key={getKey ? getKey(items[vr.index], vr.index) : vr.index}
          data-index={vr.index}
          ref={virt.measureElement}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)` }}
        >
          {renderItem(items[vr.index], vr.index)}
        </div>
      ))}
    </div>
  );
}
