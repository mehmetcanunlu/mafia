// build-www.mjs — Capacitor webDir (www/) derleyicisi.
// public/index.html + src/ + scripts/tutorial/ dosyalarını www/ altında toplar
// ve index.html'deki ../src yolunu ./src'ye çevirir.
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(kok, "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

// index.html: ../src → ./src
let html = readFileSync(join(kok, "public", "index.html"), "utf8");
html = html.replaceAll("../src/", "./src/");
writeFileSync(join(www, "index.html"), html);

cpSync(join(kok, "src"), join(www, "src"), { recursive: true });
cpSync(join(kok, "scripts", "tutorial"), join(www, "scripts", "tutorial"), { recursive: true });

// public/ içinde index.html dışında varlık varsa (ikon vb.) kopyala
for (const ek of ["icons", "assets"]) {
  const kaynak = join(kok, "public", ek);
  if (existsSync(kaynak)) cpSync(kaynak, join(www, ek), { recursive: true });
}

console.log("www/ hazır.");
