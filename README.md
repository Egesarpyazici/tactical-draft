# Tactical Draft

Kurgusal iki takımın 90 dakikalık maçını oynatan, React + TypeScript + Vite / Phaser 3 tabanlı **yerel geliştirme alfası**. Sonuç baştan seçilmez: top hareketi, bireysel kararlar, müdahaleler ve kale çizgisini geçişler skor üretir.

Bu sürüm test edilebilir bir motor temeli ve çalışan maç ekranıdır. Profesyonel futbol istatistiklerine kalibre edilmiş, rekabetçi dengesi doğrulanmış veya çok oyunculu bir ürün değildir. Gol ve top kaybı oranlarının gerçekçilik çalışması sonraki motor aşamasının önceliğidir.

## Çalıştırma

Node.js 22.12+ (bu ortamda 24.19) gerekir. Ücretli servis, API anahtarı ve oyun sunucusu gerekmez.

```sh
npm ci
npm run dev
```

Vite'nin gösterdiği yerel adresi tarayıcıda açın. Maç öncesi her iki takımın taktiklerini seçin, **Maçı başlat** düğmesine basın. İzleme hızları 1×–120×; 120× hızda yaklaşık 45 saniye aktif izleme süresi ve ayrıca devre arası gerekir. Tarayıcı yavaşsa görüntü/simülasyon duvar saati hızından geri kalabilir; motor adımları atlanmaz. Devre arasında değişiklik yapıp ikinci yarıyı başlatın. Maç sonunda skor, takım/oyuncu istatistikleri ve JSON çıktısı kullanılabilir.

```sh
npm test                      # motor, fizik, taktik ve deterministik tam maç testleri
npm run build                 # TypeScript kontrolü + üretim paketi
npm run simulate -- 12         # aynı 12 tohumda düşük/yüksek pres: 24 maç
npm run format:check
npm run test:e2e               # Chromium ile gerçek tarayıcı testi
```

Tarayıcı testi varsayılan `/usr/bin/chromium` kullanır. Başka sistemlerde `CHROMIUM_PATH=/tam/yol/chromium npm run test:e2e` çalıştırın. Test sunucuyu kendisi başlatır. `npm run preview` derlenmiş uygulamayı yerelde açar.

## Kapsam

- 22 farklı kurgusal futbolcu, sürekli 105 × 68 m saha, 100 ms sabit motor adımı.
- 4-3-3, 4-2-3-1, 4-4-2, 3-5-2; sekiz taktik parametresi ve diziliş rolleri.
- Açıklanabilir fayda puanları, topsuz destek/koşu, markaj, pas açısı kapatma, pres.
- Pas, ilk kontrol, top sürme, müdahale, şut, kaleci yakalama/sektirme ve fiziksel gol geçişi.
- Başlama, taç, köşe vuruşu, kale vuruşu; otomatik devre arası ve 90:00 bitiş.
- Motor verisini gösteren Phaser saha, hız/duraklatma, kadro ve karar inceleme panelleri.
- Tam maç olayları, oyuncu mesafe/pres süresi, takım istatistikleri ve yerel JSON indirme.

**Henüz yok:** ofsayt, faul, kart, penaltı, serbest vuruş, hava topu/üçüncü eksen, oyuncu değişikliği, sakatlık, uzatma süresi, draft, çevrim içi oda, kalıcı hesap/veri. Yeniden başlatmalar basitleştirilmiştir; tam futbol kural seti uygulanmaz. Oyun içi açıklama da bu eksikleri belirtir.

## Kod haritası

| Konum                     | Sorumluluk                                            |
| ------------------------- | ----------------------------------------------------- |
| `src/engine/types.ts`     | Motor sözleşmeleri ve veri modelleri                  |
| `src/engine/match.ts`     | Yaşam döngüsü, sabit adım, hareket ve top fiziği      |
| `src/engine/decisions.ts` | Puanlanabilir ve incelenebilir karar adayları         |
| `src/engine/tactics.ts`   | Formasyon/rol haritaları ve taktik konumlandırma      |
| `src/engine/stats.ts`     | Gerçek olaylardan istatistik biriktirme               |
| `src/engine/math.ts`      | Tohumlu RNG, geometri, saha/zaman sabitleri           |
| `src/data/teams.ts`       | Kurgusal kadro ve nitelikler                          |
| `src/ui/`                 | React kontrolleri ve salt okunur Phaser görünümü      |
| `tests/`                  | Vitest motor testleri ve Playwright tarayıcı testleri |
| `docs/`                   | Mimari, doğrulama raporu ve ham çoklu maç çıktısı     |

[Mimari ve özellik etkileri](docs/ARCHITECTURE.md) · [Doğrulama ve teknik eksikler](docs/VALIDATION.md)

## Barındırma ve sonraki aşama

`npm run build` çıktısı `dist/` altında statik bir uygulamadır; Cloudflare Pages üzerinde build komutu `npm run build`, çıktı dizini `dist` olacak şekilde ileride kullanılabilir. Bu çalışma hiçbir hizmeti yayımlamaz, Pages projesi oluşturmaz veya ücretli servis etkinleştirmez.

Motor tarayıcı API'lerine bağımlı değildir. İleride Durable Object tek otorite olarak aynı motoru adımlayacak; istemci yalnızca doğrulanacak komutlar gönderecek ve sunucu durumunu çizecek. Mevcut yerel istemci motoru, rekabetçi çok oyunculu sistemde sonuç otoritesi olarak kullanılmayacak. Çok oyunculu/draft geliştirmesinden önce mevcut fizik ve davranış kalibrasyonu ilerletilmeli.
