// ============================================================
// OPRAVY 351 · obrys zamerania na tlačidlách len pri ovládaní klávesnicou.
// Prehliadač niekedy dá :focus-visible aj po ťuku (napr. keď sa predtým písalo do poľa) → zelený obrys na tlačidle.
// Posledný spôsob ovládania sa zapíše na <html data-ovladanie="mys|klavesnica">; CSS podľa neho obrys na tlačidle skryje.
// ============================================================
const KLAVESY = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);

export function sledujOvladanie() {
  if (typeof document === "undefined") return;
  const nastav = (v: "mys" | "klavesnica") => { if (document.documentElement.dataset.ovladanie !== v) document.documentElement.dataset.ovladanie = v; };
  document.addEventListener("pointerdown", () => nastav("mys"), true);
  document.addEventListener("keydown", (e) => { if (KLAVESY.has(e.key)) nastav("klavesnica"); }, true);
}
