# Durum ve Aksiyon Raporu

Tarih: 2026-04-06  
Kapsam: `PROJE_PLANI.md` ve `src/*.js` karsilastirmasi  
Not: Bu calismada kod degisikligi yapilmadi; sadece durum tespiti ve iyilestirme onerileri uretildi.

## Durum Ozeti

### Faz siniflandirmasi (plan vs kod)

| Faz | Plan Durumu | Kod Gercegi | Sinif | Kanit |
|---|---|---|---|---|
| Faz 1-5 | Tamamlandi olarak yazili | Ana mekanikler kodda var | yapildi | `src/main.js`, `src/actions.js`, `src/ui.js`, `src/research.js`, `src/spy.js` |
| Faz 6 | Tum maddeler bos (`[ ]`) | Diplomasi sokumu + bina + olay + entegrasyonlarin buyuk kismi kodda var | tutarsiz | `/Users/umutvardernegi/mafia/PROJE_PLANI.md:192-221` vs `src/actions.js`, `src/events.js`, `src/main.js`, `src/state.js`, `src/save.js` |
| Faz 7 | Tamamlandi (`[x]`) | AI birim/arama/casusluk/bina/hedef secimi kodda var | yapildi | `src/ai.js` |
| Faz 8 | Tamamlandi (`[x]`) | UI ikonlar, arastirma paneli, ses baglantilari kodda var | yapildi | `src/ui.js`, `src/audio.js`, `src/spy.js`, `src/research.js` |
| Faz 9 | Tamamlandi (`[x]`) | Tip bazli bakim, save normalize, baslangic tip garantisi kodda var | yapildi | `src/units.js`, `src/save.js`, `src/state.js`, `src/main.js` |

### Faz 6 madde siniflandirmasi (yapildi/kismi/acik/tutarsiz)

- yapildi:
  - Diplomasi bagimliliklari sokulmus (`diplomacy.js` yok, import/cagri yok)
  - Bina kurma/yukseltme/UI var
  - Olay sistemi agirlikli havuzla calisiyor
  - Gecekondu genc uretimi var
  - Kumarhane riskli olay etkisi var
  - Depo savunma bonusu combat hesabinda
  - Arastirma efektleri ekonomi/casusluk/satin alma tarafina bagli
  - Yarali iyilesme ticki var
- kismi:
  - Esir serbest birakma/takas maddesi: fidye var, takas/serbest birakma akislari yok
- acik:
  - Faz 6 maddeleri plan dosyasinda hala `[ ]` oldugu icin resmi durum guncellenmemis
- tutarsiz:
  - Plan metni diplomasiyi hala mevcut dosya haritasinda gosteriyor, kodda yok

## Plan-Kod Tutarsizliklari

### Bulgu T1
- Bulgu: `PROJE_PLANI.md` dosya haritasi hala `diplomacy.js` varmis gibi yaziyor.
- Etki: Yeni gelistirici yanlis dosyaya baglanir, onboarding ve bakim hizi duser.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/PROJE_PLANI.md:28`, `src/` klasorunde `diplomacy.js` yok.
- Onerilen duzeltme: Dosya haritasini mevcut `src` icerigi ile birebir guncelle; kaldirilan modulleri listeden sil.
- Oncelik: P0

### Bulgu T2
- Bulgu: Faz 6 maddeleri planda tamamen acik gorunuyor (`[ ]`) ama kodda buyuk oranda uygulanmis.
- Etki: Is takip raporu gercegi yansitmiyor; hangi isin kaldigi net gorunmuyor.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/PROJE_PLANI.md:192-221` vs `src/actions.js`, `src/events.js`, `src/main.js`, `src/state.js`, `src/save.js`.
- Onerilen duzeltme: Faz 6 maddelerini `yapildi/kismi/acik` olarak yeniden isaretle; sadece gercek acik kalemleri birakir.
- Oncelik: P0

### Bulgu T3
- Bulgu: Plan dokumaninda save versiyonu `2`, kodda save versiyonu `4`.
- Etki: Save uyumlulugu hakkinda yanlis beklenti olusur.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/PROJE_PLANI.md:72`, `/Users/umutvardernegi/mafia/src/save.js:6`.
- Onerilen duzeltme: Dokumana save versiyonu ve normalize edilen alanlarin guncel listesini ekle.
- Oncelik: P0

## Hata ve Risk Bulgulari (P0-P3)

### Casusluk anlami

#### Bulgu R1
- Bulgu: Duz detay panelinde istihbarat kilidi olsa da harita kartlari ve Istanbul SVG etiketleri dusman garnizon/birim bilgisini acik veriyor.
- Etki: Kesif mekanigi deger kaybediyor; oyuncu casusluk yapmadan kritik bilgiyi aliyor.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/src/ui.js:313`, `/Users/umutvardernegi/mafia/src/ui.js:378`, `/Users/umutvardernegi/mafia/src/ui.js:409`, `/Users/umutvardernegi/mafia/src/ui.js:423`, `/Users/umutvardernegi/mafia/src/ui.js:498`, `/Users/umutvardernegi/mafia/src/ui.js:499`.
- Onerilen duzeltme: Harita/SVG tarafinda da kesif kilidi uygula; kesif yoksa `?` veya tahmini bant goster.
- Oncelik: P1

### Bulgu R2
- Bulgu: `garnizonTemizleVeYiginaTasi()` sadece `biz/ai1/ai2` icin garnizonu yiginlara tasiyor; sonra tum ownerlarda `garnizon` siliyor.
- Etki: AI3 baslangic gucu yeni oyunda tutarsiz olabilir.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/src/main.js:42-47`.
- Onerilen duzeltme: Owner kosuluna `ai3` ekle veya owner listesini dinamiklestir.
- Oncelik: P1

### Bulgu R3
- Bulgu: `tileSavasVeSonuc` ve `tileIcCatismaVeTemizlik` fonksiyonlari tanimli ama cagrilmiyor.
- Etki: Kod karmasasi artar; davranis degisikligi sanilan ama aktif olmayan kod bakim maliyeti dogurur.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/src/main.js:60`, `/Users/umutvardernegi/mafia/src/main.js:97`.
- Onerilen duzeltme: Kullanilmiyorsa kaldir; kullanilacaksa `hareketTick()` akisina net entegrasyon yap.
- Oncelik: P2

### Bulgu R4
- Bulgu: AI kesif state'i `_kesifAi` olarak yaziliyor ancak hicbir yerde okunmuyor.
- Etki: AI kesif operasyonu davranisa etkisiz kalir; bos maliyet ureten bir akis olur.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/src/ai.js:373` (okuma referansi yok).
- Onerilen duzeltme: `_kesifAi` bilgisini AI hedef secimi/saldiri skoru ve UI ihbar akisina bagla.
- Oncelik: P2

### Bulgu R5
- Bulgu: `universite` ozelliginde `arastrmaBonus` yazim hatasi var; isimlendirme tutarsiz.
- Etki: Gelecekte bu alan okunmak istendiginde sessiz bug uretme riski.
- Kanit (dosya:satir): `/Users/umutvardernegi/mafia/src/config.js:77`, `/Users/umutvardernegi/mafia/src/config.js:89`.
- Onerilen duzeltme: `arastirmaBonus` adina gecis, geriye donuk normalize notu ve yorum temizligi.
- Oncelik: P3

## Oncelikli Iyilestirme Backlogu

### P0 (dokumantasyon dogrulugu)
- `PROJE_PLANI.md` faz durumlarini kodla hizala (`Faz 6` maddeleri guncelle).
- Dosya haritasini gercek `src` yapisina gore duzelt (`diplomacy.js` referansini kaldir).
- Save bolumunu versiyon 4 ve normalize edilen alanlarla guncelle.

### P1 (oynanis dogrulugu)
- Kesif yokken harita karti + Istanbul SVG dusman istihbaratini maskele.
- `garnizonTemizleVeYiginaTasi()` icin `ai3` tasima tutarsizligini gider.

### P2 (kod sagligi)
- Kullanilmayan savas fonksiyonlarini kaldir veya aktif akisa entegre et.
- AI kesif state'ini karar mekanigina bagla (hedef skoru, risk analizi, zamanli etkiler).

### P3 (temizlik)
- `arastrmaBonus` typo duzelt ve yorumlari standartlastir.
- Benzer isimlendirme borclari icin kucuk bir config naming denetimi ekle.

## 7 gunluk uygulama sirasi (P0 -> P1 -> P2)

1. Gun 1: `PROJE_PLANI.md` dosya haritasi ve save versiyonu guncellemesi (P0).
2. Gun 2: Faz 6 maddelerini `yapildi/kismi/acik` olarak net isaretleme (P0).
3. Gun 3: Harita kartinda kesif yoksa dusman garnizon/birim bilgisini gizleme (P1).
4. Gun 4: Istanbul SVG tooltip/info etiketlerinde ayni istihbarat gizleme kurali (P1).
5. Gun 5: `garnizonTemizleVeYiginaTasi()` owner kosulunu `ai3` dahil duzeltme (P1).
6. Gun 6: Kullanilmayan savas fonksiyonlari icin karar: kaldirma veya entegrasyon (P2).
7. Gun 7: AI `_kesifAi` state entegrasyonu + `arastrmaBonus` typo temizligi (P2+P3).

