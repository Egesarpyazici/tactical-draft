# Motor mimarisi · v0.1

## Kararlar

Motor `src/engine` içinde saf TypeScript'tir. React, Phaser, DOM, zamanlayıcı, ağ veya duvar saati kullanmaz. `Match.step(n)` sadece 100 ms'lik tam adımlar alır. React bir zaman biriktiricisiyle bu adımları çağırır; Phaser sonuçları okur ve hiçbir oyun kararı vermez. Yüksek görüntüleme hızı fizik adımını büyütmez. İlk karede negatif olabilecek animasyon zaman farkı sıfıra kırpılır.

Başlangıç girdileri derin kopyalanır. `snapshot()` kopya döndürür. `state` motorun sahip olduğu canlı durumdur; test senaryoları için erişilebilir, üretim UI'sında yazılmaz. Çok oyunculu adaptörde bu nesne istemciye yetkili yazma API'si olarak açılmamalıdır. Snapshot RNG iç durumunu içermez; analiz çıktısıdır, kaydedilmiş maçtan devam/replay formatı değildir.

Rastgelelik yalnızca tohumlu RNG üzerinden aksiyon icrasında kullanılır. Pas/şut hata payı, kontrol, müdahale ve kaleci müdahalesi olasılıkları beceri/geometriye bağlıdır. Skor üreten bağımsız bir kura veya hedef skor yoktur. Aynı motor sürümü, kadro, tohum ve aynı adımlardaki talimatlar tekrar aynı durumu üretir. Farklı JavaScript motorları arasında bit düzeyinde taşınabilirlik henüz test edilmedi.

## Adım sırası

1. Tick ve maç saati ilerler; yeniden başlatma varsa hazırlık sayacı işlenir.
2. Aktif oyunda topa sahip olma sayacı artar.
3. Karar zamanı gelen tüm oyuncular aynı hareket-öncesi durum üzerinden değerlendirilir (500 ms; şut sırasında kaleciler 100 ms).
4. Oyuncular hızlanma, azami hız, enerji ve aksiyona göre hareket eder.
5. Top sahibi varsa top oyuncuya bağlanır, yakın rakip müdahalesi ve seçilen aksiyon değerlendirilir.
6. Serbest top varsa hız/sürtünme, süpürülmüş yol kesişimleri ve ilk saha sınırı geçişi hesaplanır.
7. 27.000. adımda devre arası; 54.000. adımda maç sonu. Faz durduğunda fazla `step` çağrıları durum değiştirmez.

Tüm goller topun kale çizgisini direkler arasında geçmesinden kaynaklanır. Topa son dokunuş kendi kalesine golü de mümkün kılar. Pas/şut hedefleri koşu hedefi olarak uygulanmaz: oyuncu vuruş için yavaşlar. Serbest top temasında topu alan oyuncu için tek sahiplik atanır ve uçuş temizlenir. Pası atan oyuncunun kendi pasını tekrar alması tamamlanmış pas sayılmaz.

## Karar sistemi

Her oyuncu duruma uygun adaylar üretir. Adayın `action`, `target`, `utility`, `reason` ve gerekirse `receiver` bilgisi vardır; UI seçili oyuncunun ilk üç adayını gösterir. Sabit “önce şut, yoksa pas” sırası yerine en yüksek fayda seçilir. Karar becerisi düşük oyuncuların deterministik algı sapması daha büyüktür.

- Topla: pas seçeneklerinin ileri kazancı, koridor açıklığı, alıcı boşluğu ve tercih edilen mesafesi; top sürme koridoru/baskı; şut mesafesi, açı, bitiricilik ve baskı.
- Hücumda topsuz: formasyon alanı, pas desteği ve boşluğa koşu.
- Savunmada: formasyona dönüş, topa uzaklık/takım içi mesafe sırası ile pres, bölgedeki oyuncuyu markaj ve pas açısını kapatma.
- Serbest top: en yakın oyuncuların kurtarma puanı daha yüksek.
- Kaleci: kale-top açısı, şutun öngörülen kale çizgisi kesişimi ve yakın serbest top.

Bu bir başlangıç utility AI'dır. Takım düzeyi ortak koşu planı, alan kontrol haritası, öğrenilmiş karar modeli veya kapsamlı taktik rol uzmanlığı değildir. Roller formasyon slotlarına bağlıdır; mevkiler arasında oyuncu sürükleme/rol görevi düzenleme henüz yoktur.

## Nitelikler nerede etkilidir?

Tüm nitelikler 0–100 aralığındadır. Oyuncu üretimi ayrı ve sabit tohumludur; maç tohumu kadroyu değiştirmez.

| Nitelik                       | Fiilî etki                                           |
| ----------------------------- | ---------------------------------------------------- |
| Pas                           | Pas faydası, top hızı ve hedef hata payı             |
| Teknik                        | Pas hedefi sapması                                   |
| İlk kontrol                   | Gelen topu sahiplenme veya sektirme olasılığı        |
| Top sürme                     | Dripling faydası, rakibin müdahale başarısına direnç |
| Bitiricilik                   | Şut seçme faydası ve hedef dağılımı                  |
| Şut gücü                      | Topun şut hızı                                       |
| Hız / hızlanma                | Azami hareket hızı / hız vektörünün değişim sınırı   |
| Dayanıklılık                  | Mesafe başına enerji tüketimi; enerji hızı düşürür   |
| Pozisyon alma                 | Formasyona dönüş adayının puanı                      |
| Oyun görüşü                   | Değerlendirilen pas mesafesi ve pas desteği puanı    |
| Karar verme                   | Karar puanı algı sapması ve pres talimatı uygulaması |
| Soğukkanlılık                 | Baskı altında şut faydası/hatâsı ve top koruma       |
| Topsuz hareketlilik           | Boşluğa koşu faydası                                 |
| Markaj / savunma farkındalığı | Markaj ve pas açısı kapatma puanları                 |
| Müdahale / agresiflik         | Yakın rakipten top kazanma olasılığı                 |
| Pres eğilimi                  | Pres emrinin uygulanma puanı                         |
| Kaleci refleksi               | Şut müdahalesi ve taşıyıcıdan top alma               |
| Kaleci tutuşu                 | Yakalama/sektirme ve taşıyıcıdan top alma            |
| Kaleci erişimi                | Topla kesişebileceği fiziksel yarıçap                |

## Taktikler doğrudan skor katsayısı değildir

| Talimat          | Davranış etkisi                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Pres             | Baskı mesafesi/faydası; daha çok oyuncu topa çıkar; pres hareketi daha fazla enerji tüketir |
| Çizgi            | Savunma/hücum konum hedeflerinin ileri-geri ötelenmesi; geride kalan fiziksel alan değişir  |
| Genişlik         | Formasyon hedeflerinin merkez eksenden uzaklığı; savunmada ayrıca sıkışır                   |
| Tempo            | Pas tercihi ve topa sahip olduktan sonraki vuruş bekleme süresi                             |
| Pas uzunluğu     | Aday pas mesafesi tercihi                                                                   |
| Hücum anlayışı   | Hücum konum hedefi ve topsuz ileri koşu hedefi                                              |
| Savunmadan çıkış | Kısa/dengeli/doğrudan pas mesafesi tercihinin kaydırılması                                  |
| Geçiş            | Top kazanımından sonraki ilk sekiz saniyede ileri pas ve koşu tercihi                       |

Skorda geri olan takımın son 30 dakikada şut isteği az miktarda artar. Diziliş ve talimatlar maç öncesi/devre arası değiştirilir; canlı maçta API de değişikliği reddeder. Devre arası saha yönü ve formasyonlar yeniden kurulur, kondisyon sınırlı toparlanır.

## İstatistiklerin tanımı

Gol, şut, pas, tamamlanan pas, başarılı müdahale, kesme, kaleci müdahalesi ve korner sayıları `record` üzerinden gerçek olaylara dayanır. “Kaleyi bulan şut”, vuruş anındaki yörüngenin direkler arasından geçip geçmeyeceğidir; sonradan bloklanan denemeleri içerir. Kaleci müdahaleleri, kaleyi bulmayan bir topa yapılan müdahaleyi de içerebilir. Bunlar profesyonel veri sağlayıcısı sınıflandırmalarının bire bir karşılığı değildir.

Topa sahip olma aktif oyun tick'leriyle ölçülür; pasın uçuşunda ve sahipsiz top durumunda son sahip takımda kalır. Yeniden başlatma beklemeleri hariçtir. Mesafe gerçek hareket segmentlerinden, pres süresi `press` aksiyonundaki tick'lerden birikir. Hazırlık için konum sıfırlama/yeniden başlatma taşıması mesafe istatistiğine eklenmez.

## Sonraki teknik aşamalar

1. Kontrollü senaryolarla markaj paylaşımı, oyuncu çarpışma/ayrışması, pas karşılama ve kaleci çıkışlarını geliştirmek; turn-over/gol oranlarını makul dağılımlara yaklaştırmak.
2. Ofsayt ve faul durum makineleri; duran top planları, hava topu, yedek/değişiklik.
3. Kaydedilebilir RNG + başlangıç konfigürasyonu + tick numaralı taktik komutları içeren sürümlü replay sözleşmesi.
4. Motor işini Web Worker'a taşıma, olay/snapshot farklarıyla çizim maliyetini azaltma; Phaser yük boyutunu düşürme.
5. Bundan sonra Durable Object odası: sunucunun tuttuğu seed/kadrolar/motor; kimliği ve fazı doğrulanan komutlar; sıra numaralı snapshot/event yayını. İstemcinin gönderdiği skora güvenilmez.
