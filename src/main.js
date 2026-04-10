import { AYAR, ZORLUK, BOLGE_OZELLIKLERI, BINA_TIPLERI, EKONOMI_DENGE } from "./config.js";
import { yeniOyun } from "./state.js";
import {
  haritaCiz,
  uiGuncel,
  durumCiz,
  ustPanelOyunButonlariniBagla,
  isimModalGoster,
  isimModalBagla,
  isimModalKapat,
  logYaz,
  bitisBanner,
  profilSolMenuAcilisTalebiAyarla,
} from "./ui.js";
import { callbacklar, asayisTick } from "./actions.js";
import {
  aiGelisimVeUretim,
  aiSaldiriHareket,
  aiArastirmaTick,
  aiCasuslukYap,
  aiKoordineliSaldiriDegerlendirYap,
  aiIttifakMudahalesiBaslat,
} from "./ai.js";
import { sohretCarpani } from "./state.js";
import { oyun, bolgeById } from "./state.js";
import { savasKazanmaIhtimali } from "./combat.js";
import { hareketEmriHedefSec } from "./actions.js";
import { yiginaEkle } from "./state.js";
import { olayTick, krizCarpani } from "./events.js";
import { gorevKontrol } from "./missions.js";
import { savasAnimasyonu, elDegistirmeFlash, konvoyBaslaAnimasyonu } from "./animations.js";
import { istatistikKaydet, istatistikGrafik } from "./stats.js";
import { rastgeleIsim } from "./utils.js";
import { showToast, showConfirm, showAlert } from "./modal.js";
import { sesCal, sesDurumDegistir, sesAcikMi, muzikDurumDegistir, muzikAcikMi } from "./audio.js";
import { oyunKaydet, oyunYukle, tumKayitlar, kayitSil, otomatikKaydet } from "./save.js";
import { bolgeMapTemizle } from "./state.js";
import { istatistikSifirla } from "./stats.js";
import { egitimTick, motorluHizTick, BIRIM_TIPLERI, grupEfektifSavunma, ownerBakimToplami } from "./units.js";
import { sadakatTick, fetihSonrasiSadakat } from "./loyalty.js";
import { arastirmaTick, arastirmaEfekt, arastirmaDurumunuDogrula } from "./research.js";
import { liderDevreDisiMi } from "./spy.js";
import { ownerTasitIade, bolgeFetihTasitGanmetiEkle } from "./logistics.js";
import { tutorialArayuzKur, tutorialBaslat } from "../scripts/tutorial/tutorial.js";
import {
  diplomasiTick,
  diplomasiSaldiriMumkunMu,
  diplomasiFetihSonucu,
  diplomasiSavasCatismasiSonucu,
  ittifakSaldiriCarpani,
  savasIliskiModifiyeri,
  isDostCete,
  isDostIttifak,
  diplomasiTeklifYanitla,
  ittifakMudahaleKuyrugundanHazirOlanlariAl,
} from "./diplomasi.js";

let baslangicSecimModu = false;
let bekleyenBaslangicKurulumu = null;
let modalPopupKuyrugu = Promise.resolve();

document.addEventListener("ui:guncel", () => {
  ensureGameControls();
});

document.addEventListener("ui:modal-pause", () => {
  try {
    durumCiz();
    ustPanelOyunButonlariniBagla(callbacklar);
  } catch (e) {
    console.error("[ui:modal-pause]", e);
  }
});

function konvoyTasitIade(konvoy) {
  const araba = konvoy?.tasitAraba || 0;
  const motor = konvoy?.tasitMotor || 0;
  if (!konvoy || (araba <= 0 && motor <= 0)) return;
  ownerTasitIade(konvoy.owner, araba, motor);
}

function operasyonKonvoylari(op) {
  if (!op || !Array.isArray(op.katilimcilar)) return [];
  const idler = new Set(
    op.katilimcilar.flatMap((kat) => (Array.isArray(kat.konvoyIdler) ? kat.konvoyIdler : []))
  );
  return oyun.birimler.filter((k) => idler.has(k.id));
}

function diploPopupKuyrugaEkle(olay) {
  if (!olay) return;
  const metin = typeof olay === "string" ? olay : String(olay.metin || "").trim();
  if (!metin) return;
  const baslik = typeof olay === "object" ? (olay.baslik || "Diplomasi") : "Diplomasi";
  popupKuyrugaEkle(async () => {
    if (typeof olay === "object" && olay.teklifId) {
      try {
        const kabul = await showConfirm(metin, baslik, { oyunuDuraklat: true });
        const sonuc = diplomasiTeklifYanitla(String(olay.teklifId), !!kabul);
        if (
          sonuc?.mesaj &&
          /(ittifak|koalisyon|m[üu]dahale|savaş|barış|ateskes|ticaret|teklif)/i.test(sonuc.mesaj)
        ) {
          logYaz(`🤝 ${sonuc.mesaj}`);
        }
      } catch (err) {
        console.error("[diploPopup] teklif yaniti", olay?.teklifId, err);
        logYaz(`⚠️ Diplomasi yanıtı işlenemedi (konsola bakın).`);
      }
      uiGuncel(callbacklar);
      return;
    }
    await showAlert(metin, baslik, { oyunuDuraklat: true });
  });
}

function popupKuyrugaEkle(gorev) {
  if (typeof gorev !== "function") return;
  modalPopupKuyrugu = modalPopupKuyrugu
    .then(() => gorev())
    .catch(() => undefined);
}

function ownerListesi(owner) {
  if (Array.isArray(owner)) return owner.filter(Boolean);
  return owner ? [owner] : [];
}

function ownerEtiketi(owner) {
  const ownerler = ownerListesi(owner);
  if (!ownerler.length) return "-";
  return ownerler.map((id) => oyun.fraksiyon[id]?.ad || id).join(" + ");
}

const AI_OWNERLER = Object.freeze(["ai1", "ai2", "ai3"]);

function ownerBolgeSayisi(owner) {
  return (oyun.bolgeler || []).filter((b) => b.owner === owner).length;
}

function ownerAktifMi(owner) {
  if (!owner || owner === "tarafsiz") return false;
  const fr = oyun.fraksiyon?.[owner];
  if (!fr || fr._elendi) return false;
  return ownerBolgeSayisi(owner) > 0;
}

function iliskiAnahtarOwnerIcerirMi(key, owner) {
  if (!key || !owner) return false;
  const taraflar = String(key).split("-");
  return taraflar.includes(owner);
}

function ownerElimineEt(owner) {
  if (!owner || owner === "biz" || owner === "tarafsiz") return false;
  const fr = oyun.fraksiyon?.[owner];
  if (!fr || fr._elendi) return false;

  fr._elendi = true;
  fr.para = 0;
  fr.havuz = 0;
  fr.tasit = { araba: 0, motor: 0 };
  if (oyun.toplantiNoktasi && Object.prototype.hasOwnProperty.call(oyun.toplantiNoktasi, owner)) {
    oyun.toplantiNoktasi[owner] = [];
  }

  if (Array.isArray(oyun.operasyonlar)) {
    oyun.operasyonlar.forEach((op) => {
      const ownerVar = Array.isArray(op?.katilimcilar) &&
        op.katilimcilar.some((kat) => kat?.owner === owner);
      if (!ownerVar) return;
      if (op.durum === "hazirlik" || op.durum === "saldirim") {
        operasyonSerbestBirak(op, "iptal", `☠️ ${fr.ad} dağıldığı için koordineli operasyon iptal edildi.`);
      }
    });
  }

  oyun.birimler = (oyun.birimler || []).filter((u) => u?.owner !== owner);
  oyun.yaralilar = (oyun.yaralilar || []).filter((y) => y?.owner !== owner);
  oyun.esirler = (oyun.esirler || []).filter((e) => e?.owner !== owner && e?.tutulan !== owner);
  oyun.operasyonlar = (oyun.operasyonlar || []).filter((op) => {
    if (!Array.isArray(op?.katilimcilar)) return true;
    return !op.katilimcilar.some((kat) => kat?.owner === owner);
  });

  const d = oyun.diplomasi;
  if (d && typeof d === "object") {
    if (Array.isArray(d.anlasmalar)) {
      d.anlasmalar = d.anlasmalar.filter((a) => a?.taraf1 !== owner && a?.taraf2 !== owner);
    }
    if (Array.isArray(d.bekleyenTeklifler)) {
      d.bekleyenTeklifler = d.bekleyenTeklifler.filter((t) => t?.gonderen !== owner && t?.hedef !== owner);
    }
    if (Array.isArray(d.ittifakMudahaleKuyrugu)) {
      d.ittifakMudahaleKuyrugu = d.ittifakMudahaleKuyrugu.filter(
        (m) => m?.owner !== owner && m?.saldiran !== owner && m?.savunulan !== owner
      );
    }
    if (d.iliskiler && typeof d.iliskiler === "object") {
      Object.keys(d.iliskiler).forEach((key) => {
        if (iliskiAnahtarOwnerIcerirMi(key, owner)) delete d.iliskiler[key];
      });
    }
    if (d.savasDurumu && typeof d.savasDurumu === "object") {
      Object.keys(d.savasDurumu).forEach((key) => {
        if (iliskiAnahtarOwnerIcerirMi(key, owner)) delete d.savasDurumu[key];
      });
    }
    if (d.kritikBildirim?.savasDurumu && typeof d.kritikBildirim.savasDurumu === "object") {
      delete d.kritikBildirim.savasDurumu[owner];
    }
  }

  logYaz(`☠️ ${fr.ad} tamamen dağıldı ve oyundan elendi.`);
  return true;
}

function ownerEliminasyonTick() {
  AI_OWNERLER.forEach((owner) => {
    if (ownerAktifMi(owner)) return;
    ownerElimineEt(owner);
  });
}

function tamSayiPozitif(deger) {
  return Math.max(0, Math.round(Number(deger) || 0));
}

function savasSonucPopupuGoster(detay) {
  if (!detay || !detay.bolgeAd) return;
  const saldiranOwnerler = ownerListesi(detay.saldiranOwner);
  const savunanOwner = detay.savunanOwner || "";
  const bizSaldirida = saldiranOwnerler.includes("biz");
  const bizSavunmada = savunanOwner === "biz";
  if (!bizSaldirida && !bizSavunmada) return;

  const savunmaEkrani = bizSavunmada && !bizSaldirida;
  const saldiriBasarili = !!detay.saldiriBasarili;
  const kazanildi = savunmaEkrani ? !saldiriBasarili : saldiriBasarili;
  const baslik = savunmaEkrani ? "Savunma Sonucu" : "Saldırı Sonucu";
  const sonuc = kazanildi ? "KAZANILDI" : "KAYBEDILDI";
  const durum = savunmaEkrani
    ? (kazanildi ? "Dusman saldirisi puskurtuldu." : "Bolge dusman tarafindan ele gecirildi.")
    : (kazanildi ? "Saldiri basarili, bolge ele gecirildi." : "Saldiri basarisiz, birlikler geri cekildi.");

  const saldiranBaslangic = tamSayiPozitif(detay.saldiranBaslangic);
  const saldiranKayip = tamSayiPozitif(detay.saldiranKayip);
  const saldiranKalan = tamSayiPozitif(detay.saldiranKalan);
  const savunanBaslangic = tamSayiPozitif(detay.savunanBaslangic);
  const savunanKayip = tamSayiPozitif(detay.savunanKayip);
  const savunanKalan = tamSayiPozitif(detay.savunanKalan);

  const metin = [
    `Bolge: ${detay.bolgeAd}`,
    `Sonuc: ${sonuc}`,
    `Durum: ${durum}`,
    "",
    `Saldiran (${ownerEtiketi(saldiranOwnerler)}): ${saldiranBaslangic} -> ${saldiranKalan} (Kayip: ${saldiranKayip})`,
    `Savunan (${ownerEtiketi(savunanOwner)}): ${savunanBaslangic} -> ${savunanKalan} (Kayip: ${savunanKayip})`,
    `Yeni sahip: ${ownerEtiketi(detay.yeniOwner)}`,
  ].join("\n");

  popupKuyrugaEkle(() => showAlert(metin, baslik));
}

function operasyonSerbestBirak(op, durum = "zaman_asimi", mesaj = "") {
  operasyonKonvoylari(op).forEach((k) => {
    k.bekliyor = false;
    if (k.operasyonId === op.id) k.operasyonId = null;
    if (k.durum === "bekliyor-op") k.durum = "hareket";
  });
  op.durum = durum;
  if (mesaj) logYaz(mesaj);
}

function operasyonIttifakBozulduMu(op) {
  if (!op || !Array.isArray(op.katilimcilar)) return false;
  const ownerler = [...new Set(op.katilimcilar.map((kat) => kat?.owner).filter(Boolean))];
  for (let i = 0; i < ownerler.length; i += 1) {
    for (let j = i + 1; j < ownerler.length; j += 1) {
      if (!isDostCete(ownerler[i], ownerler[j])) return true;
    }
  }
  return false;
}

function zorlaGeriCek(k) {
  if (!k || k.konumId === undefined || k.konumId === null) return;
  const bulundugu = bolgeById(k.konumId);
  if (!bulundugu) {
    k._sil = true;
    return;
  }
  const geriHedef = (oyun.komsu[bulundugu.id] || []).find((id) => bolgeById(id)?.owner === k.owner);
  if (geriHedef != null) {
    k.hedefId = geriHedef;
    k.rota = [];
    k._hazir = false;
    k.bekliyor = false;
    k.operasyonId = null;
    k.durum = "hareket";
    return;
  }
  k._sil = true;
}

function ittifakBozulduKontrol() {
  oyun.birimler.forEach((k) => {
    if (!k || k._sil || k.konumId === undefined || k.konumId === null) return;
    if (k.hedefId) return;
    const bolge = bolgeById(k.konumId);
    if (!bolge || bolge.owner === "tarafsiz" || bolge.owner === k.owner) {
      delete k._ittifakUyari;
      return;
    }
    if (isDostIttifak(k.owner, bolge.owner)) {
      delete k._ittifakUyari;
      return;
    }
    k._ittifakUyari = (k._ittifakUyari || 0) + 1;
    if (k._ittifakUyari === 1) {
      logYaz(
        `⚠️ ${oyun.fraksiyon[k.owner]?.ad || k.owner} birlikleri ${bolge.ad} bölgesinde ittifak dışı kaldı. 3 tur içinde geri çekilmeli.`
      );
    }
    if (k._ittifakUyari >= 3) {
      zorlaGeriCek(k);
      logYaz(
        `↩ ${oyun.fraksiyon[k.owner]?.ad || k.owner} birlikleri ${bolge.ad} bölgesinden zorla geri çekildi.`
      );
      delete k._ittifakUyari;
    }
  });
}

function ittifakMudahaleTick() {
  const hazirMudahale = ittifakMudahaleKuyrugundanHazirOlanlariAl();
  if (!hazirMudahale.length) return;
  hazirMudahale.forEach((m) => {
    const ok = aiIttifakMudahalesiBaslat(m.owner, m.savunulan, m.saldiran);
    if (!ok && m.owner === "biz") {
      logYaz("⚠️ İttifak müdahalesi için uygun birlik/lojistik bulunamadı.");
    }
  });
}

function operasyonTick() {
  if (!Array.isArray(oyun.operasyonlar)) oyun.operasyonlar = [];

  oyun.operasyonlar.forEach((op) => {
    if (!op || (op.durum !== "hazirlik" && op.durum !== "saldirim")) return;
    if (operasyonIttifakBozulduMu(op)) {
      operasyonSerbestBirak(op, "iptal", "⚠️ Koordineli saldırı ittifak bozulduğu için iptal oldu.");
      return;
    }
    if (op.durum !== "hazirlik") return;
    const hedef = bolgeById(op.hedefId);
    if (!hedef || !Array.isArray(op.katilimcilar) || !op.katilimcilar.length) {
      op.durum = "iptal";
      return;
    }

    if ((oyun.tur - (op.yaratildisTur || 0)) > (op.zaman_asimi || 8)) {
      operasyonSerbestBirak(op, "zaman_asimi", "⏰ Koordineli saldırı zaman aşımına uğradı.");
      return;
    }

    op.katilimcilar.forEach((kat) => {
      const konvoylar = (kat.konvoyIdler || [])
        .map((id) => oyun.birimler.find((k) => k.id === id))
        .filter((k) => k && !k._sil && k.adet > 0);
      if (!konvoylar.length) {
        kat.hazir = false;
        return;
      }

      let hazirSay = 0;
      konvoylar.forEach((k) => {
        if (!k.hedefId) k.hedefId = op.hedefId;
        if (k.operasyonId !== op.id) k.operasyonId = op.id;
        const komsuMuHedefe = (oyun.komsu[k.konumId] || []).includes(op.hedefId);
        if (komsuMuHedefe) {
          k.bekliyor = true;
          k.durum = "bekliyor-op";
          hazirSay += 1;
        } else {
          k.bekliyor = false;
          if (k.durum === "bekliyor-op") k.durum = "hareket";
        }
      });

      kat.hazir = hazirSay > 0;
    });

    const hepsiHazir = op.katilimcilar.every((kat) => kat.hazir);
    if (!hepsiHazir) return;

    const hedefBolgeOp = bolgeById(op.hedefId);
    const hedefOwnerOp = hedefBolgeOp?.owner;
    if (
      hedefOwnerOp &&
      op.katilimcilar.some((kat) => kat?.owner && !diplomasiSaldiriMumkunMi(kat.owner, hedefOwnerOp))
    ) {
      operasyonSerbestBirak(
        op,
        "iptal",
        "🕊️ Koordineli saldırı (barış/ateşkes) hedef ile anlaşma nedeniyle iptal edildi."
      );
      return;
    }

    op.katilimcilar.forEach((kat) => {
      (kat.konvoyIdler || []).forEach((kid) => {
        const k = oyun.birimler.find((b) => b.id === kid);
        if (!k) return;
        k.bekliyor = false;
        if (k.durum === "bekliyor-op") k.durum = "hareket";
      });
    });
    op.durum = "saldirim";
    logYaz("⚔ Koordineli saldırı tetiklendi.");
  });

  oyun.operasyonlar.forEach((op) => {
    if (!op || op.durum === "tamamlandi" || op.durum === "iptal" || op.durum === "zaman_asimi") return;
    const kalan = operasyonKonvoylari(op).filter((k) => !k._sil && k.adet > 0);
    if (!kalan.length) op.durum = "tamamlandi";
  });

  oyun.operasyonlar = oyun.operasyonlar.filter((op) => {
    if (!op) return false;
    if (op.durum === "tamamlandi" || op.durum === "iptal" || op.durum === "zaman_asimi") {
      return (oyun.tur - (op.yaratildisTur || 0)) <= 2;
    }
    return true;
  });
}

function koordineliSaldiriGrubu(k, varanlar) {
  if (!k?.operasyonId) return [k];
  return varanlar.filter(
    (k2) =>
      !k2._islendi &&
      k2.operasyonId === k.operasyonId &&
      k2.hedefId === k.hedefId &&
      k2.owner !== "tarafsiz"
  );
}

function efektifSaldiriGucu(k) {
  const kayipAzaltma = liderDevreDisiMi(k.owner) ? 0 : liderBonus(k.owner, "kayipAzaltma");
  const saldiriGucu = liderDevreDisiMi(k.owner) ? 0 : liderBonus(k.owner, "saldiriGucu");
  const arastrSaldiri = k.owner === "biz" ? arastirmaEfekt("saldiriBonus") : 0;
  const tipCarpani = BIRIM_TIPLERI[k.tip]?.saldiri || 1.0;
  const efektif = Math.max(1, Math.round(k.adet * tipCarpani * (1 + saldiriGucu + arastrSaldiri)));
  return { efektif, kayipAzaltma };
}

function kusatmaKontrol(hedefId, saldiranOwnerler) {
  const ownerler = [...new Set((saldiranOwnerler || []).filter(Boolean))];
  if (!ownerler.length) return false;
  const komsular = oyun.komsu[hedefId] || [];
  if (!komsular.length) return false;
  return komsular.every((id) => {
    const b = bolgeById(id);
    if (!b) return false;
    if (ownerler.includes(b.owner)) return true;
    return ownerler.some((o) => isDostCete(o, b.owner));
  });
}

function savunmaDurumuHesapla(hedef) {
  const savunanBirimler = oyun.birimler.filter(
    (x) => x.konumId === hedef.id && (x.owner === hedef.owner || isDostIttifak(x.owner, hedef.owner))
  );
  const birimAdet = savunanBirimler.reduce((t, x) => t + (x.adet || 0), 0);
  const birimEfektif = grupEfektifSavunma(savunanBirimler);
  return {
    birimler: savunanBirimler,
    toplamAdet: birimAdet,
    efektif: Math.max(1, Math.round(birimEfektif)),
  };
}

function savunmaKaybiUygula(hedef, savunanBirimler, kayipAdet) {
  const kaynaklar = (savunanBirimler || [])
    .filter((x) => x && !x._sil && (x.adet || 0) > 0)
    .map((x) => ({ tur: "birim", ref: x, adet: x.adet || 0, kayip: 0 }));

  const toplam = kaynaklar.reduce((t, k) => t + k.adet, 0);
  if (toplam <= 0) return 0;
  const hedefKayip = Math.min(toplam, Math.max(0, Math.round(kayipAdet || 0)));
  if (hedefKayip <= 0) return 0;

  kaynaklar.forEach((k) => {
    k.kayip = Math.min(k.adet, Math.floor((k.adet / toplam) * hedefKayip));
  });
  let atanan = kaynaklar.reduce((t, k) => t + k.kayip, 0);
  while (atanan < hedefKayip) {
    const aday = [...kaynaklar]
      .filter((k) => k.kayip < k.adet)
      .sort((a, b) => (b.adet - b.kayip) - (a.adet - a.kayip))[0];
    if (!aday) break;
    aday.kayip += 1;
    atanan += 1;
  }

  kaynaklar.forEach((k) => {
    if (k.kayip <= 0) return;
    k.ref.adet = Math.max(0, (k.ref.adet || 0) - k.kayip);
    if (k.ref.adet <= 0) k.ref._sil = true;
  });
  return atanan;
}

function koordineliSavasCoz(grup, hedef) {
  if (!grup.length || !hedef) return;
  const op = grup[0]?.operasyonId
    ? oyun.operasyonlar.find((o) => o.id === grup[0].operasyonId)
    : null;

  const savunma = savunmaDurumuHesapla(hedef);
  const savunanBirimler = savunma.birimler;
  const savunan = savunma.efektif;
  const savunmaBonus = bolgeOzellikBonus(hedef, "savunmaBonus") + binaBonus(hedef, "savunmaBonus");
  let guv = (hedef.guv || 0) + (hedef.yGuv || 0) + savunmaBonus;

  const farkliYonler = new Set(grup.map((g) => g.konumId)).size;
  if (farkliYonler >= 2) {
    guv *= 0.5;
    logYaz("⚔⚔ Makas hareketi! Savunma yarıya düştü.");
  }

  const toplamAdet = Math.max(1, grup.reduce((t, g) => t + (g.adet || 0), 0));
  const efektifler = grup.map((g) => ({
    konvoy: g,
    ...efektifSaldiriGucu(g),
  }));
  let toplamEfektif = efektifler.reduce((t, e) => t + e.efektif, 0);

  const ortDiplo = grup.reduce((t, g) => t + ittifakSaldiriCarpani(g.owner, hedef.owner), 0) / grup.length;
  const ortIliskiCarpani = grup.reduce(
    (t, g) => t + savasIliskiModifiyeri(g.owner, hedef.owner).saldiriCarpani,
    0
  ) / grup.length;
  toplamEfektif = Math.round(toplamEfektif * Math.max(1, ortDiplo) * Math.max(0.5, ortIliskiCarpani) * 1.15);
  const p = savasKazanmaIhtimali(Math.max(1, toplamEfektif), savunan, Math.max(0, guv));
  const kazandi = Math.random() < p;

  const oncekiOwner = hedef.owner;
  const saldiranOwnerler = [...new Set(grup.map((g) => g.owner).filter(Boolean))];
  const kayipAzaltmaOrtalama =
    efektifler.reduce((t, e) => t + (e.kayipAzaltma || 0) * ((e.konvoy.adet || 0) / toplamAdet), 0);

  if (kazandi) {
    const atkKayipOran = Math.max(0.12, (0.32 + Math.random() * 0.14) - kayipAzaltmaOrtalama);
    const atkKayipToplam = Math.round(toplamAdet * atkKayipOran);
    const savunanToplam = savunma.toplamAdet;
    const kusatma = kusatmaKontrol(hedef.id, grup.map((g) => g.owner));
    const defKalan = kusatma ? 0 : Math.round(savunanToplam * (0.1 + Math.random() * 0.1));
    if (kusatma) logYaz("🧱 Kuşatma! Savunma kaçış hattı kapandı.");

    const captureOwner = op?.baslatanOwner || grup[0].owner;
    hedef.owner = captureOwner;
    const tasitGanmeti = bolgeFetihTasitGanmetiEkle(hedef, captureOwner);
    fetihSonrasiSadakat(hedef.id);
    diplomasiFetihSonucu(captureOwner, oncekiOwner, hedef.id);
    savunanBirimler.forEach((x) => (x._sil = true));

    let kacisId = null;
    (oyun.komsu[hedef.id] || []).forEach((id) => {
      if (kacisId !== null) return;
      const bb = bolgeById(id);
      if (bb && bb.owner === oncekiOwner) kacisId = id;
    });
    if (defKalan > 0 && kacisId != null) {
      oyun.birimler.push({
        id: `k${++oyun.birimSayac}`,
        owner: oncekiOwner,
        adet: defKalan,
        konumId: hedef.id,
        hedefId: kacisId,
        _hazir: false,
        durum: "hareket",
        rota: [],
        gecisHakki: false,
        operasyonId: null,
        bekliyor: false,
      });
    }

    efektifler.forEach((e) => {
      const kg = e.konvoy;
      const oran = (kg.adet || 0) / toplamAdet;
      const kgKayip = Math.round(atkKayipToplam * oran);
      const kalan = Math.max(0, (kg.adet || 0) - kgKayip);
      if (kalan > 0) {
        yiginaEkle(hedef.id, kg.owner, kalan, kg.tip || "tetikci", { tavanUygula: false });
      }
      konvoyTasitIade(kg);
      kg._islendi = true;
      kg._sil = true;
    });

    if (captureOwner === "biz") {
      oyun.istatistikler.kazanilanSavaslar++;
      oyun.istatistikler.fetihler++;
      if ((tasitGanmeti.araba || 0) > 0 || (tasitGanmeti.motor || 0) > 0) {
        logYaz(`🚚 Bölge stoku ele geçirildi: +${tasitGanmeti.araba || 0} 🚗, +${tasitGanmeti.motor || 0} 🏍️`);
      }
      showToast(`🏴 ${hedef.ad} koordineli operasyonla fethedildi!`, "basari", 3500);
      sesCal("fetih");
    } else if (oncekiOwner === "biz") {
      showToast(`⚠️ ${hedef.ad} kaybedildi!`, "hata", 3500);
      sesCal("kayip-bolge");
    } else {
      sesCal("savas");
    }
    logYaz(`⚔ Koordineli saldırı başarılı: ${hedef.ad} ele geçirildi.`);
    savasAnimasyonu(hedef.id, "fetih", atkKayipToplam);
    elDegistirmeFlash(hedef.id);
    savasSonucPopupuGoster({
      bolgeAd: hedef.ad,
      saldiranOwner: saldiranOwnerler,
      savunanOwner: oncekiOwner,
      saldiriBasarili: true,
      saldiranBaslangic: toplamAdet,
      saldiranKayip: atkKayipToplam,
      saldiranKalan: toplamAdet - atkKayipToplam,
      savunanBaslangic: savunanToplam,
      savunanKayip: savunanToplam - defKalan,
      savunanKalan: defKalan,
      yeniOwner: hedef.owner,
    });
    diplomasiSavasCatismasiSonucu(captureOwner, oncekiOwner, {
      saldiranKayip: atkKayipToplam,
      savunanKayip: Math.max(0, savunanToplam - defKalan),
      saldiriBasarili: true,
      fetih: true,
      bolgeId: hedef.id,
    });
    return;
  }

  const atkKayipOran = Math.max(0.2, (0.48 + Math.random() * 0.16) - kayipAzaltmaOrtalama);
  const atkKayipToplam = Math.round(toplamAdet * atkKayipOran);
  const defKayipHedef = Math.round(savunma.toplamAdet * (0.22 + Math.random() * 0.2));
  const defKayipUygulandi = savunmaKaybiUygula(hedef, savunanBirimler, defKayipHedef);

  efektifler.forEach((e) => {
    const kg = e.konvoy;
    const oran = (kg.adet || 0) / toplamAdet;
    const kgKayip = Math.round(atkKayipToplam * oran);
    const kalan = Math.max(0, (kg.adet || 0) - kgKayip);
    if (kalan > 0) {
      const kacis = (oyun.komsu[hedef.id] || []).find((id) => bolgeById(id)?.owner === kg.owner);
      if (kacis != null) {
        yiginaEkle(kacis, kg.owner, kalan, kg.tip || "tetikci", { tavanUygula: false });
        konvoyTasitIade(kg);
      } else {
        konvoyTasitIade(kg);
      }
    } else {
      konvoyTasitIade(kg);
    }
    kg._islendi = true;
    kg._sil = true;
  });

  logYaz(`⚔ Koordineli saldırı püskürtüldü: ${hedef.ad}.`);
  sesCal("savas");
  savasAnimasyonu(hedef.id, "puskurtme", atkKayipToplam);
  savasSonucPopupuGoster({
    bolgeAd: hedef.ad,
    saldiranOwner: saldiranOwnerler,
    savunanOwner: oncekiOwner,
    saldiriBasarili: false,
    saldiranBaslangic: toplamAdet,
    saldiranKayip: atkKayipToplam,
    saldiranKalan: toplamAdet - atkKayipToplam,
    savunanBaslangic: savunma.toplamAdet,
    savunanKayip: defKayipUygulandi,
    savunanKalan: savunma.toplamAdet - defKayipUygulandi,
    yeniOwner: hedef.owner,
  });
  diplomasiSavasCatismasiSonucu(grup[0].owner, oncekiOwner, {
    saldiranKayip: atkKayipToplam,
    savunanKayip: defKayipUygulandi,
    saldiriBasarili: false,
    fetih: false,
    bolgeId: hedef.id,
  });
}

function hareketTick() {
  // 0) Yeni oluşturulan konvoyları işaretle — aynı turda hedefe varmasın
  oyun.birimler.forEach((k) => {
    if (!Array.isArray(k.rota)) k.rota = [];
    if (k.hedefId && k.rota.length > 0) {
      const komsular = oyun.komsu[k.konumId] || [];
      if (!komsular.includes(k.hedefId) && komsular.includes(k.rota[0])) {
        k.hedefId = k.rota.shift();
      } else if (k.rota[0] === k.hedefId) {
        k.rota.shift();
      }
    }
    if (!k._hazir) {
      // ilk kez görüyorsak, bir tur sonra hazır hale gelecek
      k._hazir = true;
      return;
    }
  });
  // 1) Hedefine ulaşmaya hazır konvoyları bul
  const varanlar = oyun.birimler.filter((k) => k._hazir && k.hedefId && !k.bekliyor);

  // 2) Her konvoy için işlem
  for (const k of varanlar) {
    if (k._islendi) continue;
    const hedef = bolgeById(k.hedefId);
    if (!hedef) {
      konvoyTasitIade(k);
      k._sil = true;
      continue;
    }

    if (hedef.owner !== "tarafsiz" && hedef.owner !== k.owner && isDostCete(k.owner, hedef.owner)) {
      const rotaVar = Array.isArray(k.rota) && k.rota.length > 0;
      if (k.gecisHakki && rotaVar) {
        k.konumId = k.hedefId;
        k.hedefId = k.rota.shift() || null;
        k._hazir = false;
        k.durum = "hareket";
        continue;
      }
      if (isDostIttifak(k.owner, hedef.owner)) {
        if (rotaVar) {
          k.konumId = k.hedefId;
          k.hedefId = k.rota.shift() || null;
          k._hazir = false;
          k.durum = "hareket";
          continue;
        }
        yiginaEkle(hedef.id, k.owner, k.adet, k.tip || "tetikci", { tavanUygula: false });
        konvoyTasitIade(k);
        logYaz(`${oyun.fraksiyon[k.owner]?.ad || k.owner} birlikleri ittifak geçişiyle ${hedef.ad} bölgesine ulaştı.`);
        k._sil = true;
        continue;
      }
      if (rotaVar) {
        k.konumId = k.hedefId;
        k.hedefId = k.rota.shift() || null;
        k._hazir = false;
        k.durum = "hareket";
        continue;
      }
      yiginaEkle(k.konumId, k.owner, k.adet, k.tip || "tetikci", { tavanUygula: false });
      konvoyTasitIade(k);
      logYaz(`${oyun.fraksiyon[k.owner]?.ad || k.owner} birlikleri dostluk geçişinde ${hedef.ad} bölgesinde kalamadı.`);
      k._sil = true;
      continue;
    }

    // --- HEDEF KENDİ BÖLGEMİZ ---
    if (hedef.owner === k.owner) {
      if (k.rota && k.rota.length > 0) {
        k.konumId = k.hedefId;
        k.hedefId = k.rota.shift();
        k._hazir = false;
        k.durum = "hareket";
        continue;
      }
      yiginaEkle(hedef.id, k.owner, k.adet, k.tip || "tetikci", { tavanUygula: false });
      konvoyTasitIade(k);
      logYaz(`${k.adet} birim ${hedef.ad} bölgesine ulaştı.`);
      k._sil = true;
      continue;
    }

    // --- TARAFSIZ BÖLGE ---
    if (hedef.owner === "tarafsiz") {
      logYaz("Tarafsız bölgeye çarpıldı, hareket durdu.");
      konvoyTasitIade(k);
      k._sil = true;
      continue;
    }

    // Düşmansa -> SAVAŞ
    if (!diplomasiSaldiriMumkunMu(k.owner, hedef.owner)) {
      logYaz(
        `${oyun.fraksiyon[k.owner]?.ad || k.owner} birlikleri ${hedef.ad} önünde ateşkes nedeniyle durdu.`
      );
      yiginaEkle(k.konumId, k.owner, k.adet, k.tip || "tetikci", { tavanUygula: false });
      konvoyTasitIade(k);
      k._sil = true;
      continue;
    }

    // ... Savaş kodu aynı kalır ...
    // SADECE: Savaş KAZANILIRSA ve rota varsa -> Devam etmeli mi?
    // Genelde fetih sonrası birlik bırakılır ve durulur.
    // Ama "yola devam et" emri varsa?
    // Şimdilik: Fetih yapıldıysa orada dursun. Rota iptal.
    // ÇÜNKÜ: Fetih sonrası orası bizim olur, bir sonraki tur devam etmek için yeni emir gerekir.
    // VEYA: main loop'ta "fetih sonrası kalanlar rotaya devam etsin" diyebiliriz.
    // Kodda savas cozumune bakalim.

    const grup = koordineliSaldiriGrubu(k, varanlar);
    if (grup.length > 1) {
      if (grup.some((g) => !diplomasiSaldiriMumkunMu(g.owner, hedef.owner))) {
        const opId = grup[0]?.operasyonId;
        const op = opId ? oyun.operasyonlar.find((o) => o.id === opId) : null;
        if (op) {
          operasyonSerbestBirak(
            op,
            "iptal",
            "🕊️ Koordineli saldırı barış / ateşkes nedeniyle iptal edildi."
          );
        }
        grup.forEach((g) => {
          if (g._islendi) return;
          logYaz(
            `${oyun.fraksiyon[g.owner]?.ad || g.owner} koordineli birlikleri ${hedef.ad} önünde anlaşma nedeniyle durdu.`
          );
          yiginaEkle(g.konumId, g.owner, g.adet, g.tip || "tetikci", { tavanUygula: false });
          konvoyTasitIade(g);
          g._islendi = true;
          g._sil = true;
        });
        continue;
      }
      koordineliSavasCoz(grup, hedef);
      continue;
    }

    // --- HEDEF DÜŞMAN: SAVAŞ ---
    const savunma = savunmaDurumuHesapla(hedef);
    const savunanBirimler = savunma.birimler;
    // Birim tipi çarpanı ile efektif savunma gücü
    const savunan = savunma.efektif;

    // Kale + bölge yapıları savunmada
    const savunmaBonus = bolgeOzellikBonus(hedef, "savunmaBonus") + binaBonus(hedef, "savunmaBonus");
    const guv = (hedef.guv || 0) + (hedef.yGuv || 0) + savunmaBonus;
    // Lider kayıp azaltma bonusu (suikast ile devre dışı olabilir)
    const kayipAzaltma = liderDevreDisiMi(k.owner) ? 0 : liderBonus(k.owner, "kayipAzaltma");
    const saldiriGucu = liderDevreDisiMi(k.owner) ? 0 : liderBonus(k.owner, "saldiriGucu");
    // Birim tipi çarpanı + araştırma bonusu ile efektif saldırı
    const arastrSaldiri = k.owner === "biz" ? arastirmaEfekt("saldiriBonus") : 0;
    const tipCarpani = BIRIM_TIPLERI[k.tip]?.saldiri || 1.0;
    const efektifAdet = Math.round(k.adet * tipCarpani * (1 + saldiriGucu + arastrSaldiri));
    const diploCarpan = ittifakSaldiriCarpani(k.owner, hedef.owner);
    const iliskiCarpan = savasIliskiModifiyeri(k.owner, hedef.owner).saldiriCarpani;
    const p = savasKazanmaIhtimali(Math.round(efektifAdet * diploCarpan * iliskiCarpan), savunan, guv);
    const kazandi = Math.random() < p;

    if (kazandi) {
      // --- KAZANAN: SALDIRAN ---
      const atkKayipOran = Math.max(0.1, (0.3 + Math.random() * 0.15) - kayipAzaltma);
      const atkKayip = Math.round(k.adet * atkKayipOran);
      const kalanAtk = Math.max(1, k.adet - atkKayip);

      // Yaralı oluştur (kayıpların %20'si)
      const yarali = Math.round(atkKayip * 0.20);
      if (yarali > 0) {
        const hastaneVar = hedef.ozellik === "hastane";
        oyun.yaralilar.push({ owner: k.owner, adet: yarali, turKaldi: hastaneVar ? 3 : 5, bolgeId: hedef.id });
      }

      const oncekiOwner = hedef.owner;
      const savunanToplam = savunma.toplamAdet;

      let defKalan = Math.round(savunanToplam * (0.1 + Math.random() * 0.1));
      if (kusatmaKontrol(hedef.id, [k.owner])) {
        defKalan = 0;
        logYaz("🧱 Kuşatma! Savunanlar kaçamadı.");
      }

      // Esir oluştur (savunan kayıplarının %10'u)
      const esirAdet = Math.round((savunanToplam - defKalan) * 0.10);
      if (esirAdet > 0) {
        oyun.esirler.push({ owner: oncekiOwner, tutulan: k.owner, adet: esirAdet });
        logYaz(`⛓️ ${esirAdet} düşman esir alındı!`);
      }

      hedef.owner = k.owner;
      const tasitGanmeti = bolgeFetihTasitGanmetiEkle(hedef, k.owner);
      fetihSonrasiSadakat(hedef.id);
      diplomasiFetihSonucu(k.owner, oncekiOwner, hedef.id);
      savunanBirimler.forEach((x) => (x._sil = true));

      let kacisId = null;
      const komsularSavunan = oyun.komsu[hedef.id] || [];
      for (const id of komsularSavunan) {
        const bb = bolgeById(id);
        if (bb && bb.owner === oncekiOwner) { kacisId = id; break; }
      }

      if (defKalan > 0 && kacisId != null) {
        oyun.birimler.push({
          id: `k${++oyun.birimSayac}`, owner: oncekiOwner, adet: defKalan,
          konumId: hedef.id, hedefId: kacisId, _hazir: false, durum: "hareket",
          rota: [],
          gecisHakki: false,
          operasyonId: null,
          bekliyor: false,
        });
        logYaz(`${hedef.ad} düştü; ${defKalan} kişi ${bolgeById(kacisId).ad} bölgesine kaçtı.`);
      } else if (defKalan > 0) {
        logYaz(`${hedef.ad} düştü; kaçacak yer yoktu, ${defKalan} kişi imha edildi.`);
      }

      yiginaEkle(hedef.id, k.owner, kalanAtk, k.tip || "tetikci", { tavanUygula: false });
      konvoyTasitIade(k);
      logYaz(`${hedef.ad} fethedildi! (${oncekiOwner} -> ${k.owner})`);

      // İstatistik güncelle + ses + toast
      if (k.owner === "biz") {
        oyun.istatistikler.kazanilanSavaslar++;
        oyun.istatistikler.fetihler++;
        if ((tasitGanmeti.araba || 0) > 0 || (tasitGanmeti.motor || 0) > 0) {
          logYaz(`🚚 Bölge stoku ele geçirildi: +${tasitGanmeti.araba || 0} 🚗, +${tasitGanmeti.motor || 0} 🏍️`);
        }
        showToast(`🏴 ${hedef.ad} fethedildi!`, 'basari', 3500);
        sesCal("fetih");
      } else if (oncekiOwner === "biz") {
        showToast(`⚠️ ${hedef.ad} kaybedildi!`, 'hata', 3500);
        sesCal("kayip-bolge");
      } else {
        sesCal("savas");
      }

      // Şöhret bonusu
      oyun.sohret[k.owner] = (oyun.sohret[k.owner] || 0) + 4;

      // === SAVAŞ ANİMASYONU: FETİH ===
      savasAnimasyonu(hedef.id, "fetih", atkKayip);
      elDegistirmeFlash(hedef.id);
      savasSonucPopupuGoster({
        bolgeAd: hedef.ad,
        saldiranOwner: k.owner,
        savunanOwner: oncekiOwner,
        saldiriBasarili: true,
        saldiranBaslangic: k.adet,
        saldiranKayip: atkKayip,
        saldiranKalan: kalanAtk,
        savunanBaslangic: savunanToplam,
        savunanKayip: savunanToplam - defKalan,
        savunanKalan: defKalan,
        yeniOwner: hedef.owner,
      });
      diplomasiSavasCatismasiSonucu(k.owner, oncekiOwner, {
        saldiranKayip: atkKayip,
        savunanKayip: Math.max(0, savunanToplam - defKalan),
        saldiriBasarili: true,
        fetih: true,
        bolgeId: hedef.id,
      });
    } else {
      // saldırı başarısız
      const atkKayipOran = Math.max(0.2, (0.45 + Math.random() * 0.2) - kayipAzaltma);
      const atkKayip = Math.round(k.adet * atkKayipOran);
      const kalan = k.adet - atkKayip;

      // Yaralı oluştur
      const yarali = Math.round(atkKayip * 0.20);
      if (yarali > 0) {
        oyun.yaralilar.push({ owner: k.owner, adet: yarali, turKaldi: 5, bolgeId: hedef.id });
      }
      // Esir — saldıran kayıplarının %10'u esir düşer
      const esirAdet = Math.round(atkKayip * 0.10);
      if (esirAdet > 0) {
        oyun.esirler.push({ owner: k.owner, tutulan: hedef.owner, adet: esirAdet });
      }

      const defKayipHedef = Math.round(savunma.toplamAdet * (0.25 + Math.random() * 0.2));
      const defKayipUygulandi = savunmaKaybiUygula(hedef, savunanBirimler, defKayipHedef);

      if (kalan > 0) {
        const kacis = (oyun.komsu[hedef.id] || []).find(
          (id) => bolgeById(id)?.owner === k.owner
        );
        if (kacis) {
          yiginaEkle(kacis, k.owner, kalan, k.tip || "tetikci", { tavanUygula: false });
          konvoyTasitIade(k);
        }
      }
      logYaz(`${hedef.ad} saldırısı püskürtüldü.`);
      oyun.sohret[k.owner] = (oyun.sohret[k.owner] || 0) + 1;

      // === SAVAŞ ANİMASYONU: PÜSKÜRTME ===
      savasAnimasyonu(hedef.id, "puskurtme", atkKayip);
      savasSonucPopupuGoster({
        bolgeAd: hedef.ad,
        saldiranOwner: k.owner,
        savunanOwner: hedef.owner,
        saldiriBasarili: false,
        saldiranBaslangic: k.adet,
        saldiranKayip: atkKayip,
        saldiranKalan: kalan,
        savunanBaslangic: savunma.toplamAdet,
        savunanKayip: defKayipUygulandi,
        savunanKalan: savunma.toplamAdet - defKayipUygulandi,
        yeniOwner: hedef.owner,
      });
      diplomasiSavasCatismasiSonucu(k.owner, hedef.owner, {
        saldiranKayip: atkKayip,
        savunanKayip: defKayipUygulandi,
        saldiriBasarili: false,
        fetih: false,
        bolgeId: hedef.id,
      });
    }

    k._sil = true;
  }

  // 3) Temizlik
  oyun.birimler = oyun.birimler.filter((k) => !k._sil && k.adet > 0);
  oyun.birimler.forEach((k) => {
    if (k._islendi) delete k._islendi;
  });

  // 4) UI güncelle
  uiGuncel(callbacklar);
}

/** Tam ekran modal / bitiş / tutorial açıkken tur ilerlemesin (duraklat bayrağı kaymış olsa bile). */
function tamEkranPanelAcikMi() {
  const flex = (id) => document.getElementById(id)?.style?.display === "flex";
  return (
    flex("cm-arka") ||
    flex("isim-arka") ||
    flex("bitis-overlay") ||
    flex("tutorial-arka")
  );
}

function dongu() {
  try {
    const panelAcik = tamEkranPanelAcikMi();
    if (!oyun.duraklat && !panelAcik) {
      turIsle();
    }
  } catch (err) {
    console.error("[dongu] turIsle", err);
    oyun.duraklat = true;
    try {
      logYaz(
        `Tur işlenirken hata oluştu; oyun duraklatıldı: ${err?.message || String(err)}. ` +
          `"Devam Et" ile sürdürmeyi dene; sorun sürerse sayfayı yenile.`
      );
    } catch (_) {
      /* log paneli yoksa yut */
    }
    uiGuncel(callbacklar);
  }
  // hız = temel_sure / hizKatsayi (alt sınır 50ms) — her durumda zincir devam etsin
  const gecikme = Math.max(
    50,
    Math.round(AYAR.turSuresiMs / (oyun.hizKatsayi || 1))
  );

  setTimeout(dongu, gecikme);
}

// rastgeleIsim artık utils.js'den geliyor, geriye dönük uyumluluk için re-export
export { rastgeleIsim } from "./utils.js";

function modalAyarlariniOku() {
  const ad = (document.getElementById("isim-input")?.value || "").trim() || rastgeleIsim();
  const ai1Ad = (document.getElementById("isim-ai1")?.value || "").trim() || rastgeleIsim();
  const ai2Ad = (document.getElementById("isim-ai2")?.value || "").trim() || rastgeleIsim();
  const ai3Ad = (document.getElementById("isim-ai3")?.value || "").trim() || rastgeleIsim();
  const zor = document.getElementById("zorluk")?.value || "orta";
  return {
    zorluk: zor,
    mapSize: "istanbul-buyuk",
    fraksiyonAdlari: {
      biz: ad,
      ai1: ai1Ad,
      ai2: ai2Ad,
      ai3: ai3Ad,
    },
  };
}

function oyunKurulumunuBaslat(kurulum, seciliBaslangicId = null) {
  if (!kurulum) return;
  yeniOyun({
    zorluk: kurulum.zorluk,
    mapSize: kurulum.mapSize,
    baslangicKonumlari: seciliBaslangicId ? { biz: seciliBaslangicId } : null,
    fraksiyonAdlari: kurulum.fraksiyonAdlari,
  });
  baslangicSecimModu = false;
  bekleyenBaslangicKurulumu = null;
  isimModalKapat();

  document.getElementById("efs-biz").textContent = oyun.fraksiyon.biz.ad;
  document.getElementById("efs-ai1").textContent = oyun.fraksiyon.ai1.ad;
  document.getElementById("efs-ai2").textContent = oyun.fraksiyon.ai2.ad;
  document.getElementById("efs-ai3").textContent = oyun.fraksiyon.ai3.ad;

  logYaz(
    `Çete: "${oyun.fraksiyon.biz.ad}", zorluk: "${kurulum.zorluk.toUpperCase()}", harita: İstanbul (Büyük).`
  );
  if (seciliBaslangicId) {
    const seciliBolge = bolgeById(seciliBaslangicId);
    if (seciliBolge) logYaz(`📍 Başlangıç bölgesi seçildi: ${seciliBolge.ad}`);
  }

  durumCiz();
  haritaCiz(onBolgeSec);
  uiGuncel(callbacklar);
  ensureGameControls();

  operasyonTick();
  hareketTick();
  setTimeout(() => tutorialBaslat(), 120);
}

function haritadanBaslangicSecimiBaslat() {
  const kurulum = modalAyarlariniOku();
  bekleyenBaslangicKurulumu = kurulum;
  baslangicSecimModu = true;
  yeniOyun({
    zorluk: kurulum.zorluk,
    mapSize: kurulum.mapSize,
    fraksiyonAdlari: kurulum.fraksiyonAdlari,
  });
  isimModalKapat();
  document.getElementById("efs-biz").textContent = oyun.fraksiyon.biz.ad;
  document.getElementById("efs-ai1").textContent = oyun.fraksiyon.ai1.ad;
  document.getElementById("efs-ai2").textContent = oyun.fraksiyon.ai2.ad;
  document.getElementById("efs-ai3").textContent = oyun.fraksiyon.ai3.ad;
  durumCiz();
  haritaCiz(onBolgeSec);
  uiGuncel(callbacklar);
  showToast("Haritada başlangıç bölgeni tıkla.", "bilgi", 2800);
  logYaz("📍 Başlangıç seçim modu: Haritadan bir bölge seç.");
}

async function haritadanBaslangicSecimiTamamla(id) {
  const kurulum = bekleyenBaslangicKurulumu;
  if (!kurulum) return;
  const bolge = bolgeById(id);
  if (!bolge) return;
  const onay = await showConfirm(
    `Başlangıç bölgen "${bolge.ad}" olsun mu?`,
    "Başlangıç Bölgesi"
  );
  if (!onay) return;
  oyunKurulumunuBaslat(kurulum, bolge.id);
}

async function onBolgeSec(id, secimOps = {}) {
  const hedef = bolgeById(id);
  if (!hedef) return;

  if (baslangicSecimModu) {
    await haritadanBaslangicSecimiTamamla(id);
    return;
  }

  const oncekiSecili = bolgeById(oyun.seciliId);
  if (
    secimOps?.shiftKey &&
    oncekiSecili &&
    oncekiSecili.owner === "biz" &&
    hedef.owner === "biz" &&
    oncekiSecili.id !== hedef.id &&
    !oyun.hareketEmri
  ) {
    profilSolMenuAcilisTalebiAyarla(null);
    oyun.seciliId = oncekiSecili.id;
    if (typeof callbacklar.hizliTransferSeciliBolgeden === "function") {
      await callbacklar.hizliTransferSeciliBolgeden(hedef.id);
      return;
    }
  }

  if (secimOps?.dblclick && hedef.owner !== "biz" && hedef.owner !== "tarafsiz" && !oyun.hareketEmri) {
    profilSolMenuAcilisTalebiAyarla(null);
    oyun.seciliId = hedef.id;
    await callbacklar.saldiriHizliAcil(hedef.id);
    return;
  }

  // Bekleyen hareket emri varsa tıklanan bölgeyi hedef olarak işle.
  if (oyun.hareketEmri) {
    profilSolMenuAcilisTalebiAyarla(null);
    hareketEmriHedefSec(id);
    return;
  }

  if (secimOps?.contextmenu) {
    const profilAcilisTalebi = hedef.owner !== "tarafsiz";
    profilSolMenuAcilisTalebiAyarla(profilAcilisTalebi ? hedef.id : null);
    oyun.seciliId = hedef.id;
    uiGuncel(callbacklar);
    return;
  }

  const ikinciTikAynıBolge = !!(oncekiSecili && oncekiSecili.id === hedef.id);
  if (ikinciTikAynıBolge && !secimOps?.shiftKey && hedef.owner === "biz" && !oyun.hareketEmri) {
    profilSolMenuAcilisTalebiAyarla(null);
    oyun.seciliId = hedef.id;
    if (typeof callbacklar.hareketEmriKaynakSec === "function") {
      await callbacklar.hareketEmriKaynakSec(hedef.id);
      return;
    }
    if (typeof callbacklar.hareketEmriBaslat === "function") {
      await callbacklar.hareketEmriBaslat();
      return;
    }
  }

  profilSolMenuAcilisTalebiAyarla(null);
  oyun.seciliId = hedef.id;
  uiGuncel(callbacklar);
}

function liderBonus(owner, bonusTip) {
  const lider = oyun.fraksiyon[owner]?.lider;
  if (!lider || !lider.bonus) return 0;
  return lider.bonus[bonusTip] || 0;
}

function bolgeOzellikBonus(b, bonusTip) {
  if (!b.ozellik) return 0;
  const oz = BOLGE_OZELLIKLERI[b.ozellik];
  return oz ? (oz[bonusTip] || 0) : 0;
}

function binaBonus(b, bonusTip) {
  if (!Array.isArray(b?.binalar)) return 0;
  return b.binalar.reduce((toplam, kayit) => {
    const tanim = BINA_TIPLERI[kayit.tip];
    const etki = tanim?.etkiler?.[bonusTip] || 0;
    return toplam + etki * (kayit.seviye || 1);
  }, 0);
}

function ekonomiDurumu() {
  if (!oyun.ekonomi || typeof oyun.ekonomi !== "object") {
    oyun.ekonomi = { haracSeviye: "orta", alimBuTur: 0, sonHaracGeliri: 0, personelTavanEk: 0 };
  }
  if (!EKONOMI_DENGE.haracSeviyeleri[oyun.ekonomi.haracSeviye]) oyun.ekonomi.haracSeviye = "orta";
  if (!Number.isFinite(oyun.ekonomi.alimBuTur)) oyun.ekonomi.alimBuTur = 0;
  if (!Number.isFinite(oyun.ekonomi.sonHaracGeliri)) oyun.ekonomi.sonHaracGeliri = 0;
  if (!Number.isFinite(oyun.ekonomi.personelTavanEk)) oyun.ekonomi.personelTavanEk = 0;
  return oyun.ekonomi;
}

function asayisDurumuMain() {
  if (!oyun.asayis || typeof oyun.asayis !== "object") {
    oyun.asayis = { sucluluk: 0, polisBaski: 0, sonBaskinTur: -999 };
  }
  if (!Number.isFinite(oyun.asayis.sucluluk)) oyun.asayis.sucluluk = 0;
  if (!Number.isFinite(oyun.asayis.polisBaski)) oyun.asayis.polisBaski = 0;
  if (!Number.isFinite(oyun.asayis.sonBaskinTur)) oyun.asayis.sonBaskinTur = -999;
  return oyun.asayis;
}

function bizOrtalamaSadakat(bizBolgeler) {
  if (!bizBolgeler.length) return 55;
  const toplam = bizBolgeler.reduce((t, b) => t + (Number(b.sadakat) || 55), 0);
  return toplam / bizBolgeler.length;
}

function aktifHaracProfili() {
  const seviye = ekonomiDurumu().haracSeviye || "orta";
  return EKONOMI_DENGE.haracSeviyeleri[seviye] || EKONOMI_DENGE.haracSeviyeleri.orta;
}

function haracGeliriHesapla(bizBolgeler, harac) {
  const taban = bizBolgeler.reduce((toplam, b) => {
    const gelirTabani = (b.gelir || 0) * EKONOMI_DENGE.haracGelirOrani;
    const nufusKatkisi = (b.nufus || 0) * EKONOMI_DENGE.haracNufusCarpani;
    const yatirimCarpani = 1 + (b.yGel || 0) * EKONOMI_DENGE.haracYatirimBonus;
    return toplam + (gelirTabani + nufusKatkisi) * yatirimCarpani;
  }, 0);
  const arastirmaHaracBonus = Math.max(0, arastirmaEfekt("haracGelirBonus"));
  return Math.max(0, Math.round(taban * (harac?.gelirCarpani || 1) * (1 + arastirmaHaracBonus)));
}

function oyuncuHaracTick(bizBolgeler) {
  const eco = ekonomiDurumu();
  const harac = aktifHaracProfili();
  const as = asayisDurumuMain();
  const haracSadakatKoruma = Math.min(0.8, Math.max(0, arastirmaEfekt("haracSadakatCezaAzaltma")));
  const haracPolisKoruma = Math.min(0.8, Math.max(0, arastirmaEfekt("haracPolisArtisAzaltma")));
  const suclulukAzaltim = Math.min(0.7, Math.max(0, arastirmaEfekt("suclulukArtisAzaltma")));
  const sadakatDelta =
    harac.sadakatDelta < 0 ? harac.sadakatDelta * (1 - haracSadakatKoruma) : harac.sadakatDelta;
  const suclulukDelta =
    harac.suclulukDelta > 0 ? harac.suclulukDelta * (1 - suclulukAzaltim) : harac.suclulukDelta;
  const polisDelta =
    harac.polisDelta > 0 ? harac.polisDelta * (1 - haracPolisKoruma) : harac.polisDelta;
  const gelir = haracGeliriHesapla(bizBolgeler, harac);
  eco.sonHaracGeliri = gelir;
  eco.alimBuTur = 0;
  if (gelir > 0) oyun.fraksiyon.biz.para += gelir;

  if (sadakatDelta !== 0) {
    bizBolgeler.forEach((b) => {
      const mevcut = Number(b.sadakat) || 55;
      b.sadakat = Math.max(0, Math.min(100, mevcut + sadakatDelta));
    });
  }

  as.sucluluk = Math.max(0, Math.min(200, (as.sucluluk || 0) + suclulukDelta));
  as.polisBaski = Math.max(0, Math.min(100, (as.polisBaski || 0) + polisDelta));

  const ortSad = bizOrtalamaSadakat(bizBolgeler);
  if (eco.haracSeviye === "yuksek" && ortSad < EKONOMI_DENGE.haracKrizSadakatEsigi) {
    const krizPolisEtkisi = EKONOMI_DENGE.haracKrizPolisEtkisi * (1 - haracPolisKoruma);
    const krizSadakatDarbe =
      EKONOMI_DENGE.haracKrizSadakatDarbe < 0
        ? EKONOMI_DENGE.haracKrizSadakatDarbe * (1 - haracSadakatKoruma)
        : EKONOMI_DENGE.haracKrizSadakatDarbe;
    as.polisBaski = Math.max(0, Math.min(100, as.polisBaski + krizPolisEtkisi));
    bizBolgeler.forEach((b) => {
      const mevcut = Number(b.sadakat) || 55;
      b.sadakat = Math.max(0, Math.min(100, mevcut + krizSadakatDarbe));
    });
  }

  if (oyun.tur % 5 === 0) {
    logYaz(`💸 Haraç geliri: +${gelir} ₺ (${harac.ad || eco.haracSeviye}).`);
  }
}

function geceEkonomiBonusu(b) {
  if (b.owner !== "biz") return 0;
  if (b.ozellik !== "kumarhane" && b.ozellik !== "carsi") return 0;
  return arastirmaEfekt("geceEkonomiBonus");
}

function gencBirimiOlustur(owner, bolgeId, adet = 1) {
  if (adet <= 0) return;
  return yiginaEkle(bolgeId, owner, adet, "genc");
}

function gecekonduTick() {
  if (oyun.tur % 4 !== 0) return;
  oyun.bolgeler.forEach((b) => {
    if (b.owner === "tarafsiz" || b.ozellik !== "gecekondu") return;
    const eklenen = gencBirimiOlustur(b.owner, b.id, 1);
    if (b.owner === "biz") {
      if (eklenen > 0) logYaz(`🏘️ ${b.ad} gecekondu ağı 1 genç eleman çıkardı.`);
      else logYaz(`🏘️ ${b.ad} gecekondu ağı personel tavanı nedeniyle yeni eleman çıkaramadı.`);
    }
  });
}

function oyuncuUretimTick() {
  const bizBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");

  // Para üretimi (her tur) — lider + bölge + kriz bonusları dahil
  const gelirLider = 1 + liderBonus("biz", "gelirCarpani");
  const kriz = krizCarpani("biz");
  const ekonomiGelirBonus = arastirmaEfekt("gelirBonus");
  const pasifGelir = arastirmaEfekt("pasifGelir");
  if (pasifGelir > 0) oyun.fraksiyon.biz.para += pasifGelir;
  bizBolgeler.forEach((b) => {
    const gelX = 1 + b.yGel * 0.5;
    const bolgeBonus =
      1 +
      bolgeOzellikBonus(b, "gelirBonus") +
      binaBonus(b, "gelirBonus") +
      ekonomiGelirBonus +
      geceEkonomiBonusu(b);
    oyun.fraksiyon.biz.para += b.gelir * gelX * gelirLider * bolgeBonus * kriz;
  });

  oyuncuHaracTick(bizBolgeler);

  // Adam üretimi (her 5 turda bir) — lider + bölge bonusları dahil
  if (oyun.tur % 5 === 0) {
    const adamLider = 1 + liderBonus("biz", "adamCarpani");
    bizBolgeler.forEach((b) => {
      const bolgeBonus = 1 + bolgeOzellikBonus(b, "uretimBonus") + binaBonus(b, "uretimBonus");
      const carp = (1 + b.yAdam * 0.7) * sohretCarpani("biz") * adamLider * bolgeBonus;
      let aday = Math.max(0, Math.round(((b.nufus || 0) / 35) * carp));
      aday = Math.min(aday, b.nufus || 0);
      if (aday > 0) {
        const eklenen = yiginaEkle(b.id, "biz", aday);
        if (eklenen > 0) b.nufus -= eklenen;
      }
    });
  }

  // Nüfus rejenerasyonu + yavaş büyüme (her 10 turda) — bölge bonusu dahil
  if (oyun.tur % 10 === 0) {
    bizBolgeler.forEach((b) => {
      b.nufusMax = Math.ceil((b.nufusMax || 0) * 1.01);
      const regenBase = 0.03 + liderBonus("biz", "regenBonus") + bolgeOzellikBonus(b, "regenBonus") * 0.03;
      const regen = Math.max(1, Math.floor((b.nufusMax || 0) * regenBase));
      b.nufus = Math.min(b.nufusMax, (b.nufus || 0) + regen);
    });
  }
}

// Yaralı iyileşme tick'i
function yaraliTick() {
  oyun.yaralilar = oyun.yaralilar.filter((y) => {
    const bolge = bolgeById(y.bolgeId);
    const hizlandirma = bolge ? binaBonus(bolge, "iyilesmeBonus") : 0;
    y.turKaldi -= 1 + Math.floor(hizlandirma);
    if (y.turKaldi <= 0) {
      // İyileşti — en yakın dost bölgeye ekle
      const dost = oyun.bolgeler.find((b) => b.owner === y.owner);
      if (dost) {
        const eklenen = yiginaEkle(dost.id, y.owner, y.adet);
        if (eklenen > 0) {
          logYaz(`🏥 ${eklenen} yaralı iyileşti ve ${dost.ad} bölgesine döndü. (${oyun.fraksiyon[y.owner]?.ad || y.owner})`);
        }
        const kalan = Math.max(0, y.adet - eklenen);
        if (kalan > 0) {
          y.adet = kalan;
          y.turKaldi = 2;
          if (y.owner === "biz") logYaz(`🏥 ${kalan} yaralı personel tavanı nedeniyle beklemede kaldı.`);
          return true;
        }
      }
      return false;
    }
    return true;
  });
}

function oyuncuBakimTick() {
  const bakimIndirim = Math.min(0.5, Math.max(0, arastirmaEfekt("bakimIndirim")));
  const gider = ownerBakimToplami("biz") * (1 - bakimIndirim);
  if (gider <= 0) return;
  oyun.fraksiyon.biz.para -= gider;
  if (oyun.fraksiyon.biz.para < 0) {
    oyun.birimler
      .filter((u) => u.owner === "biz")
      .forEach((u) => { u.adet = Math.max(1, Math.floor(u.adet * 0.95)); });
  }
}

const EKONOMI_KPI_HEDEFLERI = {
  20: { netGelir: 80, bakimOranMax: 0.7, ortBirimBoyutu: 6 },
  40: { netGelir: 140, bakimOranMax: 0.78, ortBirimBoyutu: 8 },
  60: { netGelir: 220, bakimOranMax: 0.85, ortBirimBoyutu: 10 },
};

function bizTurEkonomiMetrikleri() {
  const bizBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
  const gelirLider = 1 + liderBonus("biz", "gelirCarpani");
  const kriz = krizCarpani("biz");
  const arastirmaBonus = arastirmaEfekt("gelirBonus");
  const pasifGelir = arastirmaEfekt("pasifGelir");
  let gelir = pasifGelir;
  bizBolgeler.forEach((b) => {
    const gelX = 1 + (b.yGel || 0) * 0.5;
    const bolgeBonus =
      1 +
      bolgeOzellikBonus(b, "gelirBonus") +
      binaBonus(b, "gelirBonus") +
      arastirmaBonus +
      geceEkonomiBonusu(b);
    gelir += (b.gelir || 0) * gelX * gelirLider * bolgeBonus * kriz;
  });
  gelir += haracGeliriHesapla(bizBolgeler, aktifHaracProfili());
  const bakim = ownerBakimToplami("biz");
  const bakimOran = gelir > 0 ? (bakim / gelir) : (bakim > 0 ? 1 : 0);

  const yiginlar = oyun.birimler.filter(
    (k) => k.owner === "biz" && !k._sil && (k.adet || 0) > 0 && !k.hedefId && (!k.rota || k.rota.length === 0)
  );
  const toplamBirim = yiginlar.reduce((t, k) => t + (k.adet || 0), 0);
  const toplamGrup = yiginlar.length;
  const ortBirimBoyutu = toplamGrup > 0 ? (toplamBirim / toplamGrup) : 0;

  return {
    gelir,
    bakim,
    netGelir: gelir - bakim,
    bakimOran,
    ortBirimBoyutu,
  };
}

function ekonomiKpiTick() {
  if (!oyun.ekonomiKpi || typeof oyun.ekonomiKpi !== "object") {
    oyun.ekonomiKpi = { hedefTurlar: [20, 40, 60], kayitlar: [] };
  }
  if (!Array.isArray(oyun.ekonomiKpi.hedefTurlar)) oyun.ekonomiKpi.hedefTurlar = [20, 40, 60];
  if (!Array.isArray(oyun.ekonomiKpi.kayitlar)) oyun.ekonomiKpi.kayitlar = [];

  const hedefTurlar = new Set(oyun.ekonomiKpi.hedefTurlar);
  if (!hedefTurlar.has(oyun.tur)) return;
  if (oyun.ekonomiKpi.kayitlar.some((k) => k?.tur === oyun.tur && k?.owner === "biz")) return;

  const metrik = bizTurEkonomiMetrikleri();
  const hedef = EKONOMI_KPI_HEDEFLERI[oyun.tur] || null;
  const netTamam = !hedef || metrik.netGelir >= hedef.netGelir;
  const bakimTamam = !hedef || metrik.bakimOran <= hedef.bakimOranMax;
  const boyutTamam = !hedef || metrik.ortBirimBoyutu >= hedef.ortBirimBoyutu;
  const durum = (netTamam && bakimTamam && boyutTamam) ? "hedefte" : "geride";

  oyun.ekonomiKpi.kayitlar.push({
    tur: oyun.tur,
    owner: "biz",
    gelir: Math.round(metrik.gelir),
    bakim: Math.round(metrik.bakim),
    netGelir: Math.round(metrik.netGelir),
    bakimOran: Number(metrik.bakimOran.toFixed(3)),
    ortBirimBoyutu: Number(metrik.ortBirimBoyutu.toFixed(2)),
    durum,
  });

  logYaz(
    `📊 KPI T${oyun.tur}: Net ${Math.round(metrik.netGelir)}₺ | Bakım/Gelir ${(metrik.bakimOran * 100).toFixed(1)}% | Ortalama grup ${metrik.ortBirimBoyutu.toFixed(1)} (${durum}).`
  );
  if (!netTamam || !bakimTamam || !boyutTamam) {
    const eksikler = [];
    if (!netTamam) eksikler.push(`net >= ${hedef.netGelir}`);
    if (!bakimTamam) eksikler.push(`bakım/gelir <= ${(hedef.bakimOranMax * 100).toFixed(0)}%`);
    if (!boyutTamam) eksikler.push(`ortalama grup >= ${hedef.ortBirimBoyutu}`);
    logYaz(`⚠ KPI hedef sapması (T${oyun.tur}): ${eksikler.join(", ")}.`);
  }
}

function kazananVarMi() {
  const sahipSay = (who) => oyun.bolgeler.filter((b) => b.owner === who).length;
  const bizS = sahipSay("biz");
  const ai1S = sahipSay("ai1");
  const ai2S = sahipSay("ai2");
  const ai3S = sahipSay("ai3");
  const toplam = oyun.bolgeler.length;

  if (bizS === 0) {
    // En çok bölgeye sahip AI kazandı
    const enCok = [{ id: 'ai1', s: ai1S }, { id: 'ai2', s: ai2S }, { id: 'ai3', s: ai3S }]
      .sort((a, b) => b.s - a.s)[0];
    return {
      bitti: true,
      kazanan: enCok.id,
      tur: oyun.tur,
      tip: "kaybettin",
    };
  }
  if (bizS === toplam)
    return { bitti: true, kazanan: "biz", tur: oyun.tur, tip: "kazandin" };

  if (ai1S === 0 && ai2S === 0 && ai3S === 0 && bizS > 0)
    return { bitti: true, kazanan: "biz", tur: oyun.tur, tip: "kazandin" };
  if (ai1S === toplam || ai2S === toplam || ai3S === toplam) {
    const k = ai1S === toplam ? "ai1" : ai2S === toplam ? "ai2" : "ai3";
    return { bitti: true, kazanan: k, tur: oyun.tur, tip: "ai-kazandi" };
  }
  return { bitti: false };
}

function turIsle() {
  oyun.tur++;
  ownerEliminasyonTick();

  const fin = kazananVarMi();
  if (fin.bitti) {
    oyun.duraklat = true;
    const isim =
      fin.kazanan === "biz"
        ? oyun.fraksiyon.biz.ad
        : oyun.fraksiyon[fin.kazanan]?.ad || fin.kazanan;
    if (fin.tip === "kazandin") {
      logYaz(`Tebrikler! ${fin.tur}. turda tüm şehir senin oldu.`);
      bitisBanner(`Kazandın!`, { tip: "kazandin", kazananAd: oyun.fraksiyon.biz.ad });
    } else if (fin.tip === "kaybettin") {
      logYaz(`Kaybettin. ${fin.tur}. turda tüm bölgeleri elinden aldılar.`);
      bitisBanner(`Kaybettin!`, { tip: "kaybettin", kazananAd: isim });
    } else {
      logYaz(`${isim} tüm şehri ele geçirdi. Oyun bitti.`);
      bitisBanner(`Oyun Bitti`, { tip: "ai-kazandi", kazananAd: isim });
    }
  }

  // Ekonomi + üretim
  oyuncuUretimTick();

  // AI ekonomi/üretim
  const aktifAiOwnerler = AI_OWNERLER.filter((owner) => ownerAktifMi(owner));
  aktifAiOwnerler.forEach((owner) => aiGelisimVeUretim(owner));

  // Oyuncu bakım maliyeti
  oyuncuBakimTick();
  ekonomiKpiTick();

  // AI araştırma ilerlemesi
  aktifAiOwnerler.forEach((owner) => aiArastirmaTick(owner));

  // AI saldırı/hareket (STACK TABANLI)
  aktifAiOwnerler.forEach((owner) => aiSaldiriHareket(owner));
  aktifAiOwnerler.forEach((owner) => aiKoordineliSaldiriDegerlendirYap(owner));

  // AI casusluk
  aktifAiOwnerler.forEach((owner) => aiCasuslukYap(owner));

  // Diplomasi turu
  const diploMesajlar = diplomasiTick();
  let diploOlayVar = false;
  diploMesajlar.forEach((ham) => {
    if (!ham) return;
    const olay = (typeof ham === "string") ? { metin: ham } : ham;
    const metin = String(olay.metin || "").trim();
    if (!metin || metin.includes("hafıza")) return;

    if (olay.popup) {
      // Teklif penceresi kuyrukta beklerken tur işlenmesin; aksi halde koalisyon nesnesi kaybolup kabul/ret boşa düşüyordu.
      if (typeof olay === "object" && olay.teklifId) {
        oyun.duraklat = true;
      }
      diploPopupKuyrugaEkle({
        ...olay,
        metin,
      });
      diploOlayVar = true;
    }

    const ittifakMesaji = /ittifak/i.test(metin);
    const logaYaz = olay.log === true || ittifakMesaji;
    if (logaYaz) {
      logYaz(`🤝 ${metin}`);
      diploOlayVar = true;
    }
  });
  if (diploOlayVar) sesCal("diplo");
  ittifakMudahaleTick();
  ittifakBozulduKontrol();

  // Rastgele olaylar
  olayTick();

  // Suçluluk ve polis baskısı
  asayisTick();

  // Yaralı iyileşme
  yaraliTick();

  // Görev kontrolü
  gorevKontrol();

  // === FAZ 5 TİCKLERİ ===
  egitimTick();       // Gençleri eğitir → Ağır Silahlı
  gecekonduTick();    // Gecekondu bölgeleri genç üretir
  sadakatTick();      // Halk sadakati → isyan riski
  const labBonus = oyun.bolgeler
    .filter((b) => b.owner === "biz")
    .reduce((toplam, b) => toplam + binaBonus(b, "arastirmaBonus"), 0);
  arastirmaTick(labBonus);    // Araştırma puanı biriktir → seviye atla

  // İstatistik kaydet + otomatik kayıt (her 10 turda slot 0'a)
  istatistikKaydet();
  otomatikKaydet();

  // birliklerin varışı & savaş
  operasyonTick();
  hareketTick();
  ownerEliminasyonTick();
  motorluHizTick();   // Eski mekanik: no-op (geriye dönük uyumluluk)
  // kritik: pause butonu handler'ı düşmesin diye tam UI yenile
  uiGuncel(callbacklar);

  // İstatistik grafik güncelle
  istatistikGrafik();
}

// === OYUN İÇİ KONTROL BUTONLARI (ses + kaydet) ===
function ensureGameControls() {
  if (document.getElementById("oyun-kontrol-bar")) return;
  tutorialArayuzKur();
  const bar = document.createElement("div");
  bar.id = "oyun-kontrol-bar";
  bar.style.cssText = "display:inline-flex;gap:4px;align-items:center;";

  const sesButon = document.createElement("button");
  sesButon.className = "buton grimsi";
  sesButon.id = "ses-btn";
  sesButon.textContent = "🔊 Ses";
  sesButon.title = "Ses Efektleri Aç/Kapat";
  sesButon.onclick = () => {
    const acik = sesDurumDegistir();
    sesButon.textContent = acik ? "🔊 Ses" : "🔇 Ses";
  };

  const muzikButon = document.createElement("button");
  muzikButon.className = "buton grimsi";
  muzikButon.id = "muzik-btn";
  muzikButon.textContent = "🎵 Müzik";
  muzikButon.title = "Arka Plan Müziği Aç/Kapat";
  muzikButon.onclick = () => {
    const acik = muzikDurumDegistir();
    muzikButon.textContent = acik ? "🎵 Müzik" : "⏹ Müzik";
  };

  const kaydetButon = document.createElement("button");
  kaydetButon.className = "buton grimsi";
  kaydetButon.title = "Oyunu Kaydet (Slot 1)";
  kaydetButon.textContent = "💾";
  kaydetButon.onclick = () => {
    renderKayitMenu(kaydetButon);
  };

  bar.appendChild(sesButon);
  bar.appendChild(muzikButon);
  bar.appendChild(kaydetButon);

  const durumSag = document.getElementById("durum-sag");
  if (durumSag) durumSag.prepend(bar);
}

function renderKayitMenu(ankorEl) {
  // Varsa önceki menüyü kapat
  const onceki = document.getElementById("kayit-menu");
  if (onceki) { onceki.remove(); return; }

  const menu = document.createElement("div");
  menu.id = "kayit-menu";
  menu.style.cssText = `
    position:fixed;background:rgba(20,20,20,0.97);border:1px solid rgba(255,255,255,0.1);
    border-radius:10px;padding:10px;z-index:800;min-width:220px;
    box-shadow:0 8px 30px rgba(0,0,0,0.6);font-size:12px;
  `;

  const kayitlar = tumKayitlar();
  [0, 1, 2].forEach((slot) => {
    const bilgi = kayitlar[slot];
    const satir = document.createElement("div");
    satir.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:6px;padding:5px 0;border-bottom:1px solid #222;";

    const solTaraf = document.createElement("div");
    if (bilgi) {
      solTaraf.innerHTML = `<div style="color:#ddd;font-weight:600">Slot ${slot + 1} — ${bilgi.ceteAdi}</div>
        <div style="color:#666;font-size:11px">Tur ${bilgi.tur} · ${bilgi.bolge} bölge · ${new Date(bilgi.tarih).toLocaleDateString("tr-TR")}</div>`;
    } else {
      solTaraf.innerHTML = `<div style="color:#555;font-style:italic">Slot ${slot + 1} — Boş</div>`;
    }

    const sagTaraf = document.createElement("div");
    sagTaraf.style.cssText = "display:flex;gap:4px;";

    const kaydetBtn = document.createElement("button");
    kaydetBtn.className = "buton";
    kaydetBtn.style.cssText = "font-size:11px;padding:3px 7px;";
    kaydetBtn.textContent = "Kaydet";
    kaydetBtn.onclick = () => {
      const basarili = oyunKaydet(slot);
      if (basarili) {
        sesCal("kaydet");
        showToast(`💾 Slot ${slot + 1}'e kaydedildi.`, 'bilgi', 2500);
      }
      menu.remove();
    };
    sagTaraf.appendChild(kaydetBtn);

    if (bilgi) {
      const silBtn = document.createElement("button");
      silBtn.className = "buton grimsi";
      silBtn.style.cssText = "font-size:11px;padding:3px 7px;";
      silBtn.textContent = "Sil";
      silBtn.onclick = () => { kayitSil(slot); menu.remove(); };
      sagTaraf.appendChild(silBtn);
    }

    satir.appendChild(solTaraf);
    satir.appendChild(sagTaraf);
    menu.appendChild(satir);
  });

  // Menüyü düğmenin yanına yerleştir
  const rect = ankorEl.getBoundingClientRect();
  menu.style.top = (rect.bottom + 6) + "px";
  menu.style.right = (window.innerWidth - rect.right) + "px";
  document.body.appendChild(menu);

  // Dışarı tıklayınca kapat
  setTimeout(() => {
    const kapat = (e) => {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click", kapat); }
    };
    document.addEventListener("click", kapat);
  }, 0);
}

// === BAŞLANGIÇ MODALİ — KAYIT SLOTLARI ===
function renderKayitSlotlari(onYukle) {
  const kap = document.getElementById("kayit-slotlari");
  if (!kap) return;
  kap.innerHTML = "";

  const kayitlar = tumKayitlar();
  const bosSayisi = kayitlar.filter((k) => !k).length;

  if (bosSayisi === 3) {
    kap.innerHTML = `<div style="color:#555;font-size:12px;text-align:center;padding:6px">Kayıtlı oyun bulunamadı.</div>`;
    return;
  }

  [0, 1, 2].forEach((slot) => {
    const bilgi = kayitlar[slot];
    if (!bilgi) return;

    const satir = document.createElement("div");
    satir.className = "kayit-slot";

    const zorlukRenk = { kolay: "#2ecc71", orta: "#f39c12", zor: "#e74c3c" }[bilgi.zorluk] || "#aaa";

    satir.innerHTML = `
      <div class="kayit-slot-bilgi">
        <div class="kayit-slot-ad">Slot ${slot + 1} — ${bilgi.ceteAdi}</div>
        <div class="kayit-slot-detay">
          Tur ${bilgi.tur} · ${bilgi.bolge} bölge ·
          <span style="color:${zorlukRenk}">${bilgi.zorluk.toUpperCase()}</span> ·
          ${new Date(bilgi.tarih).toLocaleDateString("tr-TR")}
        </div>
      </div>
      <div class="kayit-slot-butonlar">
        <button class="buton kayit-devam-btn" data-slot="${slot}">Devam Et</button>
      </div>`;

    satir.querySelector(".kayit-devam-btn").onclick = () => onYukle(slot);
    kap.appendChild(satir);
  });
}

function isimAkisi() {
  baslangicSecimModu = false;
  bekleyenBaslangicKurulumu = null;
  isimModalGoster();
  renderKayitSlotlari((slot) => {
    const basarili = oyunYukle(slot);
    if (!basarili) { showToast("Kayıt yüklenemedi.", "hata"); return; }
    baslangicSecimModu = false;
    bekleyenBaslangicKurulumu = null;

    // Yükleme sonrası map cache ve istatistik canvas sıfırla
    bolgeMapTemizle();
    istatistikSifirla();
    arastirmaDurumunuDogrula();

    isimModalKapat();
    logYaz(`💾 Slot ${slot + 1} yüklendi — "${oyun.fraksiyon.biz.ad}", Tur ${oyun.tur}`);

    document.getElementById("efs-biz").textContent = oyun.fraksiyon.biz.ad;
    document.getElementById("efs-ai1").textContent = oyun.fraksiyon.ai1?.ad || "AI1";
    document.getElementById("efs-ai2").textContent = oyun.fraksiyon.ai2?.ad || "AI2";
    document.getElementById("efs-ai3").textContent = oyun.fraksiyon.ai3?.ad || "AI3";

    oyun.duraklat = true;
    haritaCiz(onBolgeSec);
    uiGuncel(callbacklar);
    ensureGameControls();
    setTimeout(() => tutorialBaslat(), 120);
  });

  isimModalBagla(
    () => {
      document.getElementById("isim-input").value = rastgeleIsim();
      const ai1 = document.getElementById("isim-ai1");
      const ai2 = document.getElementById("isim-ai2");
      const ai3 = document.getElementById("isim-ai3");
      if (ai1) ai1.value = rastgeleIsim();
      if (ai2) ai2.value = rastgeleIsim();
      if (ai3) ai3.value = rastgeleIsim();
    },
    () => {
      const kurulum = modalAyarlariniOku();
      oyunKurulumunuBaslat(kurulum);
    },
    () => {
      haritadanBaslangicSecimiBaslat();
    },
  );
}

(function baslat() {
  durumCiz();

  haritaCiz(onBolgeSec);
  uiGuncel(callbacklar);

  // Başlangıçta duraklatılmış; modal açıkken tur akmaz
  isimAkisi();
  dongu();
})();

// Her tur: konvoylar 1 adım ilerler, hedefe varanlar durumuna göre bekler/savaşır
// --- TEST AMAÇLI BAŞLANGIÇ ASKERİ ---
