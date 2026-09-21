// O nás pod hlavičkou profilu — 3 riadky, zvyšok pod „viac". Rovnaké vo verejnom
// profile aj v správe, aby správca videl presne to, čo návštevník.
import { useState } from "react";
import { C } from "@/theme";
import { pressable } from "@/components/pressable";
import { FormatovanyText } from "@/components/formattext";
import { cistyText } from "@/lib/richtext";

export function OnasKratky({ text }: { text: string }) {
  const [viac, setViac] = useState(false);
  return (
    <div style={{ fontSize: 13, lineHeight: 1.5, color: C.textSec }}>
      <div style={viac ? undefined : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        <FormatovanyText text={text} />
      </div>
      {cistyText(text).length > 140 && (
        <span {...pressable(() => setViac((v) => !v), viac ? "Zbaliť" : "Zobraziť viac")}
          style={{ display: "inline-block", marginTop: 2, fontSize: 12.5, fontWeight: 700, color: "var(--a-info)", cursor: "pointer" }}>
          {viac ? "menej" : "viac"}
        </span>
      )}
    </div>
  );
}
