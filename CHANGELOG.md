# Değişiklik günlüğü

Tüm önemli değişiklikler bu dosyada tarih sırasıyla listelenir.

## 2026-08-28

### Güvenlik ve kritik hata düzeltmeleri

- **XSS**: Çete/fraksiyon adları girişte `adTemizle()` ile HTML-özel karakterlerden arındırılıyor (`src/utils.js`, `src/main.js`); kayıttan yüklenen adlar da `save.js` normalizasyonunda temizleniyor. Render tarafında üst bar, kayıt menüsü, başlangıç slot listesi ve `showPrompt` input değeri `htmlKacir()` ile kaçışlanıyor.
- **Otokayıt sırası** (`src/main.js`): `otomatikKaydet()` savaş/hareket çözümünden (`operasyonTick`/`hareketTick`) sonraya taşındı; kayıttan dönüşte tur kaybı yaşanmıyor.
- **Zafer sonrası fazladan tur** (`src/main.js`): `turIsle()` kazanan bulununca `return` ediyor; bitiş ekranı açıkken AI/ekonomi/savaş tikleri çalışmıyor.
- **İstatistik geri yükleme** (`src/save.js`, `src/main.js`): kayıttan yüklenen istatistik artık `istatistikSifirla()` ile ezilmiyor; yeni oyun başlarken önceki oyunun grafik geçmişi temizleniyor.
- **Kayıt sürüm guard'ları** (`src/save.js`): sayısal olmayan `versiyon` reddediliyor; `zorluk` alanı eski kayıtlar için `"orta"` varsayılanıyla dönüyor (başlangıç ekranı çökmesi giderildi).
- **`src/spy.js`**: ölü `bolge.garnizon` alanına yazan üç satır kaldırıldı; suikast sonrası devredilen garnizon artık eski sahibin gerçek birlik sayısından hesaplanıp `yiginaEkle` ile stack'e ekleniyor.

### Yeni özellikler

- **Esir takası ve serbest bırakma** (`src/ui.js`): elimizdeki esirler için "Takas" (karşılıklı esir varsa 1'e 1, ilişki +4) ve "Serbest Bırak" (ilişki +6) butonları. Fidye ödemesi artık tutan tarafın kasasına gidiyor.
- **Lojistik harita modu** (`src/ui.js`, tuş `4`): bölgedeki konvoy taşıt kapasitesine göre ısı haritası; tooltip 🚗/🏍/kapasite dökümü.
- **SVG konvoy okları** (`src/ui.js`, `public/index.html`): her aktif konvoy owner renginde animasyonlu kavisli ok + adet rozeti; çok bacaklı rotanın kalanı soluk kesikli çizgi; bekleyen konvoy ⏸.
- **Sürükle-bırak birlik hareketi** (`src/ui.js`, `src/actions.js` — `surukleBirakHareket`): kendi bölgenden sürükleyince geçerli hedefler vurgulanır, 🥷 hayalet iz imleci takip eder; dost hedefe bırakınca transfer, düşmana bırakınca saldırı slider dialogu. Shift+sürükle her zaman pan.
- **Asayiş HUD renklendirme** (`src/ui.js`): üst bardaki Suç/Polis değerleri risk eşiklerinde turuncu/kırmızı.

### Kod sağlığı

- **`src/ekonomi.js` (yeni)**: gelir/haraç formülünün tek kaynağı. Beş ayrışmış kopya buna bağlandı — sonuç olarak: üst bar net gelir detayı artık lider ve kriz çarpanlarını da içeriyor, haraç tahmini araştırma bonusunu (`haracGelirBonus`) hesaba katıyor, istatistik grafiği gerçek tur gelirini çiziyor. `liderBonus`/`bolgeOzellikBonus`/`binaBonus` yardımcıları da tekilleşti (`main.js` + `ai.js` kopyaları silindi).
- **`src/state.js`**: `ekonomiDurumu()`, `asayisDurumu()`, `asayisDurumuTamamla()`, `ownerOrtalamaSadakat()` kanonik normalizer'lar; `actions/main/ui/save`'deki 9 kopya kaldırıldı.
- **`scripts/sim-test.mjs`**: `--seed` ile deterministik (mulberry32; aynı seed aynı sonuç), gelir hesabı `ekonomi.js`'ten (gerçek oyun formülü), assert ihlalinde çıkış kodu 1 (`--min-net`, `--min-birim` eşikleri).
- **Modal/pause**: modal açıkken elle basılan duraklatma, modal kapanışındaki otomatik devam tarafından artık ezilmiyor (`_manuelDuraklatma`); onay dialogu açıkken Space pause'u değil odaklı butonu tetikliyor.
- **Diplomasi popup kuyruğu**: 12 pencere sınırı (taşınca tek uyarı, detaylar Günlük'te); kuyruk hataları yutulmayıp konsola yazılıyor.
- **`saldiri()`**: onay dialogu sonrası hedef sahibi, diplomasi izni ve para yeniden doğrulanıyor (await sırasında durum değişebilir).
- **Otokayıt**: `localStorage` yazımı başarısız olursa oyuncuya toast uyarısı gösteriliyor.
- Küçükler: radix'siz `parseInt` kalmadı; `setPointerCapture` çağrıları guard'landı.
- **Ölü kod temizliği**: hiçbir yerden çağrılmayan 16 fonksiyon/alan silindi — `actions.garnizonAyarla` + `garnizonKapasitesi`, `combat.neutralSavunma` (+ `MEKANIK.neutralMilitia*` anahtarları), `config.uretKomsulukGrid`/`BASLANGIC_BOLGELER`/`ISIMLER` (eski grid harita üreteci), `map.enYakinGuvenli`, `state.bulunanSayisi`/`yigindanAl`/`tileToplam`, `units.tasitKapasitesi`/`grupEfektifSaldiri`/`birimEfektifSaldiri`/`tipKartHTML`/`motorluHizTick` (turIsle'daki no-op çağrısıyla birlikte), `stats.istatistikDirtyIsaretle`, `logistics.bolgeTasitDurumu`. Ayrıca `save.js`'teki tavan-atlayan garnizon migrasyon kopyası kaldırıldı; kayıt yükleme artık state'in kanonik `legacyGarnizonlariBirimlereAktar()`'ını kullanıyor (eski kayıtlarda personel tavanı artık uygulanıyor).

### Dokümantasyon senkronu

- `PROJE_PLANI.md` kodla satır satır eşitlendi (diplomasi gerçeği, VERIYON 8, 7×8 araştırma ağacı, güncel dosya haritası, gerçek `turIsle()` sırası, açık borç listesi).
- `DURUM_AKSIYON_RAPORU.md` ve `IMPLEMENTASYON_PLANI.md` kapanış notuyla arşivlendi; `HARITA_MODLARI_VE_HIZLI_HAREKET.md` ve `BIRLIK_HAREKETI_YENİ_PLAN.md`'ye durum başlıkları eklendi (toplanma noktası sistemi bilinçli olarak korunuyor).

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
