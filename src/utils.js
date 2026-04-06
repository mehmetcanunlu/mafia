// utils.js — Ortak yardımcı fonksiyonlar (circular dependency'yi kırmak için)

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
