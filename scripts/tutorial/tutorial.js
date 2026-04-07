import { oyun } from "../../src/state.js";
import { uiGuncel } from "../../src/ui.js";
import { callbacklar } from "../../src/actions.js";
import { showToast } from "../../src/modal.js";
import { ARASTIRMA_DALLARI } from "../../src/research.js";
import { tutorialAdimConfigOlustur } from "./tutorial.config.js";

const TUTORIAL_STORAGE_KEY = "mafia_tutorial_tamamlandi_v3";

const tutorialDurum = {
  aktif: false,
  adim: 0,
  oncekiDuraklat: false,
  adimlar: [],
  hedefEl: null,
  arastirmaTikIlerleLock: false,
  konumTakipTimer: null,
};

function tutorialTamamlandiMi() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function tutorialDurumKaydet(tamamlandi) {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, tamamlandi ? "1" : "0");
  } catch {
    // localStorage engelli olabilir; sessizce devam et.
  }
}

export function tutorialArayuzKur() {
  if (document.getElementById("tutorial-arka")) return;
  const wrap = document.createElement("div");
  wrap.id = "tutorial-arka";
  wrap.style.cssText = `
    display:none;position:fixed;inset:0;background:transparent;
    z-index:1600;padding:0;
  `;
  wrap.innerHTML = `
    <div id="tutorial-vurgu" style="
      position:fixed;display:none;pointer-events:none;
      border:2px solid rgba(241, 196, 15, 0.95);
      box-shadow:0 0 0 9999px rgba(0,0,0,0.58), 0 0 18px rgba(241,196,15,0.55);
      border-radius:10px;z-index:1601;
    "></div>
    <div id="tutorial-kutu" style="
      position:fixed;
      width:min(460px, 94vw);
      background:linear-gradient(180deg, rgba(24,24,24,0.98), rgba(15,15,15,0.98));
      border:1px solid rgba(255,255,255,0.12);
      border-radius:14px;
      box-shadow:0 22px 60px rgba(0,0,0,0.55);
      padding:18px 18px 14px 18px;
      z-index:1602;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <strong id="tutorial-baslik" style="font-size:16px;color:#fff;"></strong>
        <span id="tutorial-adim" style="font-size:12px;color:#9fb0c3;"></span>
      </div>
      <div id="tutorial-icerik" style="font-size:13px;line-height:1.6;color:#d7dee6;margin-bottom:14px;"></div>
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <button class="buton grimsi" id="tutorial-atla">Tutorialı Atla</button>
        <div style="display:flex;gap:8px;">
          <button class="buton grimsi" id="tutorial-geri">Geri</button>
          <button class="buton" id="tutorial-ileri">İleri</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const atla = document.getElementById("tutorial-atla");
  const geri = document.getElementById("tutorial-geri");
  const ileri = document.getElementById("tutorial-ileri");
  if (atla) {
    atla.onclick = () => {
      tutorialKapat({ tamamlandi: true });
      showToast("Tutorial kapatıldı. Üst bardan tekrar açabilirsin.", "bilgi", 2600);
    };
  }
  if (geri) geri.onclick = tutorialGeri;
  if (ileri) ileri.onclick = tutorialIleri;

  if (!document.body.dataset.tutorialEscBagli) {
    document.body.dataset.tutorialEscBagli = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && tutorialDurum.aktif) {
        tutorialKapat({ tamamlandi: true });
        return;
      }
      if (e.key === "Enter" && tutorialDurum.aktif) {
        const aktifEl = document.activeElement;
        const yazimAlani =
          aktifEl &&
          (aktifEl.tagName === "INPUT" ||
            aktifEl.tagName === "TEXTAREA" ||
            aktifEl.isContentEditable);
        if (yazimAlani) return;
        e.preventDefault();
        tutorialIleri();
      }
    });
    window.addEventListener("resize", () => {
      if (tutorialDurum.aktif) tutorialKonumGuncelle();
    });
    document.addEventListener(
      "scroll",
      () => {
        if (tutorialDurum.aktif) tutorialKonumGuncelle();
      },
      true
    );
    document.addEventListener(
      "click",
      (e) => {
        const hedef = e.target;
        if (!hedef || typeof hedef.closest !== "function") return;
        const arastirmaTik = hedef.closest("#arastirma-sayfa-btn, #btn-arastirma-sayfa");
        if (!arastirmaTik) return;
        tutorialArastirmaTikindaIlerle();
      },
      true
    );
  }
}

function tutorialAdimlariniOlustur() {
  const adimConfigleri = tutorialAdimConfigOlustur(ARASTIRMA_DALLARI);
  return adimConfigleri.map((kayit) => {
    const adim = { ...kayit };
    if (adim.girisAksiyonu === "sekmeAc" && adim.sekme) {
      adim.giris = () => tutorialSagSekmeAc(adim.sekme);
    } else if (adim.girisAksiyonu === "islemlerSekmesiAc") {
      adim.giris = () => {
        tutorialOyuncuBolgesiSec();
        tutorialSagSekmeAc("islemler");
      };
    } else if (adim.girisAksiyonu === "arastirmaAc") {
      adim.giris = () => tutorialArastirmaAgaciAc();
    } else if (adim.girisAksiyonu === "arastirmaKapat") {
      adim.giris = () => tutorialArastirmaAgaciKapat();
    }
    if (adim.ilerlemeKontrol === "arastirmaAcikMi") {
      adim.ilerlemeKontrol = () => tutorialArastirmaAcikMi();
    }
    delete adim.girisAksiyonu;
    delete adim.sekme;
    return adim;
  });
}

function tutorialAktifAdim() {
  return tutorialDurum.adimlar[tutorialDurum.adim];
}

function tutorialOyuncuBolgesiSec() {
  if (oyun.seciliId) return;
  const bolge = oyun.bolgeler.find((b) => b.owner === "biz") || oyun.bolgeler[0];
  if (!bolge) return;
  oyun.seciliId = bolge.id;
  uiGuncel(callbacklar);
}

function tutorialSagSekmeAc(sekme) {
  const btn = document.querySelector(`.sag-sekme[data-sekme="${sekme}"]`);
  if (btn) btn.click();
}

function tutorialArastirmaAgaciAc() {
  if (tutorialArastirmaAcikMi()) return;
  const ustBtn = document.getElementById("arastirma-sayfa-btn");
  if (ustBtn) {
    if (typeof ustBtn.onclick === "function") ustBtn.onclick();
    ustBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }
  const panelBtn = document.getElementById("btn-arastirma-sayfa");
  if (panelBtn) {
    if (typeof panelBtn.onclick === "function") panelBtn.onclick();
    panelBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }
  tutorialArastirmaAcilanaKadarDene(0);
}

function tutorialArastirmaAgaciKapat() {
  const kapatBtn = document.getElementById("arastirma-sayfa-kapat");
  if (kapatBtn) kapatBtn.click();
}

function tutorialArastirmaAcikMi() {
  const sayfa = document.getElementById("arastirma-sayfa");
  return !!(sayfa && sayfa.classList.contains("acik"));
}

function tutorialArastirmaAcilanaKadarDene(deneme = 0) {
  if (tutorialArastirmaAcikMi()) return;
  if (deneme >= 8) return;
  setTimeout(() => {
    if (tutorialArastirmaAcikMi()) return;
    const ustBtn = document.getElementById("arastirma-sayfa-btn");
    if (ustBtn) {
      if (typeof ustBtn.onclick === "function") ustBtn.onclick();
      ustBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
    const panelBtn = document.getElementById("btn-arastirma-sayfa");
    if (panelBtn) {
      if (typeof panelBtn.onclick === "function") panelBtn.onclick();
      panelBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
    tutorialArastirmaAcilanaKadarDene(deneme + 1);
  }, 120);
}

function tutorialArastirmaTikindaIlerle() {
  if (!tutorialDurum.aktif) return;
  const kayit = tutorialAktifAdim();
  if (!kayit?.arastirmaTiklaIlerle) return;
  if (tutorialDurum.arastirmaTikIlerleLock) return;
  tutorialDurum.arastirmaTikIlerleLock = true;

  tutorialArastirmaAgaciAc();
  const dene = (kalan = 12) => {
    if (!tutorialDurum.aktif) {
      tutorialDurum.arastirmaTikIlerleLock = false;
      return;
    }
    const aktifKayit = tutorialAktifAdim();
    if (!aktifKayit?.arastirmaTiklaIlerle) {
      tutorialDurum.arastirmaTikIlerleLock = false;
      return;
    }
    if (tutorialArastirmaAcikMi()) {
      tutorialDurum.arastirmaTikIlerleLock = false;
      tutorialIleri();
      return;
    }
    if (kalan <= 0) {
      tutorialDurum.arastirmaTikIlerleLock = false;
      showToast("Araştırma ekranı açılamadı, tekrar deneyebilirsin.", "uyari", 1800);
      return;
    }
    setTimeout(() => dene(kalan - 1), 90);
  };
  setTimeout(() => dene(12), 50);
}

function tutorialBirlesikRect(hedefler) {
  if (!hedefler || hedefler.length === 0) return null;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  hedefler.forEach((el) => {
    if (!el) return;
    const stil = window.getComputedStyle(el);
    if (stil.display === "none" || stil.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  });
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function tutorialKonumla(vurguRect, referansRect = null) {
  const wrap = document.getElementById("tutorial-arka");
  const kutu = document.getElementById("tutorial-kutu");
  const vurgu = document.getElementById("tutorial-vurgu");
  if (!kutu || !vurgu) return;

  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const kutuW = Math.min(460, vw - pad * 2);
  kutu.style.width = `${kutuW}px`;

  if (!vurguRect) {
    if (wrap) wrap.style.background = "rgba(0,0,0,0.7)";
    vurgu.style.display = "none";
    kutu.style.left = `${Math.max(pad, Math.round((vw - kutuW) / 2))}px`;
    kutu.style.top = `${Math.max(pad, Math.round(vh * 0.14))}px`;
    return;
  }
  if (wrap) wrap.style.background = "transparent";

  const anchor = referansRect || vurguRect;
  const genislik = Math.max(24, vurguRect.width + 10);
  const yukseklik = Math.max(24, vurguRect.height + 10);
  const left = Math.max(0, vurguRect.left - 5);
  const top = Math.max(0, vurguRect.top - 5);
  vurgu.style.display = "block";
  vurgu.style.left = `${left}px`;
  vurgu.style.top = `${top}px`;
  vurgu.style.width = `${Math.min(vw - left, genislik)}px`;
  vurgu.style.height = `${Math.min(vh - top, yukseklik)}px`;

  const kutuH = kutu.offsetHeight || 240;
  const altBosluk = vh - anchor.bottom;
  const ustBosluk = anchor.top;
  let kutuTop = anchor.bottom + 12;
  if (altBosluk < kutuH + 20 && ustBosluk > kutuH + 20) {
    kutuTop = anchor.top - kutuH - 12;
  }
  kutuTop = Math.max(pad, Math.min(vh - kutuH - pad, kutuTop));

  const hedefMerkez = anchor.left + anchor.width / 2;
  let kutuLeft = hedefMerkez - kutuW / 2;
  kutuLeft = Math.max(pad, Math.min(vw - kutuW - pad, kutuLeft));

  kutu.style.left = `${Math.round(kutuLeft)}px`;
  kutu.style.top = `${Math.round(kutuTop)}px`;
}

function tutorialKonumGuncelle() {
  const kayit = tutorialAktifAdim();
  if (!kayit) return;
  const hedefler = [];
  if (Array.isArray(kayit.hedefSeciciler)) {
    kayit.hedefSeciciler.forEach((secici) => {
      const el = document.querySelector(secici);
      if (el) hedefler.push(el);
    });
  }
  const anaHedef = kayit.hedefSecici ? document.querySelector(kayit.hedefSecici) : null;
  if (anaHedef && !hedefler.includes(anaHedef)) hedefler.push(anaHedef);

  const vurguRect = tutorialBirlesikRect(hedefler);
  const referansRect = anaHedef?.getBoundingClientRect?.() || vurguRect;
  tutorialDurum.hedefEl = anaHedef || hedefler[0] || null;
  tutorialKonumla(vurguRect, referansRect);
}

function tutorialKonumTakibiBaslat(adet = 16, aralikMs = 80) {
  if (tutorialDurum.konumTakipTimer) {
    clearInterval(tutorialDurum.konumTakipTimer);
    tutorialDurum.konumTakipTimer = null;
  }
  let kalan = adet;
  tutorialDurum.konumTakipTimer = setInterval(() => {
    if (!tutorialDurum.aktif) {
      clearInterval(tutorialDurum.konumTakipTimer);
      tutorialDurum.konumTakipTimer = null;
      return;
    }
    tutorialKonumGuncelle();
    kalan -= 1;
    if (kalan <= 0) {
      clearInterval(tutorialDurum.konumTakipTimer);
      tutorialDurum.konumTakipTimer = null;
    }
  }, aralikMs);
}

function tutorialArastirmaAdimScrollAyarla(kayit) {
  if (!kayit?.hedefSecici || !kayit.hedefSecici.startsWith(".arastirma-matris-dal")) return;
  if (tutorialDurum.adim < 10) return;
  const govde = document.getElementById("arastirma-sayfa-govde");
  const hedef = document.querySelector(kayit.hedefSecici);
  if (!govde || !hedef) return;

  const hedefRect = hedef.getBoundingClientRect();
  const govdeRect = govde.getBoundingClientRect();
  const dalYuksekligi = Math.max(hedef.offsetHeight || 0, 120);
  const hedefTopGovdeIci = hedefRect.top - govdeRect.top + govde.scrollTop;
  const hedefScrollTop = Math.max(0, hedefTopGovdeIci - dalYuksekligi);

  govde.scrollTo({ top: hedefScrollTop, behavior: "smooth" });
}

function tutorialGuncelle() {
  const baslik = document.getElementById("tutorial-baslik");
  const adim = document.getElementById("tutorial-adim");
  const icerik = document.getElementById("tutorial-icerik");
  const geri = document.getElementById("tutorial-geri");
  const ileri = document.getElementById("tutorial-ileri");
  const wrap = document.getElementById("tutorial-arka");
  const kutu = document.getElementById("tutorial-kutu");
  const kayit = tutorialAktifAdim();
  if (!kayit || !baslik || !adim || !icerik) return;

  if (typeof kayit.giris === "function") kayit.giris();
  baslik.textContent = `📘 ${kayit.baslik}`;
  adim.textContent = `Adım ${tutorialDurum.adim + 1}/${tutorialDurum.adimlar.length}`;
  icerik.textContent = kayit.icerik;
  if (wrap && kutu) {
    wrap.style.pointerEvents = kayit.disTiklamayaIzinVer ? "none" : "auto";
    kutu.style.pointerEvents = "auto";
  }
  if (geri) geri.disabled = tutorialDurum.adim === 0;
  if (ileri) ileri.textContent = tutorialDurum.adim === tutorialDurum.adimlar.length - 1 ? "Bitir" : "İleri";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => tutorialKonumGuncelle());
  });
  requestAnimationFrame(() => {
    tutorialArastirmaAdimScrollAyarla(kayit);
  });
  tutorialKonumTakibiBaslat();
}

export function tutorialBaslat({ zorla = false } = {}) {
  tutorialArayuzKur();
  if (!zorla && tutorialTamamlandiMi()) return;
  const wrap = document.getElementById("tutorial-arka");
  if (!wrap) return;
  tutorialDurum.oncekiDuraklat = oyun.duraklat;
  tutorialDurum.aktif = true;
  tutorialDurum.adimlar = tutorialAdimlariniOlustur();
  tutorialDurum.adim = 0;
  tutorialDurum.arastirmaTikIlerleLock = false;
  oyun.duraklat = true;
  wrap.style.display = "flex";
  tutorialGuncelle();
}

function tutorialKapat({ tamamlandi = false } = {}) {
  const wrap = document.getElementById("tutorial-arka");
  const vurgu = document.getElementById("tutorial-vurgu");
  if (wrap) wrap.style.display = "none";
  if (vurgu) vurgu.style.display = "none";
  if (tamamlandi) tutorialDurumKaydet(true);
  tutorialArastirmaAgaciKapat();
  if (tutorialDurum.konumTakipTimer) {
    clearInterval(tutorialDurum.konumTakipTimer);
    tutorialDurum.konumTakipTimer = null;
  }
  oyun.duraklat = tutorialDurum.oncekiDuraklat;
  tutorialDurum.aktif = false;
  tutorialDurum.hedefEl = null;
  tutorialDurum.arastirmaTikIlerleLock = false;
}

function tutorialGeri() {
  if (!tutorialDurum.aktif) return;
  tutorialDurum.adim = Math.max(0, tutorialDurum.adim - 1);
  tutorialGuncelle();
}

function tutorialIleri() {
  if (!tutorialDurum.aktif) return;
  const kayit = tutorialAktifAdim();
  if (kayit && typeof kayit.ilerlemeKontrol === "function") {
    const devam = kayit.ilerlemeKontrol();
    if (!devam) {
      if (typeof kayit.giris === "function") kayit.giris();
      if (kayit.kontrolMesaji) showToast(kayit.kontrolMesaji, "uyari", 1800);
      setTimeout(() => tutorialKonumGuncelle(), 80);
      return;
    }
  }
  if (tutorialDurum.adim >= tutorialDurum.adimlar.length - 1) {
    tutorialKapat({ tamamlandi: true });
    showToast("Tutorial tamamlandı. İyi oyunlar!", "basari", 2600);
    return;
  }
  tutorialDurum.adim += 1;
  tutorialGuncelle();
}

export function tutorialUiGuncelHook() {
  if (tutorialDurum.aktif) tutorialKonumGuncelle();
}

document.addEventListener("tutorial:open", () => tutorialBaslat({ zorla: true }));
document.addEventListener("ui:guncel", tutorialUiGuncelHook);
