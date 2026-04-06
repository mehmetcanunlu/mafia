import { oyun, bolgeById, yiginaEkle } from "./state.js";
import { GOREV_AYAR } from "./config.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";

// === GÖREV HAVUZU ===
const GOREV_SABLONLARI = [
    {
        tip: "fetih",
        olustur() {
            const tarafsiz = oyun.bolgeler.filter((b) => b.owner === "tarafsiz");
            const dusmanlar = oyun.bolgeler.filter(
                (b) => b.owner !== "biz" && b.owner !== "tarafsiz"
            );
            const adaylar = [...tarafsiz, ...dusmanlar];
            if (!adaylar.length) return null;
            const b = adaylar[Math.floor(Math.random() * adaylar.length)];
            return {
                id: `g${++oyun.birimSayac}`,
                tip: "fetih",
                ad: `${b.ad} bölgesini fethet`,
                hedefBolge: b.id,
                kalanTur: 15,
                odul: { para: 500, sohret: 10 },
            };
        },
        kontrol(g) {
            const b = bolgeById(g.hedefBolge);
            return b && b.owner === "biz";
        },
    },
    {
        tip: "savunma",
        olustur() {
            const bizB = oyun.bolgeler.filter((b) => b.owner === "biz");
            if (!bizB.length) return null;
            const b = bizB[Math.floor(Math.random() * bizB.length)];
            return {
                id: `g${++oyun.birimSayac}`,
                tip: "savunma",
                ad: `${b.ad} bölgesini 10 tur koru`,
                hedefBolge: b.id,
                kalanTur: 10,
                _baslangicTur: oyun.tur,
                odul: { para: 300, sohret: 5 },
            };
        },
        kontrol(g) {
            const b = bolgeById(g.hedefBolge);
            // 10 tur boyunca korunmuşsa başarılı
            return b && b.owner === "biz" && oyun.tur >= (g._baslangicTur || 0) + 10;
        },
    },
    {
        tip: "ekonomi",
        olustur() {
            const hedef = 1500 + Math.floor(Math.random() * 1000);
            return {
                id: `g${++oyun.birimSayac}`,
                tip: "ekonomi",
                ad: `${hedef}₺ biriktir`,
                hedefPara: hedef,
                kalanTur: 20,
                odul: { adam: 15 },
            };
        },
        kontrol(g) {
            return oyun.fraksiyon.biz.para >= g.hedefPara;
        },
    },
    {
        tip: "coklu_fetih",
        olustur() {
            const mevcut = oyun.bolgeler.filter((b) => b.owner === "biz").length;
            return {
                id: `g${++oyun.birimSayac}`,
                tip: "coklu_fetih",
                ad: `${mevcut + 2} bölgeye ulaş`,
                hedefSayi: mevcut + 2,
                kalanTur: 25,
                odul: { para: 800 },
            };
        },
        kontrol(g) {
            return oyun.bolgeler.filter((b) => b.owner === "biz").length >= g.hedefSayi;
        },
    },
];

// === GÖREV TICK ===
export function gorevKontrol() {
    // Aktif görevleri kontrol et
    oyun.gorevler.aktif = oyun.gorevler.aktif.filter((g) => {
        // Tamamlandı mı?
        const sablon = GOREV_SABLONLARI.find((s) => s.tip === g.tip);
        if (sablon && sablon.kontrol(g)) {
            // Ödül ver
            if (g.odul.para) oyun.fraksiyon.biz.para += g.odul.para;
            if (g.odul.sohret) oyun.sohret.biz = (oyun.sohret.biz || 0) + g.odul.sohret;
            if (g.odul.adam) {
                const bizB = oyun.bolgeler.find((b) => b.owner === "biz");
                if (bizB) yiginaEkle(bizB.id, "biz", g.odul.adam);
            }
            logYaz(`✅ Görev tamamlandı: "${g.ad}" — Ödül alındı!`);
            showToast(`✅ Görev tamamlandı: ${g.ad}`, 'gorev', 4500);
            oyun.gorevler.tamamlanan.push({ ...g, tamamlanmaTur: oyun.tur });
            return false;
        }

        // Süre doldu mu?
        g.kalanTur--;
        if (g.kalanTur <= 0) {
            logYaz(`❌ Görev başarısız: "${g.ad}" — Süre doldu!`);
            return false;
        }
        return true;
    });

    // Yeni görev oluşturma (her N turda)
    if (
        oyun.tur % GOREV_AYAR.yeniGorevAra === 0 &&
        oyun.gorevler.aktif.length < GOREV_AYAR.maxAktif
    ) {
        // Rastgele bir şablon seç
        const shuffled = GOREV_SABLONLARI.sort(() => Math.random() - 0.5);
        for (const sablon of shuffled) {
            const gorev = sablon.olustur();
            if (gorev) {
                oyun.gorevler.aktif.push(gorev);
                logYaz(`📋 Yeni görev: "${gorev.ad}" (${gorev.kalanTur} tur)`);
                break;
            }
        }
    }
}
