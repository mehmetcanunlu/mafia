// animations.js — Savaş ve harita animasyonları
import { oyun, bolgeById } from "./state.js";

// === SAVAŞ ANİMASYONU ===
// tip: "fetih" | "savunma" | "puskurtme"
export function savasAnimasyonu(bolgeId, tip, hasar = 0) {
    const el = document.getElementById("bolge-" + bolgeId);
    if (!el) return;

    // CSS sınıfı ekle
    const siniflar = {
        fetih: "anim-fetih",
        savunma: "anim-savunma",
        puskurtme: "anim-puskurtme",
    };
    const sinif = siniflar[tip] || "anim-puskurtme";
    el.classList.add(sinif);

    // Particle emojisi
    const emojiler = { fetih: "⚔️", savunma: "💥", puskurtme: "🛡️" };
    const emoji = emojiler[tip] || "💥";

    // Floating emoji particle
    const particle = document.createElement("div");
    particle.className = "savas-particle";
    particle.textContent = emoji;
    el.appendChild(particle);

    // Floating hasar text
    if (hasar > 0) {
        const hasarEl = document.createElement("div");
        hasarEl.className = "hasar-float";
        hasarEl.textContent = `-${hasar}`;
        el.appendChild(hasarEl);
        setTimeout(() => hasarEl.remove(), 1200);
    }

    // Temizlik
    setTimeout(() => {
        el.classList.remove(sinif);
        particle.remove();
    }, 900);
}

// === KONVOY ROKET ANİMASYONU (saldırı başlatıldığında) ===
export function konvoyBaslaAnimasyonu(kaynakId) {
    const el = document.getElementById("bolge-" + kaynakId);
    if (!el) return;
    el.classList.add("konvoy-cikis");
    setTimeout(() => el.classList.remove("konvoy-cikis"), 600);
}

// === BÖLGE EL DEĞİŞTİRME FLASH ===
export function elDegistirmeFlash(bolgeId) {
    const el = document.getElementById("bolge-" + bolgeId);
    if (!el) return;
    el.classList.add("anim-el-degistir");
    setTimeout(() => el.classList.remove("anim-el-degistir"), 800);
}
