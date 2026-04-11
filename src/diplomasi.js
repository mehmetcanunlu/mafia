import { DIPLOMASI, ZORLUK } from "./config.js";
import { gucPuani, gucSiralamasiHesapla } from "./gucDengesi.js";
import { oyun, bolgeById, diplomasiDurumuTamamla } from "./state.js";
import { yiginaEkle } from "./state.js";

export const DIPLO_OWNERLER = Object.freeze(["biz", "ai1", "ai2", "ai3"]);
const DIPLO_LOG_LIMIT = 80;
const DIPLO_TARIHCE_LIMIT = 40;
const AI_DIPLO_TUR_ARALIK = 6;
const AI_DIPLO_TEKLIF_COOLDOWN = 22;
/** Oyuncuya barış penceresi: herhangi bir AI teklif ettikten veya ret sonrası tüm AI barışları bu kadar tur bekler (farklı fraksiyonların sırayla spam yapmasını keser). */
const AI_BARIS_OYUNCU_GENEL_ARALIK = 22;
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

function ownerOyundaMi(owner) {
  if (!owner || owner === "tarafsiz") return false;
  const fr = oyun.fraksiyon?.[owner];
  if (!fr || fr._elendi) return false;
  return (oyun.bolgeler || []).some((b) => b.owner === owner);
}

function savasDurumuTablosu() {
  const d = diplomasiDurumu();
  if (!d.savasDurumu || typeof d.savasDurumu !== "object") d.savasDurumu = {};
  return d.savasDurumu;
}

function savasKayitTablosu() {
  const d = diplomasiDurumu();
  if (!d.savasKayit || typeof d.savasKayit !== "object") d.savasKayit = {};
  return d.savasKayit;
}

export function savastaMi(a, b) {
  if (!a || !b || a === b) return false;
  const d = diplomasiDurumu();
  const key = iliskiAnahtar(a, b);
  const anlasmalar = Array.isArray(d.anlasmalar) ? d.anlasmalar : [];
  for (let i = 0; i < anlasmalar.length; i += 1) {
    const an = anlasmalar[i];
    const tip = String(an?.tip || "");
    if (tip !== "baris" && tip !== "ateskes") continue;
    if (!aktifAnlasmaFiltre(an)) continue;
    if (!anlasmaTaraflariAyniMi(an, a, b)) continue;
    return false;
  }
  return !!(d.savasDurumu && d.savasDurumu[key]);
}

function ownerBolgeSayisiDiplo(owner) {
  if (!owner) return 0;
  return (oyun.bolgeler || []).filter((x) => x.owner === owner).length;
}

function savasKaydiBaslat(a, b, meta = {}) {
  if (!a || !b || a === b) return null;
  const tablo = savasKayitTablosu();
  const key = iliskiAnahtar(a, b);
  if (!tablo[key] || typeof tablo[key] !== "object") {
    const taraflar = key.split("-");
    const taraf1 = taraflar[0] || a;
    const taraf2 = taraflar[1] || b;
    tablo[key] = {
      taraflar: [taraf1, taraf2],
      ilanEden: meta.ilanEden || a,
      baslangicTur: oyun.tur,
      sonCatismaTur: oyun.tur,
      skor: {
        [taraf1]: 0,
        [taraf2]: 0,
      },
      yorgunluk: {
        [taraf1]: 0,
        [taraf2]: 0,
      },
      baslangicBolge: {
        [taraf1]: ownerBolgeSayisiDiplo(taraf1),
        [taraf2]: ownerBolgeSayisiDiplo(taraf2),
      },
      baslangicGuc: {
        [taraf1]: Math.max(1, gucPuani(taraf1)),
        [taraf2]: Math.max(1, gucPuani(taraf2)),
      },
    };
  }
  const kayit = tablo[key];
  if (!kayit.skor || typeof kayit.skor !== "object") kayit.skor = { [a]: 0, [b]: 0 };
  if (!kayit.yorgunluk || typeof kayit.yorgunluk !== "object") kayit.yorgunluk = { [a]: 0, [b]: 0 };
  if (!kayit.baslangicBolge || typeof kayit.baslangicBolge !== "object") {
    kayit.baslangicBolge = { [a]: ownerBolgeSayisiDiplo(a), [b]: ownerBolgeSayisiDiplo(b) };
  }
  if (!kayit.baslangicGuc || typeof kayit.baslangicGuc !== "object") {
    kayit.baslangicGuc = { [a]: Math.max(1, gucPuani(a)), [b]: Math.max(1, gucPuani(b)) };
  }
  if (!Number.isFinite(kayit.sonCatismaTur)) kayit.sonCatismaTur = oyun.tur;
  return kayit;
}

function savasKaydiGetir(a, b, olustur = false, meta = {}) {
  if (!a || !b || a === b) return null;
  if (olustur) return savasKaydiBaslat(a, b, meta);
  const tablo = savasKayitTablosu();
  const key = iliskiAnahtar(a, b);
  const kayit = tablo[key];
  if (!kayit || typeof kayit !== "object") return null;
  return savasKaydiBaslat(a, b, meta);
}

function savasSkorLimit(v) {
  const ust = Math.max(40, Number(DIPLOMASI.SAVAS_SKOR_UST_LIMIT || 100));
  return clamp(round1(v), -ust, ust);
}

function savasSkorDegeri(owner, hedef) {
  const kayit = savasKaydiGetir(owner, hedef);
  if (!kayit) return 0;
  const deger = Number(kayit.skor?.[owner] || 0);
  return savasSkorLimit(Number.isFinite(deger) ? deger : 0);
}

function savasYorgunlukDegeri(owner, hedef) {
  const kayit = savasKaydiGetir(owner, hedef);
  if (!kayit) return 0;
  const deger = Number(kayit.yorgunluk?.[owner] || 0);
  return clamp(round1(Number.isFinite(deger) ? deger : 0), 0, 100);
}

function savasSkorUygula(owner, hedef, delta) {
  if (!Number.isFinite(delta) || delta === 0) return;
  const kayit = savasKaydiGetir(owner, hedef, true);
  if (!kayit) return;
  const oncekiA = Number(kayit.skor?.[owner] || 0);
  const oncekiB = Number(kayit.skor?.[hedef] || 0);
  kayit.skor[owner] = savasSkorLimit(oncekiA + delta);
  kayit.skor[hedef] = savasSkorLimit(oncekiB - delta);
  kayit.sonCatismaTur = oyun.tur;
}

function savasYorgunlukUygula(owner, hedef, delta) {
  if (!Number.isFinite(delta) || delta === 0) return;
  const kayit = savasKaydiGetir(owner, hedef, true);
  if (!kayit) return;
  const onceki = Number(kayit.yorgunluk?.[owner] || 0);
  kayit.yorgunluk[owner] = clamp(round1(onceki + delta), 0, 100);
}

function savasBaslat(a, b, meta = {}) {
  if (!a || !b || a === b) return false;
  const tablo = savasDurumuTablosu();
  const key = iliskiAnahtar(a, b);
  const yeni = !tablo[key];
  tablo[key] = true;
  savasKaydiBaslat(a, b, meta);
  return yeni;
}

function savasBitir(a, b) {
  if (!a || !b || a === b) return false;
  const tablo = savasDurumuTablosu();
  const key = iliskiAnahtar(a, b);
  if (!tablo[key]) return false;
  delete tablo[key];
  const kayitTablo = savasKayitTablosu();
  if (kayitTablo[key]) delete kayitTablo[key];
  return true;
}

function ownerIttifakOrtaklari(owner) {
  if (!owner) return [];
  const ortaklar = aktifAnlasmalar()
    .filter((a) => a.tip === "ittifak")
    .filter((a) => a.taraf1 === owner || a.taraf2 === owner)
    .map((a) => (a.taraf1 === owner ? a.taraf2 : a.taraf1))
    .filter((ortak) => ortak && ortak !== owner);
  return [...new Set(ortaklar)];
}

function ittifakZorunluSavasIlani(gonderen, hedef, kaynak = "İttifak yükümlülüğü") {
  if (!gonderen || !hedef || gonderen === hedef) return false;
  if (!ownerOyundaMi(gonderen) || !ownerOyundaMi(hedef)) return false;
  if (savastaMi(gonderen, hedef)) return false;

  ihanetIsle(gonderen, hedef, kaynak);
  iliskiKoy(gonderen, hedef, Math.min(-70, iliskiDegeri(gonderen, hedef)));
  const yeniSavas = savasBaslat(gonderen, hedef, { ilanEden: gonderen });
  if (!yeniSavas) return false;

  diploKayitEkle(
    "savas-ilani",
    `${ownerAd(gonderen)}, ${ownerAd(hedef)} tarafına ittifak yükümlülüğüyle savaş ilan etti.`,
    "kotu",
    { taraflar: [gonderen, hedef], kaynak: "ittifak-zinciri" }
  );
  return true;
}

function oyuncuIttifaklariniSavasaDahilEt(saldiran, hedef, kaynak = "İttifak çağrısı") {
  if (saldiran !== "biz" && hedef !== "biz") return 0;
  const dusman = saldiran === "biz" ? hedef : saldiran;
  if (!ownerOyundaMi(dusman)) return 0;

  const ortaklar = ownerIttifakOrtaklari("biz")
    .filter((ortak) => ortak !== dusman)
    .filter((ortak) => ownerOyundaMi(ortak));
  if (!ortaklar.length) return 0;

  let katilan = 0;
  ortaklar.forEach((ortak) => {
    const oldu = ittifakZorunluSavasIlani(ortak, dusman, `${kaynak}: ${ownerAd("biz")} yardımı`);
    if (oldu) katilan += 1;
  });
  if (katilan > 0) {
    diploKayitEkle(
      "ittifak-zorunlu-katilim",
      `${ownerAd("biz")} savaştayken ${katilan} müttefik otomatik savaşa dahil oldu.`,
      "bilgi",
      { taraflar: ["biz", dusman] }
    );
  }
  return katilan;
}

function ticaretMinSermaye() {
  return Math.max(0, Math.round(DIPLOMASI.TICARET_MIN_SERMAYE || 0));
}

function ticaretLikiditeCarpani(owner, minSermaye = ticaretMinSermaye()) {
  if (minSermaye <= 0) return 1;
  const para = ownerPara(owner);
  const oran = para / Math.max(1, minSermaye);
  if (oran >= 2.5) return 0.92;
  if (oran >= 1.7) return 1;
  if (oran >= 1.2) return 1.08;
  return 1.2;
}

function ticaretTurModeli(owner, partner, minSermaye = ticaretMinSermaye()) {
  const ownerGelir = Math.max(0, ownerGelirTabani(owner));
  const partnerGelir = Math.max(0, ownerGelirTabani(partner));
  const iliski = iliskiDegeri(owner, partner);
  const pazarCarpani = clamp(0.75 + ((iliski + 20) / 220), 0.55, 1.25);
  const brutHam = (ownerGelir * 0.16) + (partnerGelir * 0.1);
  const brut = Math.max(4, Math.round(brutHam * pazarCarpani));
  const maliyetCarpani = 0.58 * ticaretLikiditeCarpani(owner, minSermaye);
  const maliyet = Math.max(2, Math.round(brut * maliyetCarpani));
  const net = brut - maliyet;
  return { brut, maliyet, net };
}

function ticaretRiskOrani(taraf1, taraf2, minSermaye = ticaretMinSermaye()) {
  const bazRisk = clamp(Number(DIPLOMASI.TICARET_BATMA_SANSI || 0), 0, 0.5);
  const hedefSermaye = Math.max(1, minSermaye || 1);
  const para1 = ownerPara(taraf1);
  const para2 = ownerPara(taraf2);
  const baski1 = clamp(((hedefSermaye * 1.8) - para1) / (hedefSermaye * 1.8), 0, 1);
  const baski2 = clamp(((hedefSermaye * 1.8) - para2) / (hedefSermaye * 1.8), 0, 1);
  const iliski = iliskiDegeri(taraf1, taraf2);
  const gerilimRiski = iliski < 15 ? clamp((15 - iliski) / 130, 0, 0.35) : 0;
  const risk = (bazRisk * 0.45) + ((baski1 + baski2) * 0.02) + gerilimRiski;
  return clamp(risk, 0.01, Math.max(0.02, bazRisk));
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
    const minSermaye = ticaretMinSermaye();
    const bizModel = ticaretTurModeli(hedef, gonderen, minSermaye);
    const digerModel = ticaretTurModeli(gonderen, hedef, minSermaye);
    const batmaYuzde = Math.round(ticaretRiskOrani(gonderen, hedef, minSermaye) * 100);
    const batmaMin = Math.round(DIPLOMASI.TICARET_BATMA_MIN_KAYIP || 0);
    const batmaMax = Math.round(DIPLOMASI.TICARET_BATMA_MAX_KAYIP || 0);
    return [
      "Getirecek:",
      `+ ${DIPLOMASI.TICARET_SURESI} tur ticaret anlaşması`,
      `+ Sana tur başı yaklaşık +${bizModel.brut}₺ brüt / -${bizModel.maliyet}₺ gider (Net +${bizModel.net}₺)`,
      `+ ${ownerAd(gonderen)} için yaklaşık Net +${digerModel.net}₺/tur`,
      "Götürecek:",
      `- Tur başı işletme gideri: yaklaşık ${bizModel.maliyet}₺`,
      `- Dinamik kriz riski: tur başı yaklaşık %${batmaYuzde} (kayıp: ${batmaMin}-${batmaMax}₺)`,
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
    if (barisAktifMi(gonderen, hedef)) {
      return [
        "Getirecek:",
        "+ Zaten aktif barış var (ek etkisi yok)",
        "Götürecek:",
        "- Yeni statü oluşturmaz",
        "- Reddedersen ilişki -6",
      ].join("\n");
    }
    if (savastaMi(gonderen, hedef)) {
      return [
        "Getirecek:",
        "+ Açık savaş durumu sona erer",
        "+ Süresiz barış statüsü başlar",
        "Götürecek:",
        "- Yeniden saldırı için önce savaş ilanı gerekir",
        "- Reddedersen ilişki -6",
      ].join("\n");
    }
    return [
      "Getirecek:",
      "+ Taraflar arasında süresiz barış statüsü başlar",
      "+ Saldırı için önce anlaşmanın bozulması/savaş ilanı gerekir",
      "Götürecek:",
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
  if (tip === "tehdit") {
    const tazminat = Math.min(120, Math.max(0, Math.floor((oyun.fraksiyon?.[hedef]?.para || 0) * 0.12)));
    return [
      "Getirecek:",
      `+ Kabul edersen ${DIPLOMASI.ATESKES_SURESI} tur ateşkes`,
      `+ Kabul edersen yaklaşık ${tazminat}₺ tazminat ödersin`,
      "Götürecek:",
      "- Reddedersen ilişki -15",
      "- Reddedersen saldırgan taraf daha da agresifleşebilir",
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

/** Koalisyon dışında oyuncuya beklemede teklif var mı? (Aynı hedefli koalisyon teklifi sayılmaz — yeniden üretmek için silinmez.) */
function oyuncuyaKoalisyonDisiBekleyenTeklifVarMi(koalisyonHedef) {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) return false;
  const hedefStr = String(koalisyonHedef ?? "");
  return d.bekleyenTeklifler.some(
    (t) =>
      t?.hedef === "biz" &&
      t?.durum === "beklemede" &&
      !(t?.tip === "koalisyon" && String(t?.meta?.hedef ?? "") === hedefStr)
  );
}

function bekleyenKoalisyonDavetiBul(koalisyonHedef) {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) return null;
  const hedefStr = String(koalisyonHedef ?? "");
  return (
    d.bekleyenTeklifler.find(
      (t) =>
        t?.durum === "beklemede" &&
        t?.tip === "koalisyon" &&
        t?.hedef === "biz" &&
        String(t?.meta?.hedef ?? "") === hedefStr
    ) || null
  );
}

function oyuncuyaTeklifOlustur(gonderen, tip, meta = {}) {
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) d.bekleyenTeklifler = [];
  if (oyuncuyaBekleyenTeklifVarMi()) return null;
  const ayniTeklif = d.bekleyenTeklifler.find((t) => {
    if (!(t?.durum === "beklemede" && t?.gonderen === gonderen && t?.hedef === "biz" && t?.tip === tip))
      return false;
    if (tip === "koalisyon") return t?.meta?.hedef === meta?.hedef;
    return true;
  });
  if (ayniTeklif) return ayniTeklif;

  const metaNorm = meta && typeof meta === "object" ? { ...meta } : {};
  if (tip === "koalisyon" && metaNorm.hedef != null) metaNorm.hedef = String(metaNorm.hedef);

  const gecerlilikTur =
    tip === "koalisyon"
      ? Math.max(
          OYUNCU_TEKLIF_GECERLILIK,
          Math.max(4, Number(DIPLOMASI.KOALISYON_DAVET_TUR_ARALIK || 22))
        )
      : OYUNCU_TEKLIF_GECERLILIK;

  const teklif = {
    id: `teklif-${oyun.tur}-${Math.random().toString(36).slice(2, 8)}`,
    tip,
    gonderen,
    hedef: "biz",
    durum: "beklemede",
    tur: oyun.tur,
    bitis: oyun.tur + gecerlilikTur,
    meta: metaNorm,
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
  const savasAktif = savastaMi(gonderen, hedef);
  if (barisAktifMi(gonderen, hedef)) {
    // Tutarsız state güvenliği: aktif barış varken savaş kaydı kalmışsa temizle.
    if (savasAktif) savasBitir(gonderen, hedef);
    savasBarisCakismasiTemizle(oyun.diplomasi);
    return { ok: true, mesaj: "Barış zaten aktif. Savaş durumu güncellendi." };
  }
  if (!kabul) {
    const kalan = redCooldownKontrol(gonderen, hedef, "baris");
    if (kalan > 0) {
      return { ok: false, mesaj: `Barış teklifi reddedildi, ${kalan} tur sonra tekrar denenebilir.` };
    }
    iliskiDegistir(gonderen, hedef, -6, "Barış teklifi reddedildi");
    redCooldownKoy(gonderen, hedef, "baris");
    if (hedef === "biz") {
      oyuncuTeklifTipCooldownKoy("baris", AI_BARIS_OYUNCU_GENEL_ARALIK);
    }
    return { ok: false, mesaj: `${ownerAd(hedef)} barış teklifini reddetti. ${RED_COOLDOWN_TUR} tur boyunca yeni teklif yapılamaz.` };
  }
  tarafAnlasmalari(gonderen, hedef)
    .filter((a) => a.tip === "ateskes")
    .forEach((a) => anlasmaSil(a.id));
  iliskiDegistir(gonderen, hedef, savasAktif ? +20 : +14, "Barış anlaşması imzalandı");
  anlasmaEkle("baris", gonderen, hedef, DIPLOMASI.BARIS_SURESI, { kalici: true });
  // Kabul edilen barış teklifi savaş kaydını her durumda kapatır.
  savasBitir(gonderen, hedef);
  savasBarisCakismasiTemizle(oyun.diplomasi);
  diploKayitEkle(
    "baris",
    savasAktif
      ? `${ownerAd(gonderen)} ve ${ownerAd(hedef)} arasında barış teklifi kabul edildi, savaş sona erdi.`
      : `${ownerAd(gonderen)} ve ${ownerAd(hedef)} arasında süresiz barış anlaşması imzalandı.`,
    "iyi",
    { taraflar: [gonderen, hedef] }
  );
  return { ok: true, mesaj: savasAktif ? "Barış kabul edildi, savaş sona erdi." : "Barış anlaşması kabul edildi (süresiz)." };
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
  const modelGonderen = ticaretTurModeli(gonderen, hedef, minSermaye);
  const modelHedef = ticaretTurModeli(hedef, gonderen, minSermaye);
  const batmaYuzde = Math.round(ticaretRiskOrani(gonderen, hedef, minSermaye) * 100);
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
      `Rapor: ${ownerAd(gonderen)} Net +${modelGonderen.net}₺/tur (+${modelGonderen.brut} / -${modelGonderen.maliyet}), ` +
      `${ownerAd(hedef)} Net +${modelHedef.net}₺/tur (+${modelHedef.brut} / -${modelHedef.maliyet}).\n` +
      `Risk: tur başı yaklaşık %${batmaYuzde} ticaret krizi (${batmaMin}-${batmaMax}₺ kayıp).`,
  };
}

function anlasmaTaraflariAyniMi(anlasma, a, b) {
  return (
    (anlasma.taraf1 === a && anlasma.taraf2 === b) ||
    (anlasma.taraf1 === b && anlasma.taraf2 === a)
  );
}

/** Yalnızca kalıcı barış süresiz sayılır; ateşkes/ittifak/ticarette eksik bitis “sonsuz” yapılmaz (UI ve bakım tutarsızlığını önler). */
function anlasmaSuresizBarisMi(anlasma) {
  const tip = String(anlasma?.tip || "");
  if (tip !== "baris") return false;
  if (anlasma?.meta?.kalici) return true;
  return anlasma.bitis === null || anlasma.bitis === undefined;
}

function aktifAnlasmaFiltre(anlasma) {
  if (!anlasma) return false;
  if (anlasmaSuresizBarisMi(anlasma)) return true;
  const b = Number(anlasma.bitis);
  return Number.isFinite(b) && b >= oyun.tur;
}

/** Aktif barış/ateşkes varken kalan savaş bayrağı / savaş kaydı tutarsızlığını giderir. */
function savasBarisCakismasiTemizle(d) {
  if (!d || typeof d !== "object") return;
  if (!d.savasDurumu || typeof d.savasDurumu !== "object") return;
  if (!Array.isArray(d.anlasmalar)) return;
  if (!d.savasKayit || typeof d.savasKayit !== "object") d.savasKayit = {};
  const savas = d.savasDurumu;
  const kayit = d.savasKayit;
  d.anlasmalar.forEach((a) => {
    const tip = String(a?.tip || "");
    if (!a || (tip !== "baris" && tip !== "ateskes")) return;
    if (!aktifAnlasmaFiltre(a)) return;
    const key = iliskiAnahtar(a.taraf1, a.taraf2);
    if (savas[key]) delete savas[key];
    if (kayit[key]) delete kayit[key];
  });
}

function iliskiDurumMeta(deger) {
  if (deger >= 70) return { etiket: "İttifak", ikon: "🟢", sinif: "ittifak" };
  if (deger >= 30) return { etiket: "Dostluk", ikon: "💚", sinif: "dostluk" };
  if (deger > -30) return { etiket: "Tarafsız", ikon: "⚪", sinif: "tarafsiz" };
  if (deger > -70) return { etiket: "Gerilim", ikon: "🟠", sinif: "gerilim" };
  return { etiket: "Düşmanlık", ikon: "🔴", sinif: "savas" };
}

export function diplomasiDurumu() {
  oyun.diplomasi = diplomasiDurumuTamamla(oyun.diplomasi);
  savasBarisCakismasiTemizle(oyun.diplomasi);
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
  return ittifakAktifMi(ownerA, ownerB);
}

export function diplomasiSaldiriYasakSebebi(saldiran, hedef) {
  if (!saldiran || !hedef || saldiran === hedef) return "Geçersiz hedef.";
  if (barisAktifMi(saldiran, hedef)) return "Aktif barış anlaşması var.";
  if (ateskesAktifMi(saldiran, hedef)) return "Aktif ateşkes var.";
  if (ittifakAktifMi(saldiran, hedef)) return "Aktif ittifak varken saldırı yapılamaz.";
  return "";
}

export function diplomasiSaldiriMumkunMu(saldiran, hedef) {
  return !diplomasiSaldiriYasakSebebi(saldiran, hedef);
}

function anlasmaEkle(tip, taraf1, taraf2, sure, meta = {}) {
  const d = diplomasiDurumu();
  const kalici = !!meta?.kalici || tip === "baris";
  const mevcut = d.anlasmalar.find(
    (a) => aktifAnlasmaFiltre(a) && a.tip === tip && anlasmaTaraflariAyniMi(a, taraf1, taraf2)
  );
  if (mevcut) {
    if (kalici) mevcut.bitis = null;
    else mevcut.bitis = Math.max(Number(mevcut.bitis || 0), oyun.tur + sure);
    mevcut.meta = { ...(mevcut.meta || {}), ...meta, kalici };
    return mevcut;
  }
  const anlasma = {
    id: `${tip}-${oyun.tur}-${Math.random().toString(36).slice(2, 8)}`,
    tip,
    taraf1,
    taraf2,
    baslangic: oyun.tur,
    bitis: kalici ? null : oyun.tur + sure,
    meta: { ...meta, kalici },
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
  if (savastaMi(gonderen, hedef)) {
    return { ok: false, mesaj: "Zaten savaş durumundasınız." };
  }

  const d = diplomasiDurumu();
  ihanetIsle(gonderen, hedef, "Savaş ilanı");
  iliskiKoy(gonderen, hedef, Math.min(-70, iliskiDegeri(gonderen, hedef)));
  tarafAnlasmalari(gonderen, hedef).forEach((a) => anlasmaSil(a.id));
  savasBaslat(gonderen, hedef, { ilanEden: gonderen });

  diploKayitEkle(
    "savas-ilani",
    `${ownerAd(gonderen)}, ${ownerAd(hedef)} tarafına savaş ilan etti.`,
    "kotu",
    { taraflar: [gonderen, hedef] }
  );

  const katilanMuttefik = oyuncuIttifaklariniSavasaDahilEt(gonderen, hedef, "Resmi savaş ilanı");

  if (!d._savasciItibarCeza || typeof d._savasciItibarCeza !== "object") d._savasciItibarCeza = {};
  DIPLO_OWNERLER
    .filter((id) => id !== gonderen && id !== hedef)
    .forEach((id) => {
      const key = `${gonderen}:${id}`;
      const cooldownBitis = Number(d._savasciItibarCeza[key] || -999);
      if (cooldownBitis > oyun.tur) return;
      const ceza = savastaMi(gonderen, id) ? -0.4 : -1.2;
      iliskiDegistir(gonderen, id, ceza, "Savaşçı itibarı", { sessiz: true });
      d._savasciItibarCeza[key] = oyun.tur + 10;
    });

  const ek = katilanMuttefik > 0 ? ` ${katilanMuttefik} müttefik otomatik savaşa dahil oldu.` : "";
  return { ok: true, mesaj: `${ownerAd(hedef)} tarafına savaş ilan edildi.${ek}` };
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

function ownerSinirTemasi(ownerA, ownerB) {
  if (!ownerA || !ownerB || ownerA === ownerB) return 0;
  const aBolgeler = (oyun.bolgeler || []).filter((b) => b.owner === ownerA);
  if (!aBolgeler.length) return 0;
  let temas = 0;
  aBolgeler.forEach((b) => {
    const komsular = oyun.komsu?.[b.id] || [];
    komsular.forEach((kid) => {
      const kb = bolgeById(kid);
      if (kb?.owner === ownerB) temas += 1;
    });
  });
  return temas;
}

function ticaretBatmaKaybiHesapla(owner, ticaretHacmi = 0) {
  const para = Math.max(0, Math.round(oyun.fraksiyon?.[owner]?.para || 0));
  if (para <= 0) return 0;
  const oranKayip = Math.round(para * Math.max(0, DIPLOMASI.TICARET_BATMA_PARA_ORANI || 0));
  const hacimKaybi = Math.round(Math.max(0, Number(ticaretHacmi) || 0) * (1.8 + Math.random() * 1.2));
  const minKayip = Math.max(0, Math.round(DIPLOMASI.TICARET_BATMA_MIN_KAYIP || 0));
  const maxKayip = Math.max(minKayip, Math.round(DIPLOMASI.TICARET_BATMA_MAX_KAYIP || minKayip));
  const hedefKayip = clamp(Math.max(oranKayip, hacimKaybi), minKayip, maxKayip);
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

function barisKabulModeli(gonderen, hedef) {
  const savasAktif = savastaMi(gonderen, hedef);
  if (!savasAktif) {
    const gucGonderen = gucPuani(gonderen);
    const gucHedef = Math.max(1, gucPuani(hedef));
    const gucFark = (gucGonderen - gucHedef) / gucHedef;
    const bazSans = clamp(0.5 - Math.max(0, gucFark) * 0.2 + Math.max(0, -gucFark) * 0.15, 0.1, 0.9);
    return {
      sans: kabulSansiniHesapla(hedef, "baris", bazSans, 0),
      savasAktif: false,
      skor: 0,
      yorgunluk: 0,
    };
  }

  const hedefSkor = savasSkorDegeri(hedef, gonderen);
  const hedefYorgunluk = savasYorgunlukDegeri(hedef, gonderen);
  const gonderenYorgunluk = savasYorgunlukDegeri(gonderen, hedef);
  const hedefGuc = Math.max(1, gucPuani(hedef));
  const gonderenGuc = Math.max(1, gucPuani(gonderen));
  const gucOrani = hedefGuc / gonderenGuc;

  const zorunluSkor = Number(DIPLOMASI.SAVAS_BARISE_ZORLAMA_SKORU || -38);
  const zorunluYorgunluk = Number(DIPLOMASI.SAVAS_BARISE_ZORLAMA_YORGUNLUK || 62);
  const zorlanan = hedefSkor <= zorunluSkor || hedefYorgunluk >= zorunluYorgunluk;

  let bazSans =
    0.26 +
    (hedefYorgunluk * 0.006) +
    (Math.max(0, -hedefSkor) * 0.011) +
    (gucOrani < 1 ? (1 - gucOrani) * 0.35 : 0) +
    (ownerPara(hedef) < 180 ? 0.08 : 0) +
    (gonderenYorgunluk > hedefYorgunluk ? 0.04 : 0);

  bazSans -=
    (Math.max(0, hedefSkor) * 0.007) +
    (gucOrani > 1.12 ? 0.1 : 0) +
    (ownerPara(hedef) > 480 ? 0.05 : 0);

  if (zorlanan) bazSans = Math.max(bazSans, 0.68);
  const sans = clamp(
    bazSans + (ZORLUK[oyun.zorluk]?.aiDiploEsneklik || 0) + (aiKisilikCarpani(hedef, "baris") * 0.5),
    0.05,
    0.96
  );

  return {
    sans,
    savasAktif: true,
    skor: round1(hedefSkor),
    yorgunluk: round1(hedefYorgunluk),
  };
}

export function barisTeklifiEt(gonderen, hedef) {
  const model = barisKabulModeli(gonderen, hedef);
  return barisTeklifiSonuclandir(gonderen, hedef, teklifSonucu(hedef, model.sans));
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

export function rusvetTahminiArtis(gonderen, hedef, miktar) {
  const para = Number(miktar);
  if (!Number.isFinite(para) || para <= 0) return 0;
  const mevcutIliski = iliskiDegeri(gonderen, hedef);
  const bazArtis = (Math.sqrt(para) / 1.9) + (para / 120);
  const yuksekIliskiCeza = mevcutIliski > 60 ? (mevcutIliski - 60) * 0.08 : 0;
  return clamp(round1(bazArtis - yuksekIliskiCeza), 0.5, 22);
}

export function rusvetVer(gonderen, hedef, miktar) {
  const para = Number(miktar);
  if (!Number.isFinite(para) || para <= 0) return { ok: false, mesaj: "Geçersiz rüşvet miktarı." };
  const fr = oyun.fraksiyon?.[gonderen];
  if (!fr || fr.para < para) return { ok: false, mesaj: "Yetersiz para." };

  fr.para -= para;
  const artis = rusvetTahminiArtis(gonderen, hedef, para);
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

function tehditOnKosulKontrol(gonderen, hedef) {
  const d = diplomasiDurumu();
  const key = iliskiAnahtar(gonderen, hedef);
  const kalan = (d.tehditCooldown?.[key] || 0) - oyun.tur;
  if (kalan > 0) {
    return { ok: false, mesaj: `Bu hedefe tekrar tehdit için ${kalan} tur beklemelisin.` };
  }
  const gucGonderen = gucPuani(gonderen);
  const gucHedef = Math.max(1, gucPuani(hedef));
  if (gucGonderen < gucHedef * 1.3) {
    return { ok: false, mesaj: "Tehdit için askeri güç en az %30 üstün olmalı." };
  }
  const fark = gucGonderen / gucHedef;
  const sans = clamp(0.35 + (fark - 1.3) * 0.35 - aiKisilikCarpani(hedef, "tehditDirenci"), 0.1, 0.9);
  return { ok: true, sans };
}

function tehditSonuclandir(gonderen, hedef, kabul) {
  const d = diplomasiDurumu();
  const key = iliskiAnahtar(gonderen, hedef);
  d.tehditCooldown[key] = oyun.tur + DIPLOMASI.TEHDIT_BEKLEME;

  if (!kabul) {
    iliskiDegistir(gonderen, hedef, -15, "Ültimatom reddedildi");
    if (oyun.fraksiyon?.[hedef]) {
      oyun.fraksiyon[hedef]._ofke = (oyun.fraksiyon[hedef]._ofke || 0) + 30;
    }
    diploKayitEkle(
      "tehdit-red",
      `${ownerAd(hedef)}, ${ownerAd(gonderen)} tarafından yapılan ültimatomu reddetti.`,
      "kotu",
      { taraflar: [gonderen, hedef] }
    );
    return { ok: false, mesaj: "Ültimatom reddedildi." };
  }

  anlasmaEkle("ateskes", gonderen, hedef, DIPLOMASI.ATESKES_SURESI, { tehditKaynakli: true });
  const tribute = Math.min(120, Math.max(0, Math.floor((oyun.fraksiyon?.[hedef]?.para || 0) * 0.12)));
  if (tribute > 0 && oyun.fraksiyon?.[hedef] && oyun.fraksiyon?.[gonderen]) {
    oyun.fraksiyon[hedef].para -= tribute;
    oyun.fraksiyon[gonderen].para += tribute;
  }
  diploKayitEkle(
    "tehdit-kabul",
    `${ownerAd(hedef)} ültimatomu kabul etti. ${DIPLOMASI.ATESKES_SURESI} tur saldırmazlık${tribute > 0 ? ` ve ${tribute}₺ tazminat` : ""}.`,
    "iyi",
    { taraflar: [gonderen, hedef] }
  );
  return { ok: true, mesaj: "Ültimatom kabul edildi, geçici ateşkes başladı." };
}

export function tehditEt(gonderen, hedef) {
  const onKosul = tehditOnKosulKontrol(gonderen, hedef);
  if (!onKosul.ok) return { ok: false, mesaj: onKosul.mesaj };
  const kabul = teklifSonucu(hedef, onKosul.sans);
  return tehditSonuclandir(gonderen, hedef, kabul);
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
  if (!diplomasiSaldiriMumkunMu(saldiran, hedef)) return;
  const d = diplomasiDurumu();
  if (!d._saldiriKayit || typeof d._saldiriKayit !== "object") d._saldiriKayit = {};
  if (!d._saldirganAlgisi || typeof d._saldirganAlgisi !== "object") d._saldirganAlgisi = {};
  const turKey = `${oyun.tur}:${saldiran}->${hedef}`;
  if (d._saldiriKayit[turKey]) return;
  d._saldiriKayit[turKey] = true;

  const yeniSavas = savasBaslat(saldiran, hedef, { ilanEden: saldiran });
  ihanetIsle(saldiran, hedef, kaynak);
  iliskiDegistir(saldiran, hedef, -15, "Askeri saldırı başlatıldı", { sessiz: false });
  if (yeniSavas) {
    diploKayitEkle(
      "savas-basladi",
      `${ownerAd(saldiran)} ve ${ownerAd(hedef)} arasında resmi savaş durumu başladı.`,
      "kotu",
      { taraflar: [saldiran, hedef] }
    );
    oyuncuIttifaklariniSavasaDahilEt(saldiran, hedef, "Sıcak çatışma");
  }
  const savasTablosu = (d.savasDurumu && typeof d.savasDurumu === "object") ? d.savasDurumu : {};
  DIPLO_OWNERLER
    .filter((id) => id !== saldiran && id !== hedef)
    .forEach((id) => {
      const algiKey = iliskiAnahtar(saldiran, id);
      const cooldownBitis = Number(d._saldirganAlgisi[algiKey] || -999);
      if (cooldownBitis > oyun.tur) return;
      const aktifSavas = !!savasTablosu[algiKey];
      const ceza = aktifSavas ? -0.2 : -0.6;
      iliskiDegistir(saldiran, id, ceza, "Saldırgan algısı", { sessiz: true });
      d._saldirganAlgisi[algiKey] = oyun.tur + 4;
    });

  const hedefIttifaklari = aktifAnlasmalar()
    .filter((a) => a.tip === "ittifak")
    .filter((a) => (a.taraf1 === hedef || a.taraf2 === hedef))
    .map((a) => (a.taraf1 === hedef ? a.taraf2 : a.taraf1))
    .filter((ortak) => ortak !== saldiran);

  hedefIttifaklari.forEach((ortak) => {
    if (savastaMi(ortak, saldiran)) return;
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
  savasSkorUygula(saldiran, savunan, Number(DIPLOMASI.SAVAS_SKOR_FETIH || 16));
  savasYorgunlukUygula(saldiran, savunan, 2.4);
  savasYorgunlukUygula(savunan, saldiran, 8.5);
  const bolge = bolgeId ? bolgeById(bolgeId) : null;
  diploKayitEkle(
    "fetih",
    `${ownerAd(saldiran)}, ${ownerAd(savunan)} tarafına ait ${bolge?.ad || "bir bölgeyi"} ele geçirdi.`,
    "kotu",
    { taraflar: [saldiran, savunan] }
  );
}

export function diplomasiSavasCatismasiSonucu(saldiran, savunan, detay = {}) {
  if (!saldiran || !savunan || saldiran === savunan) return;
  if (!savastaMi(saldiran, savunan)) return;

  const saldiranKayip = Math.max(0, Math.round(Number(detay.saldiranKayip) || 0));
  const savunanKayip = Math.max(0, Math.round(Number(detay.savunanKayip) || 0));
  const saldiriBasarili = !!detay.saldiriBasarili;
  const fetih = !!detay.fetih;
  const kayipEtki = Math.max(0.05, Number(DIPLOMASI.SAVAS_SKOR_KAYIP_ETKISI || 0.28));
  const savunmaSkoru = Math.max(2, Number(DIPLOMASI.SAVAS_SKOR_SAVUNMA || 8));

  const kayipDelta = round1((savunanKayip - saldiranKayip) * kayipEtki);
  if (kayipDelta !== 0) savasSkorUygula(saldiran, savunan, kayipDelta);
  if (!fetih && saldiriBasarili) savasSkorUygula(saldiran, savunan, 3);
  if (!saldiriBasarili) savasSkorUygula(savunan, saldiran, savunmaSkoru * 0.55);

  const yorgKayipEtki = Math.max(0.03, Number(DIPLOMASI.SAVAS_YORGUNLUK_KAYIP_ETKISI || 0.16));
  const saldiranYorg = (saldiranKayip * yorgKayipEtki) + (saldiriBasarili ? 0.4 : 1.5);
  const savunanYorg = (savunanKayip * yorgKayipEtki) + (saldiriBasarili ? 1.1 : 0.5);
  savasYorgunlukUygula(saldiran, savunan, saldiranYorg + (fetih ? 1.4 : 0));
  savasYorgunlukUygula(savunan, saldiran, savunanYorg + (fetih ? 4.2 : 0));
}

export function savasSkorOzeti(owner, hedef) {
  if (!owner || !hedef || owner === hedef) return null;
  if (!savastaMi(owner, hedef)) return null;
  const kayit = savasKaydiGetir(owner, hedef);
  if (!kayit) return null;
  const benimSkor = savasSkorDegeri(owner, hedef);
  const hedefSkor = savasSkorDegeri(hedef, owner);
  const benimYorgunluk = savasYorgunlukDegeri(owner, hedef);
  const hedefYorgunluk = savasYorgunlukDegeri(hedef, owner);
  const benimTeklifSans = Math.round(barisKabulModeli(owner, hedef).sans * 100);
  const hedefTeklifSans = Math.round(barisKabulModeli(hedef, owner).sans * 100);
  return {
    taraflar: [owner, hedef],
    baslangicTur: Number(kayit.baslangicTur || oyun.tur),
    sure: Math.max(0, oyun.tur - Number(kayit.baslangicTur || oyun.tur)),
    skor: {
      [owner]: benimSkor,
      [hedef]: hedefSkor,
    },
    yorgunluk: {
      [owner]: benimYorgunluk,
      [hedef]: hedefYorgunluk,
    },
    barisTeklifSans: {
      [owner]: benimTeklifSans,
      [hedef]: hedefTeklifSans,
    },
  };
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
  if (savastaMi(saldiran, hedef)) {
    return {
      saldiriCarpani: 1 + Number(DIPLOMASI.SAVAS_SALDIRI_BONUS || 0),
      etiket: "Savaş bonusu",
    };
  }
  const iliski = iliskiDegeri(saldiran, hedef);
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
  let gerilimKorundu = 0;
  let savasDegisim = 0;
  let rekabetDegisim = 0;
  let dostlukKorundu = 0;
  Object.entries(d.iliskiler).forEach(([key, val]) => {
    if (!Number.isFinite(val) || Math.abs(val) < 0.05) return;
    const taraflar = String(key).split("-");
    const savasAktif = !!d.savasDurumu?.[key];
    const hafizaToparlanma = clamp(Number(DIPLOMASI.ILISKI_HAFIZA_SOLMASI || 0.5), 0.1, 1.2);
    let yeniDeger = val;

    if (savasAktif) {
      const asindir = Math.max(0.5, Number(DIPLOMASI.SAVAS_CURUMESI || 0) * 0.7);
      yeniDeger = round1(Math.max(-100, val - asindir));
      savasDegisim += 1;
    } else if (val <= -70) {
      // Köklü düşmanlık hızla sıfıra dönmez.
      yeniDeger = round1(Math.min(-45, val + Math.max(0.06, hafizaToparlanma * 0.12)));
      gerilimKorundu += 1;
    } else if (val <= -35) {
      yeniDeger = round1(Math.min(-20, val + Math.max(0.1, hafizaToparlanma * 0.2)));
      gerilimKorundu += 1;
    } else if (val >= 70) {
      // Güçlü dostluk/ittifak hafızası da daha kalıcı.
      yeniDeger = round1(Math.max(45, val - Math.max(0.06, hafizaToparlanma * 0.12)));
      dostlukKorundu += 1;
    } else if (val >= 35) {
      yeniDeger = round1(Math.max(20, val - Math.max(0.1, hafizaToparlanma * 0.22)));
      dostlukKorundu += 1;
    } else if (Math.abs(val) <= 15) {
      if (val > 0) yeniDeger = round1(Math.max(0, val - Math.max(0.12, hafizaToparlanma * 0.42)));
      else yeniDeger = round1(Math.min(0, val + Math.max(0.12, hafizaToparlanma * 0.42)));
    } else if (val > 0) {
      yeniDeger = round1(Math.max(0, val - Math.max(0.08, hafizaToparlanma * 0.28)));
    } else {
      yeniDeger = round1(Math.min(0, val + Math.max(0.08, hafizaToparlanma * 0.28)));
    }

    // Sınır teması olan yakın güçler arasında rekabet baskısı birikerek kutuplaşma üretir.
    if (!savasAktif && taraflar.length === 2) {
      const [a, b] = taraflar;
      if (ownerOyundaMi(a) && ownerOyundaMi(b) && !ittifakAktifMi(a, b)) {
        const temas = ownerSinirTemasi(a, b);
        if (temas > 0) {
          const gucA = Math.max(1, gucPuani(a));
          const gucB = Math.max(1, gucPuani(b));
          const oran = gucA / gucB;
          const dengeliGuc = oran >= 0.75 && oran <= 1.35;

          let rekabetBasinci = 0;
          if (yeniDeger < 15) rekabetBasinci += Math.min(0.45, temas * 0.06);
          if (yeniDeger < -10) rekabetBasinci += Math.min(0.35, temas * 0.04);
          if (dengeliGuc) rekabetBasinci += 0.14;

          if (ticaretAktifMi(a, b)) rekabetBasinci *= 0.65;
          if (barisAktifMi(a, b) || ateskesAktifMi(a, b)) rekabetBasinci *= 0.7;

          if (rekabetBasinci > 0 && Math.random() < 0.55) {
            yeniDeger = round1(Math.max(-100, yeniDeger - rekabetBasinci));
            rekabetDegisim += 1;
          }
        }
      }
    }

    d.iliskiler[key] = yeniDeger;
  });
  if (savasDegisim > 0) {
    messages.push(`Aktif savaşlar ilişkileri sertleştirdi (${savasDegisim} ilişki çifti).`);
  } else if (rekabetDegisim > 0) {
    messages.push(`Sınır rekabeti kutuplaşmayı artırdı (${rekabetDegisim} ilişki çifti).`);
  } else if (gerilimKorundu > 0 || dostlukKorundu > 0) {
    messages.push("İlişkiler bloklaşma etkisiyle daha yavaş çözüldü.");
  } else {
    messages.push("İlişkiler sınırlı hafıza solması yaşadı.");
  }
}

function savasDinamikTick(messages) {
  const d = diplomasiDurumu();
  const savasDurumu = savasDurumuTablosu();
  let aktifSavas = 0;
  Object.keys(savasDurumu).forEach((key) => {
    if (!savasDurumu[key]) return;
    const taraflar = String(key).split("-");
    if (taraflar.length !== 2) return;
    const [a, b] = taraflar;
    if (!ownerOyundaMi(a) || !ownerOyundaMi(b)) return;
    const kayit = savasKaydiGetir(a, b, true, { ilanEden: a });
    if (!kayit) return;
    aktifSavas += 1;

    const turYorg = Math.max(0.2, Number(DIPLOMASI.SAVAS_YORGUNLUK_TUR || 0.9));
    const paraA = ownerPara(a);
    const paraB = ownerPara(b);
    const gucA = Math.max(1, gucPuani(a));
    const gucB = Math.max(1, gucPuani(b));

    let yorgA = turYorg;
    let yorgB = turYorg;
    if (paraA < 180) yorgA += 0.45;
    if (paraB < 180) yorgB += 0.45;
    if (gucA < gucB * 0.9) yorgA += 0.35;
    if (gucB < gucA * 0.9) yorgB += 0.35;
    savasYorgunlukUygula(a, b, yorgA);
    savasYorgunlukUygula(b, a, yorgB);

    const aStart = Number(kayit.baslangicBolge?.[a] || ownerBolgeSayisiDiplo(a));
    const bStart = Number(kayit.baslangicBolge?.[b] || ownerBolgeSayisiDiplo(b));
    const aNow = ownerBolgeSayisiDiplo(a);
    const bNow = ownerBolgeSayisiDiplo(b);
    const aLoss = Math.max(0, aStart - aNow);
    const bLoss = Math.max(0, bStart - bNow);
    const sahaDelta = round1((bLoss - aLoss) * 0.9);
    if (sahaDelta !== 0) savasSkorUygula(a, b, sahaDelta);

    const sessizTur = Math.max(0, oyun.tur - Number(kayit.sonCatismaTur || oyun.tur));
    if (sessizTur >= 10) {
      savasYorgunlukUygula(a, b, 0.8);
      savasYorgunlukUygula(b, a, 0.8);
    }
  });

  if (aktifSavas > 0 && oyun.tur % 8 === 0) {
    messages.push(`Savaş yorgunluğu ve cephe skoru güncellendi (${aktifSavas} aktif savaş).`);
  }

  if (!d._savasciItibarCeza || typeof d._savasciItibarCeza !== "object") d._savasciItibarCeza = {};
}

function tarafDurumTemizligi(messages) {
  const d = diplomasiDurumu();
  const aktifOwnerler = new Set(
    (oyun.bolgeler || [])
      .map((b) => b?.owner)
      .filter((owner) => owner && owner !== "tarafsiz")
  );

  const savasDurumu = savasDurumuTablosu();
  const savasKayit = savasKayitTablosu();
  Object.keys(savasDurumu).forEach((key) => {
    const taraflar = String(key).split("-");
    if (taraflar.length !== 2) {
      delete savasDurumu[key];
      return;
    }
    const [a, b] = taraflar;
    if (aktifOwnerler.has(a) && aktifOwnerler.has(b)) return;
    delete savasDurumu[key];
    if (savasKayit[key]) delete savasKayit[key];
    diploKayitEkle(
      "savas-sonlandi-dagilma",
      `${ownerAd(a)} ↔ ${ownerAd(b)} savaş durumu taraflardan biri dağıldığı için sona erdi.`,
      "bilgi",
      { taraflar: [a, b] }
    );
    if (a === "biz" || b === "biz") {
      messages.push({
        metin: `🕊️ ${ownerAd(a)} ↔ ${ownerAd(b)} savaş durumu taraflardan biri dağıldığı için kapandı.`,
        popup: true,
        log: true,
        baslik: "Savaş Durumu",
      });
    }
  });
  Object.keys(savasKayit).forEach((key) => {
    if (!savasDurumu[key]) delete savasKayit[key];
  });

  const kalanAnlasmalar = [];
  (Array.isArray(d.anlasmalar) ? d.anlasmalar : []).forEach((a) => {
    if (!a) return;
    const tarafAktif = aktifOwnerler.has(a.taraf1) && aktifOwnerler.has(a.taraf2);
    if (tarafAktif) {
      kalanAnlasmalar.push(a);
      return;
    }
    diploKayitEkle(
      "anlasma-sonlandi-dagilma",
      `${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} (${a.tip}) anlaşması taraflardan biri dağıldığı için kapandı.`,
      "bilgi",
      { taraflar: [a.taraf1, a.taraf2] }
    );
    if (a.taraf1 === "biz" || a.taraf2 === "biz") {
      messages.push({
        metin: `ℹ️ ${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} (${a.tip}) anlaşması taraflardan biri dağıldığı için sonlandı.`,
        popup: true,
        log: true,
        baslik: "Diplomasi Durumu",
      });
    }
  });
  d.anlasmalar = kalanAnlasmalar;
}

function anlasmaBakimVeTemizlik(messages) {
  const d = diplomasiDurumu();
  if (!d.kritikBildirim || typeof d.kritikBildirim !== "object") {
    d.kritikBildirim = { savasDurumu: {}, anlasmaKalan: {}, anlasmaSonBittiUyari: {} };
  }
  const sonBittiUyari = d.kritikBildirim.anlasmaSonBittiUyari;
  if (!sonBittiUyari || typeof sonBittiUyari !== "object") {
    d.kritikBildirim.anlasmaSonBittiUyari = {};
  }
  const bittiUyariKayit = d.kritikBildirim.anlasmaSonBittiUyari;

  const kalan = [];
  d.anlasmalar.forEach((a) => {
    if (!a) return;
    const tip = String(a.tip || "");
    const barisSuresiz = anlasmaSuresizBarisMi(a);
    if (!barisSuresiz) {
      const b = Number(a.bitis);
      if (!Number.isFinite(b)) {
        diploKayitEkle(
          "anlasma-bozuk-bitis",
          `${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)} (${tip}) anlaşması geçersiz bitiş tarihi nedeniyle kaldırıldı.`,
          "bilgi",
          { taraflar: [a.taraf1, a.taraf2] }
        );
        return;
      }
      if (b < oyun.tur) {
        const uyariAnahtar = `${a.id || `${iliskiAnahtar(a.taraf1, a.taraf2)}-${tip}`}|${b}`;
        const oyuncuyuIlgilendirir = a.taraf1 === "biz" || a.taraf2 === "biz";
        if (!bittiUyariKayit[uyariAnahtar]) {
          bittiUyariKayit[uyariAnahtar] = oyun.tur;
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
        }
        return;
      }
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
      const model1 = ticaretTurModeli(a.taraf1, a.taraf2, minSermaye);
      const model2 = ticaretTurModeli(a.taraf2, a.taraf1, minSermaye);
      const riskOrani = ticaretRiskOrani(a.taraf1, a.taraf2, minSermaye);
      if (para1 < model1.maliyet || para2 < model2.maliyet) {
        iliskiDegistir(a.taraf1, a.taraf2, -4, "Ticaret işletme maliyeti ödenemedi");
        const mesaj =
          `Ticaret kapandı: işletme gideri karşılanamadı. ` +
          `${ownerAd(a.taraf1)} gider ${model1.maliyet}₺, ${ownerAd(a.taraf2)} gider ${model2.maliyet}₺.`;
        diploKayitEkle(
          "ticaret-isletme-yetersiz",
          mesaj,
          "kotu",
          { taraflar: [a.taraf1, a.taraf2], gider1: model1.maliyet, gider2: model2.maliyet }
        );
        if (a.taraf1 === "biz" || a.taraf2 === "biz") {
          messages.push({
            metin: `📉 ${mesaj}\nTicaret raporu: +0₺ / -0₺ (Net 0₺)`,
            popup: false,
            log: true,
            baslik: "Ticaret Raporu",
          });
        }
        return;
      }
      if (Math.random() < riskOrani) {
        const zayifTaraf = para1 <= para2 ? a.taraf1 : a.taraf2;
        const digerTaraf = zayifTaraf === a.taraf1 ? a.taraf2 : a.taraf1;
        const batan = Math.random() < 0.7 ? zayifTaraf : digerTaraf;
        const kayip = ticaretBatmaKaybiHesapla(batan, model1.brut + model2.brut);
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
      if (oyun.fraksiyon?.[a.taraf1]) oyun.fraksiyon[a.taraf1].para += model1.net;
      if (oyun.fraksiyon?.[a.taraf2]) oyun.fraksiyon[a.taraf2].para += model2.net;
      if (a.taraf1 === "biz" || a.taraf2 === "biz") {
        const bizModel = a.taraf1 === "biz" ? model1 : model2;
        const net = bizModel.net;
        messages.push({
          metin:
            `📊 Ticaret raporu (${ownerAd(a.taraf1)} ↔ ${ownerAd(a.taraf2)}): ` +
            `+${bizModel.brut}₺ / -${bizModel.maliyet}₺ (Net ${net >= 0 ? "+" : ""}${net}₺)`,
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
    d.kritikBildirim = { savasDurumu: {}, anlasmaKalan: {}, anlasmaSonBittiUyari: {} };
  }
  const takip = d.kritikBildirim;
  const savasTablosu = (d.savasDurumu && typeof d.savasDurumu === "object")
    ? d.savasDurumu
    : {};
  if (!takip.savasDurumu || typeof takip.savasDurumu !== "object") takip.savasDurumu = {};
  if (!takip.anlasmaKalan || typeof takip.anlasmaKalan !== "object") takip.anlasmaKalan = {};

  DIPLO_OWNERLER
    .filter((owner) => owner !== "biz")
    .forEach((owner) => {
      const savasta = !!savasTablosu[iliskiAnahtar("biz", owner)];
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
    .filter((a) => Number.isFinite(a.bitis))
    .filter((a) => a.tip === "baris" || a.tip === "ateskes");

  const aktifAnlasmaIdleri = new Set();
  aktifBarisAnlasmalari.forEach((a) => {
    const bitisN = Number(a?.bitis);
    if (!Number.isFinite(bitisN)) return;
    const anahtar = a.id || `${iliskiAnahtar(a.taraf1, a.taraf2)}-${a.tip}`;
    aktifAnlasmaIdleri.add(anahtar);
    const kalanTur = Math.max(0, Math.round(bitisN - oyun.tur));
    const oncekiKalan = Number.isFinite(takip.anlasmaKalan[anahtar]) ? takip.anlasmaKalan[anahtar] : null;
    if ((kalanTur === 3 || kalanTur === 2 || kalanTur === 1) && oncekiKalan !== kalanTur) {
      const digerOwner = a.taraf1 === "biz" ? a.taraf2 : a.taraf1;
      const tipAd = a.tip === "baris" ? "Barış" : "Ateşkes";
      messages.push({
        metin: `⏳ Kritik: ${ownerAd(digerOwner)} ile ${tipAd.toLocaleLowerCase("tr-TR")} anlaşmasının bitmesine ${kalanTur} tur kaldı.`,
        popup: true,
        log: true,
        baslik: `${tipAd} Uyarısı`,
      });
    }
    takip.anlasmaKalan[anahtar] = kalanTur;
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
    const uyelerCekirdek = aktifOwnerler.filter((id) => id !== lider.owner && id !== "biz");
    if (uyelerCekirdek.length >= 2) {
      const oncekiKoalisyon = d.koalisyon && typeof d.koalisyon === "object" ? d.koalisyon : null;
      const yeniKoalisyonMizac = !oncekiKoalisyon;
      const hedefDegisti = oncekiKoalisyon && oncekiKoalisyon.hedef !== lider.owner;
      const degisti = yeniKoalisyonMizac || hedefDegisti;
      if (degisti && Array.isArray(d.bekleyenTeklifler)) {
        d.bekleyenTeklifler = d.bekleyenTeklifler.filter((t) => {
          if (!(t?.durum === "beklemede" && t?.tip === "koalisyon" && t?.hedef === "biz")) return true;
          diploKayitEkle(
            "koalisyon-teklif-iptal",
            "Koalisyon hedefi değişti; önceki davet geçersiz sayıldı.",
            "bilgi",
            { taraflar: [t.gonderen, "biz"], teklifId: t.id }
          );
          return false;
        });
      }
      // Kabul sonrası üyelik: koalisyon nesnesi bir tur null olsa da (güç eşiği / üye sayısı dalgalanması) davet tekrarlamasın.
      const oyuncuKoalisyonda =
        bizAktif &&
        lider.owner !== "biz" &&
        (d.dengeKoalisyonuOyuncuUyesi === true ||
          (oncekiKoalisyon &&
            (oncekiKoalisyon.bizKatilim === true ||
              (Array.isArray(oncekiKoalisyon.uyeler) && oncekiKoalisyon.uyeler.includes("biz")))));
      let uyeler = uyelerCekirdek.slice();
      if (oyuncuKoalisyonda) uyeler.push("biz");
      const baslangic =
        oncekiKoalisyon && Number.isFinite(oncekiKoalisyon.baslangic)
          ? oncekiKoalisyon.baslangic
          : oyun.tur;
      d.koalisyon = {
        hedef: lider.owner,
        uyeler,
        baslangic,
        davetTur: degisti ? null : (oncekiKoalisyon?.davetTur ?? null),
        bizKatilim: !!oyuncuKoalisyonda,
      };
      if (oyuncuKoalisyonda) d.dengeKoalisyonuOyuncuUyesi = true;
      if (yeniKoalisyonMizac) {
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
      } else if (hedefDegisti) {
        messages.push(`Denge Koalisyonu hedefi güncellendi: ${ownerAd(lider.owner)}.`);
        diploKayitEkle(
          "koalisyon-hedef-degisti",
          `Güç sıralaması değişti; denge koalisyonunun hedefi ${ownerAd(lider.owner)} olarak güncellendi.`,
          "bilgi",
          { taraflar: [lider.owner, ...uyeler] }
        );
      }

      if (
        bizAktif &&
        lider.owner !== "biz" &&
        !uyeler.includes("biz") &&
        d.koalisyon.bizKatilim !== true
      ) {
        const davetAralik = Math.max(4, Number(DIPLOMASI.KOALISYON_DAVET_TUR_ARALIK || 22));
        const rawDavetTur = d.koalisyon?.davetTur;
        const sonDavetTur = Number(rawDavetTur);
        // null/undefined davetTur asla 0 sayılmasın (Number(null)===0 tüm soğumayı bozup her tur yeni davet üretiyordu).
        const davetCooldownAktif =
          rawDavetTur != null &&
          Number.isFinite(sonDavetTur) &&
          oyun.tur - sonDavetTur < davetAralik;
        const koalisyonTipKalan = oyuncuTeklifTipCooldownKalan("koalisyon");
        const bekleyenAyniKoalisyon = bekleyenKoalisyonDavetiBul(lider.owner);
        if (
          !davetCooldownAktif &&
          koalisyonTipKalan <= 0 &&
          !oyuncuyaKoalisyonDisiBekleyenTeklifVarMi(lider.owner)
        ) {
          const koalisyonPopupEkle = (teklif, davetci) => {
            if (!teklif?.meta || typeof teklif.meta !== "object") teklif.meta = {};
            if (teklif.meta.davetPopupGosterildi === true) return;
            teklif.meta.davetPopupGosterildi = true;
            messages.push({
              metin: `${ownerAd(davetci)} seni ${ownerAd(lider.owner)} hedefli denge koalisyonuna çağırıyor.\n\n${teklifGetiriGoturuMetni("koalisyon", davetci, "biz")}\n\nKabul etmek için "Onayla" seç.`,
              popup: true,
              log: false,
              ses: true,
              tip: "koalisyon",
              teklifId: teklif.id,
              baslik: "Koalisyon Daveti",
            });
          };

          if (bekleyenAyniKoalisyon) {
            const davetci = bekleyenAyniKoalisyon.gonderen || uyelerCekirdek[0];
            koalisyonPopupEkle(bekleyenAyniKoalisyon, davetci);
          } else {
            const davetci =
              uyelerCekirdek
                .slice()
                .sort((a, b) => gucPuani(b) - gucPuani(a) || String(a).localeCompare(String(b)))[0] ||
              uyelerCekirdek[0];
            const teklif = oyuncuyaTeklifOlustur(davetci, "koalisyon", { hedef: lider.owner });
            if (teklif) {
              d.koalisyon.davetTur = oyun.tur;
              diploKayitEkle(
                "koalisyon-davet",
                `${ownerAd(davetci)} seni ${ownerAd(lider.owner)} hedefli koalisyona davet etti.`,
                "bilgi",
                { taraflar: [davetci, "biz", lider.owner], teklifId: teklif.id }
              );
              koalisyonPopupEkle(teklif, davetci);
            }
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
  // dengeKoalisyonuOyuncuUyesi korunur; koalisyon yeniden kurulunca tekrar davet çıkmasın.
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
    .filter((t) => t.durum !== "sonuclandi")
    .filter((t) => {
      if (!Number.isFinite(t.bitis) || t.bitis >= oyun.tur) return true;
      if (t.hedef === "biz") {
        if (t.tip === "baris" || t.tip === "ittifak" || t.tip === "ticaret" || t.tip === "koalisyon") {
          if (t.tip === "koalisyon") {
            const kAralik = Number(DIPLOMASI.KOALISYON_DAVET_TUR_ARALIK || 22);
            oyuncuTeklifTipCooldownKoy("koalisyon", kAralik);
          } else {
            redCooldownKoy(t.gonderen, "biz", t.tip);
            oyuncuTeklifTipCooldownKoy(t.tip, RED_COOLDOWN_TUR);
          }
        }
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

/**
 * Koalisyon teklifi gösterildikten sonra tur akarken d.koalisyon geçici null kaldıysa veya modal gecikirse,
 * teklif.meta.hedef ile güncel güç tablosuna göre nesneyi yeniden kurar (koalisyonKontrol ile aynı üyelik kuralları).
 */
function koalisyonDurumunuMetaHedefeGoreKur(d, metaHedefStr) {
  if (!d || typeof d !== "object" || !metaHedefStr) return false;
  const siralama = gucSiralamasiHesapla();
  if (!siralama.length) return false;
  const lider = siralama[0];
  if (String(lider.owner) !== String(metaHedefStr)) return false;
  if (lider.pay < DIPLOMASI.GUC_ESIGI_KOALISYON) return false;
  const aktifOwnerler = DIPLO_OWNERLER.filter((id) => (oyun.bolgeler || []).some((b) => b.owner === id));
  const bizAktif = aktifOwnerler.includes("biz");
  const uyelerCekirdek = aktifOwnerler.filter((id) => id !== lider.owner && id !== "biz");
  if (uyelerCekirdek.length < 2) return false;

  const oncekiKoalisyon = d.koalisyon && typeof d.koalisyon === "object" ? d.koalisyon : null;
  const oyuncuKoalisyonda =
    bizAktif &&
    lider.owner !== "biz" &&
    (d.dengeKoalisyonuOyuncuUyesi === true ||
      (oncekiKoalisyon &&
        (oncekiKoalisyon.bizKatilim === true ||
          (Array.isArray(oncekiKoalisyon.uyeler) && oncekiKoalisyon.uyeler.includes("biz")))));
  let uyeler = uyelerCekirdek.slice();
  if (oyuncuKoalisyonda) uyeler.push("biz");
  const baslangic =
    oncekiKoalisyon && Number.isFinite(oncekiKoalisyon.baslangic)
      ? oncekiKoalisyon.baslangic
      : oyun.tur;
  d.koalisyon = {
    hedef: lider.owner,
    uyeler,
    baslangic,
    davetTur: oncekiKoalisyon?.davetTur ?? null,
    bizKatilim: !!oyuncuKoalisyonda,
  };
  if (oyuncuKoalisyonda) d.dengeKoalisyonuOyuncuUyesi = true;
  return true;
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
  const idNorm = String(teklifId ?? "");
  const d = diplomasiDurumu();
  if (!Array.isArray(d.bekleyenTeklifler)) d.bekleyenTeklifler = [];
  const idx = d.bekleyenTeklifler.findIndex(
    (t) => String(t?.id) === idNorm && t?.durum !== "sonuclandi"
  );
  // Çift Enter/tıklama: ilk çağrı finally ile siler; ikincisinde gürültü yok.
  if (idx < 0) return { ok: true, mesaj: "" };

  let sonuc = { ok: false, mesaj: "Teklif işlenemedi." };
  try {
  const teklif = d.bekleyenTeklifler[idx];
  if (Number.isFinite(teklif.bitis) && teklif.bitis < oyun.tur) {
    sonuc = { ok: false, mesaj: "Teklifin süresi doldu." };
    return sonuc;
  }

  const gonderen = teklif.gonderen;
  const hedef = teklif.hedef;
  let koalisyonYanitiUyumsuz = false;
  if (teklif.tip === "baris") sonuc = barisTeklifiSonuclandir(gonderen, hedef, !!kabul);
  else if (teklif.tip === "ittifak") sonuc = ittifakTeklifiSonuclandir(gonderen, hedef, !!kabul);
  else if (teklif.tip === "ticaret") sonuc = ticaretTeklifiSonuclandir(gonderen, hedef, !!kabul);
  else if (teklif.tip === "koalisyon") {
    const metaHedef = teklif?.meta?.hedef != null ? String(teklif.meta.hedef) : null;
    if (!d.koalisyon && metaHedef) {
      koalisyonDurumunuMetaHedefeGoreKur(d, metaHedef);
    }
    const hedefUyumsuz =
      !d.koalisyon ||
      (metaHedef != null && String(d.koalisyon.hedef) !== metaHedef);
    if (hedefUyumsuz) {
      koalisyonYanitiUyumsuz = true;
      sonuc = { ok: false, mesaj: "Koalisyon artık aktif değil." };
    } else if (!kabul) {
      d.dengeKoalisyonuOyuncuUyesi = false;
      const uyeler = Array.isArray(d.koalisyon.uyeler) ? d.koalisyon.uyeler : [];
      uyeler.forEach((u) => iliskiDegistir("biz", u, -5, "Koalisyon daveti reddedildi"));
      sonuc = { ok: false, mesaj: "Koalisyon daveti reddedildi." };
    } else {
      if (!Array.isArray(d.koalisyon.uyeler)) d.koalisyon.uyeler = [];
      if (!d.koalisyon.uyeler.includes("biz")) d.koalisyon.uyeler.push("biz");
      d.koalisyon.bizKatilim = true;
      d.dengeKoalisyonuOyuncuUyesi = true;
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
      if (d.koalisyon && typeof d.koalisyon === "object") d.koalisyon.davetTur = null;
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
  } else if (teklif.tip === "tehdit") {
    const onKosul = tehditOnKosulKontrol(gonderen, hedef);
    if (!onKosul.ok) sonuc = { ok: false, mesaj: onKosul.mesaj };
    else sonuc = tehditSonuclandir(gonderen, hedef, !!kabul);
  } else sonuc = { ok: false, mesaj: "Desteklenmeyen teklif tipi." };

  // iliskiDegistir → diploKayitEkle diplomasiDurumu() ile oyun.diplomasi'yi yeniler; baştaki `d` eski kalabilir.
  if (teklif.tip === "koalisyon" && koalisyonYanitiUyumsuz) {
    const kAralik = Number(DIPLOMASI.KOALISYON_DAVET_TUR_ARALIK || 22);
    oyuncuTeklifTipCooldownKoy("koalisyon", kAralik);
  }
  if (hedef === "biz" && !kabul) {
    if (teklif.tip === "baris" || teklif.tip === "ittifak" || teklif.tip === "ticaret") {
      oyuncuTeklifTipCooldownKoy(teklif.tip, RED_COOLDOWN_TUR);
    } else if (teklif.tip === "koalisyon") {
      const kAralik = Number(DIPLOMASI.KOALISYON_DAVET_TUR_ARALIK || 22);
      oyuncuTeklifTipCooldownKoy("koalisyon", kAralik);
      const dRt = diplomasiDurumu();
      if (dRt.koalisyon && typeof dRt.koalisyon === "object") dRt.koalisyon.davetTur = oyun.tur;
    }
  }
  return sonuc;
  } finally {
    // Bu teklif için yanıt verildiyse (idx geçerliydi), güncel diplomasi üzerinden id ile tek kaydı sil.
    // durum === "beklemede" şartı ara adımlarda tamamla yüzünden bozulabildiği için sadece id eşleşmesi kullanılır.
    if (idNorm) {
      const dF = diplomasiDurumu();
      if (Array.isArray(dF.bekleyenTeklifler)) {
        const j = dF.bekleyenTeklifler.findIndex((t) => String(t?.id) === idNorm);
        if (j >= 0) dF.bekleyenTeklifler.splice(j, 1);
      }
    }
  }
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
  if (!ownerOyundaMi(owner) || !ownerOyundaMi(hedef)) return null;
  if (hedef === "biz" && (tip === "baris" || tip === "ittifak" || tip === "ticaret" || tip === "tehdit")) {
    if (tip === "baris" || tip === "ittifak" || tip === "ticaret") {
      const tipKalan = oyuncuTeklifTipCooldownKalan(tip);
      if (tipKalan > 0) return null;
      const kalan = redCooldownKontrol(owner, hedef, tip);
      if (kalan > 0) return null;
    }
    if (tip === "tehdit") {
      const onKosul = tehditOnKosulKontrol(owner, hedef);
      if (!onKosul.ok) return null;
    }
    const teklif = oyuncuyaTeklifOlustur(owner, tip);
    if (!teklif) return null;
    if (tip === "baris") oyuncuTeklifTipCooldownKoy("baris", AI_BARIS_OYUNCU_GENEL_ARALIK);
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
    if (!ownerOyundaMi(owner)) return;
    if (oyun.tur % AI_DIPLO_TUR_ARALIK !== 0) return;
    const cooldownBitis = Number(d.aiTeklifCooldown[owner] || 0);
    if (cooldownBitis > oyun.tur) return;

    const digerleri = DIPLO_OWNERLER.filter((id) => id !== owner && ownerOyundaMi(id));
    if (!digerleri.length) return;
    const guc = gucPuani(owner);
    const enTehlikeli = [...digerleri].sort((a, b) => gucPuani(b) - gucPuani(a))[0];
    const zayifHedef = [...digerleri].sort((a, b) => gucPuani(a) - gucPuani(b))[0];
    const para = oyun.fraksiyon[owner].para || 0;
    const aktifAnlasmaSayisi = ownerAktifAnlasmaSayisi(owner, ["ittifak", "ticaret"]);
    const yeniAnlasmaAcabilir = aktifAnlasmaSayisi < AI_DIPLO_AKTIF_ANLASMA_LIMIT;

    let sonuc = null;

    for (const hedef of digerleri) {
      const iliski = iliskiDegeri(owner, hedef);
      const hedefGuc = Math.max(1, gucPuani(hedef));
      const savasAktif = savastaMi(owner, hedef);
      if (savasAktif) {
        if (barisAktifMi(owner, hedef) || ateskesAktifMi(owner, hedef)) continue;
        const model = barisKabulModeli(owner, hedef);
        const gucOrani = guc / hedefGuc;
        let barisSans = clamp(0.12 + model.sans * 0.45, 0.08, 0.42);
        if (gucOrani < 0.75) barisSans = Math.min(0.5, barisSans + 0.12);
        if (hedef === "biz") barisSans = Math.min(0.48, barisSans + 0.06);
        if (Math.random() < barisSans * 0.72) {
          sonuc = aiTeklifDenemesi(owner, hedef, "baris");
          if (sonuc) break;
        }
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
  tarafDurumTemizligi(messages);
  bekleyenTeklifleriTemizle();
  zorunluTeklifPopupKontrol(messages);
  iliskiHafizaSolmasi(messages);
  savasDinamikTick(messages);
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
  const bekleyenBarisArasi = (a, b) =>
    (Array.isArray(d.bekleyenTeklifler) ? d.bekleyenTeklifler : []).some(
      (t) =>
        t?.tip === "baris" &&
        t?.durum !== "sonuclandi" &&
        ((t.gonderen === a && t.hedef === b) || (t.gonderen === b && t.hedef === a))
    );
  const durumRozeti = (hedefOwner) => {
    if (barisAktifMi(owner, hedefOwner)) return { tip: "baris", ad: "Barış" };
    if (ateskesAktifMi(owner, hedefOwner)) return { tip: "ateskes", ad: "Ateşkes" };
    if (ittifakAktifMi(owner, hedefOwner)) return { tip: "ittifak", ad: "İttifak" };
    if (savastaMi(owner, hedefOwner)) {
      if (bekleyenBarisArasi(owner, hedefOwner)) {
        return { tip: "savas-baris-bekliyor", ad: "Savaş — barış yanıtı bekleniyor" };
      }
      return { tip: "savas", ad: "Savaş" };
    }
    return { tip: "normal", ad: "Normal" };
  };
  const hedefler = DIPLO_OWNERLER
    .filter((id) => id !== owner)
    .filter((id) => ownerOyundaMi(id))
    .map((id) => {
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
        kalan: Number.isFinite(a.bitis) ? Math.max(0, a.bitis - oyun.tur) : null,
      }));
      const tehditKey = iliskiAnahtar(owner, id);
      const tehditKalan = Math.max(0, (d.tehditCooldown?.[tehditKey] || 0) - oyun.tur);
      const savasDetay = savasSkorOzeti(owner, id);
      return {
        owner: id,
        ...il,
        anlasmalar,
        tehditKalan,
        tarihce,
        savasDetay,
        durumRozet: durumRozeti(id),
      };
    });
  const aktifAnlasmaListesi = aktifAnlasmalar()
    .filter((a) => a.taraf1 === owner || a.taraf2 === owner)
    .map((a) => {
      const diger = a.taraf1 === owner ? a.taraf2 : a.taraf1;
      const kalan = Number.isFinite(a.bitis) ? Math.max(0, a.bitis - oyun.tur) : null;
      const sureMetni = Number.isFinite(kalan) ? `${kalan} tur kaldı` : "Süresiz";
      const uyari =
        (a.tip === "ateskes" || a.tip === "baris") && Number.isFinite(kalan)
          ? (kalan <= 1 ? "kritik" : (kalan <= 2 ? "uyari" : "normal"))
          : "normal";
      return {
        id: a.id,
        tip: a.tip,
        owner: diger,
        kalan,
        sureMetni,
        bakim: a.tip === "ittifak" ? DIPLOMASI.ITTIFAK_TUR_MALIYETI : 0,
        ticaretGeliri:
          a.tip === "ticaret"
            ? ticaretTurModeli(owner, diger).net
            : 0,
        uyari,
      };
    })
    .sort((a, b) => a.kalan - b.kalan);
  const bekleyenTeklifler = (Array.isArray(d.bekleyenTeklifler) ? d.bekleyenTeklifler : [])
    .filter((t) => t?.durum !== "sonuclandi" && t?.hedef === owner)
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
