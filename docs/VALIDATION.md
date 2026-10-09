# Doğrulama raporu · 9 Ekim 2026

## Çalışan teslim kapsamı

Tarayıcıda maçı başlatma, hareketli 22 oyuncu ve topu izleme, hızı değiştirme, duraklatma/devam etme, devre arası iki takımın talimatlarını düzenleme ve 90 dakika sonunda olaylardan hesaplanan sonuçları görüntüleme uygulanmıştır. JSON dışa aktarma bir analiz snapshot'ıdır.

## Otomatik doğrulama

- **Vitest: 25 test geçti.** Aynı tohumda bitmiş durumun ve tüm olayların eşitliği; farklı tohum; adım paketlemesinden bağımsızlık; devre arası durması ve saha yönü değişimi; taktik değişikliğinin ikinci yarı pozisyonlarına etkisi; girdi/snapshot izolasyonu; hatalı girdi reddi.
- Üç ayrı tam maçta **162.000 adım** boyunca oyuncu sonlu konum/sınır ve tek top sahipliği kontrolü; her 100 adımda daha kapsamlı top sınırı, enerji ve istatistik kontrolleri. Gol/pas/şut/müdahale sayıları olay listesiyle karşılaştırıldı.
- Kontrollü senaryolar: kale çizgisini geçmeden gol olmaması, hızlı pasın alıcıdan tünellememesi, kaleci müdahalesi, taç, köşe/kale vuruşu sahipliği, diziliş rolleri ve başlama yerleşimi.
- Taktik testleri: iki yarıda yüksek çizgi/dar-geniş konum hedefleri, aynı durumda yüksek presin daha çok baskı kararı üretmesi, üç eşlenmiş tohumda gerçekleşen pres süresi, dört dizilişle geçerli konumlar, nitelik değişiminin karar puanına etkisi.
- **Playwright: 2 test geçti (52.7 saniye).** Masaüstünde gerçek tarayıcıda tam maç, duraklatılmış saatin sabitliği, 45:00 devre arasında 3-5-2 ve %90 pres değişikliği, 90:00 bitiş, indirilen veride sonuçların doğrulanması ve yeni maç. Ayrıca 390 px mobil genişlikte taşma ve hatalı tohum bildirimi.
- **Üretim derlemesi geçti.** TypeScript strict kontrolü ve Vite üretim çıktısı alındı. Phaser ayrı pakette yaklaşık **1.21 MB / gzip 332 kB**; Vite boyut uyarısı verir. Bu bir derleme hatası değildir, fakat yükleme optimizasyonu yapılmalıdır.

## 24 tam maç: düşük/yüksek pres

Komut: `node --import tsx scripts/simulate.ts 12`. Tohumlar 1–12; her tohum için ev sahibi presi 15 ve 85, diğer başlangıç girdileri aynı. Her maç tam 54.000 adım; toplam **1.296.000 adım**. Ham çıktı: [paired-simulations.json](paired-simulations.json).

| Ev sahibi ölçümü, 12 maç ortalaması     | Pres 15 | Pres 85 |
| --------------------------------------- | ------: | ------: |
| Toplam oyuncu pres süresi (saniye)      |  232.17 | 1937.42 |
| Bitiş kondisyonu (11 oyuncu ortalaması) |   %72.9 |   %71.6 |
| Şut                                     |    7.50 |   14.50 |
| Pas denemesi                            |  411.92 |  428.58 |
| Tamamlanan pas                          |  131.08 |  140.08 |
| Maçın toplam golü (iki takım)           |    9.50 |   12.33 |

12 eşleşmenin tamamında yüksek pres daha çok gerçekleşmiş pres süresi ve daha düşük ortalama kondisyon üretti. Bu, talimatın davranış ve tüketim üzerinde etkisini gösterir; yüksek presin rekabetçi olarak dengeli veya daha iyi olduğunu göstermez. Aynı tohumla başlamak, karar akışları ayrıldıktan sonra iki maçın aynı rastgele aksiyon dizisini kullanacağı anlamına gelmez. Taktik kararının doğrudan etkisi ayrıca aynı durumdaki kontrollü testle doğrulandı.

**Kalibrasyon açığı belirgin:** toplam goller bu örneklemde 6–18 arasında; pas tamamlama yaklaşık %32–33. Gol ve top kaybı oranları gerçek profesyonel futboldan uzaktır. Bu rakamlar saklanmadı veya skor sonradan kırpılarak düzeltilmedi. Maçların bitmesi ve deterministik olması, davranışların gerçekçi/dengeli olduğu anlamına gelmez. Çok oyunculu veya rekabetçi değerlendirmeden önce bu açıklar giderilmelidir.

## Bilinen teknik borçlar

- Ofsayt, faul/kart/penaltı/serbest vuruş, hava topu, oyuncu değişikliği, sakatlık, uzatma ve tam yeniden başlatma kuralları uygulanmadı.
- Tüm vuruşlar yer seviyesinde. Top yüksekliği, spin, oyuncu gövde çarpışması/ayrışması ve engel etrafından yol bulma yok. Aynı alanı paylaşan oyuncular ve sık top kapma tekrarları mümkün.
- Savunma markaj paylaşımı, pas karşılaması, kaleci çıkışları ve şut seçim dağılımları geliştirilmelidir. Savunmadan çıkış şimdilik pas mesafesi tercihiyle sınırlı.
- Top sürerken saha sınırında oyuncu/top kırpılır; taç/kale çizgisi geçişi serbest top fiziğinde işler. Yeniden başlatma hazırlığında oyuncu konumu doğrudan ayarlanır; yürüyüş animasyonu yok.
- Başlama vuruşu kontrollü top sahipliği verir; zorunlu ilk pas/ikinci dokunuş kuralları uygulanmaz. Duran top uzman rolleri ve duran top organizasyonları yok.
- Sahipsiz top süresi son sahip takımın topa sahip olmasına eklenir. Kaleyi bulan şut ve kaleci müdahalesi tanımları için mimari belgesine bakın; resmî istatistik standardı iddiası yoktur.
- Maç motoru ve görünüm şimdilik ana tarayıcı iş parçacığında; snapshot tüm olayları kopyalar. Yüksek hızlarda yavaş cihazlarda performans düşebilir. Web Worker ve artımlı olay aktarımı sonraki adımdır.
- UI başlangıç/devre arası taktiklerini kaydeder ama oturum yenilenince kalıcılık yok. Dışa aktarma, RNG iç durumunu/tam başlangıç komut geçmişini taşımadığından geri yükleme değildir.
- Phaser büyük paket; tembel yükleme veya özelleştirilmiş Phaser derlemesi yapılmadı. Sistem yazı tipleri kullanılır, harici font/varlık isteği yok.
- Görsel testler Chromium/Linux masaüstü ve mobil viewport'tur; gerçek iOS/Android cihaz testi yapılmadı. 25 motor testi exhaustive doğrulama değildir.

## Sonraki motor kabul eşiği

Çok oyunculudan önce: kontrollü savunma/kaleci/pas alma senaryolarını genişletmek, sık top kapma tekrarlarını azaltmak, ofsayt ve temel oyuncu ayrışmasını eklemek ve daha büyük/ayrı tohum kümelerinde gol-pas-mesafe dağılımlarını ölçmek. Bu sürümde rekabetçi denge konusunda kesin iddia yoktur.

## Tarayıcı kanıtları

Son Playwright çalıştırmasının [90:00 masaüstü ekranı](screenshots/match-finished.png) ve [mobil ekranı](screenshots/mobile.png) kaydedildi. Masaüstü senaryosunda tohum 2026, devre arasında ev sahibi 3-5-2 ve pres 90; sonuç 9–6. Bu görüntü kalibrasyon açığını da görünür kılar.
