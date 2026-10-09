# Aşama 2A başlangıç kaydı

Motor başlangıç revision: `0ea95631a51cbf5f0aa83d7e551da6ac7e83417a` (`feat/simulation-foundation`, PR #1). Yeni motor değişikliklerinden izole edilmiş `git archive` kopyasında ölçüldü. Sonuçlar `before.json` içinde. Ölçüm scripti aynı başlangıç girdileriyle sonraki motorda da kullanılacak.

24 tam maç: tohum 1–4 × dengeli, düşük pres, yüksek pres, geniş 3-5-2, güçlü ev sahibi (+15 nitelik), zayıf ev sahibi (-15 nitelik). Tüm maçlar 54.000 tick. Bu örneklem kalibrasyon içindir; yeni motor ayrıca ayrılmış tohumlarla değerlendirilecek.

Dengeli senaryoda dört maç ortalaması: 13.25 toplam gol (medyan 13), ev sahibi %32.99 pas başarısı, 301.5 başarılı müdahale, yaklaşık 968 müdahale denemesi ve 195.79 km takım mesafesi. İki saniye içinde ters yönde top kazanımı maç başına 486 kez. Aynı takımdan 2 m'den yakın çift sayısı saniyelik örneklerde ortalama 0.564.

Eski motor deneme olayı kaydetmediği için denemeler `challengeAt = currentTick + 12` değişiminden sayıldı. Yeni motor açık `tackleAttempt` olayını kullanacak. Top kaybı ölçümü kontrollü sahip takımın değişimidir, yeniden başlatmalar hariç. Bu tanım her pas isabetsizliğini top kaybı saymaz ve veri sağlayıcılarının possession lost tanımlarıyla bire bir aynı değildir.

## Koddan doğrulanan nedenler

- `challenge` mesafe ve bekleme süresi dışında açı/hız/kontrol zamanlaması değerlendirmiyor. Birden çok yakın rakip aynı tick'te deneyebiliyor. Topu kaybeden oyuncuya geri kazanım beklemesi atanmadığından hızlı ters müdahaleler mümkün.
- `evaluate` serbest top olduğunda alıcı dahil en yakın birkaç oyuncuya aynı hedefi öneriyor; pasın amaçlanan alıcısını görevlendirmiyor. Ortak markaj ataması olmadığından birden fazla savunmacı aynı rakibi seçebiliyor.
- Pas hedefi sabit 0.35 saniyelik hız ötelemesi kullanıyor; pas yolculuk süresi ve rakibin pas koridoruna erişme zamanı hesaplanmıyor. Mesafeden bağımsız metre cinsinden hedef sapması var.
- Kalecinin şut yörüngesi adayı 1.0, serbest topu kurtarma adayı 1.2. Şut da serbest top olduğu için çizgide karşılama yerine topa çıkma seçilebiliyor.
- Oyuncu ayrışması bulunmuyor. Hareket çoğu durumda azami hızın %68–100'ü; hedefe yaklaşmada yumuşama çok kısa. Koşu mesafesinin aşırılığı ölçümle de görülüyor.
- Şut puanı kaleci konumunu veya savunmacının şut koridorunu hesaba katmıyor. Gol, gerçek çizgi geçişinden oluşuyor; skor üretiminin kendisi önceden seçilmiş değil.

Bunlar kodda görülen mekanizmalar ve gözlenen çıktılardır. Her birinin nihai gole bağımsız nedensel katkısı bu başlangıç koşularıyla ayrıştırılmış değildir.
