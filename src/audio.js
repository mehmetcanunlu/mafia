// audio.js — Web Audio API ile Oscillator Tabanlı Ses Efektleri

let ctx = null;
let _sesAcik = true;
let _muzikDongusu = null;
let _muzikAcik = false;
let _muzikGainNode = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Tarayıcı autoplay politikası: etkileşimden önce suspended olabilir
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/**
 * Ses açık/kapalı durumu.
 */
export function sesAcikMi() { return _sesAcik; }
export function sesDurumDegistir() {
  _sesAcik = !_sesAcik;
  if (!_sesAcik && _muzikAcik) muzikDurdur();
  return _sesAcik;
}

/**
 * Temel ses çalma fonksiyonları.
 */
function envelope(gainNode, audioCtx, attack = 0.01, decay = 0.1, sustain = 0.6, release = 0.2, duration = 0.3) {
  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(sustain, now + attack);
  gainNode.gain.setValueAtTime(sustain, now + attack + decay);
  gainNode.gain.linearRampToValueAtTime(0, now + duration + release);
}

function nota(frekans, sure = 0.2, volume = 0.15, tip = "square", delay = 0) {
  if (!_sesAcik) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = tip;
    osc.frequency.setValueAtTime(frekans, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + sure);

    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + sure + 0.05);
  } catch (e) {
    // Ses çalma hatası sessizce geçilsin
  }
}

function notaDizisi(frekanslar, aralik = 0.08, sure = 0.18, volume = 0.12, tip = "triangle") {
  frekanslar.forEach((f, i) => nota(f, sure, volume, tip, i * aralik));
}

/**
 * Özel ses efektleri.
 */

function sesSavas() {
  // Kısa, keskin bir darbe + bass
  nota(80, 0.15, 0.2, "sawtooth");
  nota(160, 0.12, 0.1, "square", 0.05);
  nota(240, 0.1, 0.08, "square", 0.1);
}

function sesFetih() {
  // Zafer melodisi — yükselen arpej
  notaDizisi([523, 659, 784, 1047], 0.1, 0.25, 0.13, "triangle");
}

function sesYenilgi() {
  // İnen, karamsar melodi
  notaDizisi([440, 370, 311, 220], 0.12, 0.3, 0.13, "triangle");
}

function sesRusvet() {
  // Para sesi — metalik tıklama + arpej
  nota(1200, 0.06, 0.12, "square");
  nota(1600, 0.05, 0.08, "square", 0.04);
  nota(2000, 0.04, 0.06, "square", 0.08);
}

function sesDiplo() {
  // Diplomatik — yumuşak, harmonik
  notaDizisi([523, 659], 0.12, 0.25, 0.1, "sine");
}

function sesYatirim() {
  // Kısa onay sesi
  nota(660, 0.12, 0.1, "sine");
  nota(880, 0.1, 0.08, "sine", 0.08);
}

function sesOlay() {
  // Dikkat çekici — iki nota
  nota(440, 0.15, 0.12, "square");
  nota(880, 0.1, 0.1, "square", 0.18);
}

function sesKayipBolge() {
  // Tehlike uyarısı
  nota(300, 0.2, 0.15, "sawtooth");
  nota(200, 0.25, 0.12, "sawtooth", 0.15);
}

function sesKaydet() {
  // Kaydetme onayı
  notaDizisi([880, 1047], 0.07, 0.12, 0.08, "sine");
}

function sesSuikast() {
  nota(210, 0.08, 0.12, "sawtooth");
  nota(160, 0.12, 0.08, "triangle", 0.05);
  nota(110, 0.18, 0.06, "sine", 0.1);
}

function sesKesif() {
  notaDizisi([740, 880, 988], 0.06, 0.1, 0.08, "sine");
}

function sesIsyan() {
  nota(180, 0.18, 0.14, "square");
  nota(140, 0.22, 0.12, "sawtooth", 0.08);
  nota(110, 0.28, 0.1, "sawtooth", 0.16);
}

function sesArastirmaSeviye() {
  notaDizisi([523, 659, 784, 988], 0.08, 0.16, 0.1, "triangle");
}

/**
 * Ana ses çalma arayüzü.
 */
export function sesCal(tip) {
  if (!_sesAcik) return;
  switch (tip) {
    case "savas":       sesSavas();      break;
    case "fetih":       sesFetih();      break;
    case "yenilgi":     sesYenilgi();    break;
    case "rusvet":      sesRusvet();     break;
    case "diplo":       sesDiplo();      break;
    case "yatirim":     sesYatirim();    break;
    case "olay":        sesOlay();       break;
    case "kayip-bolge": sesKayipBolge(); break;
    case "kaydet":      sesKaydet();     break;
    case "suikast":     sesSuikast();    break;
    case "kesif":       sesKesif();      break;
    case "isyan":       sesIsyan();      break;
    case "arastirma-seviye": sesArastirmaSeviye(); break;
  }
}

/**
 * Arka plan müziği — basit ambient loop.
 */
export function muzikBaslat() {
  if (_muzikAcik || !_sesAcik) return;
  _muzikAcik = true;

  try {
    const c = getCtx();
    _muzikGainNode = c.createGain();
    _muzikGainNode.gain.value = 0.03;
    _muzikGainNode.connect(c.destination);

    // Drone notaları (sürekli, düşük frekanslı)
    const dronFrekanslari = [55, 82.4, 110];
    dronFrekanslari.forEach((f) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(_muzikGainNode);
      osc.start();
      // Durdurmak için ref sakla
      if (!_muzikDongusu) _muzikDongusu = [];
      _muzikDongusu.push(osc);
    });
  } catch (e) {
    _muzikAcik = false;
  }
}

export function muzikDurdur() {
  _muzikAcik = false;
  if (_muzikDongusu) {
    _muzikDongusu.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    _muzikDongusu = null;
  }
  if (_muzikGainNode) {
    _muzikGainNode.disconnect();
    _muzikGainNode = null;
  }
}

export function muzikAcikMi() { return _muzikAcik; }

export function muzikDurumDegistir() {
  if (_muzikAcik) muzikDurdur();
  else muzikBaslat();
  return _muzikAcik;
}
