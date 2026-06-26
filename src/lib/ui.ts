// farba → priesvitný tint. Funguje pre hex ("#RRGGBB") aj CSS premennú
// ("var(--a-green)"). Pre premennú použije color-mix → tint je theme-aware
// (rozlíši sa podľa režimu rovnako ako samotná premenná).
export const tint = (c: string, a: number) => {
  if (c.startsWith("var(") || c.startsWith("color-mix")) {
    return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
  }
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
