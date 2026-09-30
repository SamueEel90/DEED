// Štíty oblastí (karta 26): z originálov od Martina (assets-src/stity, PNG ~1443 × 1863, ~2,7 MB)
// vyrobí verzie do appky — originály do public/ nejdú.
//   public/stity/oblasti/<názov>.webp      512 px na výšku (zväčšenie, veľký štít)
//   public/stity/oblasti/<názov>-128.webp  128 px (mriežka, profil, polia)
//   public/stity/oblasti/<názov>.png       512 px záloha pre staré prehliadače
// Spustenie: npm run stity  (raz po pridaní / výmene originálov)
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const ZDROJ = "assets-src/stity";
const CIEL = "public/stity/oblasti";
await mkdir(CIEL, { recursive: true });
const subory = (await readdir(ZDROJ)).filter((f) => /^DEED_.+\.png$/i.test(f));
for (const f of subory) {
  const n = path.parse(f).name;
  const src = sharp(path.join(ZDROJ, f)).trim();
  await src.clone().resize({ height: 512 }).webp({ quality: 82, alphaQuality: 90 }).toFile(`${CIEL}/${n}.webp`);
  await src.clone().resize({ height: 128 }).webp({ quality: 80, alphaQuality: 90 }).toFile(`${CIEL}/${n}-128.webp`);
  await src.clone().resize({ height: 512 }).png({ compressionLevel: 9, palette: true }).toFile(`${CIEL}/${n}.png`);
  console.log("✓", n);
}
console.log(`${subory.length} štítov → ${CIEL}`);
