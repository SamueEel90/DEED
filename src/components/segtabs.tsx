// ============================================================
// DEED · SegTabs — prístupný segment/tab selektor (jedna voľba).
// Nahrádza bespoke pásiky `{opts.map(o => <span onClick=setTab>)}`,
// ktoré neboli klávesnicovo ovládateľné. Dáva im správnu ARIA
// sémantiku (radiogroup + roving tabindex) a šípkovú navigáciu —
// presne to, čo ROADMAP žiada pre segment selektory.
//
// Vzhľad ostáva bespoke: `render(opt, active)` vráti pôvodne
// naštýlovaný element, SegTabs mu len doplní role/tabIndex/aria
// + klávesnicu (← → ↑ ↓ Home End, Enter/Space) cez cloneElement.
// ============================================================
import { useRef, cloneElement, type ReactElement, type KeyboardEvent, type CSSProperties } from "react";

interface SegTabsProps<T extends string> {
  /** voľby v poradí zobrazenia */
  options: readonly T[];
  /** aktívna voľba */
  value: T;
  onChange: (v: T) => void;
  /** vykreslí vizuál jednej voľby — vráti element, ktorý dostane a11y + klávesnicu */
  render: (opt: T, active: boolean) => ReactElement;
  /** prístupný názov skupiny (napr. „Filter charít", „Sekcie profilu") */
  ariaLabel?: string;
  /** štýl/triedy kontajnera (preberá pôvodný flex/grid/overflow obal) */
  style?: CSSProperties;
  className?: string;
}

/** Jedno-výberový segment selektor s klávesnicou (radiogroup + roving tabindex). */
export function SegTabs<T extends string>({ options, value, onChange, render, ariaLabel, style, className }: SegTabsProps<T>) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  const vyber = (i: number) => {
    const next = ((i % options.length) + options.length) % options.length;
    onChange(options[next]);
    refs.current[next]?.focus();
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown": e.preventDefault(); vyber(i + 1); break;
      case "ArrowLeft":
      case "ArrowUp": e.preventDefault(); vyber(i - 1); break;
      case "Home": e.preventDefault(); vyber(0); break;
      case "End": e.preventDefault(); vyber(options.length - 1); break;
      case "Enter":
      case " ": e.preventDefault(); onChange(options[i]); break;
    }
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={className} style={style}>
      {options.map((opt, i) => {
        const active = opt === value;
        const el = render(opt, active);
        return cloneElement(el as ReactElement<Record<string, unknown>>, {
          key: opt,
          ref: (n: HTMLElement | null) => { refs.current[i] = n; },
          role: "radio",
          "aria-checked": active,
          tabIndex: active ? 0 : -1,
          onClick: () => onChange(opt),
          onKeyDown: (e: KeyboardEvent) => onKey(e, i),
        });
      })}
    </div>
  );
}
