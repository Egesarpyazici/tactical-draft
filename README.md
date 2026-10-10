# Tactical Draft

Kurgusal iki takımın 90 dakikalık maçını oynatan, React + TypeScript + Vite / Phaser 3 tabanlı **Aşama 2B-1 yerel geliştirme alfası**. Sonuç baştan seçilmez: top hareketi, bireysel kararlar, müdahaleler ve kale çizgisini geçişler skor üretir.

Bu sürüm test edilebilir bir motor temeli ve çalışan maç ekranıdır. Profesyonel futbol istatistiklerine kalibre edilmiş, rekabetçi dengesi doğrulanmış veya çok oyunculu bir ürün değildir. Takım organizasyonu, pas karşılama, kontrollü müdahale, 19 oyuncu rolü ve maç içi taktik komutları uygulanmıştır. Kalan gerçekçilik farkları Aşama 2A raporunda açıklanır.

## Çalıştırma

Node.js 22.12+ (bu ortamda 24.19) gerekir. Ücretli servis, API anahtarı ve oyun sunucusu gerekmez.

```sh
npm ci
npm run dev
```

Vite'nin gösterdiği yerel adresi tarayıcıda açın. Taktik ve rol seçimlerini **Değişiklikleri Uygula** ile kaydedin, **Maçı başlat** düğmesine basın. **Önemli Anlar**, **Genişletilmiş**, **Tüm Maç** ve **Hızlı Sonuç** aynı motoru kullanır. Önemli anlar pozisyon öncesi sekiz saniyeye kadar gelişimi içerir. 1×, önemli anlarda dört kat; tüm maçta 12 kat maç saati anlamına gelir. 2× ve 4× görünüm hızları da vardır.

Her modda **Duraklat** ile taktik/rol/mevki değiştirilebilir. Düzenleme taslakta birikir; **Değişiklikleri Uygula** veya **Vazgeç** kullanın. Henüz gösterilmemiş gelecek iptal edilir ve simülasyon görünen gerçek durumdan devam eder. **Sahadaki etki** paneli ölçülmüş konum/iş yükü/pas bağlantılarını gösterir. Bütün modlar devre arasında durur. Maç sonunda gerçek istatistikler ve JSON çıktısı kullanılabilir. Ayrıntılar: [2B-1 raporu](docs/stage-2b-1/REPORT.md).

```sh
npm test                      # motor, fizik, taktik ve deterministik tam maç testleri
npm run build                 # TypeScript kontrolü + üretim paketi
npm run simulate -- 12         # aynı 12 tohumda düşük/yüksek pres: 24 maç
npm run benchmark -- /tmp/benchmark.json 4 1  # altı senaryo × dört tohum
npm run format:check
npm run test:e2e               # Chromium ile gerçek tarayıcı testi
```

Tarayıcı testi varsayılan `/usr/bin/chromium` kullanır. Başka sistemlerde `CHROMIUM_PATH=/tam/yol/chromium npm run test:e2e` çalıştırın. Test sunucuyu kendisi başlatır. `npm run preview` derlenmiş uygulamayı yerelde açar.

## Kapsam

- 22 farklı kurgusal futbolcu, sürekli 105 × 68 m saha, 100 ms sabit motor adımı.
- 4-3-3, 4-2-3-1, 4-4-2, 3-5-2; sekiz taktik parametresi ve diziliş rolleri.
- Ortak savunma hatları, tekil markaj paylaşımı, birincil/destek baskısı ve oyuncu ayrışması.
- 19 davranış profili, mevkiye uygun görevler ve açıklanabilir özellik uyumu.
- Açıklanabilir fayda puanları, topsuz destek/koşu, pas açısı oluşturma ve baskı.
- Pas, ilk kontrol, top sürme, müdahale, şut, kaleci yakalama/sektirme ve fiziksel gol geçişi.
- Başlama, taç, köşe vuruşu, kale vuruşu; otomatik devre arası ve 90:00 bitiş.
- Motor verisini gösteren Phaser saha, hız/duraklatma, kadro ve karar inceleme panelleri.
- Tam maç olayları, müdahale denemeleri/başarıları, oyuncu mesafe/pres süresi ve JSON v3 indirme.
- Başlangıç girdileri ve tick sıralı komutlardan deterministik yeniden üretim (`replayMatch`).

**Henüz yok:** ofsayt, faul, kart, penaltı, serbest vuruş, hava topu/üçüncü eksen, oyuncu değişikliği, sakatlık, uzatma süresi, draft, çevrim içi oda, kalıcı hesap/veri. Yeniden başlatmalar basitleştirilmiştir; tam futbol kural seti uygulanmaz. Oyun içi açıklama da bu eksikleri belirtir.

## Kod haritası

| Konum                     | Sorumluluk                                             |
| ------------------------- | ------------------------------------------------------ |
| `src/engine/types.ts`     | Motor sözleşmeleri ve veri modelleri                   |
| `src/engine/match.ts`     | Yaşam döngüsü, sabit adım, hareket ve top fiziği       |
| `src/engine/decisions.ts` | Puanlanabilir ve incelenebilir karar adayları          |
| `src/engine/tactics.ts`   | Formasyon/rol haritaları ve taktik konumlandırma       |
| `src/engine/stats.ts`     | Gerçek olaylardan istatistik biriktirme                |
| `src/engine/math.ts`      | Tohumlu RNG, geometri, saha/zaman sabitleri            |
| `src/data/teams.ts`       | Kurgusal kadro ve nitelikler                           |
| `src/viewing/`            | Önemli an seçimi, checkpoint tamponu, taslak ve gözlem |
| `src/ui/`                 | React kontrolleri ve salt okunur Phaser görünümü       |
| `tests/`                  | Vitest motor testleri ve Playwright tarayıcı testleri  |
| `docs/`                   | Mimari, doğrulama raporu ve ham çoklu maç çıktısı      |

[Aşama 2A tasarım ve rol kapsamı](docs/stage-2a/DESIGN.md) · [Karşılaştırmalı doğrulama](docs/stage-2a/REPORT.md) · [Gerçek futbol referansları](docs/stage-2a/REFERENCES.md)

İlk sürümün tarihsel kayıtları: [mimari](docs/ARCHITECTURE.md), [doğrulama](docs/VALIDATION.md). Bunlar v0.1 içindir; güncel davranış için Aşama 2A ve 2B-1 belgelerini kullanın.

## Barındırma ve sonraki aşama

`npm run build` çıktısı `dist/` altında statik bir uygulamadır; Cloudflare Pages üzerinde build komutu `npm run build`, çıktı dizini `dist` olacak şekilde ileride kullanılabilir. Bu çalışma hiçbir hizmeti yayımlamaz, Pages projesi oluşturmaz veya ücretli servis etkinleştirmez.

Motor tarayıcı API'lerine bağımlı değildir. İleride Durable Object tek otorite olarak aynı motoru adımlayacak; istemci yalnızca doğrulanacak komutlar gönderecek ve sunucu durumunu çizecek. Mevcut yerel istemci motoru, rekabetçi çok oyunculu sistemde sonuç otoritesi olarak kullanılmayacak. Çok oyunculu/draft geliştirmesinden önce mevcut fizik ve davranış kalibrasyonu ilerletilmeli.
