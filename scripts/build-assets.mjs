// build-assets.mjs — assets/svg/*.svg kaynaklarından @capacitor/assets'in
// beklediği PNG'leri üretir, sonra `npx capacitor-assets generate` çalıştırılır.
import sharp from "sharp";
import { readFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgDizin = join(kok, "assets", "svg");
const hedef = join(kok, "assets");

async function ciz(svgAd, pngAd, boyut) {
  const svg = readFileSync(join(svgDizin, svgAd));
  await sharp(svg, { density: 300 })
    .resize(boyut, boyut)
    .png()
    .toFile(join(hedef, pngAd));
  console.log(`${pngAd} (${boyut}×${boyut}) hazır.`);
}

await ciz("icon.svg", "icon-only.png", 1024);
await ciz("icon-foreground.svg", "icon-foreground.png", 1024);
await ciz("icon-background.svg", "icon-background.png", 1024);
await ciz("splash.svg", "splash.png", 2732);
copyFileSync(join(hedef, "splash.png"), join(hedef, "splash-dark.png"));
console.log("splash-dark.png kopyalandı (oyun koyu temalı, tek görsel yeterli).");
