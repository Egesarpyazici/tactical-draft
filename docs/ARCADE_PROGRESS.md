# Tactical Draft — Arcade Slice A

Dal: `feat/arcade-manager-shot-prototype`. Temel: `feat/simulation-foundation` / `707cc8f`; onaylı tasarım `b036a62`. Kod checkpoint'leri: `fb0cf6e`, `fffa8f6`. Çalışma bu dala commit edilip gönderildi. Klasik motor/UI dosyaları ve PR #1 değiştirilmedi. Ana dala birleştirme veya yayın yapılmadı.

## Çalışan kapsam

- `/arcade`: bağımsız, tohumlu TypeScript sekans motoru; iki kurgusal 11, 90 dakika, devre arası, 70. dakika karar durağı ve maç sonu.
- Yüksek pres, kompakt kontra ve topa sahip olma: pas riski, baskı/top kazanım bölgesi, ilerleme, şut fırsatı, yerleşim ve enerji bedelleri farklıdır. Maç öncesi ve duraklatılmış maçta değişiklik sonraki sekansa uygulanır.
- Phaser 2D saha, motor kaynaklı oyuncu/top yolları, kaleci bitiş konumu, hız seçimi ve duraklatma. Önceden belirlenmiş maç skoru yoktur; yalnız güncel sekans hesaplanıp oynatılır.
- İki taraf için eşit Son Çare: 70'ten sonra bir saha oyuncusunun yerine yönetici, 11 kişi/1 kaleci korunur; yöneticiye özel fırsat veya gol bonusu yoktur. Yeterli kaliteye sahip gerçek fırsat doğarsa tek manuel şut açılır. Hiç fırsat bulamamak geçerli sonuçtur.
- Yön/ince hedef, yükseklik, güç ve zamanlama; kaleci tepkisi/erişimi, baskı, kondisyon ve bitiricilikten hesaplanan gol/kurtarış/dışarı/üstten dışarı. Aynı fizik iki taraf için geçerlidir. Klavye ve dokunma kontrolleri, maçtan ayrı iki taraflı antrenman.
- Koyu yeşil/lime arayüz; kadro/özellikler, gerçek istatistik ve olaylar, taktik öncesi/sonrası gözlem, yönetici katkısı, maç JSON'u ve motor seviyesinde komut tekrarı.
- Eski sürüm `/` adresinde korunur. Çevrim içi oda, draft ve gelişmiş rol editörü yoktur.

## Doğrulama kaydı

- `npm test`: **91/91 geçti**, tek tam koşu, 160.17 saniye. Eski 71 + yeni 20 test. Determinizm/komut tekrarı, oyun sınırları, geçersiz komutlar, eşit erişim, tek şut, fırsat eşiği, şut fiziği, taktik bedelleri ve animasyon zaman regresyonu.
- `npm run build`: başarılı; TypeScript ve Vite üretim derlemesi. Phaser paket boyutu uyarısı sürüyor.
- **7/7 Playwright testi geçti** (5.2 dakika): üç Arcade akışı ve dört klasik regresyon. Gerçek 90 dakika/iki kazanılmış manuel şut, duraklatma/taktik, mobil/klavye/iki taraflı antrenman; klasik varsayılan tam maç 222.6 saniyede tamamlandı. Son şut ekranı metin/mesafe düzeltmesinin ardından **3/3 Arcade tarayıcı testi yeniden geçti**; son üretim derlemesi de başarılı. Açık başarısız test yok.
- Değişen kod/belgeler için Prettier ve `git diff --check` başarılı.
- Tohum 101–124 ile **216 maç** ve ham veri: [doğrulama/denge raporu](arcade/VALIDATION.md), [JSON](arcade/benchmark-seeds-101-124.json). İlk kalibrasyon/test örnekleminden ayrıdır.
- Tarayıcıda bulunan StrictMode çift canvas ve negatif ilk kare ilerleme hataları düzeltildi. Açıklaması doğrulama raporundadır; test başarısızlıkları gizlenmedi.

## Kullanıcı testi

[Çalıştırma, Codespaces ve kontroller](arcade/PLAY.md). Kısaca `npm ci`, `npm run dev`, ardından `http://localhost:5173/arcade`. Varsayılan hızda hesaplanan aktif maç süresi 5.7–6.2 dakika; tarayıcı tam maç doğrulaması hızlı modda yapıldı. İnsan karar süreleri ve cihaz etkisi ayrıdır.

## Açık borçlar ve sonraki iş

1. Rekabetçi denge bitmedi: topa sahip olma zayıf, maçların gol hacmi yüksek. Ham sonuçlar raporda; bu sürüm profesyonel futbol istatistiklerine kalibre değildir. Kadro aynalama ve yeni tohum gruplarıyla ayrı dengeleme çalışması gerekir.
2. Görselleştirme sekans enterpolasyonudur. Her pas alıcısının ayağına fiziksel temas, bağımsız sürekli oyuncu AI, tam duran top/faul/ofsayt/hava topu yoktur. Fırsat puanı kalibre xG değildir.
3. Şut ve taktikler yerel istemcide çalışır. Sunucu otoritesi, süre sınırı, hile önleme ve çevrim içi odalar Slice C'dir. JSON içe aktarma ekranı yoktur.
4. Normal hızda Arcade tam maçının gerçek duvar süresi ve düşük güçlü fiziksel mobil cihaz testleri yapılmadı. Görsel ve otomatik akış kontrolü, gerçek kullanıcı eğlence testi yerine geçmez.
5. Genel yedek/değişiklik sistemi ve geniş rol/draft arayüzü Slice B'dir. Yönetici hakkı sonrası pas desteğinde kalır, tekrar şut alıcısı seçilmez.
6. Taslak inceleme: [PR #2](https://github.com/Egesarpyazici/tactical-draft/pull/2), hedef `feat/simulation-foundation`. PR #1 ve `main` değiştirilmedi. Son belge/ekran kanıtları bu PR kapsamındadır. Slice A oynanabilir prototip teslimi tamamlandı; yukarıdaki denge/gerçekçilik sınırları devam eder.
