// stats.js — İstatistik takip ve grafik çizim modülü
import { oyun } from "./state.js";

// Dirty flag — sadece veri değiştiğinde grafik yeniden çizilir
let _dirty = false;
export function istatistikDirtyIsaretle() { _dirty = true; }

// Tur bazlı veri deposu
export const istatistik = {
    turlar: [],
    gelir: [],
    gider: [],
    kayip: [],
    kazanc: [],
    para: [],
    bolge: [],
};

// Her turda çağrılır — o turki anlık durumu kaydet
export function istatistikKaydet() {
    const biz = oyun.fraksiyon.biz;
    if (!biz) return;

    const bizBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
    const turGelir = bizBolgeler.reduce((t, b) => t + (b.gelir || 0) * (1 + (b.yGel || 0) * 0.5), 0);

    // Gider = saldırı/yatırım maliyetleri (fark hesabı)
    const oncekiPara = istatistik.para.length > 0 ? istatistik.para[istatistik.para.length - 1] : biz.para;
    const fark = Math.floor(biz.para) - oncekiPara;
    const turGider = Math.max(0, turGelir - fark); // gelirden fazla harcamışsak

    // Kayıp/kazanç: birim sayısı değişimi
    const toplamBirim = oyun.birimler
        .filter((k) => k.owner === "biz")
        .reduce((t, k) => t + k.adet, 0);
    const oncekiBirim = istatistik.kazanc.length > 0
        ? istatistik.kazanc[istatistik.kazanc.length - 1]
        : toplamBirim;

    istatistik.turlar.push(oyun.tur);
    istatistik.gelir.push(Math.round(turGelir));
    istatistik.gider.push(Math.round(turGider));
    istatistik.kayip.push(Math.max(0, oncekiBirim - toplamBirim));
    istatistik.kazanc.push(toplamBirim);
    istatistik.para.push(Math.floor(biz.para));
    istatistik.bolge.push(bizBolgeler.length);
    _dirty = true;

    // Son 60 tur sakla
    if (istatistik.turlar.length > 60) {
        for (const key of Object.keys(istatistik)) {
            istatistik[key] = istatistik[key].slice(-60);
        }
    }
}

// Canvas grafiği çiz — sadece veri değiştiğinde
export function istatistikGrafik() {
    if (!_dirty) return;
    _dirty = false;
    const canvas = document.getElementById("istatistik-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = canvas.parentElement?.clientWidth || 320;
    const H = canvas.height = 140;

    ctx.clearRect(0, 0, W, H);

    const gelirlar = istatistik.gelir;
    const paralar = istatistik.para;
    const bolgeler = istatistik.bolge;
    if (gelirlar.length < 2) {
        ctx.fillStyle = "#666";
        ctx.font = "12px Arial";
        ctx.fillText("Yeterli veri yok (min 2 tur)", 10, 30);
        return;
    }

    // Arka plan
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    // Grid çizgileri
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < H; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    const n = gelirlar.length;
    const dx = W / (n - 1 || 1);

    // Gelir çizgisi (yeşil)
    drawLine(ctx, gelirlar, n, dx, H, "#2ecc71", "Gelir");
    // Para çizgisi (sarı, ikincil eksen)
    drawLine(ctx, paralar, n, dx, H, "#f1c40f", "Para");
    // Bölge çizgisi (mavi)
    drawLine(ctx, bolgeler, n, dx, H, "#3498db", "Bölge");

    // Legend
    ctx.font = "10px Arial";
    const legends = [
        { renk: "#2ecc71", ad: "Gelir" },
        { renk: "#f1c40f", ad: "Para" },
        { renk: "#3498db", ad: "Bölge" },
    ];
    let lx = 6;
    legends.forEach((l) => {
        ctx.fillStyle = l.renk;
        ctx.fillRect(lx, 4, 12, 8);
        ctx.fillStyle = "#ccc";
        ctx.fillText(l.ad, lx + 16, 12);
        lx += ctx.measureText(l.ad).width + 28;
    });

    // Son değerler
    ctx.fillStyle = "#aaa";
    ctx.font = "10px Arial";
    ctx.fillText(`Tur: ${istatistik.turlar[n - 1]}`, W - 60, 12);
}

function drawLine(ctx, data, n, dx, H, color) {
    const max = Math.max(1, ...data);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = i * dx;
        const y = H - 16 - ((data[i] / max) * (H - 28));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Gradient fill altında
    ctx.globalAlpha = 0.12;
    ctx.lineTo((n - 1) * dx, H - 16);
    ctx.lineTo(0, H - 16);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
}

// Sıfırla
export function istatistikSifirla() {
    for (const key of Object.keys(istatistik)) {
        istatistik[key] = [];
    }
    _dirty = false;
}
