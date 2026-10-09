# Aşama 2A tasarım ve kapsam

## Takım organizasyonu

`organization.ts`, her karar turunda ortak formasyon hedefleri, birincil baskıcı, destek baskıcısı, tekil markaj eşleştirmeleri ve pas karşılama sorumlusu çıkarır. Pas atanın takımında sadece amaçlanan alıcı topun varış noktasına yönelir. Diğer oyuncular rol alanlarında pas açısı arar. Destek alanı adayları yakın rakipler ve pas koridoruna göre seçilir; savunma görevi alanı daha dar tutar.

`tactics.ts`, ortak geri hat ve 12.5–15 m hat bağlantılarından hedef konum üretir. Hedefe varış hâlâ oyuncunun hızlanma, kondisyon ve niteliklerine bağlıdır. Savunmacılar tehlikeli rakipleri tekil olarak devralır; derine inen forvet bütün savunmayı peşine takmaz. Yerel ayrışma yönlendirmesi takım arkadaşlarının aynı koordinata yığılmasını azaltır. Bu tam gövde çarpışma çözücüsü değildir.

## Pas, müdahale ve şut

`opportunities.ts`, pasın varış zamanını, alıcının hızını, rakibin pas koridoruna erişmesini, çıkış açısını, baskıyı ve alıcının kontrol becerisini değerlendirir. Gerçek top açısına uygulanan hata mesafe ile büyür; uzun paslar farklı hız ve kontrol güçlüğü üretir. Başarı sayısı yalnızca başka bir takım arkadaşının fiziksel olarak kontrol ettiği uçuşta artar. `relatedEvent` tamamlanan pası başlangıç olayına bağlar; rapor kısa/orta/uzun ve güvenli/riskli grupları ayrı sayar.

Pres ayrı bir davranış; yakın olmak doğrudan müdahale üretmez. Müdahale tehlike oranı açı, göreli hız, kontrol açıklığı, agresiflik ve zamanlamaya bağlıdır. Deneme ve başarı ayrı olaydır. Yeni sahiplikte kısa kontrol süresi ve topu kaybedenin geri dönüş beklemesi hızlı ters top kapma zincirini azaltır. Koşu, hızın yüksek bölümü, pres süresi ve dayanıklılık enerji tüketir. Pres taktiği doğrudan gol veya sonuç cezası taşımaz.

Şut kararında mesafe, direklerin oluşturduğu açı, savunmacı engeli, baskı ve kaleci konumu kullanılır. Vuruş köşeye yönlendirilir; bitiricilik/soğukkanlılık ve mesafeye bağlı açısal hata normal dağılımdan gelir. Kaleci artık şut izleme kararını serbest topa çıkış kararıyla geçersiz kılmaz. Çıkışta kendi ve rakibin varış sürelerini karşılaştırır. Goller yine yalnızca fiziksel kale çizgisi geçişiyle oluşur.

`shotOpportunity.xg`, yalnızca **deneysel fırsat puanıdır**: lojistik mesafe/açı/blok/baskı/kaleci açıklığı formülü. Gerçek şut verisiyle fit edilmedi. Gol çekilişi için kullanılmaz; karar tercihinde ve tanısal JSON'da bulunur. Arayüzde kalibre edilmiş xG istatistiği gibi gösterilmez.

## Rol ve görev sözleşmesi

`roles.ts` 19 çalışan profil içerir. Profil; mevki uyumu, desteklediği görevler, gereken nitelikler, açıklama, avantaj/risk ve davranış tercihlerini tanımlar. Rol uyumu gereken niteliklerin aritmetik ortalamasıdır; arayüz bileşen değerlerini gösterir. Uyum, konum talimatını uygulama miktarını ve karar algısını etkiler; gol bonusu değildir. Nitelikler ayrıca temel fizik/icra denklemlerinde rol oynar.

| Mevki             | Seçilebilir roller                                                                   | Temel davranış farkı                                                     |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Kaleci            | Standart Kaleci, Libero Kaleci                                                       | Daha yüksek çıkış konumu ve daha geniş güvenli çıkış alanı               |
| Stoper            | Standart Stoper, Pasör Stoper                                                        | Markaj odağı / uygun ileri pas arayışı                                   |
| Bek               | Standart Bek, Kanat Bek, İçe Kat Eden Bek                                            | Dengeli hat / bindirme ve genişlik / hücumda merkez bağlantısı           |
| Ön libero         | Çakılı Ön Libero, Derinden Oyun Kurucu                                               | Savunma önünü tutma / derin pas bağlantısı                               |
| Merkez            | Standart Orta Saha, İki Yönlü Orta Saha, Yarı Alan Orta Sahası; Derinden Oyun Kurucu | Dengeli destek / ileri-geri koşu / yarı alana açılma / geride oyun kurma |
| Kanat             | Klasik Kanat, İç Forvet                                                              | Çizgi genişliği / iç koridor koşusu                                      |
| Ofansif orta saha | İleri Oyun Kurucu, Gölge Forvet                                                      | Bağlantıya gelme / santrfor çevresine ileri koşu                         |
| Santrfor          | Golcü Forvet, Sahte Dokuz, Pres Forvet                                               | İleri uç / derine bağlantı / ilk baskıda sorumluluk                      |

Görev seçimi rolün izin verdiği Savunma/Destek/Hücum seçenekleriyle sınırlıdır. Maç öncesi veya duraklatılmış maçta oyuncu slotu değişince o slotun oyuncusuyla yer değiştirir. Kaleci saha oyuncusuyla yer değiştiremez. Formasyon değişiminde uyumlu rol korunur, uyumsuz rol yeni mevki varsayılanına dönüştürülür. Bu davranış otomatik testlidir.

**2B'ye bırakılan ve seçilemeyenler:** Savunmacı Stoper, Libero (saha oyuncusu), Geniş Stoper; ayrı Hücumcu Kanat Bek ve Savunmacı Bek profilleri; Top Kazanan Orta Saha, Regista, Half Back, Segundo Volante; Carrilero ve merkez için ayrı İleri Oyun Kurucu; Ters Kanat, Geniş Oyun Kurucu, Savunmacı Kanat; Enganche, Trequartista; Pivot Santrfor, Derine Gelen Forvet, Komple Forvet. Kanat Bek'in Hücum görevi ayrı Hücumcu Kanat Bek profilinin tamamlandığı anlamına gelmez. Serbest bireysel talimat editörü henüz yok.

## Canlı müdahale ve yeniden üretim

Motor fazları: ready → playing ↔ paused → halfTime → playing → finished. UI duraklatması motoru da durdurur. Komutlar sadece ready/paused/halfTime sırasında kabul edilir; çalışan motor doğrudan düzenlemeyi reddeder. `command()` önce uyumu doğrular; sonra formasyon/slot/rol/görevi günceller ve karar zamanını geçersiz kılar. Canlı konum ve hız vektörleri sıfırlanmaz. Yeni hedefler sonraki karar adımında hareket sınırlarıyla uygulanır.

`state.commands` tam komut içeriklerini tick + monoton sequence ile saklar. Başlangıç kadroları `initialTeams` içinde korunur. `replayMatch(initialTeams, seed, commands, endTick)` aynı girdileri baştan oynatır; bu hâlen RNG snapshot'ından rastgele bir noktaya anlık geri yükleme değildir. JSON şeması sürüm 2. Duraklatma duvar saati süresi sonuca etki etmez.

## Devam eden sınırlar

Ofsayt karar motoru yok; hücumcuların koşuları savunma çizgisine göre zamanlanır fakat bu ofsayt kuralı değildir. Faul/kart, hava topu, değişiklik, serbest vuruş ve tam duran top kuralları hâlâ yok. Libero kaleci için ceza alanı dışında el/ayak temasının ayrı animasyon/fizik modeli yoktur. Takım uyumu için bağımsız sezon/kadro alışkanlığı verisi yok; mevcut koordinasyon oyuncu nitelikleri ve gecikmelerle sınırlı.

Görselleştirme salt durum okuyucusudur. Motor ana iş parçacığında çalışmaya devam eder; Web Worker ve özet/önemli anlar izleme sonraki aşamanın konusudur. Ağ/draft/çok oyunculu/ücretli servis eklenmedi.

Skora bağlı otomatik zaman geçirme, maç sonu risk değiştirme ve bağımsız takım alışkanlığı/uyum öğrenimi bu aşamada modellenmez. Kullanıcı bu müdahaleyi rol ve takım komutlarıyla yapabilir; otomatik maç yönetimi tamamlanmış gibi sunulmaz.
