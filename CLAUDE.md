# Mafya Bölge Savaşı — Proje Kuralları

## İkinci beyin (ikincibeyin vault, V3)

Mehmet'in kalıcı hafızası ayrı bir vault: `$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/ikincibeyin`.
Bu projede anlamlı bir iş bittiğinde (özellik, düzeltme, karar, doğrulama) oraya kaynak bağlantılı
bir sonuç kaydı yaz; oturum sonunu bekleme, iş bitince yaz. Geçici bir JSON hazırla ve vault kökünde çalıştır:

```bash
cd "$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/ikincibeyin" && python3 beyin.py receipt --file /tmp/R.json --harness claude
```

JSON: `{"event_id":"proje-is-tarih","summary":"ne yapıldı, ne doğrulandı, ne açık kaldı","refs":["knowledge/concepts/<ilgili>.md"]}`.
`refs` vault içindeki mevcut dosyalardır; bu projedeki dosya yollarını `summary` içine yaz.
Planı bitmiş gibi yazma; canlı doğrulanmayanı doğrulanmış gösterme. Önemsiz sohbet için kayıt yazma.
Kalıcı bir öğrenim çıktıysa aynı vault'ta `python3 beyin.py note-create` ile `knowledge/concepts/` altına damıt.
6. turda gelen tek seferlik Stop hook hatırlatması bu kuralın mekanik yedeğidir; hatırlatma gelmese de kural geçerlidir.
