import { MEKANIK } from "./config.js";

export function savasKazanmaIhtimali(saldiran, savunan, guv) {
  // Savunan yoksa otomatik zafer
  if (savunan <= 0) return 1.0;

  // oran: saldıran/savunan (örneğin 0.5 = yarısı kadar, 2 = iki katı)
  const oran = saldiran / savunan;

  // güvenlik savunmayı çarpar, 1 güvenlik = %12 avantaj (düşürüldü)
  const guvenlikCarpani = 1 + guv * 0.12;

  // efektif oran
  const efektif = oran / guvenlikCarpani;

  // saldırı şansı eğrisi: düşük oranlarda 0’a yakın, yüksek oranlarda 1’e yakın
  let ihtimal = 1 / (1 + Math.exp(-4 * (efektif - 1)));

  // min–max sınırı
  if (ihtimal < 0.05) ihtimal = 0.05;
  if (ihtimal > 0.95) ihtimal = 0.95;

  return ihtimal;
}

export function neutralSavunma(nufus, guv) {
  return Math.max(
    3,
    Math.ceil(nufus / MEKANIK.neutralMilitiaDiv) +
    guv * MEKANIK.neutralMilitiaGuv
  );
}

export function saldiriMaliyeti(
  { taban = 40, guvenlikCarpani = 8, adamCarpani = 2 },
  guvToplam,
  gonder
) {
  return taban + guvToplam * guvenlikCarpani + gonder * adamCarpani;
}
