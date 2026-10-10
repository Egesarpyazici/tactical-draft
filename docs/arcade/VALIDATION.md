# Slice A doğrulama ve denge gözlemleri

## Modelin kapsamı

Bu sürüm pozisyon/sekans tabanlı bir arcade prototipidir. 22 bağımsız sürekli fizik ajanının tam futbol simülasyonu değildir. Pas kontrolü ve fırsat seçimi tohumlu olasılıklardan, şut sonucu ise hedef/irtifa, uçuş süresi, icra sapması ve kalecinin erişim geometrisinden çıkar. Gol kotası, skor bonusu veya geri düşene yardım katsayısı yoktur.

Pres hattı ve genişlik takım konumlarına; pres yoğunluğu, oyuncu becerisi ve enerji pas baskısına; pas uzunluğu kontrol riskine; geçiş tercihi yüksek hat arkasındaki ilerlemeye etki eder. Başarılı bağlantılar ilk baskıyı azaltır. Topa sahip olma kısa ve çok bağlantı üretir; kompakt kontra daha uzun ve riskli ilerler. Yüksek pres daha fazla enerji tüketir. Kalite puanı deneysel bir fırsat endeksidir, kalibre edilmiş xG değildir.

2D saha motorun sekans başlangıç/bitiş konumlarını ve top yolunu enterpole eder. Kaleci bitiş noktası şut çözümünden gelir. Detaylı şut ekranı gerçek top yörüngesini ve kalecinin tepki gecikmesini gösterir. Pas alıcısı ile her ara top noktasının ayak temasını çözen mikro-fizik yoktur. Sekanslar arası başlama/yeniden başlatma konumları soyuttur; tam taç, korner, faul, ofsayt ve hava topu kuralları uygulanmadı.

## Ayrı değerlendirme örneklemi

Komut:

```sh
node --import tsx scripts/arcade-benchmark.ts docs/arcade/benchmark-seeds-101-124.json 24 101
```

Tohum 101–124, 9 taktik eşleşmesi, **216 tam maç**. İlk kalibrasyon 1–12 tohumlarıyla yapıldı; bu değerlendirmeden sonra skor modeline ayar yapılmadı. İki taraf 70'te girer; fırsat kazanılırsa aynı sabit manuel girdi kullanılır: yön 0.8, irtifa 0.25, güç 0.76, zamanlama 0.5. Gerçek insan becerisi veya iki eşit kadro deneyi değildir. İki kurgusal kadro farklıdır. Aynı tohumlar eşleşmeler arasında kullanılır; bunlar 216 bağımsız insan müsabakası sayılmaz.

Ev sahibinin galibiyet / beraberlik / yenilgisi; maç başına toplam gol:

| Ev         | Deplasman  | G / B / M (24 maç) | Toplam gol ort. |
| ---------- | ---------- | ------------------ | --------------- |
| Pres       | Pres       | 8 / 3 / 13         | 13.5            |
| Pres       | Kontra     | 14 / 1 / 9         | 13.1            |
| Pres       | Sahip olma | 21 / 1 / 2         | 12.1            |
| Kontra     | Pres       | 10 / 5 / 9         | 14.7            |
| Kontra     | Kontra     | 16 / 1 / 7         | 18.3            |
| Kontra     | Sahip olma | 22 / 2 / 0         | 14.9            |
| Sahip olma | Pres       | 4 / 3 / 17         | 12.2            |
| Sahip olma | Kontra     | 4 / 4 / 16         | 13.8            |
| Sahip olma | Sahip olma | 13 / 3 / 8         | 10.5            |

Örnek fiziksel bedeller:

- Pres–kontra: pres tarafı 20.25 baskı kazanımı, %63.1 kalan enerji; kontra tarafı 0 baskı kazanımı, %76.4 enerji. Baskı kazanımı toplam top kazanımı değildir; yalnız baskı eşiğiyle gelenlerdir.
- Sahip olma–kontra: tamamlanan pas oranı %81.1 / %68.0; fırsat kalitesi 0.548 / 0.658. Daha güvenli pas, daha iyi şut demek değildir.
- Yüksek pres–kontra top kazanım konumu: kendi kalesinden ortalama 55.2 / 48.8 metre. Yüksek hat rakibe daha kaliteli geçiş de bırakır.
- Yöneticilerin fırsat bulma oranları eşleşme/tarafa göre %50–87.5. Her maç iki manuel şut garanti edilmez; kurallar ve şut fiziği iki taraf için aynıdır.

**Denge tamamlanmış değildir.** Topa sahip olma bu örneklemde belirgin zayıftır. Gol toplamları profesyonel futbola göre çok yüksektir. Hiçbir strateji bütün eşleşmelerini kazanmıyor, ancak bu rekabetçi denge kanıtı değildir. Sonraki kalibrasyonda kadroları aynalayarak, daha büyük ayrı tohum grupları ve gerçek oyuncu oturumlarıyla pas zinciri/şut hacmi/kaleci erişimi değerlendirilmelidir. Mevcut skorları kozmetik olarak düşüren bir katsayı eklenmedi.

## Tekrarlanabilirlik ve süre

Maç dışa aktarımı `arcade-slice-a-1` biçiminde tohum, seçenekler, zaman/sekans damgalı taktik/değişim/şut komutları ve gerçek olayları içerir. `replayArcade(seed, options, commands, sequence)` motor seviyesinde tekrar üretir; JSON içe aktarma ekranı yoktur.

216 maçta 86–93 sekans oluştu. Varsayılan 4 saniye/sekans: 344–372 saniye (5.7–6.2 dakika) **hesaplanan aktif oynatma süresi**, insan karar durakları hariç. Bu, varsayılan Arcade modunda ölçülmüş tam maç duvar saati sonucu değildir. Gerçek tarayıcı tam maç testi hızlı modda yapıldı. Sekans saat/istatistiği hesaplama sonunu gösterir; animasyon oynarken gelecek sekans hesaplanmaz. Sekans ortasında duraklatılan taktik bir sonraki sekansa uygulanır.

## Hata geçmişi

- İlk tarayıcı koşusunda Phaser iki kez başlatılıyordu (React StrictMode). Başlatma ilk animasyon karesine ertelendi, iptal/temizlik eklendi.
- İlk kare zaman damgası effect kurulumundan erken olabildiği için negatif ilerleme top yolunda negatif indeks üretiyordu. İlerleme artık geriye gitmez; özel regresyon testi vardır. Hata bastırılmadı.
- İlk iki taraflı fırsat testindeki iyi şut gol olunca sonraki akış değişiyor ve ikinci taraf fırsat bulamıyordu. Tohum değiştirilmedi. Aynı tohum 1 ile açıkça dışarı/yüksek hedefli şut girdileri iki pencere kapsamı için kullanıldı. Ayrı testler fırsatın hiç oluşmamasını da doğrular. Motor test için şut üretmez.
- Kurtarış olayı artık kaleciye ve savunan takıma yazılır; sayaç-olay eşitliği test edilir.
- Phaser paket boyutu uyarısı sürüyor (~1.21 MB minified / 332 KB gzip); derleme hatası değildir.
