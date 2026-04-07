// Custom Modal ve Toast sistemi — Faz 3

function ensureContainers() {
  if (!document.getElementById('cm-arka')) {
    const arka = document.createElement('div');
    arka.id = 'cm-arka';
    document.body.appendChild(arka);
  }
  if (!document.getElementById('toast-kap')) {
    const kap = document.createElement('div');
    kap.id = 'toast-kap';
    document.body.appendChild(kap);
  }
}

function showModal({ html, escValue, bagla }) {
  return new Promise((resolve) => {
    ensureContainers();
    const arka = document.getElementById('cm-arka');
    arka.innerHTML = '';
    arka.style.display = 'flex';

    const kutu = document.createElement('div');
    kutu.className = 'cm-kutu';
    kutu.innerHTML = html;
    arka.appendChild(kutu);

    requestAnimationFrame(() => requestAnimationFrame(() => kutu.classList.add('cm-acik')));

    let cleanup = null;
    let escHandler = null;

    function kapat(val) {
      if (typeof cleanup === 'function') cleanup();
      if (escHandler) document.removeEventListener('keydown', escHandler);
      kutu.classList.remove('cm-acik');
      setTimeout(() => {
        arka.style.display = 'none';
        resolve(val);
      }, 200);
    }

    cleanup = bagla(kutu, kapat);

    escHandler = (e) => {
      if (e.key === 'Escape') {
        kapat(escValue !== undefined ? escValue : null);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

export function showAlert(mesaj, baslik = 'Bilgi') {
  return showModal({
    html: `
      <div class="cm-baslik">${baslik}</div>
      <div class="cm-icerik">${mesaj}</div>
      <div class="cm-butonlar">
        <button class="buton cm-tamam">Tamam</button>
      </div>`,
    escValue: undefined,
    bagla(kutu, kapat) {
      kutu.querySelector('.cm-tamam').onclick = () => kapat(undefined);
    }
  });
}

export function showConfirm(mesaj, baslik = 'Onay', secenekler = {}) {
  const ekButonEtiketi = secenekler?.ekButonEtiketi || '';
  const ekButonDegeri = secenekler?.ekButonDegeri || 'extra';
  return showModal({
    html: `
      <div class="cm-baslik">${baslik}</div>
      <div class="cm-icerik">${mesaj}</div>
      <div class="cm-butonlar">
        <button class="buton grimsi cm-iptal">İptal</button>
        ${ekButonEtiketi ? `<button class="buton grimsi cm-ek">${ekButonEtiketi}</button>` : ''}
        <button class="buton cm-onayla">Onayla</button>
      </div>`,
    escValue: false,
    bagla(kutu, kapat) {
      const onaylaBtn = kutu.querySelector('.cm-onayla');
      const iptalBtn = kutu.querySelector('.cm-iptal');
      const ekBtn = kutu.querySelector('.cm-ek');
      onaylaBtn.onclick = (e) => kapat(e.shiftKey ? "shift5" : true);
      iptalBtn.onclick = () => kapat(false);
      if (ekBtn) ekBtn.onclick = () => kapat(ekButonDegeri);
      setTimeout(() => onaylaBtn.focus(), 50);
      const enterHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          kapat(e.shiftKey ? "shift5" : true);
        }
      };
      document.addEventListener('keydown', enterHandler);
      return () => document.removeEventListener('keydown', enterHandler);
    }
  });
}

export function showPrompt(mesaj, baslik = 'Giriş', varsayilan = '') {
  return showModal({
    html: `
      <div class="cm-baslik">${baslik}</div>
      <div class="cm-icerik">${mesaj}</div>
      <input class="cm-input" type="text" value="${varsayilan}" />
      <div class="cm-butonlar">
        <button class="buton grimsi cm-iptal">İptal</button>
        <button class="buton cm-tamam">Tamam</button>
      </div>`,
    escValue: null,
    bagla(kutu, kapat) {
      const inp = kutu.querySelector('.cm-input');
      setTimeout(() => { inp.focus(); inp.select(); }, 50);
      kutu.querySelector('.cm-tamam').onclick = () => kapat(inp.value);
      kutu.querySelector('.cm-iptal').onclick = () => kapat(null);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') kapat(inp.value);
      });
    }
  });
}

export function showToast(mesaj, tip = 'bilgi', sure = 4000) {
  ensureContainers();
  const kap = document.getElementById('toast-kap');
  const t = document.createElement('div');
  t.className = `toast toast-${tip}`;
  t.textContent = mesaj;
  kap.appendChild(t);

  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('toast-goster')));

  setTimeout(() => {
    t.classList.add('toast-kayboluyor');
    setTimeout(() => t.remove(), 400);
  }, sure);
}
