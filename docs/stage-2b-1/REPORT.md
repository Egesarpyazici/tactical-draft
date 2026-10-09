# Aşama 2B-1 — maç izleme katmanı

Temel: `6090de0`, `feat/simulation-foundation`, taslak PR #1. Motorun futbol kararları, fizik denklemleri ve Aşama 2A kalibrasyon parametreleri değiştirilmedi. Bu çalışma motor kalibrasyonundaki açık sorunları çözmüş sayılmaz.

## Mimari ve kullanım

`src/viewing/` motorun üstünde ayrı bir izleme katmanıdır. `highlights.ts` gerçek olay/durumdan aday seçer; `director.ts` sınırlı ileri simülasyon, görüntü tamponu ve kullanıcı müdahalesini yönetir; `draft.ts` uygulanmamış taktiği ayrı durumda tutar; `analysis.ts` gerçekleşen konumları örnekler. Phaser salt okunur kalır.

- **Önemli Anlar:** gol, kaleci müdahalesi, deneysel fırsat puanı en az 0.18 olan şut ve ileri bölgede kritik top kazanımı. Puan kalibre edilmiş gol olasılığı değildir.
- **Genişletilmiş:** bunlara diğer şutlar, hızlı hücum, ileri koşu, pas bağlantılarıyla hücum ve koordineli baskı eklenir. Seçim kuralları açıklanabilir sezgisellerdir; futbol yorumcusunun kapsamlı semantik anlayışı iddiası yoktur.
- **Tüm Maç:** bütün motor adımları; 1× görünümde 12 kat maç saati, 2×/4× seçenekleri. İdeal aktif izleme süreleri 7.5 / 3.75 / 1.875 dakika; cihaz hesaplama süresi ve devre arası buna eklenebilir.
- **Hızlı Sonuç:** görüntülerin oynatılmasını beklemeden aynı motoru hesaplar, devre arasında kullanıcı için durur ve maç sonunda gerçek sonuç/analiz panellerini gösterir. İkinci yarı otomatik atlanmaz.

Önemli anlarda 1× gösterim dört kat maç saati kullanır. Süre seçilen gerçek pozisyon sayısına bağlıdır; sabit skor, olay kotası veya süreye göre gol üretimi yoktur. Arama sırasında saha karartılır ve ilerleme saati gösterilir. Pozisyon dışında oyuncuların anlamsız hızda koşması izletilmez. Kullanıcı bütün modlarda duraklatabilir veya izleme modunu değiştirebilir.

## Tampon ve zaman sözleşmesi

Her iki tick'te (0.2 simülasyon saniyesi), ayrıca olaylarda ve faz sınırında checkpoint alınır. Rastgelelik üretecinin tam sayısal durumu; oyuncuların karar zamanları, top uçuşu, yeniden başlatma, kondisyon, skor ve olay/komut geçmişi birlikte korunur. Geçmiş olay nesneleri append-only kabul edilir; dizileri kopyalanır. Checkpoint API'si dahili ve güvenilir girdiler içindir; dışarıdan checkpoint yükleme arayüzü yoktur.

Arama sırasında gösterilmemiş son sekiz saniye tutulur. Olay bulununca mevcut görünür an ile olay öncesi tampon ve normalde beş saniyelik devamı oynatılır; yakın olaylar aynı sekansa birleşir, ilk tetikten en fazla 16 saniye sonrasına uzatılır. Gol ve kurtarışlar tekrar önleme aralığına takılmaz. Sekansın uzama sınırında devam görüntüsü kısalabilir; görünür gol anı 0.9 gerçek saniye tutulur, son tick’teki gol de atlanmaz. Arka arkaya gösterilen sekanslarda zaten izlenen bölüm tekrar oynatılmaz. Devre ve maç sonu tampon içinden mutlaka teslim edilir.

Skor, saat, anlatım ve saha **aynı görünür checkpoint'ten** gelir. Arka plandaki geleceğin gol/istatistikleri gösterilmez. Duraklatma görünür checkpoint'i RNG dahil geri yükler; gelecekteki görüntüler, analiz örnekleri ve olaylar silinir. Sonraki talimat bu gerçek durumdan devam eder. İzleme modu değişikliği de aynı yolu kullanır. Bu bir önceden belirlenmiş maç videosu değildir.

Hesaplama her tarayıcı çağrısında en çok 80 tick ilerler; olay seçimi duvar saatine bağlı değildir. Görüntü hareketleri son gözlenen koordinatlar arasında yaklaşık 35 ms yumuşatılır; ileri koordinat tahmini yapılmaz. Yeniden başlatma, büyük zaman geçişi ve duraklatmada koordinatlar doğrudan eşitlenir. Saat/veri tam checkpoint zamanıdır; görsel yumuşatma birkaç render karesi geriden gelebilir.

## Taktik işlemi

Kaydırıcılar ve rol/mevki/görev seçimleri ayrı bir `TacticalDraft` üzerinde çalışır. Ardışık aynı alan düzenlemeleri birleştirilir. **Değişiklikleri Uygula** tek `batch` komutu üretir; **Vazgeç** gerçek motora dokunmaz. Bekleyen taslak varken devam düğmesi kapalıdır; kullanıcıya neden gösterilir.

Batch önce bağımsız bir kopyada bütünüyle doğrulanır; herhangi bir komut hatalıysa canlı motor değişmez. Başarılı işlem bir komut geçmişi girdisi ve tek taktik anlatımı üretir. Alt komutlar teknik kayıtta korunur. `replayMatch` aynı batch'i aynı tick'te yeniden uygular. JSON dışa aktarma sürümü 3'tür; eski tekil komutlar hâlâ desteklenir. Canlı düzenleme konum ve hızı sıfırlamaz.

## Gözlenen taktik etkisi

İsteğe bağlı **Sahadaki etki** paneli izleme alanını kalabalıklaştırmadan açılır. Aktif oyunda saniyelik örnekler; stoper hattının kendi kalesine uzaklığı, takımın gerçek genişliği, eşzamanlı baskıcı sayısı ve ileri bölgedeki sahipliğin saha üst/orta/alt şerit dağılımını verir. Son müdahale öncesi/sonrası en çok 120 saniye karşılaştırılır; takım bazında işlem seçilir. 30 aktif örnekten azsa yetersiz veri uyarısı vardır.

Son 120 saniyedeki müdahale/pas arası top kazanımları saha üçlülerine, tamamlanan paslar oyuncu bağlantılarına ayrılır. Bütün örnekler görünür zamana kırpılır; geçersiz kılınan gelecek analize sızmaz. Hat mesafesi kullanılabilir boş alanın tam ölçümü değildir. Rakip ve oyun fazı kontrol edilmediğinden önce/sonra farkı nedensel başarı kanıtı olarak sunulmaz.

## Doğrulama durumu

Son test ve tarayıcı sonuçları teslim kontrolünde buraya eklenecektir. Önceki 64 motor testi korunur; mevcut tarayıcı akışının beklentileri açık taslak uygulama ve batch kayıt biçimine uyarlanır. Motor/simülasyon adımları atlanmaz.

## Sınırlar

- Aşama 2A pas başarısı, şut/kaleci dengesi, ofsayt/faul/hava topu ve diğer eksikleri aynen sürer.
- Motor ve seçici ana iş parçacığında çalışır. Tick başına maliyet cihazdan etkilenir; Web Worker sonraki performans adımıdır.
- Tetik eşikleri ve tekrar aralığı henüz geniş kullanıcı çalışmasıyla seyir zevki açısından ayarlanmadı. Birkaç dakikalık önemli-an deneyimi hedeftir, her maç için süre garantisi değildir.
- Serbest kamera, çoklu tekrar açısı, ses, video dışa aktarma ve gelişmiş alan kontrolü haritası yoktur.
- Draft, çevrim içi oda, yedek oyuncu, büyük arayüz yeniden tasarımı, yayın ve ana dala birleştirme yapılmadı.
