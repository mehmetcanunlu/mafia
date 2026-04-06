# Mafia2 Projesi Genel Inceleme Raporu

Tarih: 2026-04-07  
Inceleme kapsami: kod tabani statik analiz (oyun dongusu, ekonomi, savas, AI, lojistik, casusluk)

## Ozet

Kod tabaninda oyun dengesini dogrudan bozan iki kritik sorun var:

1. Tasit iade akisi bozuk oldugu icin araclar geri donmuyor.
2. Oyuncu saldirisinda birlik kaynaktan dusmedigi icin birlik kopyalama olusuyor.

Bunlar duzeltilmeden ekonomi/AI dengesi saglikli olculemez.

---

## Kritik Bulgular (Oncelige Gore)

### P0 - Tasit iadesi calismiyor

- Belirti: Konvoydan donen araba/motor stoklara geri yazilmiyor.
- Neden: `bolgeId` sayiya zorlanarak aranmis (`Number(bolgeId)`), fakat bolge id'leri string (`fatih`, `r0c0` vb).
- Etki:
  - Uzun oyunda lojistik kapasite eriyor.
  - AI saldiri ritmi yapay sekilde dusuyor.
  - Oyuncu da operasyon yaptikca "kilitlenmis" hissetmeye basliyor.
- Kanit:
  - `src/logistics.js:38`
  - `src/istanbul.js:489`
  - `src/main.js:56`
  - `src/ai.js:408`
  - `src/spy.js:111`

### P0 - Oyuncu saldirisinda birlik eksilmiyor (birlik kopyalama)

- Belirti: Saldiri komutunda para dusuyor ama birlik kaynaktan alinmadan yeni konvoy olusuyor.
- Etki:
  - Sonsuz/bedelsiz birlik projeksiyonu.
  - Tum ekonomi ve savas dengesi gecersiz hale geliyor.
- Kanit:
  - `src/actions.js:281`
  - `src/actions.js:332`
  - `src/actions.js:760` (hizli saldirida dogru sekilde `yigindanAl` kullaniliyor, yani davranislar tutarsiz)

### P1 - Hareket/rota akisinda mantik celiskisi

- Belirti: `hedef.owner === k.owner || tarafsiz` durumunda konvoy hemen yiginlanip siliniyor.
- Sonuc: Alttaki "rota devam etsin" bloklari pratikte anlamsiz kalabiliyor.
- Etki:
  - Cok adimli sevk davranisinda tutarsizlik.
  - Oyuncu bekledigi transit davranisini alamiyor.
- Kanit:
  - `src/main.js:81`
  - `src/main.js:90`
  - `src/main.js:114`

### P1 - Garnizon modeli ile savas modeli uyumsuz

- Belirti: Savunma hesabi agirlikla `oyun.birimler` uzerinden yuruyor, `garnizon` beklenen rollerde degil.
- Etki:
  - UI'de gorulen guc ile gercek savunma sonucu farkli olabiliyor.
  - Oyuncu karar kalitesi dusuyor.
- Kanit:
  - `src/main.js:133`
  - `src/ai.js:370`
  - `src/main.js:37`

### P2 - Hizli saldiri Istanbul id formatinda bozuluyor

- Belirti: Kaynak seciminde ID parse islemi sayisal kabul ediyor.
- Neden: `parseInt(sec.split(":")[0], 10)` string ilce id'lerinde (`fatih`) `NaN` uretir.
- Etki:
  - Ozellik butonu bir cok senaryoda kullanilamaz.
- Kanit:
  - `src/actions.js:713`
  - `src/actions.js:714`
  - `src/istanbul.js:449`

### P2 - Zorluk parametrelerinin bir kismi tanimli ama devrede degil

- Belirti: `aiAttackChance`, `aiPenaltyVsPlayer`, `aiCooldownMin/Max`, `aiBribePref` tanimli fakat AI karar akisinda aktif kullanilmiyor.
- Etki:
  - Zorluk seviyesi davranissal farktan cok baslangic bonusu gibi calisiyor.
- Kanit:
  - `src/config.js:5-35`
  - `src/state.js:19`

### P2 - Ofke flag'i AI tarafinda yanlis hedefe yaziliyor

- Belirti: AI suikast basarisiz olunca `biz._ofke` artiyor; ama AI kararinda kontrol edilen `fr._ofke`.
- Etki:
  - "Misilleme modu" beklenen sekilde tetiklenmiyor.
- Kanit:
  - `src/ai.js:414`
  - `src/ai.js:432`
  - `src/spy.js:214`

---

## Ekonomi Dengesi Analizi

### 1) Gelir-buyume kartopu etkisi

- Gelir tarafi:
  - Tur bazli gelir toplama (`yGel`, lider, bolge/bina/arastirma bonuslari) hizli carpan uretiyor.
  - Referans: `src/main.js:364-371`, `src/ai.js:258-264`
- Uretim tarafi:
  - Her 5 turda nufustan adam cevrimi var, sohret carpanlariyla hizla buyuyor.
  - Referans: `src/main.js:375-385`, `src/ai.js:266-283`
- Maliyet tarafi:
  - Bakim var ama gec oyunda gelir carpani kadar agresif artmiyor.
  - Referans: `src/main.js:419-430`, `src/units.js:251-267`

Degerlendirme: Orta-uzun oyunda "kazanan daha hizli kazanir" egilimi yuksek.

### 2) Tarafsiz bolge ele gecirme modeli tutarsiz

- Oyuncu ve AI tarafsiz bolge alma formulu farkli.
- Bu fark bazen adil hissi bozar (AI daha "akilli fiyata", oyuncu daha "sabit ceza formuluyle" oynuyor).
- Referans:
  - Oyuncu: `src/actions.js:229-233`
  - AI: `src/ai.js:361-366`, `src/ai.js:474-483`

### 3) Lojistik ekonomisi su an bozuk olcum veriyor

- Tasit iadesi bug'i sebebiyle tasit ekonomisi gercek maliyet/surdurulebilirlik yerine bozuk veri uretiyor.

---

## AI Davranis Analizi

### Guclu taraflar

- Hedef skorlamasi tek boyutlu degil:
  - basari olasiligi
  - gelir degeri
  - ozel bolge degeri
  - kesif bilgisi
- Referans: `src/ai.js:369-395`

### Zayif taraflar

1. Yalnizca komsu dusmana bakiyor (operasyonel derinlik yok).  
   Referans: `src/ai.js:496-500`

2. Stratejik hedef katmani yok:
   - "once oyuncuyu bog", "gelir koridorunu kes", "zayif cepheyi cokert" gibi metalar yok.

3. Zorluk parametreleri davranisa yeterince bagli degil:
   - agresyon/cooldown gibi ayarlar pratikte etkisiz.

4. Casusluk tarafinda ofke akisinda baglanti kopuk.

---

## Ne Yapilabilir? (Uygulama Sirasi)

### Faz 1 - Acil Duzeltmeler (P0)

1. `bolgeTasitIadeEt` icinde `bolgeById(Number(bolgeId))` -> `bolgeById(bolgeId)` duzelt.
2. Oyuncu `saldiri()` akisinda konvoy olusturmadan once kaynaktan birlik dus:
   - rota cikis bolgesi uzerinden `yigindanAl` veya esitdeger mekanizma.
   - basarisiz olursa islem rollback.

### Faz 2 - Oynanis Tutarliligi (P1)

1. Hareket modelini tek standartta topla:
   - `hedefId = bir sonraki adim`
   - `rota = kalan adimlar`
2. Garnizon + birim savunmasini tek savunma modelinde birlestir.

### Faz 3 - Denge ve AI Iyilestirme

1. Zorluk parametrelerini AI kararina bagla:
   - min saldiri olasiligi,
   - cooldown araligi,
   - oyuncuya odak katsayisi.
2. AI'ya stratejik katman ekle:
   - cephe onceligi
   - ekonomik hedef onceligi
   - toparlanma modu (negatif para/yardimci savunma)
3. Ekonomi KPI hedefleri belirle:
   - 20/40/60. tur net gelir
   - bakim/gelir orani
   - ortalama birlik buyuklugu

---

## Son Not

Bu rapor statik kod incelemesine dayalidir. Simulasyon bazli dengeyi dogrulamak icin P0/P1 duzeltmelerinden sonra otomatik tur simule eden bir test harness eklenmesi onerilir.
