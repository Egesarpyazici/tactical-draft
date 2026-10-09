# Tactical Draft — devam kaydı

Son güncelleme: 9 Ekim 2026. Geliştirme dalı: `feat/simulation-foundation`. Başlangıç: `0ea9563`. İnceleme: [taslak PR #1](https://github.com/Egesarpyazici/tactical-draft/pull/1). Ana dala birleştirme veya yayın yapılmadı.

## Aşama 2B-1 — güncel çalışma

Temel commit `6090de0`. İzleme katmanı, RNG dahil checkpoint/geri dönüş, dört mod, sekiz saniyelik olay öncesi tampon, tek işlemli taktik taslağı ve ölçülmüş etki paneli uygulandı. Motorun futbol denklemleri değiştirilmedi. Mimari ve sınırlar [2B-1 raporunda](stage-2b-1/REPORT.md).

Uygulama commit'i `0c0ad64`; doğrulama ve güncel görüntüler takip commit'inde. **70 testlik tam paket geçti (133.59 s)**; son kaynak üzerinde **7/7 izleme testi geçti (84.40 s)**. Toplam kapsam 64 mevcut + 7 yeni = 71 test; tek koşuda 71 iddiası yok. Dört Playwright senaryosu, strict TypeScript/Vite üretim derlemesi, Prettier ve diff kontrolü geçti. Varsayılan Önemli Anlar/1×/2026 tohumunda tam maç **217.2 gerçek saniye** sürdü; devre arası ve maç sonu korundu. Ekran görüntüleri `docs/stage-2b-1/screenshots/` altında.

Bu aşamanın geliştirme ve doğrulaması tamamlandı. Test sırasında düzeltilenler: Vitest'e modlar arasında kontrol vererek RPC zaman aşımını kaldırma; karşılaştırma değerlerinin dar panelde kesilmesi; kontra seçicisinde saniye/tick ayrımı; art arda mevki takaslarının korunması; sekans sınırında gol gösteriminin tutulması. Fizik/karar denklemleri değiştirilmedi ve eski 128 maçlık kalibrasyon gereksiz yere tekrarlanmadı.

Sonraki oturumda yeni izleme katmanını yeniden yazma. Açık 2B-1 işleri: düşük güçlü cihazlarda Web Worker/performance değerlendirmesi, farklı tohumlarda seyir süresi ve kullanıcı geri bildirimi, daha gelişmiş alan kontrolü ölçümü. Önemli-an eşikleri sezgiseldir; 217.2 sn tek cihaz/tek maç ölçümüdür. Alttaki Aşama 2A gerçekçilik eksikleri devam ediyor. Gelişmiş draft/çok oyunculuya geçiş bu görev kapsamında değildir.

## Aşama 2A — tamamlanan temel

- Ortak savunma hatları, tekil markaj, birincil/destek presi, pas alıcısı sorumluluğu, boş alan desteği ve yerel ayrışma.
- Pas koridoru/varış süresi/ilk kontrol değerlendirmesi; ayrı müdahale denemeleri ve kontrol süreleri; geometrik şut icrası ve kaleci karar düzeltmesi.
- 19 mevki uyumlu rol, görevler, açık nitelik uyumu ve gerçek konum/karar etkileri.
- Maç öncesi ve duraklatılmış maçta slot/rol/görev/taktik düzenleme; canlı oyuncu konumlarını sıfırlamadan uygulama.
- Tick ve sıra numaralı komut kaydı, başlangıç kadrosundan deterministik yeniden oynatma, JSON v2.
- Mevcut Phaser maç ekranı, 90 dakika, devre arası, istatistikler ve mobil görünüm korundu.
- Önce/sonra 24'er maç ve ayrı 80 maç doğrulaması tamamlandı. JSON sonuçlarını yeniden üretmek gerekli değildir; kaynak özeti holdout dosyasında kayıtlıdır.

## Doğrulama

Son bütünleşik test sonucu ve karşılaştırmalı ölçümler [Aşama 2A raporunda](stage-2a/REPORT.md). Son bütünleşik koşuda **64/64 Vitest testi geçti (88.15 s), sıfır çalıştırıcı hatası**. Strict TypeScript/Vite üretim derlemesi ve biçim denetimi geçti. İki Playwright senaryosu geçti: canlı rol/taktik, devre arası, 90 dakika, JSON ve mobil. Tarayıcı görüntüleri `docs/stage-2a/screenshots/` altında.

## Açık işler — tamamlandı sayılmamalı

1. Pas tamamlama ayrı doğrulamada %66; profesyonel inceleme bandının altında. Koridor kesme ve ilk kontrol kayıplarını ayrı ölçerek iyileştir.
2. Ayrı tohumlarda dengeli maçlar 5.38 gol/maç. Şut yerleştirme/kaleci dengesi ve yüksek isabet oranını incele. Kontrollü deneyde bitiricilik isabeti artırıyor fakat gol oranı monoton değil; başarı kotası ekleme.
3. Zayıf kadro/düşük blok senaryosu fazla gol yiyor. Hatlar arası alan, ceza sahası savunması ve rakip şut konumlarını incele; sekiz maçtan denge hükmü çıkarma.
4. Ofsayt, faul/kart, hava topu, oyuncu değişikliği ve tam duran top kuralları yok. Uygulanmamış roller DESIGN.md içinde; seçilebilir gösterilmez.
5. Tam çarpışma çözücüsü, ceza alanı dışında kaleci el/ayak ayrımı, otomatik skora bağlı maç yönetimi ve öğrenilen takım uyumu yok.
6. Motor hâlâ ana iş parçacığında; Phaser paket boyutu uyarısı sürüyor. Ağ/draft/çok oyunculu geliştirmesine geçmeden motor kalibrasyonuna devam et.

## Sonraki oturum

Önce `git status --short --branch` ve bu raporu oku. Mevcut geliştirmeyi yeniden kurma. `npm test`, `npm run build`, `npm run test:e2e` doğrulama komutlarıdır. Benchmark yöntemleri, sabit tohumlar, kaynaklar ve tanım farkları [REPORT.md](stage-2a/REPORT.md), [DESIGN.md](stage-2a/DESIGN.md), [REFERENCES.md](stage-2a/REFERENCES.md) içinde. Motor değişirse yeni kaynak özetiyle ayrı sonuç dosyası üret; eski ölçümleri değiştirme. Ana dala birleştirmek/yayınlamak için kullanıcı onayı yok.
