# Durum ve Aksiyon Raporu — KAPANIŞ

İlk rapor tarihi: 2026-04-06  
Kapanış/senkron tarihi: 2026-08-28  
Durum: **Bu rapordaki tüm bulgular çözüldü veya geçersiz çıktı.** Dosya arşiv
niteliğindedir; güncel durum için `PROJE_PLANI.md`'ye bakın.

## Bulguların Kapanış Durumu

### Plan-Kod Tutarsızlıkları

| Bulgu | Özet | Kapanış |
|---|---|---|
| T1 | Dosya haritası eksik/yanlış (`diplomacy.js` vb.) | ✅ 2026-08-28: `PROJE_PLANI.md` dosya haritası gerçek `src/` içeriğiyle yeniden yazıldı (`diplomasi.js`, `gucDengesi.js`, `liderHavuzu.js`, `logistics.js`, `istanbul-geometry.js`, `scripts/tutorial` dahil) |
| T2 | Faz 6 maddeleri planda açık görünüyordu | ✅ Faz 6 kodda tamamlanmıştı; son açık madde (esir takas/serbest bırakma) 2026-08-28'de kodlandı ve planda işaretlendi |
| T3 | Planda kayıt sürümü eski (2/4), kodda farklı | ✅ Kodda `VERIYON = 8`; plan güncellendi, sürüm guard'ları sertleştirildi (`save.js`) |

Not: Raporun "diplomacy.js yok, import/çağrı yok" tespiti sonradan geçersizleşti —
diplomasi geri getirilip `src/diplomasi.js` olarak oyunun en büyük modülü oldu.

### Hata/Risk Bulguları

| Bulgu | Özet | Kapanış |
|---|---|---|
| R1 | Harita kartları/SVG düşman istihbaratını açık veriyordu | ✅ Koddaki `bolgeEtiketIstihbaratMetni()` + `istihbaratGizli` maskeleme ile çözülmüş (`ui.js`) |
| R2 | `garnizonTemizleVeYiginaTasi()` ai3'ü atlıyordu | ✅ Fonksiyon kaldırıldı; garnizon geçişi `legacyGarnizonlariBirimlereAktar/Tasi` ile tüm owner'lar için yapılıyor |
| R3 | `tileSavasVeSonuc` / `tileIcCatismaVeTemizlik` ölü kod | ✅ Kodda artık yok |
| R4 | `_kesifAi` yazılıyor ama okunmuyordu | ✅ Artık okunuyor: `ai.js` süre kontrolü + `diplomasi.js` tüketimi |
| R5 | `arastrmaBonus` yazım hatası | ✅ Kodda tek yazım `arastirmaBonus` |

## 2026-08-28 Oturumunda Ek Olarak Kapananlar

Bu rapor kapsamı dışında, aynı senkron oturumunda tespit edilip düzeltilenler:

- **XSS**: çete adları kaynakta `adTemizle()` ile temizleniyor, render noktaları
  `htmlKacir()` kullanıyor (`utils.js`, `ui.js`, `main.js`, `modal.js`, `save.js`)
- **Otokayıt sırası**: `otomatikKaydet()` artık savaş/hareket çözümünden sonra
- **Zafer sonrası fazladan tur**: `turIsle()` kazanan bulununca `return` ediyor
- **İstatistik geri yükleme**: kayıttan dönen istatistik artık silinmiyor;
  yeni oyun eski grafiği devralmıyor
- **`spy.js` ölü garnizon yazımları** temizlendi
- **Yeni özellikler**: esir takası/serbest bırakma, lojistik harita modu (tuş 4),
  SVG konvoy okları, sürükle-bırak birlik hareketi

## Güncel Açık Borçlar

Bu rapordaki her şey kapandığı için yeni açık işler `PROJE_PLANI.md` →
"Bilinen açık borçlar" bölümünde takip ediliyor (gelir formülü tekilleştirme,
sim-test determinizmi, ölü kod temizliği, erişilebilirlik, kayıt migrasyon altyapısı).
