// utils.js — Ortak yardımcı fonksiyonlar (circular dependency'yi kırmak için)

// Kullanıcı girdisini (çete adı vb.) innerHTML/attribute içine basmadan önce kaçışlar.
export function htmlKacir(deger) {
  return String(deger ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fraksiyon/çete adlarını HTML-özel karakterlerden arındırır; adlar birçok
// innerHTML şablonuna ham girdiği için XSS'i kaynağında kapatır.
export function adTemizle(deger) {
  return String(deger ?? "").replace(/[<>"'&`]/g, "").trim();
}

export function rastgeleIsim() {
  const a = [
    "Kuzey", "Gölge", "Çelikler", "Karalar", "Bozkurtlar",
    "Asiler", "Yıldırım", "Avrupa", "Paşalar", "Sahil",
    "Çirkinler", "Şirinler", "Aygırlar", "Yırtıcılar",
  ];
  const b = ["Birliği", "Takımı", "Klanı", "Çetesi", "Kardeşliği"];
  return (
    a[Math.floor(Math.random() * a.length)] +
    " " +
    b[Math.floor(Math.random() * b.length)]
  );
}
