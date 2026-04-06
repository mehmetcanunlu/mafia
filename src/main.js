import { AYAR, ZORLUK, BOLGE_OZELLIKLERI, BINA_TIPLERI } from "./config.js";
import { yeniOyun } from "./state.js";
import {
  haritaCiz,
  uiGuncel,
  durumCiz,
  isimModalGoster,
  isimModalBagla,
  isimModalKapat,
  logYaz,
  bitisBanner,
} from "./ui.js";
import { callbacklar, asayisTick } from "./actions.js";
import { aiGelisimVeUretim, aiSaldiriHareket, aiArastirmaTick, aiCasuslukYap } from "./ai.js";
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
import { showToast } from "./modal.js";
import { sesCal, sesDurumDegistir, sesAcikMi, muzikDurumDegistir, muzikAcikMi } from "./audio.js";
import { oyunKaydet, oyunYukle, tumKayitlar, kayitSil, otomatikKaydet } from "./save.js";
import { bolgeMapTemizle } from "./state.js";
import { istatistikSifirla } from "./stats.js";
import { egitimTick, motorluHizTick, BIRIM_TIPLERI, grupEfektifSavunma, ownerBakimToplami } from "./units.js";
import { sadakatTick, fetihSonrasiSadakat } from "./loyalty.js";
import { arastirmaTick, arastirmaEfekt } from "./research.js";
import { liderDevreDisiMi } from "./spy.js";
import { bolgeTasitIadeEt } from "./logistics.js";

/* --- YENİ: saldırı çözümü (toplu varan birlikler) --- */
export function garnizonTemizleVeYiginaTasi() {
  oyun.bolgeler.forEach((b) => {
    const g = b.garnizon || 0;
    if (
      g > 0 &&
      (b.owner === "biz" || b.owner === "ai1" || b.owner === "ai2" || b.owner === "ai3")
    ) {
      yiginaEkle(b.id, b.owner, g, b.baslangicBirimTipi || "tetikci");
    }
    // tamamen bitir:
    delete b.garnizon;
  });
}

function konvoyTasitIade(konvoy, bolgeId) {
  if (!konvoy || bolgeId === undefined || bolgeId === null) return;
  const araba = konvoy.tasitAraba || 0;
  const motor = konvoy.tasitMotor || 0;
  if (araba <= 0 && motor <= 0) return;
  bolgeTasitIadeEt(bolgeId, araba, motor);
}

function hareketTick() {
  // 0) Yeni oluşturulan konvoyları işaretle — aynı turda hedefe varmasın
  oyun.birimler.forEach((k) => {
    if (!k._hazir) {
      // ilk kez görüyorsak, bir tur sonra hazır hale gelecek
      k._hazir = true;
      return;
    }
  });
  // 1) Hedefine ulaşmaya hazır konvoyları bul
  const varanlar = oyun.birimler.filter((k) => k._hazir && k.hedefId);

  // 2) Her konvoy için işlem
  for (const k of varanlar) {
    const hedef = bolgeById(k.hedefId);
    if (!hedef) {
      konvoyTasitIade(k, k.konumId);
      k._sil = true;
      continue;
    }

    // --- HEDEF DOST VEYA TARAFSIZ ---
    if (hedef.owner === "tarafsiz" || hedef.owner === k.owner) {
      yiginaEkle(hedef.id, k.owner, k.adet);
      konvoyTasitIade(k, hedef.id);
      k._sil = true;
      continue;
    }

    // --- SALDIRI / HAREKET ---
    // Eğer hedef bize aitse ve rota devam ediyorsa -> DURMA, DEVAM ET
    if (hedef.owner === k.owner && k.rota && k.rota.length > 0) {
      // Bir sonraki adıma geç
      k.konumId = k.hedefId;
      k.hedefId = k.rota.shift();
      k._hazir = false; // bu tur hareket etti, gelecek tur varacak
      // Log yazmaya gerek yok, transit geçiş
      continue;
    }

    // Eğer hedef bize aitse ve rota bittiyse -> YERLEŞ
    if (hedef.owner === k.owner) {
      yiginaEkle(hedef.id, k.owner, k.adet);
      konvoyTasitIade(k, hedef.id);
      logYaz(`${k.adet} birim ${hedef.ad} bölgesine ulaştı.`);
      k._sil = true;
      continue;
    }

    // Tarafsız fakat rota var -> (Normalde tarafsıza transit geçmek için savaşmak gerekmez eğer geçiş izni varsa,
    // ama bu oyunda geçiş izni yok. Tarafsız = Düşman değil ama geçilmez. 
    // FAKAT oyuncu isteği: "en kısa yoldan git". Eğer tarafsız bölgeye varırsa ne olur?
    // Oyun kuralı: Tarafsız bölgeye SADECE rüşvetle girilir. Savaşla girilmez (kodda engelli).
    // Bu yüzden rota tarafsızdan geçemez. BFS while loop tarafsıza takılabilir.
    // Şimdilik: Tarafsıza geldiyse durur.)
    if (hedef.owner === "tarafsiz") {
      logYaz("Tarafsız bölgeye çarpıldı, hareket durdu.");
      konvoyTasitIade(k, k.konumId);
      k._sil = true; // Yolda kaldı veya geri döndü
      continue;
    }

    // Düşmansa -> SAVAŞ
    // ... Savaş kodu aynı kalır ...
    // SADECE: Savaş KAZANILIRSA ve rota varsa -> Devam etmeli mi?
    // Genelde fetih sonrası garnizon bırakılır ve durulur. 
    // Ama "yola devam et" emri varsa?
    // Şimdilik: Fetih yapıldıysa orada dursun. Rota iptal.
    // ÇÜNKÜ: Fetih sonrası orası bizim olur, bir sonraki tur devam etmek için yeni emir gerekir.
    // VEYA: main loop'ta "fetih sonrası kalanlar rotaya devam etsin" diyebiliriz.
    // Kodda savas cozumune bakalim.


    // --- HEDEF DÜŞMAN: SAVAŞ ---
    const savunanBirimler = oyun.birimler.filter((x) => x.konumId === hedef.id && x.owner === hedef.owner);
    // Birim tipi çarpanı ile efektif savunma gücü
    const savunan = grupEfektifSavunma(savunanBirimler);

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
    const p = savasKazanmaIhtimali(efektifAdet, savunan, guv);
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
      const savunanStackler = oyun.birimler.filter(
        (x) => x.konumId === hedef.id && x.owner === oncekiOwner
      );
      const savunanToplam = savunanStackler.reduce(
        (t, x) => t + (x.adet || 0), 0
      );

      const defKalan = Math.round(savunanToplam * (0.1 + Math.random() * 0.1));

      // Esir oluştur (savunan kayıplarının %10'u)
      const esirAdet = Math.round((savunanToplam - defKalan) * 0.10);
      if (esirAdet > 0) {
        oyun.esirler.push({ owner: oncekiOwner, tutulan: k.owner, adet: esirAdet });
        logYaz(`⛓️ ${esirAdet} düşman esir alındı!`);
      }

      hedef.owner = k.owner;
      fetihSonrasiSadakat(hedef.id);
      savunanStackler.forEach((x) => (x._sil = true));

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
        });
        logYaz(`${hedef.ad} düştü; ${defKalan} kişi ${bolgeById(kacisId).ad} bölgesine kaçtı.`);
      } else if (defKalan > 0) {
        logYaz(`${hedef.ad} düştü; kaçacak yer yoktu, ${defKalan} kişi imha edildi.`);
      }

      yiginaEkle(hedef.id, k.owner, kalanAtk);
      konvoyTasitIade(k, hedef.id);
      logYaz(`${hedef.ad} fethedildi! (${oncekiOwner} -> ${k.owner})`);

      // İstatistik güncelle + ses + toast
      if (k.owner === "biz") {
        oyun.istatistikler.kazanilanSavaslar++;
        oyun.istatistikler.fetihler++;
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

      const savunanlar = oyun.birimler.filter(
        (x) => x.konumId === hedef.id && x.owner === hedef.owner
      );
      const defKayip = Math.round(savunan * (0.25 + Math.random() * 0.2));
      savunanlar.forEach((x) => {
        const oran = x.adet / savunan;
        x.adet -= Math.round(defKayip * oran);
        if (x.adet <= 0) x._sil = true;
      });

      if (kalan > 0) {
        const kacis = (oyun.komsu[hedef.id] || []).find(
          (id) => bolgeById(id)?.owner === k.owner
        );
        if (kacis) {
          yiginaEkle(kacis, k.owner, kalan);
          konvoyTasitIade(k, kacis);
        }
      }
      logYaz(`${hedef.ad} saldırısı püskürtüldü.`);
      oyun.sohret[k.owner] = (oyun.sohret[k.owner] || 0) + 1;

      // === SAVAŞ ANİMASYONU: PÜSKÜRTME ===
      savasAnimasyonu(hedef.id, "puskurtme", atkKayip);
    }

    k._sil = true;
  }

  // 3) Temizlik
  oyun.birimler = oyun.birimler.filter((k) => !k._sil && k.adet > 0);

  // 4) UI güncelle
  uiGuncel(callbacklar);
}

function dongu() {
  if (!oyun.duraklat) {
    turIsle();
  }
  // hız = temel_sure / hizKatsayi (alt sınır 50ms)
  const gecikme = Math.max(
    50,
    Math.round(AYAR.turSuresiMs / (oyun.hizKatsayi || 1))
  );

  setTimeout(dongu, gecikme);
}

// rastgeleIsim artık utils.js'den geliyor, geriye dönük uyumluluk için re-export
export { rastgeleIsim } from "./utils.js";

function onBolgeSec(id) {
  // Bekleyen hareket emri varsa tıklanan bölgeyi hedef olarak işle.
  if (oyun.hareketEmri) {
    hareketEmriHedefSec(id);
    return;
  }
  oyun.seciliId = id;
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

function geceEkonomiBonusu(b) {
  if (b.owner !== "biz") return 0;
  if (b.ozellik !== "kumarhane" && b.ozellik !== "carsi") return 0;
  return arastirmaEfekt("geceEkonomiBonus");
}

function gencBirimiOlustur(owner, bolgeId, adet = 1) {
  if (adet <= 0) return;
  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner,
    adet,
    tip: "genc",
    konumId: bolgeId,
    hedefId: null,
    rota: [],
    durum: "bekle",
    egitimKalan: BIRIM_TIPLERI.genc.egitimTur,
  });
}

function gecekonduTick() {
  if (oyun.tur % 4 !== 0) return;
  oyun.bolgeler.forEach((b) => {
    if (b.owner === "tarafsiz" || b.ozellik !== "gecekondu") return;
    gencBirimiOlustur(b.owner, b.id, 1);
    if (b.owner === "biz") logYaz(`🏘️ ${b.ad} gecekondu ağı 1 genç eleman çıkardı.`);
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

  // Adam üretimi (her 5 turda bir) — lider + bölge bonusları dahil
  if (oyun.tur % 5 === 0) {
    const adamLider = 1 + liderBonus("biz", "adamCarpani");
    bizBolgeler.forEach((b) => {
      const bolgeBonus = 1 + bolgeOzellikBonus(b, "uretimBonus") + binaBonus(b, "uretimBonus");
      const carp = (1 + b.yAdam * 0.7) * sohretCarpani("biz") * adamLider * bolgeBonus;
      let aday = Math.max(0, Math.round(((b.nufus || 0) / 35) * carp));
      aday = Math.min(aday, b.nufus || 0);
      if (aday > 0) {
        yiginaEkle(b.id, "biz", aday);
        b.nufus -= aday;
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
        yiginaEkle(dost.id, y.owner, y.adet);
        logYaz(`🏥 ${y.adet} yaralı iyileşti ve ${dost.ad} bölgesine döndü. (${oyun.fraksiyon[y.owner]?.ad || y.owner})`);
      }
      return false;
    }
    return true;
  });
}

function oyuncuBakimTick() {
  const gider = ownerBakimToplami("biz");
  if (gider <= 0) return;
  oyun.fraksiyon.biz.para -= gider;
  if (oyun.fraksiyon.biz.para < 0) {
    oyun.bolgeler
      .filter((b) => b.owner === "biz" && (b.garnizon || 0) > 0)
      .forEach((b) => { b.garnizon = Math.max(0, Math.floor((b.garnizon || 0) * 0.95)); });
    oyun.birimler
      .filter((u) => u.owner === "biz")
      .forEach((u) => { u.adet = Math.max(1, Math.floor(u.adet * 0.95)); });
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
  aiGelisimVeUretim("ai1");
  aiGelisimVeUretim("ai2");
  aiGelisimVeUretim("ai3");

  // Oyuncu bakım maliyeti
  oyuncuBakimTick();

  // AI araştırma ilerlemesi
  aiArastirmaTick("ai1");
  aiArastirmaTick("ai2");
  aiArastirmaTick("ai3");

  // AI saldırı/hareket (STACK TABANLI)
  aiSaldiriHareket("ai1");
  aiSaldiriHareket("ai2");
  aiSaldiriHareket("ai3");

  // AI casusluk
  aiCasuslukYap("ai1");
  aiCasuslukYap("ai2");
  aiCasuslukYap("ai3");

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
  hareketTick();
  motorluHizTick();   // Eski mekanik: no-op (geriye dönük uyumluluk)
  // kritik: pause butonu handler'ı düşmesin diye tam UI yenile
  uiGuncel(callbacklar);

  // İstatistik grafik güncelle
  istatistikGrafik();
}

// === OYUN İÇİ KONTROL BUTONLARI (ses + kaydet) ===
function ensureGameControls() {
  if (document.getElementById("oyun-kontrol-bar")) return;
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
  isimModalGoster();
  renderKayitSlotlari((slot) => {
    const basarili = oyunYukle(slot);
    if (!basarili) { showToast("Kayıt yüklenemedi.", "hata"); return; }

    // Yükleme sonrası map cache ve istatistik canvas sıfırla
    bolgeMapTemizle();
    istatistikSifirla();

    isimModalKapat();
    logYaz(`💾 Slot ${slot + 1} yüklendi — "${oyun.fraksiyon.biz.ad}", Tur ${oyun.tur}`);

    document.getElementById("efs-biz").textContent = oyun.fraksiyon.biz.ad;
    document.getElementById("efs-ai1").textContent = oyun.fraksiyon.ai1?.ad || "AI1";
    document.getElementById("efs-ai2").textContent = oyun.fraksiyon.ai2?.ad || "AI2";
    document.getElementById("efs-ai3").textContent = oyun.fraksiyon.ai3?.ad || "AI3";

    durumCiz();
    haritaCiz(onBolgeSec);
    uiGuncel(callbacklar);
    ensureGameControls();
    oyun.duraklat = false;
    durumCiz();
  });

  isimModalBagla(
    () => {
      // Rastgele
      const ad = rastgeleIsim();
      document.getElementById("isim-input").value = ad;
    },
    () => {
      // Başla
      const inp = document.getElementById("isim-input");
      const zor = document.getElementById("zorluk").value;
      const size = "istanbul-buyuk";

      const ad = inp.value.trim().length ? inp.value.trim() : rastgeleIsim();
      yeniOyun({ zorluk: zor, mapSize: size });
      oyun.fraksiyon.biz.ad = ad;

      document.getElementById("efs-biz").textContent = ad;
      document.getElementById("efs-ai1").textContent = oyun.fraksiyon.ai1.ad;
      document.getElementById("efs-ai2").textContent = oyun.fraksiyon.ai2.ad;
      document.getElementById("efs-ai3").textContent = oyun.fraksiyon.ai3.ad;

      isimModalKapat();
      logYaz(
        `Çete: "${ad}", zorluk: "${zor.toUpperCase()}", harita: İstanbul (Büyük).`
      );
      durumCiz();
      haritaCiz(onBolgeSec);
      uiGuncel(callbacklar);
      ensureGameControls();

      oyun.duraklat = false;
      durumCiz();
      hareketTick();
    }
  );
}

(function baslat() {
  durumCiz();

  haritaCiz(onBolgeSec);
  uiGuncel(callbacklar);

  // Başlangıçta duraklatılmış; modal açıkken tur akmaz
  isimAkisi();
  garnizonTemizleVeYiginaTasi();
  dongu();
})();

// Her tur: konvoylar 1 adım ilerler, hedefe varanlar durumuna göre bekler/savaşır
// --- TEST AMAÇLI BAŞLANGIÇ ASKERİ ---
