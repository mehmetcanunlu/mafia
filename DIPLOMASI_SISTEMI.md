# Diplomasi Sistemi Tasarım Belgesi

> Türk Mafya Oyunu — Çetelerarası İlişkiler & Güç Politikası

---

## 1. Genel Bakış

Diplomasi sistemi, dört çetenin (Oyuncu + 3 Yapay Zeka) birbirleriyle sadece silahla değil, **para, söz, tehdit ve ihanet** üzerinden de mücadele etmesini sağlar. Her çete ilişkisi dinamik olarak değişir; dün ally olan bugün düşman olabilir.

---

## 2. İlişki Durumları (5 Kademe)

Her çete çifti arasında **tek bir ilişki değeri** bulunur: `ilişki` — **−100** (kanlı düşman) ile **+100** (tam ittifak).

| Değer Aralığı | Durum Adı | Renk | Anlam |
|---|---|---|---|
| +70 … +100 | **İttifak** | Yeşil | Ortak saldırı, kaynak paylaşımı, toprak garantisi |
| +30 … +69 | **Dostluk** | Açık Yeşil | Geçiş izni, ticaret, istihbarat paylaşımı |
| −29 … +29 | **Tarafsızlık** | Gri | Ne savaş ne barış; tetikte bekleme |
| −30 … −69 | **Gerilim** | Turuncu | Konvoy baskısı, sabotaj, tehdit |
| −100 … −70 | **Savaş** | Kırmızı | Açık silahlı çatışma, toprak yutma |

### 2.1 Başlangıç Değerleri

```
Oyuncu  ↔ AI1 :  0  (Tarafsız)
Oyuncu  ↔ AI2 :  0  (Tarafsız)
Oyuncu  ↔ AI3 :  0  (Tarafsız)
AI1     ↔ AI2 : rastgele −20 … +20
AI1     ↔ AI3 : rastgele −20 … +20
AI2     ↔ AI3 : rastgele −20 … +20
```

---

## 3. İlişki Değiştiriciler (Otomatik Olaylar)

Aşağıdaki eylemler, eylem yapan çete ile hedef çetenin ilişki puanını **otomatik** değiştirir.

### 3.1 Askeri Eylemler

| Olay | İlişki Değişimi |
|---|---|
| Komşu ilçeye saldırı başlatma | −15 |
| Toprak fethi (bir ilçe alınması) | −25 |
| Suikast girişimi (başarılı) | −40 |
| Suikast girişimi (başarısız) | −20 |
| Sabotaj (bina tahrip etme) | −18 |
| Konvoy karşı konvoya çarpışma | −10 |

### 3.2 Ekonomik Eylemler

| Olay | İlişki Değişimi |
|---|---|
| Ticaret anlaşması teklifi (kabul edilirse) | +12 |
| Borç/yardım teklifi (kabul edilirse) | +20 |
| Rüşvetle ortak ilçe satın alma | −5 (3. taraflara) |

### 3.3 Diplomatik Olaylar

| Olay | İlişki Değişimi |
|---|---|
| Barış teklifi kabul etme | +15 |
| İttifak teklifi reddetme | −8 |
| Anlaşmayı bozma (ihanet) | −50 (kalıcı iz) |
| Ortak düşmana birlikte saldırma | +10/tur |
| Başka bir çete hakkında istihbarat paylaşımı | +12 |

### 3.4 Pasif Zamansal Değişim

Her tur sonunda ilişki değerleri **merkeze doğru 0.5 puan** çekilir (hafıza solması), savaş hali dışında.

---

## 4. Diplomatik Eylemler (Oyuncu Menüsü)

Oyuncu, tur başında bir çeteye **bir diplomatik aksiyon** başlatabilir.

### 4.1 Barış Teklifi *(Ateşkes)*
- **Maliyet:** 0₺
- **Koşul:** İlişki < −29 (Gerilim veya Savaş halinde)
- **Etki (kabul):** İlişki +20, 5 tur boyunca karşılıklı saldırı yasağı
- **AI Kabul Oranı:** `max(10%, 50% − güç_farkı × 2)` — zayıf AI daha kolay kabul eder
- **İhanet Cezası:** Barışı boz → ilişki −50 + tüm çetelerle −10 ("söz tanımaz" etiketi)

### 4.2 İttifak Teklifi *(Kanlı Yemin)*
- **Maliyet:** 300₺ başlangıç + 50₺/tur ortak bakım
- **Koşul:** İlişki ≥ +30 (Dostluk halinde)
- **Süresi:** 10 tur, yenilenebilir
- **Avantajlar:**
  - Ortak saldırı: İttifak ortağı, aynı düşmana aynı turda saldırırsa saldırı gücü **+15%**
  - Geçiş hakkı: Ortağın ilçelerinden konvoy geçişi (çatışma yok)
  - Toprak garantisi: Ortak saldırıya uğrayan tarafa **uyarı** gelir (isteğe bağlı savunma desteği)
  - Düşman istihbaratı paylaşımı: Ortağın keşiflerinden yararlanma

### 4.3 Ticaret Anlaşması *(Ortak Kazan)*
- **Maliyet:** Yok (karşılıklı kazanç)
- **Koşul:** İlişki ≥ −10
- **Süresi:** 8 tur
- **Etki:** Her iki taraf da anlaşma süresince **+8% gelir** kazanır
- **Kırılma:** Birisi diğerine saldırırsa anlaşma bozulur ve −30 ilişki

### 4.4 Rüşvet / Gizli Ödeme *(Siyasi Para)*
- **Maliyet:** 150₺ … 600₺ (ilişki açığına göre ölçeklenir)
- **Koşul:** Her zaman kullanılabilir
- **Etki:** `ödenen_miktar / 30` puan ilişki artışı (max +15 tek seferlik)
- **AI Tepkisi:** AI karakterine göre farklı; "Patron" tipi lider rüşvete daha açık

### 4.5 Tehdit *(Ültimaton)*
- **Maliyet:** Yok
- **Koşul:** Oyuncunun askeri gücü rakipten **%30 fazla** olmalı
- **Etki (AI boyun eğerse):** Bir ilçeyi savaşsız teslim etme veya 5 tur saldırmaması
- **Etki (AI direnirse):** İlişki −15, AI'nın ofkesi +30 (daha agresif davranır)
- **Bekleme süresi:** 12 tur (tekrar tehdit edilemez)

### 4.6 İstihbarat Paylaşımı *(Sızdırma)*
- **Maliyet:** 80₺
- **Koşul:** Hedef çetenin rakibini keşif yapmış olma
- **Etki:** Hedef çete, rakibi hakkında bilgi edinir; paylaşan tarafla ilişki +12
- **Yan Etki:** Hakkında bilgi paylaşılan çeteyle ilişki −8 (fark ederse)

### 4.7 Sabotaj Teklifi *(Kirli Ortak İş)*
- **Maliyet:** 200₺
- **Koşul:** İlişki ≥ +20, ortak düşman var
- **Etki:** AI, ortak düşmanın seçilen ilçesini sabote eder (bina −1 seviye, savunma −0.5)
- **İlişki:** +8 (ortak iş pekiştirir)

---

## 5. Lider Karakteristikleri & Diplomasi Kişilikleri

Her çetenin lideri farklı bir diplomatik kişiliğe sahiptir. Bu kişilik, tekliflere verilen yanıtı ve AI davranışını etkiler.

| Lider | Kişilik | Tercih | Zayıflık |
|---|---|---|---|
| **Demir Yumruk** | Savaşçı | Savaşı tercih eder, anlaşma yapmaz | Güç üstünlüğüne boyun eğer |
| **Tilki** | Fırsatçı | İttifak kurar, ihanet eder | Parayı sever; yeterli rüşvetle döner |
| **Doktor** | Defansif | Barış arar, teklif kabul eder | Saldırı gelirse panikler |
| **Mimar** | Ekonomist | Ticaret anlaşmalarını sever | Askeri kararları yavaş alır |
| **Hayalet** | Gizlici | İstihbarat alışverişi tercih eder | Tehdit karşısında beklenmedik tepki |
| **Patron** | Pragmatist | Her şey mümkün, sadece fiyatı var | Çok güçlenince kibirlenir, ittifaktan çıkar |

### 5.1 AI Diplomatik Karar Ağacı

```
Her tur başında AI değerlendirir:

1. Eğer ilişki < −50 ve askeri güç < oyuncunun %70'i:
   → Barış teklifi gönder (hayatta kalma modu)

2. Eğer ilişki > +40 ve ortak düşman var:
   → İttifak teklif et veya sabotaj öner

3. Eğer ekonomi sıkıntıdaysa (para < 200₺):
   → Ticaret anlaşması ara

4. Eğer başka bir çete çok güçleniyorsa:
   → Üçüncü tarafa karşı ittifak kur (denge politikası)

5. Eğer ihanet puanı yüksekse:
   → Tilki tipi liderler ihanet eder (+50₺ kazanç fırsatı varsa)
```

---

## 6. İhanet Mekaniği *(Kirli Oyun)*

Oyun, **ihanet sayacı** tutar. Her anlaşma bozulduğunda:

- İhanetin kaydı tüm çetelere bildirilir ("X çetesi Y'ye ihanet etti")
- **İtibar Puanı** (`itibar`) 0-100 arası, başlangıç: 50
  - Her ihanet: −20 itibar
  - Her 10 tur onurlu davranış: +2 itibar

**İtibar Etkileri:**

| İtibar | Etki |
|---|---|
| 80+ | AI çeteleri ittifak teklifini +%30 daha kolay kabul eder |
| 50-79 | Normal |
| 30-49 | AI teklifleri %20 daha az güvenir, rüşvet maliyeti +25% |
| 10-29 | Tüm diplomatik teklifler %40 daha az kabul görür |
| 0-9 | "Güvenilmez" etiketi — hiç kimse ittifak yapmaz |

---

## 7. Güç Dengesi Sistemi *(Balance of Power)*

Oyun her tur **güç sıralaması** hesaplar:

```
güçPuanı = (kontrolEdilen_ilçe × 10) 
          + (toplam_asker × 0.5) 
          + (para / 100) 
          + (araştırma_seviyesi × 5)
```

Bu sıralamayı **AI çeteleri görür** ve davranışlarını buna göre ayarlar:

- **Lider çete** (en yüksek puan): Diğerleri ittifak arar, saldırıya maruz kalır
- **Son sıradaki çete**: Hayatta kalma moduna girer, barış arar
- **2. ve 3. çeteler**: Lidere karşı koalisyon kurabilir

### 7.1 Koalisyon Savaşı *(Son Koz)*

Eğer bir çete toplam gücün **%50'sini** geçerse:

- Kalan çeteler otomatik olarak bir araya gelir
- "Denge Koalisyonu" bildirimi çıkar
- Bu çetelerin aralarındaki ilişki +30 puan artar (yapay gerilim azalması)
- Koalisyon, lider çeteye **her turda ek +10% saldırı** yapar

---

## 8. Özel Diplomatik Olaylar *(Random Events)*

Mevcut olay sistemine entegre edilecek yeni diplomasi olayları:

| Olay | Tetikleyici | Sonuç |
|---|---|---|
| **Gizli Toplantı** | İlişki 20-50 arası, 15+ tur geçmiş | Seçim: +30₺ + ilişki +10, ya da reddet |
| **Çifte Ajan** | İstihbarat araştırması 4+, farklı çeteyle ilişki > 30 | Rakip hakkında bedava keşif |
| **Kan Davası** | Suikast başarılı ise 3 tur sonra | Hedef lider "intikam" moduna girer, saldırı +20% |
| **Düğün Barışı** | İki çete 5+ turdur savaşmamışsa | Kalıcı +15 ilişki bonusu |
| **Hain Teğmen** | AI'nın bir üyesi oyuncuya sığınır | Seçim: Al (o çeteyle −20 ilişki) / Geri gönder (+15 ilişki) |
| **Silah Kaçakçılığı** | Liman ilçesi varken ticaret anlaşması aktif | İkisine de +1 Uzman asker / tur (5 tur) |
| **Ortak Polis Baskısı** | İkisi de aynı turda polis olayı yaşarsa | Seçim: "Birlikte karşı koyalım" → ilişki +12 |

---

## 9. Görsel Arayüz Bileşenleri

### 9.1 İlişki Göstergesi (Harita Üstü)

Her çetenin yanında küçük bir **ilişki ikonu** gösterilir:

```
🟢 İttifak   (+70 … +100)
💚 Dostluk   (+30 … +69)
⚪ Tarafsız  (−29 … +29)
🟠 Gerilim   (−30 … −69)
🔴 Savaş     (−70 … −100)
```

### 9.2 Diplomasi Paneli

Sağ yan panelde yeni sekme: **"Diplomasi"**

```
┌─────────────────────────────────────┐
│  ÇETELER ARASI İLİŞKİLER           │
├─────────────────────────────────────┤
│  [Kızıl Kurtlar]  ⚪  +5   Tarafsız │
│  [Mor Ejderler]   🟠 −35  Gerilim  │
│  [Altın Aslanlar] 🔴 −72  Savaş    │
├─────────────────────────────────────┤
│  Seçilen Çete: Kızıl Kurtlar        │
│  ┌──────────────────────────────┐   │
│  │ [Barış Teklif Et]            │   │
│  │ [İttifak Kur]   → 300₺      │   │
│  │ [Ticaret Yap]                │   │
│  │ [Rüşvet Ver]    → 150₺      │   │
│  │ [Tehdit Et]                  │   │
│  │ [İstihbarat Sat] → 80₺      │   │
│  └──────────────────────────────┘   │
│  İtibar: ████████░░  72/100         │
└─────────────────────────────────────┘
```

### 9.3 İlişki Tarihçesi

Her çete için son 5 önemli olay:

```
[Tur 14] Barış anlaşması imzalandı       +20
[Tur 17] Konvoy çatışması                −10
[Tur 19] Ticaret anlaşması başladı       +12
[Tur 22] İttifak teklifi reddedildi      −8
[Tur 25] Ortak düşmana saldırı           +10
```

---

## 10. Teknik Entegrasyon

### 10.1 State Yapısı

`state.js` dosyasına eklenmesi gereken alanlar:

```js
oyun.diplomasi = {
  // İki çete arasındaki ilişki: "id1-id2" formatında key
  iliskiler: {
    "oyuncu-ai1": 0,
    "oyuncu-ai2": 0,
    "oyuncu-ai3": 0,
    "ai1-ai2": 0,
    "ai1-ai3": 0,
    "ai2-ai3": 0,
  },

  // Aktif anlaşmalar listesi
  anlasмalar: [
    // { tip, taraf1, taraf2, baslangic, bitis, kosullar }
  ],

  // İtibar puanı (0-100)
  itibar: 50,

  // İhanet sayacı (tüm zamanlar)
  ihanetSayisi: 0,

  // Güç dengesi tarihçesi (son 10 tur)
  gucSiralamasi: [],

  // Diplomatik olay günlüğü
  olaygünlüğü: [],
};
```

### 10.2 Yeni Dosyalar

```
src/
├── diplomasi.js          — İlişki hesaplama, teklif işleme, AI karar ağacı
├── gucDengesi.js         — Güç puanı hesaplama, koalisyon mantığı
```

### 10.3 Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `state.js` | `oyun.diplomasi` nesnesi ekleme |
| `main.js` | `diplomasiTick()` fonksiyonu yeniden etkinleştirme |
| `ai.js` | AI diplomatik karar ağacı entegrasyonu |
| `combat.js` | İttifak saldırı bonusu (+15%) ekleme |
| `events.js` | 7 yeni diplomatik olay ekleme |
| `ui.js` | Diplomasi paneli ve ilişki ikonları render |
| `save.js` | `oyun.diplomasi` alanlarını kayıt/yüklemeye dahil etme |
| `audio.js` | `diplo` ses efektini yeniden etkinleştirme |

### 10.4 `diplomasiTick()` Akışı

```
Her tur sonunda:
1. İlişkileri 0.5 puan merkeze çek (hafıza solması)
2. Biten anlaşmaları sil
3. Koalisyon şartını kontrol et
4. AI diplomatik kararlarını çalıştır
5. Güç sıralamasını güncelle
6. Diplomatik olayları tetikle (olay sistemi gibi ağırlıklı seçim)
```

---

## 11. Denge & Zorluk Ayarları

`config.js`'e eklenecek sabitler:

```js
DIPLOMASI: {
  BARIS_SURESI: 5,           // tur
  ITTIFAK_SURESI: 10,        // tur
  ITTIFAK_MALIYETI: 300,     // ₺
  ITTIFAK_TUR_MALIYETI: 50,  // ₺/tur
  TICARET_SURESI: 8,         // tur
  TICARET_GELIR_BONUS: 0.08, // %8
  IHANET_ITIBIR_KAYBI: 20,
  GUC_ESIGI_KOALISYON: 0.50, // %50
  KOALISYON_SALDIIRI_BONUS: 0.10,
  ITTIFAK_SALDIIRI_BONUS: 0.15,
  TEHDIT_BEKLEME: 12,        // tur
  ILISKI_HAFIZA_SOLMASI: 0.5,// /tur
}
```

---

## 12. Uygulama Öncelikleri

### Faz A — Temel Altyapı (1-2 oturum)
- [x] `oyun.diplomasi` state yapısı
- [x] İlişki değerlerinin hesaplanması ve kaydı
- [x] Otomatik değiştiriciler (saldırı, suikast, fetih)
- [x] Pasif hafıza solması
- [x] Diplomasi paneli UI (sadece gösterim)

### Faz B — Oyuncu Aksiyonları (2-3 oturum)
- [x] Barış teklifi + 5 tur koruma
- [x] Rüşvet/ödeme sistemi
- [x] Ticaret anlaşması
- [x] İtibar sistemi
- [x] Olay günlüğü

### Faz C — Gelişmiş Mekanikler (2-3 oturum)
- [x] İttifak sistemi (saldırı bonusu, geçiş hakkı)
- [x] Tehdit mekaniği
- [x] Lider kişilikleri ve AI karar ağacı
- [x] Koalisyon savaşı
- [x] 7 yeni diplomatik olay

### Faz D — Cilalama (1 oturum)
- [x] İlişki tarihçesi UI
- [x] Diplomatik olaylar için ses efekti
- [x] Save/Load entegrasyonu
- [x] Zorluk seviyesine göre AI diplomatik esnekliği

---

## 13. Örnek Oyun Senaryoları

### Senaryo A: "Üçgen Güç"
> Oyuncu AI1 ile ittifak kurar, birlikte AI2'yi ezer. AI3 bu sırada güçlenir. İttifak bozulunca eski müttefik en tehlikeli düşmana dönüşür.

### Senaryo B: "İhanete Uğramış Patron"
> Oyuncu AI1 ile barış imzalar, arkasından AI2 ile gizli ticaret yapar. AI1 bunu fark edince (istihbarat paylaşımı olayı) koalisyon kurar. Oyuncu iki cephede savaşmak zorunda kalır.

### Senaryo C: "Sessiz Hükmedici"
> Oyuncu hiç savaşmadan, sadece rüşvet ve ticaret anlaşmalarıyla ilk 20 turu geçirir. Sonra en güçlü hale gelince koalisyona maruz kalır ve tüm çeteler üzerine saldırır.

### Senaryo D: "Denge Politikası"
> Oyuncu kasıtlı olarak en güçlü çeteyi sürekli zayıflatır — bazen kendi saldırarak, bazen diğerlerine istihbarat satarak. İstanbul'u hiç tam fethetmeden oyunun kontrolünü elinde tutar.

---

*Bu belge, oyunun mevcut sistemleriyle (combat.js, ai.js, events.js, state.js) tam uyumlu şekilde tasarlanmıştır. Uygulama sırası Faz A → D şeklinde önerilir.*

---

## 14. Lider Profilleri — 100 Kişilik Havuz

Her oyun başlangıcında 4 lider bu havuzdan **rastgele** seçilir (biri oyuncu için, üçü AI için). Seçilen liderlerin geçmişleri, fraksiyon başlangıç ilişkilerini şekillendirir.

---

### Görsel Kaynak: DiceBear API

> Ücretsiz, açık kaynak, seed-bazlı deterministik avatar üretimi.  
> Her tohum (`seed`) her zaman aynı görseli üretir — kayıt/yükleme güvenli.

| Köken Grubu | DiceBear Stili | Arka Plan Rengi | Örnek URL |
|---|---|---|---|
| Sokak | `lorelei` | `#ffd5dc` (gül) | `https://api.dicebear.com/9.x/lorelei/svg?seed=TOHUM&backgroundColor=ffd5dc` |
| Asker | `notionists-neutral` | `#b6e3f4` (çelik mavi) | `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=TOHUM&backgroundColor=b6e3f4` |
| Tüccar | `personas` | `#c0f4c4` (yeşil) | `https://api.dicebear.com/9.x/personas/svg?seed=TOHUM&backgroundColor=c0f4c4` |
| Militan | `adventurer` | `#f4c4b6` (al) | `https://api.dicebear.com/9.x/adventurer/svg?seed=TOHUM&backgroundColor=f4c4b6` |
| Yabancı | `big-smile` | `#e4c0f4` (mor) | `https://api.dicebear.com/9.x/big-smile/svg?seed=TOHUM&backgroundColor=e4c0f4` |

---

### Başlangıç İlişki Matrisi (Köken Grupları Arası)

> Bu değerler, iki farklı köken grubundan lider çiftlenince başlangıç ilişkisine eklenir.  
> Kendi `sempati` değerleri ayrıca eklenir.

|  | Sokak | Asker | Tüccar | Militan | Yabancı |
|---|---|---|---|---|---|
| **Sokak** | +10 | **−15** | −5 | +8 | −5 |
| **Asker** | −15 | **+15** | +10 | **−30** | −8 |
| **Tüccar** | −5 | +10 | **+5** | −18 | +8 |
| **Militan** | +8 | **−30** | −18 | **+20** | −5 |
| **Yabancı** | −5 | −8 | +8 | −5 | **+5** |

---

### Sempati Puanı Açıklaması

`sempati` değeri, bu lider bir fraksiyon başına geçtiğinde **tüm dış ilişkilere** eklenen genel karizmatik/itici etki:

- **+20 … +25** → Ünlü barışçı ya da saygı duyulan figür; herkes yaklaşmak ister
- **+10 … +19** → Güvenilir, tanınan; ilişkiler pozitif başlar
- **0 … +9** → Nötr; özelliği olmayan başlangıç
- **−1 … −14** → Notorious; diğerleri temkinli yaklaşır
- **−15 … −25** → Korkulan ya da nefret edilen; herkes baştan gergin

`kan_davasi` ve `eski_dost` değerleri ise **yalnızca o iki lider aynı anda seçilirse** devreye girer; çok daha güçlüdür.

---

### Grup 1 — Sokak (Liderler #1–#20)

*İstanbul sokaklarından çıkmış, hayatta kalmayı başarmış figürler. Birbirlerine orta düzey sempati duyarlar; askere karşı kronik güvensizlik.*

| # | Ad | Lakap | Tohum | Sempati | Özel İlişkiler |
|---|---|---|---|---|---|
| 1 | Kara Mehmet | Boğaziçi'nin Gölgesi | `kara-mehmet` | +5 | Kan davası → #21: −35 |
| 2 | Çukur Ali | Delişmen | `cukur-ali` | +2 | Eski dost → #61: +22 |
| 3 | Kıl Payı Hasan | Hayatta Kalan | `kilpayi-hasan` | +12 | — |
| 4 | Bıçak Sırtı Kemal | Keskin | `bicaksirtikemal` | −8 | Kan davası → #43: −28 |
| 5 | Gece Yarısı Murat | Uykusuz | `geceyarisi-murat` | +3 | Kan davası → #98: −30 |
| 6 | Tophane Osman | Eski Toprak | `tophane-osman` | +14 | Eski dost → #86: +18 |
| 7 | Bacanak Sami | Yandaş | `bacanak-sami` | +8 | Eski dost → #1: +15 |
| 8 | Fırtına Erkan | Delice | `firtina-erkan` | −12 | Kan davası → #22: −20 |
| 9 | Yılan Gözlü Cevat | Soğukkanlı | `yilangozlu-cevat` | −5 | Eski dost → #50: +20 |
| 10 | Külkedisi Tarık | Zorlu | `kulkedisi-tarik` | +6 | — |
| 11 | Kasap Yılmaz | Acımasız | `kasap-yilmaz` | −18 | Eski dost → #41: +25 |
| 12 | Kömür Fikret | Karanlık | `komur-fikret` | −10 | — |
| 13 | Patlak Lastik Vedat | Takılı | `patlak-vedat` | +1 | — |
| 14 | Demir Boncuk Süleyman | Serttaş | `demirboncuk-suleyman` | −3 | Eski dost → #15: +12 |
| 15 | Boz Kurt Hamit | Sürü Lideri | `bozkurt-hamit` | +16 | Eski dost → #1: +15, eski dost → #7: +10 |
| 16 | Çakı Yusuf | Sivri | `caki-yusuf` | −6 | Kan davası → #33: −22 |
| 17 | Gürültülü Şükrü | Patırtılı | `gurultulu-sukru` | −14 | — |
| 18 | Mazlum Ahmet | İkiyüzlü | `mazlum-ahmet` | +9 | Kan davası → #20: −30 |
| 19 | Boyacı Selim | Renkli | `boyaci-selim` | +18 | Eski dost → #44: +15 |
| 20 | Kancık Celal | Sinsi | `kancik-celal` | −22 | Kan davası → #47: −40, kan davası → #18: −30 |

---

### Grup 2 — Asker / Devlet (Liderler #21–#40)

*Eski ordu ya da emniyet mensupları. Ciddi, hiyerarşi sever. Militana kanlı düşman, tüccarla pragmatik ittifak.*

| # | Ad | Lakap | Tohum | Sempati | Özel İlişkiler |
|---|---|---|---|---|---|
| 21 | Albay Rıza | Disiplinli | `albay-riza` | −5 | Kan davası → #1: −35, kan davası → #65: −50 |
| 22 | Komutan Fevzi | Katı | `komutan-fevzi` | −8 | Kan davası → #64: −45 |
| 23 | Teğmen Umut | Genç Kan | `tegmen-umut` | +18 | Eski dost → #35: +14 |
| 24 | Binbaşı Serkan | Stratejist | `binbasi-serkan` | +10 | Eski dost → #22: +15, eski dost → #40: +15 |
| 25 | Emekli Komiser Cem | Çevreli | `komiser-cem` | +20 | Eski dost → #55: +18 |
| 26 | Jandarma Nihat | Sert | `jandarma-nihat` | −15 | Kan davası → #73: −25 |
| 27 | Piyade Erdal | Sadık | `piyade-erdal` | +6 | — |
| 28 | Bomba Uzmanı Bülent | Hassas | `bomba-bulent` | −3 | — |
| 29 | Sniper Koray | Sabırlı | `sniper-koray` | +4 | Kan davası → #75: −20 |
| 30 | Kamuflaj Tuncay | Kaybolur | `kamuflaj-tuncay` | +8 | — |
| 31 | Eski İstihbarat Faruk | Bilgili | `istihbarat-faruk` | −12 | Kan davası → #83: −20 |
| 32 | Demir Yaka Zafer | Katı Kuralcı | `demiryaka-zafer` | −6 | — |
| 33 | Şehit Oğlu Levent | Öfkeli | `sehitoglu-levent` | −18 | Kan davası → #16: −22, kan davası → #71: −30 |
| 34 | Kışla Kaçkını Emre | İsyankar | `kisla-emre` | +3 | Eski dost → #62: +15 |
| 35 | Silah Ustası Nuri | Yetenekli | `silahusta-nuri` | +12 | Eski dost → #23: +14 |
| 36 | Paraşütçü İbrahim | Atılgan | `parasutcu-ibrahim` | +7 | — |
| 37 | Deniz Kurdu Bahadır | Gezgin | `denizkurdu-bahadir` | +15 | Eski dost → #81: +18 |
| 38 | Bomba Takımı Soner | Dikkatli | `bombatak-soner` | −2 | — |
| 39 | Helikopter Çağrısı Volkan | Panikçi | `heli-volkan` | −10 | — |
| 40 | Kırmızı Bere Alper | Elit | `kiziibere-alper` | +22 | Eski dost → #22: +15, eski dost → #24: +15 |

---

### Grup 3 — Tüccar / İşadamı (Liderler #41–#60)

*Parayla her şeyi çözmeye alışmış iş dünyası figürleri. Herkesle orta düzey başlar; kendi aralarında hafif rekabet.*

| # | Ad | Lakap | Tohum | Sempati | Özel İlişkiler |
|---|---|---|---|---|---|
| 41 | Altın Diş Agop | Güvenilmez | `altindis-agop` | +5 | Eski dost → #11: +25 |
| 42 | Köşeli Kamil | Hesaplı | `koseli-kamil` | +10 | Eski dost → #56: +30 |
| 43 | Döviz Büro Sabri | Değişken | `doviz-sabri` | +2 | Kan davası → #4: −28 |
| 44 | Kıyak Naim | İyi Niyetli | `kiyak-naim` | +22 | Eski dost → #19: +15 |
| 45 | Çifte Defter Orhan | İkili Oyun | `ciftedefter-orhan` | −8 | — |
| 46 | Borsa Beyi Ufuk | Spekülatör | `borsa-ufuk` | +4 | — |
| 47 | Kira Kıralı Hilmi | Ev Sahibi | `kirakral-hilmi` | +15 | Kan davası → #20: −40 |
| 48 | İhracat İsmet | Uluslararası | `ihracat-ismet` | +12 | Eski dost → #90: +15 |
| 49 | Piyasa Bilal | Değişken | `piyasa-bilal` | +1 | — |
| 50 | Komisyon Bedri | Aracı | `komisyon-bedri` | +18 | Eski dost → #9: +20, eski dost → #90: +20 |
| 51 | Sahte Fatura Mesut | Dolandırıcı | `sahtefatura-mesut` | −20 | — |
| 52 | Nakit Cömert Necdet | Parasever | `nakit-necdet` | +8 | Eski dost → #58: +15 |
| 53 | Gümrük Kapısı Hami | Gizli | `gumruk-hami` | +6 | Eski dost → #84: +12 |
| 54 | Marka Sahtecisi Bayram | Kopya | `marka-bayram` | −14 | — |
| 55 | Sıcak Para Kenan | Akıllı | `sicakpara-kenan` | +16 | Eski dost → #25: +18 |
| 56 | Vergi Kaçağı Fikret | Kaçak | `vergikacak-fikret` | −5 | Eski dost → #42: +30 |
| 57 | İşhanı Beyi Mükremin | Sakin | `ishanı-mukremin` | +20 | — |
| 58 | Borç Veren Nazif | Faizci | `borcveren-nazif` | −6 | Eski dost → #52: +15 |
| 59 | Kargo Şirketi Tekin | Hızlı | `kargo-tekin` | +9 | Eski dost → #87: +10 |
| 60 | Komisyoncu Ramazan | Tatlı Dilli | `komisyoncu-ramazan` | +24 | — |

---

### Grup 4 — Militan / İdealist (Liderler #61–#80)

*Fikir uğruna her şeyi göze almış figürler. Askere kanlı düşman, kendi aralarında güçlü dayanışma.*

| # | Ad | Lakap | Tohum | Sempati | Özel İlişkiler |
|---|---|---|---|---|---|
| 61 | Ateş Perest Barış | Çelişkili | `atesperest-baris` | +8 | Eski dost → #2: +22 |
| 62 | Kızıl Boran Deniz | Sert | `kizilboran-deniz` | −5 | Eski dost → #34: +15 |
| 63 | Devrim Hüseyin | Tutucu | `devrim-huseyin` | +2 | — |
| 64 | Molotof Sezai | Patlayıcı | `molotof-sezai` | −20 | Kan davası → #22: −45 |
| 65 | Köy Yangını Veli | Öfkeli | `koyyangini-veli` | −16 | Kan davası → #21: −50 |
| 66 | Siyah Bayrak Sedat | Radikal | `siyahbayrak-sedat` | −10 | — |
| 67 | Özgürlük Kahraman | İdealist | `ozgurluk-kahraman` | +18 | — |
| 68 | Toprak Reformu Cengiz | Katı | `toprak-cengiz` | +5 | — |
| 69 | Gece Baskını Tahsin | Stratejist | `gecebaskini-tahsin` | −4 | — |
| 70 | Barikat Mevlüt | Engel | `barikat-mevlut` | −8 | — |
| 71 | Başkaldırı Bekir | Asi | `baskaldiri-bekir` | +6 | Kan davası → #33: −30 |
| 72 | Yanan Araba Cenk | Sert | `yananaraba-cenk` | −18 | — |
| 73 | İşçi Hakkı Selçuk | Dayanışmacı | `isci-selcuk` | +14 | Kan davası → #26: −25 |
| 74 | Örgütçü Tamer | Planlayıcı | `orgutcu-tamer` | +10 | Eski dost → #80: +20, eski dost → #79: +20 |
| 75 | Kalaşnikov Kaya | Silah Düşkünü | `kalasnikov-kaya` | −22 | Kan davası → #29: −20 |
| 76 | Propaganda Halil | Konuşkan | `propaganda-halil` | +20 | — |
| 77 | Grev Öncüsü Burhan | Kararlı | `grevcusu-burhan` | +12 | Eski dost → #80: +35 |
| 78 | Barikatta Ölüm Umut | Korkusuz | `barikat-umut` | −6 | — |
| 79 | Sınıf Savaşı Yıldırım | Keskin | `sinif-yildirim` | +7 | Eski dost → #74: +20 |
| 80 | Kızıl Fırtına Cihan | Coşkulu | `kizilf-cihan` | +16 | Eski dost → #77: +35, eski dost → #74: +20 |

---

### Grup 5 — Yabancı Kökenli (Liderler #81–#100)

*İstanbul'a farklı geçmişlerden gelmiş; bazıları mülteci, bazıları sürgün, bazıları servet arayan cesur adamlar.*

| # | Ad | Lakap | Tohum | Sempati | Özel İlişkiler |
|---|---|---|---|---|---|
| 81 | Rum Vasilis | Denizci | `rum-vasilis` | +10 | Eski dost → #37: +18 |
| 82 | Bulgar Boris | Soğuk | `bulgar-boris` | −8 | — |
| 83 | Kürt Serhat | Gizli Ağ | `kurt-serhat` | +6 | Kan davası → #31: −20 |
| 84 | Çeçen İbrahim Halil | Acımasız | `cecen-ibrahim` | −16 | Kan davası → #89: −30, eski dost → #53: +12 |
| 85 | Arnavut Besim | Onurlu | `arnavut-besim` | +14 | Eski dost → #93: +15 |
| 86 | Gürcü Giorgi | Sadık | `gurcu-giorgi` | +8 | Eski dost → #6: +18, kan davası → #90: −25 |
| 87 | Suriyeli Walid | Hayatta Kalan | `suriyeli-walid` | +5 | Eski dost → #59: +10 |
| 88 | İranlı Daryoush | Sinsi | `iranli-daryoush` | −10 | — |
| 89 | Ukraynalı Mykola | Sert | `ukraynali-mykola` | −5 | Kan davası → #84: −30 |
| 90 | Rus Viktor | Soğukkanlı | `rus-viktor` | +2 | Eski dost → #50: +20, eski dost → #48: +15, kan davası → #86: −25 |
| 91 | Leh Bartosz | Planlayıcı | `leh-bartosz` | +12 | — |
| 92 | Romen Constantin | Uyumlu | `romen-constantin` | +7 | — |
| 93 | Sırp Dragan | Güçlü | `sirp-dragan` | −4 | Eski dost → #85: +15, eski dost → #95: +20 |
| 94 | Macar Zoltán | Hesaplı | `macar-zoltan` | +16 | — |
| 95 | Makedon Bojan | Sessiz | `makedon-bojan` | +9 | Eski dost → #93: +20 |
| 96 | Boşnak Adnan | Onurlu | `bosnak-adnan` | +11 | — |
| 97 | Azeri Elvin | Akıllı | `azeri-elvin` | +18 | Eski dost → #86: +15, kan davası → #98: −45 |
| 98 | Ermeni Hagop | Tarihe Düşman | `ermeni-hagop` | −15 | Kan davası → #5: −30, eski dost → #90: +20, kan davası → #97: −45 |
| 99 | Yunan Stavros | Denizci | `yunan-stavros` | +13 | Eski dost → #81: +12 |
| 100 | Kıbrıslı Petros | İki Taraflı | `kibrisli-petros` | +20 | Eski dost → #81: +10, eski dost → #99: +10 |

---

### Başlangıç İlişki Formülü

Oyun başında iki lider çiftlenince, o iki fraksiyon arasındaki başlangıç ilişki skoru şöyle hesaplanır:

```
başlangıçİlişki = grupMatrisi(köken_A, köken_B)
                + lider_A.sempati
                + lider_B.sempati
                + özelBağ(lider_A, lider_B)   // kan davası veya eski dost varsa
```

**Örnek:** Albay Rıza (#21, Asker, sempati −5) vs Köy Yangını Veli (#65, Militan, sempati −16):
```
grupMatrisi(Asker, Militan) = −30
sempati toplamı             = −5 + (−16) = −21
özelBağ(#21, #65)          = −50  (Rıza Veli'nin köyünü yaktırdı)
─────────────────────────────────────
Başlangıç ilişki            = −101 → sınırlanır → −100  ► Savaş (baştan)
```

**Örnek 2:** Komisyoncu Ramazan (#60, Tüccar, sempati +24) vs Kıbrıslı Petros (#100, Yabancı, sempati +20):
```
grupMatrisi(Tüccar, Yabancı) = +8
sempati toplamı               = +24 + +20 = +44
özelBağ(#60, #100)           = 0   (bağ yok)
─────────────────────────────────────
Başlangıç ilişki              = +52 → sınırlanır → +52  ► Dostluk (baştan!)
```

---

### Önemli Feud Ağı (Öne Çıkan Çatışmalar)

```
#21 Albay Rıza  ←−35→  #1  Kara Mehmet      (baskın, kardeş ölümü)
#21 Albay Rıza  ←−50→  #65 Köy Yangını Veli (köy yakma emri)
#22 Komutan Fevzi ←−45→ #64 Molotof Sezai   (Sezai'nin babası tutuklandı)
#20 Kancık Celal ←−40→ #47 Kira Kıralı Hilmi (borç dolandırıcılığı)
#84 Çeçen İbrahim ←−30→ #89 Ukraynalı Mykola (savaş geçmişi)
#97 Azeri Elvin  ←−45→  #98 Ermeni Hagop     (tarihsel husumet)
#86 Gürcü Giorgi ←−25→  #90 Rus Viktor       (Gürcistan geçmişi)
#33 Şehit Oğlu Levent ←−30→ #71 Başkaldırı Bekir (babasının ölümü)
```

### Önemli Dostluk Ağı (Öne Çıkan İttifaklar)

```
#80 Kızıl Fırtına Cihan ←+35→ #77 Grev Öncüsü Burhan   (ortak örgüt geçmişi)
#56 Vergi Kaçağı Fikret ←+30→ #42 Köşeli Kamil          (aynı muhasebeci)
#41 Altın Diş Agop      ←+25→ #11 Kasap Yılmaz           (eski iş ortaklığı)
#50 Komisyon Bedri      ←+20→ #9  Yılan Gözlü Cevat      (gizli aracılık)
#50 Komisyon Bedri      ←+20→ #90 Rus Viktor              (silah ticareti)
#40 Kırmızı Bere Alper  ←+15→ #22 Komutan Fevzi          (kardeş komutanlar)
#15 Boz Kurt Hamit      ←+15→ #1  Kara Mehmet            (Boğaziçi birliği)
#6  Tophane Osman       ←+18→ #86 Gürcü Giorgi           (eski mahalle)
```

---

### Teknik Entegrasyon: Lider Havuzu (`config.js`)

```js
export const LIDER_HAVUZU = [
  // Her lider: { id, ad, lakap, tohum, kokkoen, sempati, kanDavalari, eskiDostlar, ozellik, bonus, ikon }
  {
    id: 1,
    ad: "Kara Mehmet",
    lakap: "Boğaziçi'nin Gölgesi",
    tohum: "kara-mehmet",
    koken: "sokak",         // grup matrisi için
    sempati: 5,
    kanDavalari: [{ hedef: 21, deger: -35 }],
    eskiDostlar: [],
    ozellik: "gizlici",     // mevcut kişilik sistemi (BAĞIMSIZ)
    bonus: { kayipAzaltma: 0.15 },
    ikon: "👻",
  },
  // ... 99 lider daha
];
```

> `ozellik` ve `bonus` alanları Bölüm 5'teki kişilik sistemindendir ve **sempati/kanDavalari ile çakışmaz**.  
> Oyun başında `koken` → grup matrisi + `sempati` + aktif `kanDavalari/eskiDostlar` → başlangıç ilişki skoru.

---

### Avatar Önizleme (Örnek 5 Lider)

| Lider | Avatar URL |
|---|---|
| #1 Kara Mehmet | `https://api.dicebear.com/9.x/lorelei/svg?seed=kara-mehmet&backgroundColor=ffd5dc` |
| #21 Albay Rıza | `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=albay-riza&backgroundColor=b6e3f4` |
| #44 Kıyak Naim | `https://api.dicebear.com/9.x/personas/svg?seed=kiyak-naim&backgroundColor=c0f4c4` |
| #64 Molotof Sezai | `https://api.dicebear.com/9.x/adventurer/svg?seed=molotof-sezai&backgroundColor=f4c4b6` |
| #100 Kıbrıslı Petros | `https://api.dicebear.com/9.x/big-smile/svg?seed=kibrisli-petros&backgroundColor=e4c0f4` |

---

*100 lider havuzu sayesinde her oyun farklı başlangıç dinamikleri sunar. 4 lider seçiminde teorik kombinasyon sayısı: C(100,4) = **3.921.225** farklı oyun başlangıcı.*
