# Arcade Slice A — mimari ve kabul sözleşmesi

Onaylı kaynak: `docs/ARCADE_PROTOTYPE_SPEC.md`. Dal `feat/arcade-manager-shot-prototype`, temel `707cc8f`. Klasik motor ve ekran kendi dosyalarında ve `/` adresinde korunur; yeni deney `/arcade` altında çalışır. PR #1 ve temel dal değiştirilmez.

## Katmanlar

- `src/arcade/engine`: DOM/Phaser bağımlılığı olmayan deterministik TypeScript. Kurgusal kadro verisini mevcut veri modülünden dönüştürür. Üç stratejinin hat, genişlik, pres, pas mesafesi ve geçiş tercihleri sahadaki açıklanabilir durumları değiştirir.
- Sekans: sahiplik → pasla çıkış / baskıdan kurtulma → top kazanımı veya ileri giriş → şut fırsatı. Motor yalnız bir sonraki sekansı hesaplar; bütün maçın sonucu önceden seçilmez. Sekans; zaman, gerçek başlangıç/bitiş koordinatları, hareket yolları, nedenler ve olay kayıtlarını taşır.
- Şut çözücüsü: hedef, güç ve bırakma zamanlamasından top hızı, yön/irtifa sapması ve uçuş süresi çıkarır. Kaleci başlangıç konumu, tepki süresi ve erişim sınırıyla müdahale eder. Gol kotası veya sonuç çekilişi yoktur; şut icra sapması tohumlu ve tekrar üretilebilirdir.
- React/Phaser: motorun ürettiği sekansı gösterir, sonuç üretmez. Varsayılan sekans süresi yaklaşık 4 saniye; maçın simülasyon süresi 90 dakika. Hızlı mod kullanıcı kararı gereken durumları atlamaz.

## Zaman ve komutlar

Otorite sekans sınırıdır. Mevcut sekansın 2D sunumu duraklatılabilir; değişen taktik bir sonraki sekansa uygulanır. Gösterimdeki sekansın tamamlanmış hesaplaması açıkça sekans olarak etiketlenir; daha ilerideki sekanslar tamponlanmaz. Dolayısıyla taktik komutundan sonra iptal edilmesi gereken görünmez gelecek maç yoktur. Saat ve olay kayıtları sekansın model zamanını kullanır.

Hazır / oyun / devre / 70. dakika karar durağı / manuel şut / bitiş fazları. Her iki tarafın 70. dakika erişimi kullanıcıya sunulmadan ilerlenmez. Taktik, yönetici değişimi ve şut girdileri sekans numarası + zamanla kayıtlıdır. Aynı başlangıç seçenekleri, tohum ve komutlar aynı sonucu üretmelidir.

## Son Çare adaleti

Başlangıç dakikası varsayılan 70, yapılandırılabilir. Her takım bir defa saha oyuncusunu (varsayılan santrfor) yöneticisiyle değiştirir; 11 oyuncu / 1 kaleci korunur. Yönetici özellikleri mütevazı ve görünürdür. Geri düşen takıma yardım katsayısı yoktur. Yönetici diğer oyuncularla aynı koşu/pas seçiminde pozisyon kazanır. Yeterli kaliteye sahip fırsat yoksa manuel şut açılmaz. Takım başına bir manuel şut; kullanılan hak tekrar açılamaz. Sonrasında yönetici pas desteğinde kalır. Pratik modu ayrı, etiketli, maç istatistiğinden tamamen bağımsızdır.

## Kabul kontrolleri

1. Her iki 11, deterministik 90 dakika, devre arası ve 70. dakika duruşu.
2. Üç stratejide ölçülmüş farklı pres kazanım bölgeleri, giriş/kalite/baskı/yorgunluk; küçük örneklemden üstünlük iddiası yok.
3. Eşit Son Çare erişimi, tek kullanım ve tek şut, geçersiz oyuncu/değişim/girdi reddi, fırsat eşiği.
4. Hedef/güç/zamanlama/kaleci ve baskı değişince açıklanabilir fizik farkları; gol, kurtarış, dışarı/yüksek sonuçları.
5. Yerel iki taraflı maç, antrenman, gerçek kazanılmış yönetici fırsatları, taktik değiştirme, bitiş ve mobil tarayıcı akışı.
6. Klasik dosyalar korunur; yeni tip/derleme, mevcut testler ve yeni regresyonlar çalışır.
7. `docs/ARCADE_PROGRESS.md`, ham karşılaştırma, gerçek görüntüler, Codespaces komutları ve temel dalı hedefleyen ayrı taslak PR.

Çevrim içi, draft havuzu, yedek sistemi ve kapsamlı rol editörü Slice A dışında. Manuel şut gelecekte sunucuda doğrulanmalıdır; bu yerel prototip rekabetçi anti-cheat sağlamaz.
