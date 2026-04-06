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

    function kapat(val) {
      kutu.classList.remove('cm-acik');
      setTimeout(() => {
        arka.style.display = 'none';
        resolve(val);
      }, 200);
    }

    bagla(kutu, kapat);

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
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

export function showConfirm(mesaj, baslik = 'Onay') {
  return showModal({
    html: `
      <div class="cm-baslik">${baslik}</div>
      <div class="cm-icerik">${mesaj}</div>
      <div class="cm-butonlar">
        <button class="buton grimsi cm-iptal">İptal</button>
        <button class="buton cm-onayla">Onayla</button>
      </div>`,
    escValue: false,
    bagla(kutu, kapat) {
      kutu.querySelector('.cm-onayla').onclick = () => kapat(true);
      kutu.querySelector('.cm-iptal').onclick = () => kapat(false);
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
