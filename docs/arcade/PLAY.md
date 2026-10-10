# Arcade Slice A — çalıştırma ve oynama

Node.js 22.12+ kullanın. Repo içindeki mevcut Arcade dalında:

```sh
git switch feat/arcade-manager-shot-prototype
npm ci
npm run dev
```

Tarayıcıda `http://localhost:5173/arcade` açın. Klasik sürüm `/` adresindedir. Mevcut Codespaces ortamında Ports panelindeki 5173 bağlantısını açıp sonuna `/arcade` ekleyin; port görünürlüğünü private tutun. Yeni Codespace/servis açılması prototip için zorunlu değildir; yerelde ücretsiz çalışır. API anahtarı veya gerçek sunucu gerekmez.

1. İki tarafın oyun planını ve yönetici adını seçin. Varsayılan Önemli Anlar ile başlayın; hızlı test için Hızlı sonuç seçilebilir.
2. Duraklatıp oyun planını değiştirin. Değişiklik sonraki sekansa uygulanır. İstatistik ve son taktik öncesi/sonrası fırsat verilerini karşılaştırın; bunlar nedensellik garantisi vermez.
3. 45'te ikinci yarıyı başlatın. 70'te Son Çare karar durağı açılır. Her taraf kendi düğmesiyle santrforunu yöneticisiyle değiştirebilir veya kullanmadan devam edebilir.
4. Yeterli fırsat doğarsa oyun manuel şuta geçer. Takım kontrol etiketi sıranın kimde olduğunu gösterir. Sol/orta/sağ ya da kaleye dokunarak hedef seçin; ince hedef, yükseklik ve gücü ayarlayın.
5. Zamanlamayı başlatın; işaret yeşil bölgedeyken ŞUT ÇEK'e basın. Klavyede Tab ile odaklanın, aralıklarda ok tuşlarını, düğmelerde Enter/Boşluk kullanın. Düşük güç kaleciye zaman verir; yüksek güç sapma ve üstten kaçırma riskini artırır. Gol garanti değildir.
6. Sonucu izleyip maça dönün. Her taraf en fazla bir manuel maç şutu kullanır. Fırsat bulamamak geçerli bir Son Çare sonucudur.
7. Maç sonunda gerçek skor/olay/istatistikleri ve yönetici katkısını inceleyin. JSON indir komutu tekrar üretim verisini kaydeder.

Şut Antrenmanı maçtan bağımsızdır. İki tarafı ve savunma baskısını değiştirerek deneyin; maç skoru, süresi ve hakları etkilenmez. Maçtan antrenmana geçmek maçı duraklatır.

## Geliştirici doğrulaması

```sh
npm test
npm run build
npm run test:e2e
node --import tsx scripts/arcade-benchmark.ts /tmp/arcade-report.json 24 101
```

Tarayıcı testleri varsayılan `/usr/bin/chromium` kullanır; farklı bir kurulumda `CHROMIUM_PATH` ortam değişkenini Chromium yürütülebilir dosyasına ayarlayın. `npm run preview` üretim derlemesini 4173 portunda sunar; `/arcade` yolunu açın.

Çevrim içi oda yoktur; bu aynı cihazda iki taraflı prototiptir. Rekabetçi denge ve gerçek kullanıcı eğlence değerlendirmesi tamamlanmış sayılmaz. [Doğrulama raporu](VALIDATION.md) ve [ilerleme kaydı](../ARCADE_PROGRESS.md) kapsamı açıklar.
