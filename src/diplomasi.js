import { DIPLOMASI, ZORLUK } from "./config.js";
import { gucPuani, gucSiralamasiHesapla } from "./gucDengesi.js";
import { oyun, bolgeById, diplomasiDurumuTamamla } from "./state.js";
import { yiginaEkle } from "./state.js";

export const DIPLO_OWNERLER = Object.freeze(["biz", "ai1", "ai2", "ai3"]);
const DIPLO_LOG_LIMIT = 80;
const DIPLO_TARIHCE_LIMIT = 40;
const AI_DIPLO_TUR_ARALIK = 6;
const AI_DIPLO_TEKLIF_COOLDOWN = 12;
const AI_DIPLO_AKTIF_ANLASMA_LIMIT = 1;
const AI_TICARET_DENEME_SANSI = 0.16;
const OYUNCU_TEKLIF_GECERLILIK = 3;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

export function iliskiAnahtar(a, b) {
  return [a, b].sort().join("-");
}

function ownerAd(owner) {
  return oyun.fraksiyon?.[owner]?.ad || owner;
}

function ownerPara(owner) {
  return Math.max(0, Math.round(oyun.fraksiyon?.[owner]?.para || 0));
}

function ticaretMinSermaye() {
  return Math.max(0, Math.round(DIPLOMASI.TICARET_MIN_SERMAYE || 0));
}

function ticaretSermayeYetersizMesaji(owner, minSermaye) {
  const para = ownerPara(owner);
  return `${ownerAd(owner)}: ${para}₺ (gerekli ${minSermaye}₺)`;
}

function teklifTipAdi(tip) {
  if (tip === "baris") return "barış";
  if (tip === "savas") return "savaş ilanı";
  if (tip === "ittifak") return "ittifak";
  if (tip === "ticaret") return "ticaret";
  if (tip === "koalisyon") return "koalisyon";
  if (tip === "ittifak-mudahale") return "ittifak müdahalesi";
  if (tip === "sabotaj") return "sabotaj";
  if (tip === "tehdit") return "ültimatom";
  return tip || "diplomasi";
}

function teklifGetiriGoturuMetni(tip, gonderen, hedef = "biz") {
  if (tip === "ticaret") {
    const gelirBiz = Math.round(ownerGelirTabani(hedef) * DIPLOMASI.TICARET_GELIR_BONUS);
    const gelirDiger = Math.round(ownerGelirTabani(gonderen) * DIPLOMASI.TICARET_GELIR_BONUS);
    const batmaYuzde = Math.round((DIPLOMASI.TICARET_BATMA_SANSI || 0) * 100);
    const batmaMin = Math.round(DIPLOMASI.TICARET_BATMA_MIN_KAYIP || 0);
    const batmaMax = Math.round(DIPLOMASI.TICARET_BATMA_MAX_KAYIP || 0);
    const minSermaye = ticaretMinSermaye();
    return [
      "Getirecek:",
      `+ ${DIPLOMASI.TICARET_SURESI} tur ticaret anlaşması`,
      `+ Sana yaklaşık tur başı ${gelirBiz}₺`,
      `+ ${ownerAd(gonderen)} için tur başı yaklaşık ${gelirDiger}₺`,
      "Götürecek:",
      "- Doğrudan para maliyeti yok",
      `- Başlangıçta iki taraf için min sermaye: ${minSermaye}₺`,
      `- Her tur %${batmaYuzde} batma riski (yaklaşık ${batmaMin}-${batmaMax}₺ kayıp)`,
      "- Reddedersen ilişki -4",
    ].join("\n");
  }
  if (tip === "ittifak") {
    return [
      "Getirecek:",
      `+ ${DIPLOMASI.ITTIFAK_SURESI} tur ittifak ve saldırmazlık`,
      `+ Ortak saldırılarda bonus (yaklaşık +%${Math.round((DIPLOMASI.ITTIFAK_SALDIRI_BONUS || 0) * 100)})`,
      "Götürecek:",
      `- Her tur iki taraf da ${DIPLOMASI.ITTIFAK_TUR_MALIYETI}₺ bakım öder`,
      "- Bakım ödenemezse ittifak bozulur",
      "- Reddedersen ilişki -8",
    ].join("\n");
  }
  if (tip === "baris") {
    const iliski = iliskiDegeri(gonderen, hedef);
    if (iliski <= -50) {
      return [
        "Getirecek:",
        `+ ${DIPLOMASI.BARIS_SURESI} tur barış anlaşması`,
        "+ İlişki artışı (+20)",
        "Götürecek:",
        "- Anlaşma boyunca saldırı yapılamaz",
        "- Reddedersen ilişki -6",
      ].join("\n");
    }
    if (iliski <= -30) {
      return [
        "Getirecek:",
        `+ ${DIPLOMASI.ATESKES_SURESI} tur ateşkes`,
        "+ İlişki artışı (+12)",
        "Götürecek:",
        "- Ateşkes süresince saldırı yok",
        "- Reddedersen ilişki -6",
      ].join("\n");
    }
    if (iliski < 0) {
      return [
        "Getirecek:",
        "+ Normalleşme görüşmesi, ilişki +8",
        "Götürecek:",
        "- Saldırı yasağı oluşturmaz",
        "- Reddedersen ilişki -6",
      ].join("\n");
    }
    return [
      "Getirecek:",
      "+ İlişki iyileşmesi",
      "Götürecek:",
      "- Bu seviyede barış görüşmesi açılamaz",
      "- Reddedersen ilişki -6",
    ].join("\n");
  }
  if (tip === "koalisyon") {
    return [
      "Getirecek:",
      `+ Koalisyona katılım ve +%${Math.round((DIPLOMASI.KOALISYON_SALDIRI_BONUS || 0) * 100)} ortak saldırı bonusu`,
      "+ Üyelerle ilişki artışı",
      "Götürecek:",
      "- Koalisyon hedefiyle açık gerilim",
      "- Reddedersen diğer üyelerle ilişki -5",
    ].join("\n");
  }
  if (tip === "ittifak-mudahale") {
    return [
      "Getirecek:",
      "+ Müttefike askeri destek verirsin",
      "Götürecek:",
      "- Yeni cephe açılır, birlik ve lojistik tüketir",
    ].join("\n");
  }
  return [
    "Getirecek:",
    "+ Diplomatik ilişki etkisi",
    "Götürecek:",
    "- Karara göre ilişki değişimi",
  ].join("\n");
}

function oyuncuyaBekleyenTeklifVarMi() {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) d.bekleyenTeklifler = [];
  return d.bekleyenTeklifler.some((t) => t?.hedef === "biz" && t?.durum === "beklemede");
}

function oyuncuyaTeklifOlustur(gonderen, tip, meta = {}) {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) d.bekleyenTeklifler = [];
  if (oyuncuyaBekleyenTeklifVarMi()) return null;
  const ayniTeklif = d.bekleyenTeklifler.find(
    (t) => t?.durum === "beklemede" && t?.gonderen === gonderen && t?.hedef === "biz" && t?.tip === tip
  );
  if (ayniTeklif) return ayniTeklif;

  const teklif = {
    id: `teklif-${oyun.tur}-${Math.random().toString(36).slice(2, 8)}`,
    tip,
    gonderen,
    hedef: "biz",
    durum: "beklemede",
    tur: oyun.tur,
    bitis: oyun.tur + OYUNCU_TEKLIF_GECERLILIK,
    meta: (meta && typeof meta === "object") ? { ...meta } : {},
  };
  d.bekleyenTeklifler.push(teklif);
  return teklif;
}

const RED_COOLDOWN_TUR = 50;

function redCooldownKey(gonderen, hedef, tip) {
  return `${tip}:${[gonderen, hedef].sort().join("-")}`;
}

function redCooldownKontrol(gonderen, hedef, tip) {
  const d = diplomasiDurumu();
  if (!d.redCooldown || typeof d.redCooldown !== "object") d.redCooldown = {};
  const key = redCooldownKey(gonderen, hedef, tip);
  const bitis = d.redCooldown[key] || 0;
  const kalan = bitis - oyun.tur;
  return kalan > 0 ? kalan : 0;
}

function redCooldownKoy(gonderen, hedef, tip) {
  const d = diplomasiDurumu();
  if (!d.redCooldown || typeof d.redCooldown !== "object") d.redCooldown = {};
  const key = redCooldownKey(gonderen, hedef, tip);
  d.redCooldown[key] = oyun.tur + RED_COOLDOWN_TUR;
}

function oyuncuTeklifTipCooldownKalan(tip) {
  const d = diplomasiDurumu();
  if (!d.oyuncuTeklifTipCooldown || typeof d.oyuncuTeklifTipCooldown !== "object") {
    d.oyuncuTeklifTipCooldown = {};
  }
  const bitis = Number(d.oyuncuTeklifTipCooldown[tip] || 0);
  const kalan = bitis - oyun.tur;
  return kalan > 0 ? kalan : 0;
}

function oyuncuTeklifTipCooldownKoy(tip, sure = RED_COOLDOWN_TUR) {
  if (!tip) return;
  const d = diplomasiDurumu();
  if (!d.oyuncuTeklifTipCooldown || typeof d.oyuncuTeklifTipCooldown !== "object") {
    d.oyuncuTeklifTipCooldown = {};
  }
  d.oyuncuTeklifTipCooldown[tip] = oyun.tur + Math.max(1, Math.floor(Number(sure) || RED_COOLDOWN_TUR));
}

function barisAsamasiBelirle(iliski) {
  if (iliski <= -50) return "baris";
  if (iliski <= -30) return "ateskes";
  if (iliski < 0) return "normallesme";
  return "uygunsuz";
}

function ittifakMudahaleKuyrugu() {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.ittifakMudahaleKuyrugu)) d.ittifakMudahaleKuyrugu = [];
  return d.ittifakMudahaleKuyrugu;
}

function ittifakMudahaleKuyrugaEkle(kayit) {
  if (!kayit || typeof kayit !== "object") return;
  if (!kayit.owner || !kayit.saldiran || !kayit.savunulan) return;
  const kuyruk = ittifakMudahaleKuyrugu();
  const varMi = kuyruk.some(
    (m) =>
      m.owner === kayit.owner &&
      m.saldiran === kayit.saldiran &&
      m.savunulan === kayit.savunulan &&
      Number(m.tetikTur) === Number(kayit.tetikTur)
  );
  if (varMi) return;
  kuyruk.push({
    owner: kayit.owner,
    saldiran: kayit.saldiran,
    savunulan: kayit.savunulan,
    tetikTur: Number.isFinite(kayit.tetikTur) ? kayit.tetikTur : oyun.tur + 1,
    kaynak: kayit.kaynak || "ittifak",
  });
  if (kuyruk.length > 16) kuyruk.splice(0, kuyruk.length - 16);
}

export function ittifakMudahaleKuyrugundanHazirOlanlariAl() {
  const kuyruk = ittifakMudahaleKuyrugu();
  const hazir = kuyruk.filter((m) => Number.isFinite(m.tetikTur) && m.tetikTur <= oyun.tur);
  const kalan = kuyruk.filter((m) => !Number.isFinite(m.tetikTur) || m.tetikTur > oyun.tur);
  const d = diplomasiDurumu();
  d.ittifakMudahaleKuyrugu = kalan;
  return hazir;
}

function barisTeklifiSonuclandir(gonderen, hedef, kabul) {
  const iliski = iliskiDegeri(gonderen, hedef);
  const asama = barisAsamasiBelirle(iliski);
  if (asama === "uygunsuz") {
    return { ok: false, mesaj: "Barış/ateşkes için ilişki en az Tarafsız altı (0'dan düşük) olmalı." };
  }
  if (barisAktifMi(gonderen, hedef)) {
    return { ok: false, mesaj: "Zaten aktif bir barış anlaşması var." };
  }
  if (asama === "ateskes" && ateskesAktifMi(gonderen, hedef)) {
    return { ok: false, mesaj: "Zaten aktif bir ateşkes var." };
  }
  const kalan = redCooldownKontrol(gonderen, hedef, "baris");
  if (kalan > 0) {
    return { ok: false, mesaj: `Barış teklifi reddedildi, ${kalan} tur sonra tekrar denenebilir.` };
  }
  if (!kabul) {
    iliskiDegistir(gonderen, hedef, -6, "Barış teklifi reddedildi");
    redCooldownKoy(gonderen, hedef, "baris");
    return { ok: false, mesaj: `${ownerAd(hedef)} barış teklifini reddetti. ${RED_COOLDOWN_TUR} tur boyunca yeni teklif yapılamaz.` };
  }

  if (asama === "baris") {
    iliskiDegistir(gonderen, hedef, +20, "Barış anlaşması imzalandı");
    anlasmaEkle("baris", gonderen, hedef, DIPLOMASI.BARIS_SURESI);
    diploKayitEkle(
      "baris",
      `${ownerAd(gonderen)} ve ${ownerAd(hedef)} arasında ${DIPLOMASI.BARIS_SURESI} turluk barış anlaşması imzalandı.`,
      "iyi",
      { taraflar: [gonderen, hedef] }
    );
    return { ok: true, mesaj: `Barış anlaşması kabul edildi (${DIPLOMASI.BARIS_SURESI} tur).` };
  }

  if (asama === "ateskes") {
    iliskiDegistir(gonderen, hedef, +12, "Ateşkes kabul edildi");
    anlasmaEkle("ateskes", gonderen, hedef, DIPLOMASI.ATESKES_SURESI);
    diploKayitEkle(
      "ateskes",
      `${ownerAd(gonderen)} ve ${ownerAd(hedef)} arasında ${DIPLOMASI.ATESKES_SURESI} turluk ateşkes yapıldı.`,
      "bilgi",
      { taraflar: [gonderen, hedef] }
    );
    return { ok: true, mesaj: `Ateşkes kabul edildi (${DIPLOMASI.ATESKES_SURESI} tur).` };
  }

  iliskiDegistir(gonderen, hedef, +8, "Normalleşme görüşmesi");
  diploKayitEkle(
    "normallesme",
    `${ownerAd(gonderen)} ve ${ownerAd(hedef)} normalleşme görüşmesi yaptı (+8 ilişki).`,
    "bilgi",
    { taraflar: [gonderen, hedef] }
  );
  return { ok: true, mesaj: "Normalleşme görüşmesi kabul edildi (+8 ilişki)." };
}

function ittifakTeklifiSonuclandir(gonderen, hedef, kabul) {
  const iliski = iliskiDegeri(gonderen, hedef);
  if (iliski < 30) return { ok: false, mesaj: "İttifak için en az Dostluk (+30) gerekir." };
  if (ittifakAktifMi(gonderen, hedef)) return { ok: false, mesaj: "Zaten aktif ittifak var." };
  const kalan = redCooldownKontrol(gonderen, hedef, "ittifak");
  if (kalan > 0) {
    return { ok: false, mesaj: `İttifak teklifi reddedildi, ${kalan} tur sonra tekrar denenebilir.` };
  }
  if (!kabul) {
    iliskiDegistir(gonderen, hedef, -8, "İttifak teklifi reddedildi");
    redCooldownKoy(gonderen, hedef, "ittifak");
    return { ok: false, mesaj: `${ownerAd(hedef)} ittifak teklifini reddetti. ${RED_COOLDOWN_TUR} tur boyunca yeni teklif yapılamaz.` };
  }
  iliskiDegistir(gonderen, hedef, +14, "İttifak kuruldu");
  anlasmaEkle("ittifak", gonderen, hedef, DIPLOMASI.ITTIFAK_SURESI);
  diploKayitEkle(
    "ittifak",
    `${ownerAd(gonderen)} ve ${ownerAd(hedef)} ${DIPLOMASI.ITTIFAK_SURESI} turluk ittifak kurdu.`,
    "iyi",
    { taraflar: [gonderen, hedef] }
  );
  return { ok: true, mesaj: "İttifak teklifi kabul edildi." };
}

function ticaretTeklifiSonuclandir(gonderen, hedef, kabul) {
  const iliski = iliskiDegeri(gonderen, hedef);
  if (iliski < -10) return { ok: false, mesaj: "Ticaret için ilişki en az -10 olmalı." };
  if (ticaretAktifMi(gonderen, hedef)) return { ok: false, mesaj: "Aktif ticaret anlaşması zaten var." };
  const minSermaye = ticaretMinSermaye();
  const paraGonderen = ownerPara(gonderen);
  const paraHedef = ownerPara(hedef);
  if (paraGonderen < minSermaye || paraHedef < minSermaye) {
    return {
      ok: false,
      mesaj:
        `Ticaret için iki tarafın da en az ${minSermaye}₺ sermayesi olmalı.\n` +
        `${ticaretSermayeYetersizMesaji(gonderen, minSermaye)}\n` +
        `${ticaretSermayeYetersizMesaji(hedef, minSermaye)}`,
    };
  }
  const kalan = redCooldownKontrol(gonderen, hedef, "ticaret");
  if (kalan > 0) {
    return { ok: false, mesaj: `Ticaret teklifi reddedildi, ${kalan} tur sonra tekrar denenebilir.` };
  }
  if (!kabul) {
    iliskiDegistir(gonderen, hedef, -4, "Ticaret teklifi reddedildi");
    redCooldownKoy(gonderen, hedef, "ticaret");
    return { ok: false, mesaj: `${ownerAd(hedef)} ticaret teklifini reddetti. ${RED_COOLDOWN_TUR} tur boyunca yeni teklif yapılamaz.` };
  }
  iliskiDegistir(gonderen, hedef, +12, "Ticaret anlaşması başladı");
  anlasmaEkle("ticaret", gonderen, hedef, DIPLOMASI.TICARET_SURESI);
  const gelirGonderen = Math.round(ownerGelirTabani(gonderen) * DIPLOMASI.TICARET_GELIR_BONUS);
  const gelirHedef = Math.round(ownerGelirTabani(hedef) * DIPLOMASI.TICARET_GELIR_BONUS);
  const batmaYuzde = Math.round((DIPLOMASI.TICARET_BATMA_SANSI || 0) * 100);
  const batmaMin = Math.round(DIPLOMASI.TICARET_BATMA_MIN_KAYIP || 0);
  const batmaMax = Math.round(DIPLOMASI.TICARET_BATMA_MAX_KAYIP || 0);
  diploKayitEkle(
    "ticaret",
    `${ownerAd(gonderen)} ↔ ${ownerAd(hedef)} arasında ${DIPLOMASI.TICARET_SURESI} turluk ticaret başladı.`,
    "iyi",
    { taraflar: [gonderen, hedef] }
  );
  return {
    ok: true,
    mesaj:
      "Ticaret anlaşması kabul edildi.\n" +
      `Rapor: ${ownerAd(gonderen)} +${gelirGonderen}₺/tur, ${ownerAd(hedef)} +${gelirHedef}₺/tur.\n` +
      `Risk: her tur %${batmaYuzde} batma (${batmaMin}-${batmaMax}₺ kayıp).`,
  };
}

function anlasmaTaraflariAyniMi(anlasma, a, b) {
  return (
    (anlasma.taraf1 === a && anlasma.taraf2 === b) ||
    (anlasma.taraf1 === b && anlasma.taraf2 === a)
  );
}

function aktifAnlasmaFiltre(anlasma) {
  return anlasma && Number.isFinite(anlasma.bitis) && anlasma.bitis >= oyun.tur;
}

function iliskiDurumMeta(deger) {
  if (deger >= 70) return { etiket: "İttifak", ikon: "🟢", sinif: "ittifak" };
  if (deger >= 30) return { etiket: "Dostluk", ikon: "💚", sinif: "dostluk" };
  if (deger > -30) return { etiket: "Tarafsız", ikon: "⚪", sinif: "tarafsiz" };
  if (deger > -70) return { etiket: "Gerilim", ikon: "🟠", sinif: "gerilim" };
  return { etiket: "Savaş", ikon: "🔴", sinif: "savas" };
}

export function diplomasiDurumu() {
  oyun.diplomasi = diplomasiDurumuTamamla(oyun.diplomasi);
  return oyun.diplomasi;
}

function oyuncuAksiyonDurumu() {
  const d = diplomasiDurumu();
  if (!d.oyuncuAksiyon || typeof d.oyuncuAksiyon !== "object") {
    d.oyuncuAksiyon = { tur: -1, tip: null, hedef: null };
  }
  return d.oyuncuAksiyon;
}

export function oyuncuDiploAksiyonMumkunMu() {
  return oyuncuAksiyonDurumu().tur !== oyun.tur;
}

export function oyuncuDiploAksiyonKullan(tip, hedef) {
  const aksiyon = oyuncuAksiyonDurumu();
  if (aksiyon.tur === oyun.tur) return false;
  aksiyon.tur = oyun.tur;
  aksiyon.tip = tip || null;
  aksiyon.hedef = hedef || null;
  return true;
}

export function oyuncuDiploAksiyonDurumu() {
  const aksiyon = oyuncuAksiyonDurumu();
  return {
    kullanildi: aksiyon.tur === oyun.tur,
    tur: aksiyon.tur,
    tip: aksiyon.tip || null,
    hedef: aksiyon.hedef || null,
  };
}

function diploKayitEkle(kod, mesaj, oncelik = "bilgi", extra = {}) {
  const d = diplomasiDurumu();
  const kayit = {
    tur: oyun.tur,
    kod,
    mesaj,
    oncelik,
    ...extra,
  };
  d.olayGunlugu.push(kayit);
  if (d.olayGunlugu.length > DIPLO_LOG_LIMIT) {
    d.olayGunlugu.splice(0, d.olayGunlugu.length - DIPLO_LOG_LIMIT);
  }
  return kayit;
}

function iliskiKoy(a, b, deger) {
  const d = diplomasiDurumu();
  d.iliskiler[iliskiAnahtar(a, b)] = clamp(round1(deger), -100, 100);
  return d.iliskiler[iliskiAnahtar(a, b)];
}

export function iliskiDegeri(a, b) {
  if (!a || !b || a === b) return 0;
  const d = diplomasiDurumu();
  const key = iliskiAnahtar(a, b);
  if (!Number.isFinite(d.iliskiler[key])) d.iliskiler[key] = 0;
  return d.iliskiler[key];
}

export function iliskiDurumu(a, b) {
  const deger = iliskiDegeri(a, b);
  return {
    deger,
    ...iliskiDurumMeta(deger),
  };
}

export function iliskiDegistir(a, b, delta, neden = "İlişki olayı", opts = {}) {
  if (!a || !b || a === b || !Number.isFinite(delta) || delta === 0) return { deger: iliskiDegeri(a, b), delta: 0 };
  const onceki = iliskiDegeri(a, b);
  const yeni = iliskiKoy(a, b, onceki + delta);
  const net = round1(yeni - onceki);
  if (!opts.sessiz) {
    diploKayitEkle(
      "iliski-degisim",
      `${ownerAd(a)} ↔ ${ownerAd(b)}: ${neden} (${net >= 0 ? "+" : ""}${net})`,
      "bilgi",
      { taraflar: [a, b], delta: net }
    );
  }
  return { deger: yeni, delta: net };
}

export function aktifAnlasmalar(a = null, b = null, tip = null) {
  const d = diplomasiDurumu();
  return d.anlasmalar
    .filter(aktifAnlasmaFiltre)
    .filter((anlasma) => (tip ? anlasma.tip === tip : true))
    .filter((anlasma) => (a && b ? anlasmaTaraflariAyniMi(anlasma, a, b) : true));
}

export function anlasmaAktifMi(a, b, tip) {
  return aktifAnlasmalar(a, b, tip).length > 0;
}

export function ateskesAktifMi(a, b) {
  return anlasmaAktifMi(a, b, "ateskes");
}

export function barisAktifMi(a, b) {
  return anlasmaAktifMi(a, b, "baris");
}

export function ittifakAktifMi(a, b) {
  return anlasmaAktifMi(a, b, "ittifak");
}

export function ticaretAktifMi(a, b) {
  return anlasmaAktifMi(a, b, "ticaret");
}

export function isDostCete(ownerA, ownerB) {
  if (!ownerA || !ownerB) return false;
  if (ownerA === ownerB) return true;
  return iliskiDegeri(ownerA, ownerB) >= 30 || ittifakAktifMi(ownerA, ownerB);
}

export function isDostIttifak(ownerA, ownerB) {
  if (!ownerA || !ownerB) return false;
  if (ownerA === ownerB) return true;
  return iliskiDegeri(ownerA, ownerB) >= 70 || ittifakAktifMi(ownerA, ownerB);
}

export function diplomasiSaldiriYasakSebebi(saldiran, hedef) {
  if (!saldiran || !hedef || saldiran === hedef) return "Geçersiz hedef.";
  if (barisAktifMi(saldiran, hedef)) return "Aktif barış anlaşması var.";
  if (ateskesAktifMi(saldiran, hedef)) return "Aktif ateşkes var.";
  if (isDostIttifak(saldiran, hedef)) return "Aktif ittifak varken saldırı yapılamaz.";
  return "";
}

export function diplomasiSaldiriMumkunMu(saldiran, hedef) {
  return !diplomasiSaldiriYasakSebebi(saldiran, hedef);
}

function anlasmaEkle(tip, taraf1, taraf2, sure, meta = {}) {
  const d = diplomasiDurumu();
  const mevcut = d.anlasmalar.find(
    (a) => aktifAnlasmaFiltre(a) && a.tip === tip && anlasmaTaraflariAyniMi(a, taraf1, taraf2)
  );
  if (mevcut) {
    mevcut.bitis = Math.max(mevcut.bitis, oyun.tur + sure);
    mevcut.meta = { ...(mevcut.meta || {}), ...meta };
    return mevcut;
  }
  const anlasma = {
    id: `${tip}-${oyun.tur}-${Math.random().toString(36).slice(2, 8)}`,
    tip,
    taraf1,
    taraf2,
    baslangic: oyun.tur,
    bitis: oyun.tur + sure,
    meta: { ...meta },
  };
  d.anlasmalar.push(anlasma);
  return anlasma;
}

function anlasmaSil(anlasmaId) {
  const d = diplomasiDurumu();
  d.anlasmalar = d.anlasmalar.filter((a) => a.id !== anlasmaId);
}

function tarafAnlasmalari(taraf1, taraf2) {
  return aktifAnlasmalar(taraf1, taraf2);
}

function itibarDegistir(delta, neden) {
  const d = diplomasiDurumu();
  const onceki = d.itibar;
  d.itibar = clamp(Math.round(d.itibar + delta), 0, 100);
  if (d.itibar !== onceki) {
    diploKayitEkle(
      "itibar",
      `İtibar ${d.itibar > onceki ? "arttı" : "azaldı"}: ${onceki} → ${d.itibar} (${neden})`,
      d.itibar > onceki ? "iyi" : "kotu",
      { delta: d.itibar - onceki }
    );
  }
}

function ihanetIsle(owner, hedef, sebep = "Anlaşma bozuldu") {
  const d = diplomasiDurumu();
  const bozulacak = tarafAnlasmalari(owner, hedef).filter((a) =>
    a.tip === "ateskes" || a.tip === "baris" || a.tip === "ittifak" || a.tip === "ticaret"
  );
  if (!bozulacak.length) return { ihanet: false };

  bozulacak.forEach((a) => anlasmaSil(a.id));
  iliskiDegistir(owner, hedef, -50, `İhanet: ${sebep}`);
  d.ihanetSayisi += 1;
  itibarDegistir(-DIPLOMASI.IHANET_ITIBAR_KAYBI, "Anlaşma ihlali");

  DIPLO_OWNERLER.filter((id) => id !== owner && id !== hedef).forEach((id) => {
    iliskiDegistir(owner, id, -10, "Söz tanımaz itibarı", { sessiz: true });
  });
  diploKayitEkle(
    "ihanet",
    `${ownerAd(owner)}, ${ownerAd(hedef)} ile yaptığı anlaşmayı bozdu (${sebep}).`,
    "kotu",
    { taraflar: [owner, hedef] }
  );
  return { ihanet: true, adet: bozulacak.length };
}

export function savasBildir(gonderen, hedef) {
  if (!gonderen || !hedef || gonderen === hedef) {
    return { ok: false, mesaj: "Geçersiz savaş hedefi." };
  }
  if (iliskiDegeri(gonderen, hedef) <= -70) {
    return { ok: false, mesaj: "Zaten savaş durumundasınız." };
  }

  ihanetIsle(gonderen, hedef, "Savaş ilanı");
  iliskiKoy(gonderen, hedef, -70);
  tarafAnlasmalari(gonderen, hedef).forEach((a) => anlasmaSil(a.id));

  diploKayitEkle(
    "savas-ilani",
    `${ownerAd(gonderen)}, ${ownerAd(hedef)} tarafına savaş ilan etti.`,
    "kotu",
    { taraflar: [gonderen, hedef] }
  );

  DIPLO_OWNERLER
    .filter((id) => id !== gonderen && id !== hedef)
    .forEach((id) => iliskiDegistir(gonderen, id, -5, "Savaşçı itibarı", { sessiz: true }));

  return { ok: true, mesaj: `${ownerAd(hedef)} tarafına savaş ilan edildi.` };
}

function ownerGelirTabani(owner) {
  return (oyun.bolgeler || [])
    .filter((b) => b.owner === owner)
    .reduce((t, b) => t + (b.gelir || 0) * (1 + (b.yGel || 0) * 0.5), 0);
}

function ownerAskeriGuc(owner) {
  return (oyun.birimler || [])
    .filter((u) => u.owner === owner)
    .reduce((t, u) => t + (u.adet || 0), 0);
}

function ticaretBatmaKaybiHesapla(owner) {
  const para = Math.max(0, Math.round(oyun.fraksiyon?.[owner]?.para || 0));
  if (para <= 0) return 0;
  const oranKayip = Math.round(para * Math.max(0, DIPLOMASI.TICARET_BATMA_PARA_ORANI || 0));
  const minKayip = Math.max(0, Math.round(DIPLOMASI.TICARET_BATMA_MIN_KAYIP || 0));
  const maxKayip = Math.max(minKayip, Math.round(DIPLOMASI.TICARET_BATMA_MAX_KAYIP || minKayip));
  const hedefKayip = clamp(oranKayip, minKayip, maxKayip);
  return Math.min(para, hedefKayip);
}

function aiKisilikCarpani(owner, tip) {
  const ozellik = oyun.fraksiyon?.[owner]?.lider?.ozellik || "";
  if (tip === "baris") {
    if (ozellik === "savasci") return -0.15;
    if (ozellik === "tedavici" || ozellik === "yapici") return 0.1;
  }
  if (tip === "ticaret") {
    if (ozellik === "ekonomist") return 0.16;
    if (ozellik === "savasci") return -0.1;
  }
  if (tip === "ittifak") {
    if (ozellik === "ekonomist" || ozellik === "rekrutcu") return 0.08;
    if (ozellik === "savasci") return -0.08;
  }
  if (tip === "sabotaj") {
    if (ozellik === "gizlici" || ozellik === "savasci") return 0.1;
    if (ozellik === "tedavici") return -0.08;
  }
  if (tip === "tehditDirenci") {
    if (ozellik === "savasci") return 0.12;
    if (ozellik === "tedavici") return -0.08;
  }
  return 0;
}

function kabulSansiniHesapla(hedef, tip, bazSans, iliskiEtkisi = 0) {
  const esneklik = ZORLUK[oyun.zorluk]?.aiDiploEsneklik || 0;
  const kisilik = aiKisilikCarpani(hedef, tip);
  return clamp(bazSans + iliskiEtkisi + kisilik + esneklik, 0.05, 0.95);
}

function teklifSonucu(hedef, sans) {
  return Math.random() < sans;
}

export function barisTeklifiEt(gonderen, hedef) {
  const gucGonderen = gucPuani(gonderen);
  const gucHedef = Math.max(1, gucPuani(hedef));
  const gucFark = (gucGonderen - gucHedef) / gucHedef;
  const bazSans = clamp(0.5 - Math.max(0, gucFark) * 0.2 + Math.max(0, -gucFark) * 0.15, 0.1, 0.9);
  const sans = kabulSansiniHesapla(hedef, "baris", bazSans, 0);
  return barisTeklifiSonuclandir(gonderen, hedef, teklifSonucu(hedef, sans));
}

export function ittifakTeklifiEt(gonderen, hedef) {
  const iliski = iliskiDegeri(gonderen, hedef);
  const sans = kabulSansiniHesapla(hedef, "ittifak", 0.45, iliski * 0.004);
  return ittifakTeklifiSonuclandir(gonderen, hedef, teklifSonucu(hedef, sans));
}

export function ticaretTeklifiEt(gonderen, hedef) {
  const iliski = iliskiDegeri(gonderen, hedef);
  const sans = kabulSansiniHesapla(hedef, "ticaret", 0.5, iliski * 0.0035);
  return ticaretTeklifiSonuclandir(gonderen, hedef, teklifSonucu(hedef, sans));
}

export function rusvetVer(gonderen, hedef, miktar) {
  const para = Number(miktar);
  if (!Number.isFinite(para) || para <= 0) return { ok: false, mesaj: "Geçersiz rüşvet miktarı." };
  const fr = oyun.fraksiyon?.[gonderen];
  if (!fr || fr.para < para) return { ok: false, mesaj: "Yetersiz para." };

  fr.para -= para;
  const artis = clamp(round1(para / 30), 0, 15);
  iliskiDegistir(gonderen, hedef, artis, `Rüşvet/ödeme (${Math.round(para)}₺)`);
  diploKayitEkle(
    "rusvet",
    `${ownerAd(gonderen)}, ${ownerAd(hedef)} tarafına ${Math.round(para)}₺ gönderdi (+${artis}).`,
    "iyi",
    { taraflar: [gonderen, hedef], delta: artis }
  );
  if (gonderen === "biz" && artis >= 8) itibarDegistir(1, "Diplomatik ödeme");
  return { ok: true, mesaj: `Rüşvet verildi (+${artis}).`, artis };
}

export function tehditEt(gonderen, hedef) {
  const d = diplomasiDurumu();
  const key = iliskiAnahtar(gonderen, hedef);
  const kalan = (d.tehditCooldown?.[key] || 0) - oyun.tur;
  if (kalan > 0) return { ok: false, mesaj: `Bu hedefe tekrar tehdit için ${kalan} tur beklemelisin.` };

  const gucGonderen = gucPuani(gonderen);
  const gucHedef = Math.max(1, gucPuani(hedef));
  if (gucGonderen < gucHedef * 1.3) {
    return { ok: false, mesaj: "Tehdit için askeri güç en az %30 üstün olmalı." };
  }

  const fark = gucGonderen / gucHedef;
  const sans = clamp(0.35 + (fark - 1.3) * 0.35 - aiKisilikCarpani(hedef, "tehditDirenci"), 0.1, 0.9);
  const kabul = teklifSonucu(hedef, sans);
  d.tehditCooldown[key] = oyun.tur + DIPLOMASI.TEHDIT_BEKLEME;

  if (!kabul) {
    iliskiDegistir(gonderen, hedef, -15, "Ültimaton reddedildi");
    if (oyun.fraksiyon?.[hedef]) {
      oyun.fraksiyon[hedef]._ofke = (oyun.fraksiyon[hedef]._ofke || 0) + 30;
    }
    diploKayitEkle(
      "tehdit-red",
      `${ownerAd(hedef)}, ${ownerAd(gonderen)} tarafından yapılan ültimatomu reddetti.`,
      "kotu",
      { taraflar: [gonderen, hedef] }
    );
    return { ok: false, mesaj: "Tehdit geri tepti, hedef direndi." };
  }

  anlasmaEkle("ateskes", gonderen, hedef, DIPLOMASI.ATESKES_SURESI, { tehditKaynakli: true });
  const tribute = Math.min(120, Math.max(0, Math.floor((oyun.fraksiyon?.[hedef]?.para || 0) * 0.12)));
  if (tribute > 0) {
    oyun.fraksiyon[hedef].para -= tribute;
    oyun.fraksiyon[gonderen].para += tribute;
  }
  diploKayitEkle(
    "tehdit-kabul",
    `${ownerAd(hedef)} ültimatomu kabul etti. ${DIPLOMASI.ATESKES_SURESI} tur saldırmazlık${tribute > 0 ? ` ve ${tribute}₺ tazminat` : ""}.`,
    "iyi",
    { taraflar: [gonderen, hedef] }
  );
  return { ok: true, mesaj: "Hedef geri adım attı ve geçici olarak boyun eğdi." };
}

function kesifliHedefSahipleri(owner, hariç = []) {
  const disla = new Set([owner, ...hariç]);
  const sahipler = new Set();
  (oyun.bolgeler || []).forEach((b) => {
    if (disla.has(b.owner)) return;
    if (owner === "biz" && b._kesif && b._kesif.bitis >= oyun.tur) sahipler.add(b.owner);
    if (owner !== "biz" && b._kesifAi && b._kesifAi.owner === owner && b._kesifAi.bitis >= oyun.tur) sahipler.add(b.owner);
  });
  return [...sahipler];
}

function ortakDusmanListesi(a, b) {
  return DIPLO_OWNERLER.filter((x) => x !== a && x !== b)
    .filter((x) => iliskiDegeri(a, x) <= -30 && iliskiDegeri(b, x) <= -30)
    .filter((x) => (oyun.bolgeler || []).some((bolge) => bolge.owner === x));
}

export function istihbaratPaylas(owner, hedef) {
  const fr = oyun.fraksiyon?.[owner];
  if (!fr || fr.para < 80) return { ok: false, mesaj: "İstihbarat paylaşımı için 80₺ gerekir." };
  const ifsaAdaylar = kesifliHedefSahipleri(owner, [hedef]);
  if (!ifsaAdaylar.length) return { ok: false, mesaj: "Paylaşılacak keşif bilgisi yok." };

  fr.para -= 80;
  const ifsa = ifsaAdaylar[Math.floor(Math.random() * ifsaAdaylar.length)];
  iliskiDegistir(owner, hedef, +12, "İstihbarat paylaşıldı");
  if (Math.random() < 0.65) {
    iliskiDegistir(owner, ifsa, -8, "Bilgi sızıntısı fark edildi");
  }
  diploKayitEkle(
    "istihbarat-paylasim",
    `${ownerAd(owner)}, ${ownerAd(hedef)} ile ${ownerAd(ifsa)} hakkında istihbarat paylaştı.`,
    "bilgi",
    { taraflar: [owner, hedef, ifsa] }
  );
  return { ok: true, mesaj: "İstihbarat paylaşıldı." };
}

export function sabotajTeklifiEt(gonderen, hedef) {
  const fr = oyun.fraksiyon?.[gonderen];
  if (!fr) return { ok: false, mesaj: "Gönderen taraf bulunamadı." };
  if (fr.para < DIPLOMASI.SABOTAJ_MALIYETI) {
    return { ok: false, mesaj: `Sabotaj için ${DIPLOMASI.SABOTAJ_MALIYETI}₺ gerekir.` };
  }
  const iliski = iliskiDegeri(gonderen, hedef);
  if (iliski < 20) return { ok: false, mesaj: "Sabotaj için ilişki en az +20 olmalı." };

  const ortaklar = ortakDusmanListesi(gonderen, hedef);
  if (!ortaklar.length) return { ok: false, mesaj: "Sabotaj için ortak düşman yok." };

  const sans = kabulSansiniHesapla(hedef, "sabotaj", 0.44, iliski * 0.0035);
  const kabul = teklifSonucu(hedef, sans);
  if (!kabul) {
    iliskiDegistir(gonderen, hedef, -4, "Sabotaj teklifi reddedildi");
    return { ok: false, mesaj: `${ownerAd(hedef)} sabotaj teklifini reddetti.` };
  }

  fr.para -= DIPLOMASI.SABOTAJ_MALIYETI;
  const hedefOwner = ortaklar.sort((a, b) => gucPuani(b) - gucPuani(a))[0];
  const hedefBolgeler = (oyun.bolgeler || []).filter((b) => b.owner === hedefOwner);
  if (!hedefBolgeler.length) {
    iliskiDegistir(gonderen, hedef, +4, "Sabotaj anlaşması");
    return { ok: true, mesaj: "Sabotaj anlaşması yapıldı ancak uygun hedef bulunamadı." };
  }

  const stratejik = (bolge) => {
    const binaSkoru = (bolge.binalar || []).reduce((t, b) => t + (b.seviye || 1), 0);
    const bolgeBirlik = (oyun.birimler || [])
      .filter((u) => u.owner === bolge.owner && u.konumId === bolge.id && !u.hedefId && (!u.rota || u.rota.length === 0))
      .reduce((t, u) => t + (u.adet || 0), 0);
    return (bolge.gelir || 0) * 1.2 + (bolge.yGuv || 0) * 4 + binaSkoru * 2 + bolgeBirlik * 0.3;
  };
  const hedefBolge = [...hedefBolgeler].sort((a, b) => stratejik(b) - stratejik(a))[0];

  let binaMesaj = "bina yoktu";
  if (Array.isArray(hedefBolge.binalar) && hedefBolge.binalar.length) {
    const vurulan = [...hedefBolge.binalar].sort((a, b) => (b.seviye || 1) - (a.seviye || 1))[0];
    if ((vurulan.seviye || 1) > 1) {
      vurulan.seviye -= 1;
      binaMesaj = `${vurulan.tip} seviyesi düştü`;
    } else {
      hedefBolge.binalar = hedefBolge.binalar.filter((b) => b !== vurulan);
      binaMesaj = `${vurulan.tip} imha edildi`;
    }
  }

  hedefBolge.yGuv = Math.max(0, round1((hedefBolge.yGuv || 0) - 0.5));
  iliskiDegistir(gonderen, hedef, +8, "Ortak sabotaj işi");
  iliskiDegistir(gonderen, hedefOwner, -6, "Sabotaj izi", { sessiz: true });
  iliskiDegistir(hedef, hedefOwner, -6, "Sabotaj izi", { sessiz: true });
  diploKayitEkle(
    "sabotaj",
    `${ownerAd(gonderen)} ve ${ownerAd(hedef)}, ${ownerAd(hedefOwner)} kontrolündeki ${hedefBolge.ad} bölgesinde sabotaj yaptı (${binaMesaj}, savunma -0.5).`,
    "kotu",
    { taraflar: [gonderen, hedef, hedefOwner], bolgeId: hedefBolge.id }
  );
  return { ok: true, mesaj: `Sabotaj başarılı: ${hedefBolge.ad} zayıflatıldı.` };
}

export function diplomasiSaldiriBaslat(saldiran, hedef, kaynak = "saldiri", opts = {}) {
  const d = diplomasiDurumu();
  if (!d._saldiriKayit || typeof d._saldiriKayit !== "object") d._saldiriKayit = {};
  const turKey = `${oyun.tur}:${saldiran}->${hedef}`;
  if (d._saldiriKayit[turKey]) return;
  d._saldiriKayit[turKey] = true;

  ihanetIsle(saldiran, hedef, kaynak);
  iliskiDegistir(saldiran, hedef, -15, "Askeri saldırı başlatıldı", { sessiz: false });
  DIPLO_OWNERLER
    .filter((id) => id !== saldiran && id !== hedef)
    .forEach((id) => iliskiDegistir(saldiran, id, -2, "Saldırgan algısı", { sessiz: true }));

  const hedefIttifaklari = aktifAnlasmalar()
    .filter((a) => a.tip === "ittifak")
    .filter((a) => (a.taraf1 === hedef || a.taraf2 === hedef))
    .map((a) => (a.taraf1 === hedef ? a.taraf2 : a.taraf1))
    .filter((ortak) => ortak !== saldiran);

  hedefIttifaklari.forEach((ortak) => {
    diploKayitEkle(
      "ittifak-uyari",
      `${ownerAd(hedef)} saldırı altında. İttifak ortağı ${ownerAd(ortak)} için savunma uyarısı geçti.`,
      "bilgi",
      { taraflar: [hedef, ortak, saldiran] }
    );

    if (opts?.ittifakMudahalesi) return;

    if (ortak === "biz") {
      const teklif = oyuncuyaTeklifOlustur(
        hedef,
        "ittifak-mudahale",
        { saldiran, savunulan: hedef, ortak: "biz", kaynak, zorunluPopup: true, popupGosterildi: false }
      );
      if (teklif) {
        diploKayitEkle(
          "ittifak-mudahale-teklif",
          `${ownerAd(hedef)} yardım çağrısı gönderdi: ${ownerAd(saldiran)} saldırısına müdahale teklifi.`,
          "bilgi",
          { taraflar: [hedef, "biz", saldiran], teklifId: teklif.id }
        );
      }
      return;
    }

    const ortakAktif = (oyun.bolgeler || []).some((b) => b.owner === ortak);
    if (!ortakAktif) return;
    const sans = clamp(0.55 + Math.max(0, iliskiDegeri(ortak, hedef) - 70) * 0.005, 0.2, 0.92);
    if (Math.random() < sans) {
      ittifakMudahaleKuyrugaEkle({
        owner: ortak,
        saldiran,
        savunulan: hedef,
        tetikTur: oyun.tur + 1,
        kaynak: "ittifak",
      });
      diploKayitEkle(
        "ittifak-mudahale",
        `${ownerAd(ortak)} ittifak savunmasına hazırlanıyor (1 tur gecikme).`,
        "bilgi",
        { taraflar: [ortak, hedef, saldiran] }
      );
    }
  });
}

export function diplomasiFetihSonucu(saldiran, savunan, bolgeId = null) {
  if (!saldiran || !savunan || saldiran === savunan) return;
  iliskiDegistir(saldiran, savunan, -25, "Toprak fethi");
  const bolge = bolgeId ? bolgeById(bolgeId) : null;
  diploKayitEkle(
    "fetih",
    `${ownerAd(saldiran)}, ${ownerAd(savunan)} tarafına ait ${bolge?.ad || "bir bölgeyi"} ele geçirdi.`,
    "kotu",
    { taraflar: [saldiran, savunan] }
  );
}

export function diplomasiSuikastSonucu(saldiran, hedef, basarili) {
  if (!saldiran || !hedef || saldiran === hedef) return;
  iliskiDegistir(
    saldiran,
    hedef,
    basarili ? -40 : -20,
    basarili ? "Suikast başarılı" : "Suikast girişimi"
  );
  diploKayitEkle(
    basarili ? "suikast-basarili" : "suikast-basarisiz",
    `${ownerAd(saldiran)} → ${ownerAd(hedef)} suikastı ${basarili ? "başarılı" : "başarısız"} oldu.`,
    "kotu",
    { taraflar: [saldiran, hedef] }
  );
}

export function ittifakSaldiriCarpani(saldiran, hedefOwner) {
  let carp = 1;
  const ittifaklar = aktifAnlasmalar()
    .filter((a) => a.tip === "ittifak")
    .filter((a) => a.taraf1 === saldiran || a.taraf2 === saldiran);
  if (ittifaklar.length) {
    const ortaklar = ittifaklar.map((a) => (a.taraf1 === saldiran ? a.taraf2 : a.taraf1));
    const ayniHedefeYuruyenOrtakVar = (oyun.birimler || []).some((u) => {
      if (!ortaklar.includes(u.owner)) return false;
      if (!u.hedefId) return false;
      const hedefBolge = bolgeById(u.hedefId);
      return hedefBolge && hedefBolge.owner === hedefOwner;
    });
    if (ayniHedefeYuruyenOrtakVar) carp += DIPLOMASI.ITTIFAK_SALDIRI_BONUS;
  }

  const d = diplomasiDurumu();
  if (
    d.koalisyon &&
    d.koalisyon.hedef === hedefOwner &&
    Array.isArray(d.koalisyon.uyeler) &&
    d.koalisyon.uyeler.includes(saldiran)
  ) {
    carp += DIPLOMASI.KOALISYON_SALDIRI_BONUS;
  }
  return carp;
}

export function savasIliskiModifiyeri(saldiran, hedef) {
  const iliski = iliskiDegeri(saldiran, hedef);
  if (iliski <= -70) {
    return {
      saldiriCarpani: 1 + Number(DIPLOMASI.SAVAS_SALDIRI_BONUS || 0),
      etiket: "Savaş bonusu",
    };
  }
  if (iliski >= 30) {
    return {
      saldiriCarpani: 1 - Number(DIPLOMASI.IHANET_SALDIRI_CEZA || 0),
      etiket: "İhanet şoku",
    };
  }
  return { saldiriCarpani: 1, etiket: "" };
}

function iliskiHafizaSolmasi(messages) {
  const d = diplomasiDurumu();
  let gerilimDegisim = 0;
  let savasDegisim = 0;
  Object.entries(d.iliskiler).forEach(([key, val]) => {
    if (!Number.isFinite(val) || Math.abs(val) < 0.05) return;
    if (val <= -70) {
      d.iliskiler[key] = round1(Math.max(-100, val - Number(DIPLOMASI.SAVAS_CURUMESI || 0)));
      savasDegisim += 1;
      return;
    }
    if (val <= -30) {
      d.iliskiler[key] = round1(Math.max(-100, val - Number(DIPLOMASI.GERILIM_CURUMESI || 0)));
      gerilimDegisim += 1;
      return;
    }
    if (val > 0) d.iliskiler[key] = round1(Math.max(0, val - DIPLOMASI.ILISKI_HAFIZA_SOLMASI));
    else d.iliskiler[key] = round1(Math.min(0, val + DIPLOMASI.ILISKI_HAFIZA_SOLMASI));
  });
  if (gerilimDegisim > 0 || savasDegisim > 0) {
    messages.push(`Gerilim/Savaş çürümesi uygulandı (${gerilimDegisim + savasDegisim} ilişki çifti).`);
  } else {
    messages.push("İlişkiler hafıza solmasıyla merkeze yaklaştı.");
  }
}

function anlasmaBakimVeTemizlik(messages) {
  const d = diplomasiDurumu();
  const kalan = [];
  d.anlasmalar.forEach((a) => {
    if (!a) return;
    if (a.bitis < oyun.tur) {
      const oyuncuyuIlgilendirir = a.taraf1 === "biz" || a.taraf2 === "biz";
      if (oyuncuyuIlgilendirir) {
        const metin = `${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} (${a.tip}) anlaşması sona erdi.`;
        if (a.tip === "baris" || a.tip === "ateskes") {
          messages.push({
            metin,
            popup: true,
            log: true,
            baslik: a.tip === "baris" ? "Barış Bitti" : "Ateşkes Bitti",
          });
        } else {
          messages.push(metin);
        }
      }
      diploKayitEkle(
        "anlasma-bitti",
        `${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} (${a.tip}) süresi doldu.`,
        "bilgi",
        { taraflar: [a.taraf1, a.taraf2] }
      );
      return;
    }
    if (a.tip === "ittifak") {
      const odeme1 = oyun.fraksiyon?.[a.taraf1]?.para ?? 0;
      const odeme2 = oyun.fraksiyon?.[a.taraf2]?.para ?? 0;
      if (odeme1 < DIPLOMASI.ITTIFAK_TUR_MALIYETI || odeme2 < DIPLOMASI.ITTIFAK_TUR_MALIYETI) {
        iliskiDegistir(a.taraf1, a.taraf2, -12, "İttifak bakım ödemesi yapılamadı");
        diploKayitEkle(
          "ittifak-bozuldu",
          `${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} ittifakı bakım ödemesi yüzünden bozuldu.`,
          "kotu",
          { taraflar: [a.taraf1, a.taraf2] }
        );
        return;
      }
      oyun.fraksiyon[a.taraf1].para -= DIPLOMASI.ITTIFAK_TUR_MALIYETI;
      oyun.fraksiyon[a.taraf2].para -= DIPLOMASI.ITTIFAK_TUR_MALIYETI;
    } else if (a.tip === "ticaret") {
      const minSermaye = ticaretMinSermaye();
      const para1 = ownerPara(a.taraf1);
      const para2 = ownerPara(a.taraf2);
      if (minSermaye > 0 && (para1 < minSermaye || para2 < minSermaye)) {
        iliskiDegistir(a.taraf1, a.taraf2, -4, "Ticaret sermayesi tükendi");
        const mesaj =
          `Ticaret kapandı: sermaye eşiği ${minSermaye}₺ altına düştü. ` +
          `${ticaretSermayeYetersizMesaji(a.taraf1, minSermaye)} • ${ticaretSermayeYetersizMesaji(a.taraf2, minSermaye)}`;
        diploKayitEkle(
          "ticaret-sermaye-yetersiz",
          mesaj,
          "kotu",
          { taraflar: [a.taraf1, a.taraf2], minSermaye }
        );
        const oyuncuyuIlgilendirir = a.taraf1 === "biz" || a.taraf2 === "biz";
        if (oyuncuyuIlgilendirir) {
          messages.push({
            metin: `📉 ${mesaj}\nTicaret raporu: +0₺ / -0₺ (Net 0₺)`,
            popup: false,
            log: true,
            baslik: "Ticaret Raporu",
          });
        }
        return;
      }
      if (Math.random() < Math.max(0, DIPLOMASI.TICARET_BATMA_SANSI || 0)) {
        const batan = Math.random() < 0.5 ? a.taraf1 : a.taraf2;
        const kayip = ticaretBatmaKaybiHesapla(batan);
        if (kayip > 0 && oyun.fraksiyon?.[batan]) {
          oyun.fraksiyon[batan].para = Math.max(0, (oyun.fraksiyon[batan].para || 0) - kayip);
        }
        iliskiDegistir(
          a.taraf1,
          a.taraf2,
          Number(DIPLOMASI.TICARET_BATMA_ILISKI_CEZASI || -10),
          "Ticaret batışı"
        );
        const mesaj =
          `Ticaret krizi: ${ownerAd(batan)} tarafı ${Math.round(kayip)}₺ kaybedip batış yaşadı. ` +
          `${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} ticaret anlaşması bozuldu.`;
        diploKayitEkle(
          "ticaret-batis",
          mesaj,
          "kotu",
          { taraflar: [a.taraf1, a.taraf2], batan, kayip: Math.round(kayip) }
        );
        const oyuncuyuIlgilendirir = a.taraf1 === "biz" || a.taraf2 === "biz";
        if (oyuncuyuIlgilendirir) {
          const bizKayip = batan === "biz" ? Math.round(kayip) : 0;
          messages.push({
            metin: `💥 ${mesaj}\nTicaret raporu: +0₺ / -${bizKayip}₺ (Net ${bizKayip > 0 ? "-" : ""}${bizKayip}₺)`,
            popup: true,
            log: true,
            baslik: "Ticaret Krizi",
          });
        }
        return;
      }
      const bonus1 = Math.round(ownerGelirTabani(a.taraf1) * DIPLOMASI.TICARET_GELIR_BONUS);
      const bonus2 = Math.round(ownerGelirTabani(a.taraf2) * DIPLOMASI.TICARET_GELIR_BONUS);
      if (oyun.fraksiyon?.[a.taraf1]) oyun.fraksiyon[a.taraf1].para += bonus1;
      if (oyun.fraksiyon?.[a.taraf2]) oyun.fraksiyon[a.taraf2].para += bonus2;
      if (a.taraf1 === "biz" || a.taraf2 === "biz") {
        const bizGelir = a.taraf1 === "biz" ? bonus1 : bonus2;
        const net = bizGelir;
        messages.push({
          metin:
            `📊 Ticaret raporu (${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)}): ` +
            `+${bizGelir}₺ / -0₺ (Net ${net >= 0 ? "+" : ""}${net}₺)`,
          popup: false,
          log: true,
          baslik: "Ticaret Raporu",
        });
      }
    }
    kalan.push(a);
  });
  d.anlasmalar = kalan;
}

function savasBarisKritikBildirimleri(messages) {
  const d = diplomasiDurumu();
  if (!d.kritikBildirim || typeof d.kritikBildirim !== "object") {
    d.kritikBildirim = { savasDurumu: {}, anlasmaKalan: {} };
  }
  const takip = d.kritikBildirim;
  if (!takip.savasDurumu || typeof takip.savasDurumu !== "object") takip.savasDurumu = {};
  if (!takip.anlasmaKalan || typeof takip.anlasmaKalan !== "object") takip.anlasmaKalan = {};

  DIPLO_OWNERLER
    .filter((owner) => owner !== "biz")
    .forEach((owner) => {
      const iliskiKey = iliskiAnahtar("biz", owner);
      const iliski = Number(d.iliskiler?.[iliskiKey] || 0);
      const savasta = iliski <= -70;
      const oncekiSavas = !!takip.savasDurumu[owner];
      if (savasta && !oncekiSavas) {
        messages.push({
          metin:
            `⚠️ Kritik savaş durumu: ${ownerAd(owner)} ile açık savaşa girildi. ` +
            "Cephe, savunma ve lojistik dengesini hemen kontrol et.",
          popup: true,
          log: true,
          baslik: "Savaş Durumu",
        });
      } else if (!savasta && oncekiSavas) {
        messages.push({
          metin:
            `🕊️ ${ownerAd(owner)} ile açık savaş durumu sona erdi. ` +
            "Yeni saldırı riski için anlaşmaları ve birlik konumlarını takip et.",
          popup: true,
          log: true,
          baslik: "Savaş Durumu",
        });
      }
      takip.savasDurumu[owner] = savasta;
    });

  const aktifBarisAnlasmalari = (Array.isArray(d.anlasmalar) ? d.anlasmalar : [])
    .filter(aktifAnlasmaFiltre)
    .filter((a) => a && (a.taraf1 === "biz" || a.taraf2 === "biz"))
    .filter((a) => a.tip === "baris" || a.tip === "ateskes");

  const aktifAnlasmaIdleri = new Set();
  aktifBarisAnlasmalari.forEach((a) => {
    if (!a?.id || !Number.isFinite(a.bitis)) return;
    aktifAnlasmaIdleri.add(a.id);
    const kalanTur = Math.max(0, Math.round(a.bitis - oyun.tur));
    const oncekiKalan = Number.isFinite(takip.anlasmaKalan[a.id]) ? takip.anlasmaKalan[a.id] : null;
    if ((kalanTur === 2 || kalanTur === 1) && oncekiKalan !== kalanTur) {
      const digerOwner = a.taraf1 === "biz" ? a.taraf2 : a.taraf1;
      const tipAd = a.tip === "baris" ? "Barış" : "Ateşkes";
      messages.push({
        metin: `⏳ Kritik: ${ownerAd(digerOwner)} ile ${tipAd.toLocaleLowerCase("tr-TR")} anlaşmasının bitmesine ${kalanTur} tur kaldı.`,
        popup: true,
        log: true,
        baslik: `${tipAd} Uyarısı`,
      });
    }
    takip.anlasmaKalan[a.id] = kalanTur;
  });

  Object.keys(takip.anlasmaKalan).forEach((id) => {
    if (!aktifAnlasmaIdleri.has(id)) delete takip.anlasmaKalan[id];
  });
}

function koalisyonKontrol(messages) {
  const d = diplomasiDurumu();
  const siralama = gucSiralamasiHesapla();
  if (!siralama.length) return;
  const lider = siralama[0];
  const aktifOwnerler = DIPLO_OWNERLER.filter((id) => (oyun.bolgeler || []).some((b) => b.owner === id));
  const bizAktif = aktifOwnerler.includes("biz");

  if (lider.pay >= DIPLOMASI.GUC_ESIGI_KOALISYON) {
    const uyeler = aktifOwnerler.filter((id) => id !== lider.owner && id !== "biz");
    if (uyeler.length >= 2) {
      const degisti = !d.koalisyon || d.koalisyon.hedef !== lider.owner;
      d.koalisyon = {
        hedef: lider.owner,
        uyeler,
        baslangic: degisti ? oyun.tur : (d.koalisyon?.baslangic || oyun.tur),
        davetTur: d.koalisyon?.davetTur || null,
      };
      if (degisti) {
        for (let i = 0; i < uyeler.length; i += 1) {
          for (let j = i + 1; j < uyeler.length; j += 1) {
            iliskiDegistir(uyeler[i], uyeler[j], +30, "Denge Koalisyonu");
          }
        }
        messages.push(`Denge Koalisyonu kuruldu: hedef ${ownerAd(lider.owner)}.`);
        diploKayitEkle(
          "koalisyon",
          `${ownerAd(lider.owner)} güçte %${Math.round(lider.pay * 100)} eşiğini geçti. Koalisyon devrede.`,
          "kotu",
          { taraflar: [lider.owner, ...uyeler] }
        );
      }

      if (bizAktif && lider.owner !== "biz" && !uyeler.includes("biz")) {
        const ayniTurDavet = Number(d.koalisyon?.davetTur || -1) === oyun.tur;
        if (!ayniTurDavet && !oyuncuyaBekleyenTeklifVarMi()) {
          const davetci = uyeler
            .slice()
            .sort((a, b) => gucPuani(b) - gucPuani(a))[0] || uyeler[0];
          const teklif = oyuncuyaTeklifOlustur(davetci, "koalisyon", { hedef: lider.owner });
          if (teklif) {
            d.koalisyon.davetTur = oyun.tur;
            diploKayitEkle(
              "koalisyon-davet",
              `${ownerAd(davetci)} seni ${ownerAd(lider.owner)} hedefli koalisyona davet etti.`,
              "bilgi",
              { taraflar: [davetci, "biz", lider.owner], teklifId: teklif.id }
            );
            messages.push({
              metin: `${ownerAd(davetci)} seni ${ownerAd(lider.owner)} hedefli denge koalisyonuna çağırıyor.\n\n${teklifGetiriGoturuMetni("koalisyon", davetci, "biz")}\n\nKabul etmek için "Onayla" seç.`,
              popup: true,
              log: false,
              ses: true,
              tip: "koalisyon",
              teklifId: teklif.id,
              baslik: "Koalisyon Daveti",
            });
          }
        }
      }
      return;
    }
  }

  if (d.koalisyon) {
    messages.push("Denge Koalisyonu dağıldı.");
    diploKayitEkle("koalisyon-bitti", "Denge Koalisyonu dağıldı.", "bilgi");
  }
  d.koalisyon = null;
}

function ortakDusmanVar(a, b) {
  return ortakDusmanListesi(a, b).length > 0;
}

function bekleyenTeklifleriTemizle() {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) {
    d.bekleyenTeklifler = [];
    return;
  }
  d.bekleyenTeklifler = d.bekleyenTeklifler
    .filter((t) => t && typeof t === "object")
    .filter((t) => t.durum === "beklemede")
    .filter((t) => {
      if (!Number.isFinite(t.bitis) || t.bitis >= oyun.tur) return true;
      if (t.hedef === "biz") {
        diploKayitEkle(
          "teklif-sure-doldu",
          `${ownerAd(t.gonderen)} tarafından gelen ${teklifTipAdi(t.tip)} teklifi süresi dolduğu için kapandı.`,
          "bilgi",
          { taraflar: [t.gonderen, t.hedef], teklifId: t.id }
        );
      }
      return false;
    })
    .slice(-12);
}

function zorunluTeklifPopupKontrol(messages) {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) return;
  d.bekleyenTeklifler
    .filter((t) => t?.durum === "beklemede" && t?.hedef === "biz")
    .filter((t) => t?.meta?.zorunluPopup && !t?.meta?.popupGosterildi)
    .forEach((t) => {
      t.meta.popupGosterildi = true;
      const tipAd = teklifTipAdi(t.tip);
      const etki = teklifGetiriGoturuMetni(t.tip, t.gonderen, "biz");
      messages.push({
        metin:
          `${ownerAd(t.gonderen)} senden ${tipAd} kararı istiyor.\n\n${etki}\n\n` +
          `Kabul etmek için "Onayla", reddetmek için "İptal" seç.`,
        popup: true,
        log: false,
        ses: true,
        tip: t.tip,
        teklifId: t.id,
        baslik: t.tip === "ittifak-mudahale" ? "İttifak Müdahalesi" : "Diplomasi Teklifi",
      });
    });
}

export function diplomasiTeklifYanitla(teklifId, kabul = false) {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) d.bekleyenTeklifler = [];
  const idx = d.bekleyenTeklifler.findIndex((t) => t?.id === teklifId && t?.durum === "beklemede");
  if (idx < 0) return { ok: false, mesaj: "Teklif artık geçerli değil." };
  const teklif = d.bekleyenTeklifler[idx];
  if (Number.isFinite(teklif.bitis) && teklif.bitis < oyun.tur) {
    d.bekleyenTeklifler.splice(idx, 1);
    return { ok: false, mesaj: "Teklifin süresi doldu." };
  }

  const gonderen = teklif.gonderen;
  const hedef = teklif.hedef;
  let sonuc;
  if (teklif.tip === "baris") sonuc = barisTeklifiSonuclandir(gonderen, hedef, !!kabul);
  else if (teklif.tip === "ittifak") sonuc = ittifakTeklifiSonuclandir(gonderen, hedef, !!kabul);
  else if (teklif.tip === "ticaret") sonuc = ticaretTeklifiSonuclandir(gonderen, hedef, !!kabul);
  else if (teklif.tip === "koalisyon") {
    if (!d.koalisyon || d.koalisyon.hedef !== teklif?.meta?.hedef) {
      sonuc = { ok: false, mesaj: "Koalisyon artık aktif değil." };
    } else if (!kabul) {
      const uyeler = Array.isArray(d.koalisyon.uyeler) ? d.koalisyon.uyeler : [];
      uyeler.forEach((u) => iliskiDegistir("biz", u, -5, "Koalisyon daveti reddedildi"));
      sonuc = { ok: false, mesaj: "Koalisyon daveti reddedildi." };
    } else {
      if (!Array.isArray(d.koalisyon.uyeler)) d.koalisyon.uyeler = [];
      if (!d.koalisyon.uyeler.includes("biz")) d.koalisyon.uyeler.push("biz");
      d.koalisyon.uyeler
        .filter((u) => u !== "biz")
        .forEach((u) => iliskiDegistir("biz", u, +8, "Koalisyon katılımı"));
      diploKayitEkle(
        "koalisyon-katilim",
        `${ownerAd(gonderen)} davetiyle koalisyona katıldın. Hedef: ${ownerAd(d.koalisyon.hedef)}.`,
        "bilgi",
        { taraflar: ["biz", ...d.koalisyon.uyeler] }
      );
      sonuc = { ok: true, mesaj: "Koalisyona katılım kabul edildi." };
    }
  } else if (teklif.tip === "ittifak-mudahale") {
    const saldiran = teklif?.meta?.saldiran || "";
    const savunulan = teklif?.meta?.savunulan || gonderen;
    if (!kabul) {
      iliskiDegistir("biz", savunulan, -5, "Müttefik yardım çağrısı reddedildi");
      sonuc = { ok: false, mesaj: `${ownerAd(savunulan)} yardım çağrısı reddedildi.` };
    } else if (!saldiran || !savunulan) {
      sonuc = { ok: false, mesaj: "Müdahale verisi eksik." };
    } else {
      ittifakMudahaleKuyrugaEkle({
        owner: "biz",
        saldiran,
        savunulan,
        tetikTur: oyun.tur + 1,
        kaynak: "oyuncu-ittifak",
      });
      sonuc = { ok: true, mesaj: `${ownerAd(savunulan)} için müdahale hazırlığı başladı (1 tur).` };
    }
  }
  else sonuc = { ok: false, mesaj: "Desteklenmeyen teklif tipi." };

  teklif.durum = "sonuclandi";
  teklif.kabul = !!kabul;
  teklif.sonucTur = oyun.tur;
  if (hedef === "biz" && !kabul && (teklif.tip === "baris" || teklif.tip === "ittifak" || teklif.tip === "ticaret")) {
    oyuncuTeklifTipCooldownKoy(teklif.tip, RED_COOLDOWN_TUR);
  }
  d.bekleyenTeklifler.splice(idx, 1);
  return sonuc;
}

function ownerAktifAnlasmaSayisi(owner, tipler = null) {
  if (!owner) return 0;
  const filtreTipler = Array.isArray(tipler) && tipler.length ? new Set(tipler) : null;
  return aktifAnlasmalar()
    .filter((a) => a.taraf1 === owner || a.taraf2 === owner)
    .filter((a) => (filtreTipler ? filtreTipler.has(a.tip) : true))
    .length;
}

function aiTeklifDenemesi(owner, hedef, tip) {
  if (owner === hedef) return null;
  if (!oyun.fraksiyon?.[owner] || !oyun.fraksiyon?.[hedef]) return null;
  if (hedef === "biz" && (tip === "baris" || tip === "ittifak" || tip === "ticaret")) {
    const tipKalan = oyuncuTeklifTipCooldownKalan(tip);
    if (tipKalan > 0) return null;
    // Oyuncu aynı tip teklifi reddettiyse:
    // 1) Tip bazlı global cooldown
    // 2) Aynı gönderen + tip için ek cooldown
    const kalan = redCooldownKontrol(owner, hedef, tip);
    if (kalan > 0) return null;
    const teklif = oyuncuyaTeklifOlustur(owner, tip);
    if (!teklif) return null;
    return {
      ok: true,
      beklemede: true,
      tip,
      gonderen: owner,
      hedef,
      teklifId: teklif.id,
      mesaj: `${ownerAd(owner)} ${teklifTipAdi(tip)} teklifi gönderdi.`,
    };
  }
  let sonuc = null;
  if (tip === "baris") sonuc = barisTeklifiEt(owner, hedef);
  else if (tip === "ittifak") sonuc = ittifakTeklifiEt(owner, hedef);
  else if (tip === "ticaret") sonuc = ticaretTeklifiEt(owner, hedef);
  else if (tip === "sabotaj") sonuc = sabotajTeklifiEt(owner, hedef);
  else if (tip === "tehdit") sonuc = tehditEt(owner, hedef);
  if (!sonuc || typeof sonuc !== "object") return null;
  return { ...sonuc, tip, gonderen: owner, hedef };
}

function aiDiplomasiKararlari(messages) {
  const d = diplomasiDurumu();
  if (!d.aiTeklifCooldown || typeof d.aiTeklifCooldown !== "object") d.aiTeklifCooldown = {};
  DIPLO_OWNERLER.filter((id) => id !== "biz").forEach((owner) => {
    if (!oyun.fraksiyon?.[owner]) return;
    if (oyun.tur % AI_DIPLO_TUR_ARALIK !== 0) return;
    const cooldownBitis = Number(d.aiTeklifCooldown[owner] || 0);
    if (cooldownBitis > oyun.tur) return;

    const digerleri = DIPLO_OWNERLER.filter((id) => id !== owner);
    const guc = gucPuani(owner);
    const enTehlikeli = [...digerleri].sort((a, b) => gucPuani(b) - gucPuani(a))[0];
    const zayifHedef = [...digerleri].sort((a, b) => gucPuani(a) - gucPuani(b))[0];
    const para = oyun.fraksiyon[owner].para || 0;
    const aktifAnlasmaSayisi = ownerAktifAnlasmaSayisi(owner, ["ittifak", "ticaret", "ateskes", "baris"]);
    const yeniAnlasmaAcabilir = aktifAnlasmaSayisi < AI_DIPLO_AKTIF_ANLASMA_LIMIT;

    let sonuc = null;

    for (const hedef of digerleri) {
      const iliski = iliskiDegeri(owner, hedef);
      const hedefGuc = Math.max(1, gucPuani(hedef));
      if (iliski < -50 && guc < hedefGuc * 0.7 && Math.random() < 0.5) {
        sonuc = aiTeklifDenemesi(owner, hedef, "baris");
        break;
      }
      const savasYorgunlugu =
        iliski <= -30 &&
        iliski > -70 &&
        para < 220 &&
        guc < hedefGuc * 1.05 &&
        Math.random() < 0.22;
      if (savasYorgunlugu) {
        sonuc = aiTeklifDenemesi(owner, hedef, "baris");
        break;
      }
    }
    if (!sonuc && para < 200 && yeniAnlasmaAcabilir) {
      for (const hedef of digerleri) {
        const denemeSans = hedef === "biz" ? AI_TICARET_DENEME_SANSI * 0.5 : AI_TICARET_DENEME_SANSI;
        if (iliskiDegeri(owner, hedef) >= -10 && Math.random() < denemeSans) {
          sonuc = aiTeklifDenemesi(owner, hedef, "ticaret");
          if (sonuc) break;
        }
      }
    }
    if (!sonuc && yeniAnlasmaAcabilir && enTehlikeli && zayifHedef && enTehlikeli !== owner) {
      for (const hedef of digerleri) {
        if (hedef === enTehlikeli) continue;
        if (iliskiDegeri(owner, hedef) > 40 && ortakDusmanVar(owner, hedef) && Math.random() < 0.42) {
          if (para >= DIPLOMASI.SABOTAJ_MALIYETI && Math.random() < 0.4) {
            sonuc = aiTeklifDenemesi(owner, hedef, "sabotaj");
          }
          if (!sonuc?.ok) sonuc = aiTeklifDenemesi(owner, hedef, "ittifak");
          if (sonuc) break;
        }
      }
    }
    if (!sonuc && zayifHedef && guc > gucPuani(zayifHedef) * 1.45 && Math.random() < 0.25) {
      sonuc = aiTeklifDenemesi(owner, zayifHedef, "tehdit");
    }

    if (!sonuc) return;
    d.aiTeklifCooldown[owner] = oyun.tur + AI_DIPLO_TEKLIF_COOLDOWN;

    const hedefAd = ownerAd(sonuc.hedef);
    const tipAd = teklifTipAdi(sonuc.tip);
    const sonucAd = sonuc.ok ? "kabul edildi" : "reddedildi";
    const metin = `${ownerAd(owner)} → ${hedefAd}: ${tipAd} teklifi (${sonucAd}).`;
    const bizTeklifi = sonuc.hedef === "biz";

    if (bizTeklifi) {
      const etki = teklifGetiriGoturuMetni(sonuc.tip, owner, "biz");
      const soru = `${ownerAd(owner)} senden ${tipAd} teklifi istiyor.\n\n${etki}\n\nKabul etmek için "Onayla", reddetmek için "İptal" seç.`;
      messages.push({
        metin: soru,
        popup: true,
        log: false,
        ses: true,
        tip: sonuc.tip,
        teklifId: sonuc.teklifId || null,
        baslik: "Diplomasi Teklifi",
      });
      return;
    }

    if (sonuc.tip === "ittifak" && sonuc.ok) {
      messages.push({
        metin,
        popup: false,
        log: true,
        ses: true,
        tip: sonuc.tip,
      });
    }
  });
}

function diplomatikRastgeleOlay(messages) {
  if (oyun.tur < 8 || oyun.tur % 6 !== 0) return;
  const havuz = [];

  const uygunToplanti = [];
  for (let i = 0; i < DIPLO_OWNERLER.length; i += 1) {
    for (let j = i + 1; j < DIPLO_OWNERLER.length; j += 1) {
      const a = DIPLO_OWNERLER[i];
      const b = DIPLO_OWNERLER[j];
      const il = iliskiDegeri(a, b);
      if (il >= 20 && il <= 50) uygunToplanti.push([a, b]);
    }
  }
  if (uygunToplanti.length) havuz.push("gizli-toplanti");
  if (aktifAnlasmalar(null, null, "ticaret").length) havuz.push("silah-kacakciligi");
  if (diplomasiDurumu().olayGunlugu.some((o) => o.kod === "suikast-basarili" && oyun.tur - o.tur <= 3)) havuz.push("kan-davasi");
  havuz.push("dugun-barisi", "hain-tegmen", "ortak-polis", "cifte-ajan");

  const secim = havuz[Math.floor(Math.random() * havuz.length)];
  if (!secim) return;

  if (secim === "gizli-toplanti") {
    const [a, b] = uygunToplanti[Math.floor(Math.random() * uygunToplanti.length)];
    if (oyun.fraksiyon?.[a]) oyun.fraksiyon[a].para += 30;
    if (oyun.fraksiyon?.[b]) oyun.fraksiyon[b].para += 30;
    iliskiDegistir(a, b, +10, "Gizli Toplantı");
    const m = `Gizli Toplantı: ${ownerAd(a)} ile ${ownerAd(b)} yakınlaştı (+10).`;
    diploKayitEkle("olay-gizli-toplanti", m, "iyi", { taraflar: [a, b] });
    messages.push(m);
    return;
  }
  if (secim === "silah-kacakciligi") {
    const an = aktifAnlasmalar(null, null, "ticaret")[0];
    if (an) {
      const b1 = (oyun.bolgeler || []).find((b) => b.owner === an.taraf1);
      const b2 = (oyun.bolgeler || []).find((b) => b.owner === an.taraf2);
      if (b1) yiginaEkle(b1.id, an.taraf1, 1, "uzman");
      if (b2) yiginaEkle(b2.id, an.taraf2, 1, "uzman");
      const m = `Silah Kaçakçılığı: ${ownerAd(an.taraf1)} ve ${ownerAd(an.taraf2)} uzman takviye aldı.`;
      diploKayitEkle("olay-silah-kacakciligi", m, "bilgi", { taraflar: [an.taraf1, an.taraf2] });
      messages.push(m);
      return;
    }
  }
  if (secim === "kan-davasi") {
    const suikast = diplomasiDurumu().olayGunlugu
      .filter((o) => o.kod === "suikast-basarili")
      .sort((a, b) => b.tur - a.tur)[0];
    if (suikast?.taraflar?.[1]) {
      const hedef = suikast.taraflar[1];
      if (oyun.fraksiyon?.[hedef]) oyun.fraksiyon[hedef]._ofke = (oyun.fraksiyon[hedef]._ofke || 0) + 20;
      const m = `Kan Davası: ${ownerAd(hedef)} intikam moduna geçti (+öfke).`;
      diploKayitEkle("olay-kan-davasi", m, "kotu", { taraflar: suikast.taraflar });
      messages.push(m);
      return;
    }
  }
  if (secim === "dugun-barisi") {
    const a = DIPLO_OWNERLER[Math.floor(Math.random() * DIPLO_OWNERLER.length)];
    const adaylar = DIPLO_OWNERLER.filter((id) => id !== a);
    const b = adaylar[Math.floor(Math.random() * adaylar.length)];
    iliskiDegistir(a, b, +15, "Düğün Barışı");
    const m = `Düğün Barışı: ${ownerAd(a)} ve ${ownerAd(b)} arasında kalıcı yakınlaşma oldu (+15).`;
    diploKayitEkle("olay-dugun-barisi", m, "iyi", { taraflar: [a, b] });
    messages.push(m);
    return;
  }
  if (secim === "hain-tegmen") {
    const hedef = DIPLO_OWNERLER.filter((id) => id !== "biz")[Math.floor(Math.random() * 3)];
    const secim = Math.random() < 0.5 ? "al" : "gonder";
    if (secim === "al") {
      iliskiDegistir("biz", hedef, -20, "Hain Teğmen kabul edildi");
      const bizBolge = (oyun.bolgeler || []).find((b) => b.owner === "biz");
      if (bizBolge) yiginaEkle(bizBolge.id, "biz", 2, "uzman");
      const m = `Hain Teğmen: ${ownerAd(hedef)} içinden kaçan adamlar bize katıldı.`;
      diploKayitEkle("olay-hain-tegmen", m, "kotu", { taraflar: ["biz", hedef] });
      messages.push(m);
    } else {
      iliskiDegistir("biz", hedef, +15, "Hain Teğmen geri gönderildi");
      const m = `Hain Teğmen geri gönderildi. ${ownerAd(hedef)} ile ilişki iyileşti (+15).`;
      diploKayitEkle("olay-hain-tegmen", m, "iyi", { taraflar: ["biz", hedef] });
      messages.push(m);
    }
    return;
  }
  if (secim === "ortak-polis") {
    const a = DIPLO_OWNERLER[Math.floor(Math.random() * DIPLO_OWNERLER.length)];
    const b = DIPLO_OWNERLER.filter((id) => id !== a)[Math.floor(Math.random() * 3)];
    iliskiDegistir(a, b, +12, "Ortak Polis Baskısı");
    const m = `Ortak Polis Baskısı: ${ownerAd(a)} ve ${ownerAd(b)} dayanışma kurdu (+12).`;
    diploKayitEkle("olay-ortak-polis", m, "bilgi", { taraflar: [a, b] });
    messages.push(m);
    return;
  }
  if (secim === "cifte-ajan") {
    const hedefSahip = DIPLO_OWNERLER.filter((id) => id !== "biz")[Math.floor(Math.random() * 3)];
    const bolge = (oyun.bolgeler || []).find((b) => b.owner === hedefSahip);
    if (bolge) {
      bolge._kesif = { bitis: oyun.tur + 5 };
      const m = `Çifte Ajan: ${ownerAd(hedefSahip)} hakkında ücretsiz keşif bilgisi geldi.`;
      diploKayitEkle("olay-cifte-ajan", m, "iyi", { taraflar: ["biz", hedefSahip] });
      messages.push(m);
    }
  }
}

function iliskiTarihceKaydet() {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.iliskiTarihce)) d.iliskiTarihce = [];
  d.iliskiTarihce.push({
    tur: oyun.tur,
    iliskiler: { ...(d.iliskiler || {}) },
  });
  if (d.iliskiTarihce.length > DIPLO_TARIHCE_LIMIT) {
    d.iliskiTarihce.splice(0, d.iliskiTarihce.length - DIPLO_TARIHCE_LIMIT);
  }
}

export function diplomasiTick() {
  const messages = [];
  diplomasiDurumu();
  bekleyenTeklifleriTemizle();
  zorunluTeklifPopupKontrol(messages);
  iliskiHafizaSolmasi(messages);
  anlasmaBakimVeTemizlik(messages);
  savasBarisKritikBildirimleri(messages);
  koalisyonKontrol(messages);
  aiDiplomasiKararlari(messages);

  const d = diplomasiDurumu();
  d.gucSiralamasi.push({
    tur: oyun.tur,
    siralama: gucSiralamasiHesapla(),
  });
  if (d.gucSiralamasi.length > 10) d.gucSiralamasi.shift();

  diplomatikRastgeleOlay(messages);
  iliskiTarihceKaydet();

  if (oyun.tur > 0 && oyun.tur % 10 === 0 && d.ihanetSayisi === 0) {
    itibarDegistir(+2, "Onurlu diplomasi");
  }
  d._saldiriKayit = {};

  return messages;
}

export function diplomasiOzet(owner = "biz") {
  const d = diplomasiDurumu();
  const durumRozeti = (hedefOwner) => {
    if (ittifakAktifMi(owner, hedefOwner)) return { tip: "ittifak", ad: "İttifak" };
    if (barisAktifMi(owner, hedefOwner)) return { tip: "baris", ad: "Barış" };
    if (ateskesAktifMi(owner, hedefOwner)) return { tip: "ateskes", ad: "Ateşkes" };
    const iliski = iliskiDegeri(owner, hedefOwner);
    if (iliski <= -70) return { tip: "savas", ad: "Savaş" };
    return { tip: "normal", ad: "Normal" };
  };
  const hedefler = DIPLO_OWNERLER.filter((id) => id !== owner).map((id) => {
    const il = iliskiDurumu(owner, id);
    const iliskiKey = iliskiAnahtar(owner, id);
    const tarihce = Array.isArray(d.iliskiTarihce)
      ? d.iliskiTarihce
        .slice(-12)
        .map((row) => ({
          tur: row.tur,
          deger: Number(row.iliskiler?.[iliskiKey] ?? il.deger),
        }))
      : [];
    const anlasmalar = aktifAnlasmalar(owner, id).map((a) => ({
      tip: a.tip,
      bitis: a.bitis,
      kalan: Math.max(0, a.bitis - oyun.tur),
    }));
    const tehditKey = iliskiAnahtar(owner, id);
    const tehditKalan = Math.max(0, (d.tehditCooldown?.[tehditKey] || 0) - oyun.tur);
    return {
      owner: id,
      ...il,
      anlasmalar,
      tehditKalan,
      tarihce,
      durumRozet: durumRozeti(id),
    };
  });
  const aktifAnlasmaListesi = aktifAnlasmalar()
    .filter((a) => a.taraf1 === owner || a.taraf2 === owner)
    .map((a) => {
      const diger = a.taraf1 === owner ? a.taraf2 : a.taraf1;
      const kalan = Math.max(0, a.bitis - oyun.tur);
      const uyari =
        (a.tip === "ateskes" || a.tip === "baris")
          ? (kalan <= 1 ? "kritik" : (kalan <= 2 ? "uyari" : "normal"))
          : "normal";
      return {
        id: a.id,
        tip: a.tip,
        owner: diger,
        kalan,
        bakim: a.tip === "ittifak" ? DIPLOMASI.ITTIFAK_TUR_MALIYETI : 0,
        ticaretGeliri:
          a.tip === "ticaret"
            ? Math.round(ownerGelirTabani(owner) * DIPLOMASI.TICARET_GELIR_BONUS)
            : 0,
        uyari,
      };
    })
    .sort((a, b) => a.kalan - b.kalan);
  const bekleyenTeklifler = (Array.isArray(d.bekleyenTeklifler) ? d.bekleyenTeklifler : [])
    .filter((t) => t?.durum === "beklemede" && t?.hedef === owner)
    .map((t) => ({
      id: t.id,
      tip: t.tip,
      gonderen: t.gonderen,
      kalan: Number.isFinite(t.bitis) ? Math.max(0, t.bitis - oyun.tur) : null,
      etkiMetni: teklifGetiriGoturuMetni(t.tip, t.gonderen, owner),
    }))
    .sort((a, b) => (a.kalan ?? 999) - (b.kalan ?? 999));
  return {
    itibar: d.itibar,
    ihanetSayisi: d.ihanetSayisi,
    hedefler,
    gecmis: d.olayGunlugu.slice(-5).reverse(),
    aktifAnlasmalar: aktifAnlasmaListesi,
    bekleyenTeklifler,
    olayGunlugu: d.olayGunlugu.slice(-40).reverse(),
    koalisyon: d.koalisyon,
    oyuncuAksiyon: oyuncuDiploAksiyonDurumu(),
  };
}
