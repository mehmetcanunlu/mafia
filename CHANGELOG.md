# Değişiklik günlüğü

Tüm önemli değişiklikler bu dosyada tarih sırasıyla listelenir.

## 2026-04-10

### Diplomasi — bekleyen teklifler ve koalisyon yanıtı

- **`src/state.js`**: `diplomasiDurumuTamamla` içinde teklif `durum` alanı düzeltildi. Yalnızca açıkça `"sonuclandi"` olan kayıtlar kapanmış sayılıyor; eksik/boş `durum` artık yanlışlıkla `"sonuclandi"` yapılmıyor. Böylece bekleyen teklifler tur başında listeden düşmüyor ve “Onayla”da satır bulunamama hatası azaltıldı.
- **`src/diplomasi.js` — `bekleyenTeklifleriTemizle`**: Filtre `durum === "beklemede"` yerine `durum !== "sonuclandi"` olacak şekilde hizalandı (tamamlama mantığıyla uyumlu).
- **`src/diplomasi.js` — `diplomasiTeklifYanitla`**: Bekleyen satır `durum !== "sonuclandi"` ile aranıyor. Liste yoksa / çift tetiklemede teklif zaten silinmişse `{ ok: true, mesaj: "" }` dönülüyor; gereksiz “Teklif artık geçerli değil” gürültüsü engellendi. Güncel `diplomasi` üzerinden `teklifId` ile kayıt silmek için `try` / `finally` akışı korunuyor.
- **`src/diplomasi.js` — `diplomasiOzet`**: “Bekleyen teklifler” listesi `durum !== "sonuclandi"` ile süzülüyor.

### Modal — çift kapanma

- **`src/modal.js` — `showModal`**: `kapat` yalnızca bir kez işlenecek şekilde `kapandi` bayrağı eklendi. Odaklı “Onayla” + Enter gibi durumlarda oluşabilecek ikinci `kapat` çağrısı yok sayılıyor.

### Oyun akışı — teklif penceresi sırasında tur

- **`src/main.js`**: Diplomasi teklifi popup kuyruğunda (`teklifId` olan olaylar) tur ilerlemesi sırasında oyunun duraklatılması; teklif yanıtı sırasında koalisyon / diplo state’inin kayması riskini azaltmak için.

### Güç sıralaması

- **`src/gucDengesi.js`**: Aynı puanda oyuncular için kararlı sıralama (`owner` ile `localeCompare` tie-break).

### Savaşta barış teklifi sıklığı

- **`src/diplomasi.js`**: Oyuncuya giden barış teklifleri için **genel aralık** (`AI_BARIS_OYUNCU_GENEL_ARALIK`, 22 tur): teklif oluşturulunca ve oyuncu barışı reddedince `oyuncuTeklifTipCooldown("baris")` güncelleniyor; farklı AI’ların kısa aralıklarla sırayla barış spam’i kesiliyor.
- **`src/diplomasi.js` — `aiDiplomasiKararlari`**: Savaşta barış denemesi olasılığı yaklaşık `%28 düşürüldü** (`barisSans * 0.72`).

### Diplomasi ekranı — savaş + bekleyen barış

- **`src/diplomasi.js` — `diplomasiOzet`**: Taraflar arasında aktif barış teklifi varken rozet metni **“Savaş — barış yanıtı bekleniyor”** (`tip: savas-baris-bekliyor`).
- **`src/ui.js`**: Bu rozet için turuncu vurgu rengi.

### Koalisyon / diplo (önceki aynı gün düzeltmeleri — özet)

- **`src/diplomasi.js`**: Koalisyon daveti, cooldown’lar, `dengeKoalisyonuOyuncuUyesi`, bekleyen koalisyon satırlarının gereksiz silinmemesi, `davetTur` / popup bayrakları ile ilgili davranış iyileştirmeleri.
- **`src/state.js`**: `dengeKoalisyonuOyuncuUyesi` ve ilgili diplo alanlarının tamamlanması / yüklemeyle uyumu.

---

Not: Bu günlük, 2026-04-10 tarihinde yapılan diplomasi, modal ve barış teklifi ile ilgili kod değişikliklerini derler; sürüm numarası henüz atanmadıysa `[Unreleased]` altına taşıyabilirsiniz.
