# Aşama 2A — karşılaştırmalı doğrulama

Mevcut `feat/simulation-foundation` dalı ve PR #1 devam ettirildi. Başlangıç motoru `0ea9563`; yeni bir proje kurulmadı. Skor seçimi, gol kotası, sonradan istatistik düzeltmesi veya taktiklere doğrudan sonuç bonusu eklenmedi.

## Test ve çalıştırma

- **64 Vitest testi temiz geçti (88.15 s).** İlk sürümün 25 testi korunarak genişletildi; 39 yeni test fiziksel şut sonuçları, organizasyon, pas riski, kaleci kararı, 19 rol profili, rol uyumu, canlı pozisyon değişimi, geçersiz komutların atomik reddi ve tick bazlı replay'i kapsıyor.
- **2 Playwright testi geçti (yaklaşık 1.1 dk).** Maç öncesi Sahte Dokuz seçimi; canlı maçta duraklatıp Pres Forvet/Hücum ve pres yoğunluğuna geçiş; devre arasında formasyon; 90:00 bitiş; JSON komut sırası ve sonuç kontrolü; 390 px mobil görünüm.
- **Strict TypeScript ve Vite üretim derlemesi geçti.** Phaser paketi hâlâ yaklaşık 1.21 MB / gzip 332 kB; boyut uyarısı çözülmüş değildir.
- İlk test koşularındaki gerçek hatalar giderildi: yeniden başlatma süresine sabit 18 tick varsayımı, rol testinin hazırlık konum sıfırlamasını yanlış kullanması. Tek baskıcı tasarımına geçildiği için eski pres testindeki keyfî “iki kat” eşiği yerine gerçekleşmiş daha yüksek iş yükü karşılaştırılır; ayrıca aynı durumda görev paylaşımı ve pres enerji maliyeti ayrı test edilir.
- Ağır, senkron tam maç testleri Vitest işçi mesajlaşmasını aç bırakabiliyordu. Her test sonunda event loop'a dönülerek RPC bildirimleri boşaltılır; motor adımları veya hatalar atlanmaz. Son koşuda **64/64 ve sıfır çalıştırıcı hatası** alındı.

[Duraklatılmış maçta rol düzenleme](screenshots/live-roles.png) · [Maç sonu](screenshots/match-finished.png) · [Mobil](screenshots/mobile.png)

## Başlangıçla aynı 24 maç

Tohum 1–4 × altı senaryo: dengeli, pres 15, pres 85, geniş/doğrudan 3-5-2, ev sahibi nitelikleri +15 ve -15. Her iki sürümde aynı kurgusal kadrolar, başlangıç talimatları ve tohumlar. Her maç 54.000 tick; iki sürüm toplam 2.592.000 tick. Ham çıktılar: [önce](before.json), [sonra](after.json). Kod nedenlerinin başlangıç analizi: [BASELINE.md](BASELINE.md).

Aşağıdaki takım ölçümleri **her iki takımın 48 gözleminin ortalamasıdır**, yalnızca ev sahibi değildir. Pas yüzdesi toplam tamamlanan / toplam denemedir.

| Ölçüm                                            |    Önce |  Sonra |
| ------------------------------------------------ | ------: | -----: |
| Gol / maç ortalama                               |   13.63 |   3.92 |
| Gol / maç medyan                                 |    13.5 |      4 |
| En düşük–yüksek toplam gol                       |    7–24 |    0–8 |
| Pas / takım                                      |  439.50 | 464.75 |
| Pas tamamlanma                                   |  %33.25 | %64.71 |
| Kontrollü top kaybı / takım                      |  453.00 | 165.63 |
| Müdahale denemesi / takım                        | 893.98* |  61.96 |
| Başarılı müdahale / takım                        |  279.29 |  33.63 |
| Şut / takım                                      |   14.48 |  16.19 |
| Vuruş anında kaleye yönelen şut / takım          |    9.71 |  12.10 |
| Saha oyuncuları toplam km / takım                |  189.82 | 102.70 |
| Kaleci dahil toplam km / takım                   |  196.31 | 103.60 |
| Bitiş kondisyonu                                 |  %72.49 | %78.98 |
| İki saniye içinde ters sahiplik kazanımı / maç   |  452.08 |  10.96 |
| Aynı takımdan 2 m içindeki çiftler / aktif örnek |  0.5626 | 0.0158 |

*Eski motor deneme kaydı tutmadığından `challengeAt = tick + 12` değişimleri üzerinden hesaplandı. Yeni motorda açık `tackleAttempt` olayıdır. Ölçüm farkı saklanmadı. Top kaybı yeniden başlatmaları hariç tutar. Kümelenme her aktif simülasyon saniyesinde ölçülür, bir maç boyunca benzersiz karşılaşma sayısı değildir.

Başarılı müdahaleler yaklaşık %88, hızlı ters kazanım zincirleri %97.6, yakın kümelenme %97.2 azaldı. Pas tamamlama 31.46 yüzde puanı yükseldi. Toplam mesafe artık referans ölçeğine yakın; kondisyonun yüksek kalması tek başına iyileşme olarak yorumlanmaz, çünkü önceki aşırı koşu azaltılmıştır.

Gol dağılımı, `toplam gol: maç sayısı`:

- Önce: `7:1, 8:2, 9:1, 10:3, 11:1, 12:1, 13:3, 14:3, 15:3, 17:1, 18:2, 19:1, 20:1, 24:1`.
- Sonra: `0:1, 1:3, 2:2, 3:3, 4:5, 5:5, 6:3, 7:1, 8:1`.

### Pas zorluğu

Aynı yeni 24 maçta tamamlanma oranı, pasın gerçek başlangıç olayına bağlanan `passComplete` olaylarından:

| Grup                          | Deneme | Tamamlanan |   Oran |
| ----------------------------- | -----: | ---------: | -----: |
| Kısa (<15 m)                  |   2433 |       1640 | %67.41 |
| Orta (15–30 m)                |  16716 |      10929 | %65.38 |
| Uzun (≥30 m)                  |   3159 |       1867 | %59.10 |
| Güvenli (model zorluğu <0.35) |  12104 |       9047 | %74.74 |
| Riskli (≥0.35)                |  10204 |       5389 | %52.81 |

Zorluk grupları ve mesafe grupları aynı pasları farklı biçimde böler; birbirlerine eklenmez. Model zorluğu kalibre edilmiş başarı olasılığı değildir. Beklenen yönde davranış farkı var, fakat pas tamamlama hâlâ profesyonel referansın altındadır.

### Kontrollü taktik etkileri (dört eşlenmiş tohum)

| Ev sahibi ölçümü                   | Pres 15 | Pres 85 |
| ---------------------------------- | ------: | ------: |
| Topa sahip olma                    |  %48.60 |  %51.25 |
| Pres süresi, oyuncular toplamı (s) | 1410.35 | 1563.67 |
| Koşu mesafesi, kaleci dahil (km)   |  106.02 |  109.76 |
| Bitiş kondisyonu                   |  %78.77 |  %77.30 |
| Başarılı müdahale                  |   32.75 |   28.25 |
| Şut                                |   18.75 |   20.25 |
| Gol farkı                          |   -1.00 |   -0.50 |

Yüksek pres daha fazla baskı/koşu ve daha düşük enerji üretirken her baskı top kapmaya dönüşmüyor. Bu dört tohum “yüksek pres daha güçlüdür” sonucunu doğrulamaya yetmez. Tohumlar eşlenmiş olsa da eylem akışları ayrıldığında kullanılan rastgele sayıların eylemlerle eşleşmesi de değişir. Aynı durumdaki birim testleri, komutun doğrudan davranış etkisini ayrıca kontrol eder.

## Referanslarla farklar ve kapsam

[Futbol referansları ve tanım farkları](REFERENCES.md) ayrı belgede kaynaklandırıldı. 24 maçlık toplu gol ortalaması düştü; **dengeli senaryo alt kümesinde hâlâ 5.25 gol/maç** görüldü. Pas tamamlama %64.71 ile yaklaşık %75–90 inceleme bandının altında. Başarılı müdahaleler hâlâ yüksek olabilir. Kaleyi bulma tanımı vuruş anındaki 2D yörüngedir; bloklanmış şutları içerebilir ve yükseklik olmadığı için yüksekten auta gitme yoktur. Resmî veriyle doğrudan eşit sayılmamalıdır.

Karşılaştırmanın bu aşaması yalnızca dört kalibrasyon tohumu içerir. Güçlü/zayıf ev sahibi senaryolarında pas/şut davranışları farklılaşsa da güçlü kadronun bu küçük kümede sürekli kazandığı iddia edilmez. Ayrı doğrulama kümesi aşağıda raporlanır.

## Ayrı tohumlarla doğrulama: 80 maç

Tohum 101–108 × 10 senaryo, parametreler değiştirilmeden tamamlandı. [Ham veri ve senaryo özetleri](holdout.json). Motor dosyalarının SHA-256 özeti mevcut kaynakla eşleşir. Başlangıç 24 + yeni karşılaştırma 24 + ayrı doğrulama 80 = **128 tam maç**, 6.912.000 tick; bunun 104 maçı yeni motordadır. Bu sayıya birim testleri ve kontrollü şut deneyleri dahil değildir.

80 maçta toplam gol ortalaması **4.24**, iki takım birlikte hesaplanan pas tamamlama **%66.00**, takım başına saha oyuncusu mesafesi **102.15 km**, şut **15.38**, başarılı müdahale **33.87**. Hızlı ters sahiplik kazanımı **10.23/maç**, yakın çiftler **0.0164/aktif örnek**. Organizasyon iyileşmesi ayrı tohumlarda korunuyor; pas ve gol kalibrasyonu tamamlanmıyor.

Her satır sekiz maçtır; gol ortalaması iki takım toplamı, diğer sütunlar ev sahibidir:

| Senaryo                     | Gol/maç | Gol farkı | Pas % |   Şut | Kondisyon % |
| --------------------------- | ------: | --------: | ----: | ----: | ----------: |
| Dengeli                     |    5.38 |     -0.13 | 66.31 | 20.38 |       78.06 |
| Düşük pres                  |    3.75 |     -0.50 | 65.56 | 13.25 |       78.88 |
| Yüksek pres                 |    5.38 |     -0.63 | 65.86 | 17.50 |       77.58 |
| Geniş 3-5-2                 |    3.13 |     -1.13 | 67.87 | 10.88 |       82.96 |
| Güçlü kadro                 |    3.00 |     +0.25 | 68.78 | 15.13 |       77.98 |
| Zayıf kadro                 |    4.13 |     -2.13 | 62.10 | 13.13 |       78.26 |
| Kompakt 4-4-2               |    3.13 |     -1.13 | 60.39 | 13.38 |       79.69 |
| Güçlü + yüksek pres/hat     |    4.25 |     +2.75 | 69.13 | 23.25 |       77.58 |
| Zayıf + düşük blok/kontra   |    6.00 |     -4.50 | 58.97 | 12.00 |       79.01 |
| İçe gelen bek + sahte dokuz |    4.25 |     -2.25 | 69.46 |  9.63 |       80.78 |

Düşük/yüksek pres karşılaştırmasında baskı süresi 1389→1519 oyuncu-saniye, toplam koşu 105.86→109.09 km, sahiplik %48.22→%53.57; enerji düşerken gol farkı iyileşmedi. Rol kombinasyonunda pas başarısı yükselirken şut sayısı azaldı. Bunlar avantaj/dezavantaj gözlemleridir, evrensel üstünlük kanıtı değildir. Güçlü kadro daha iyi pas ve gol farkı üretti; düşük blok zayıf kadroyu bu örneklemde korumadı. Özellikle dengeli senaryonun 5.38 ve zayıf/düşük bloğun 6.00 gol ortalaması çözülmemiş inceleme alanıdır. Birlikte değiştirilen formasyon/talimat senaryoları tek bir parametrenin nedensel etkisini ayırmaz.

## Teslim kriterlerinin durumu

1. Tarayıcıda çalışma ve iki takımın 90 dakikayı tamamlaması: doğrulandı.
2. Kümelenme ve aşırı müdahale döngülerinin belirgin azalması: ölçüldü.
3. Pas/şut davranışlarının iyileşmesi: ölçüldü; profesyonel kalibrasyon **tamamlanmış değil**.
4. Savunma organizasyonu: ortak hatlar, tekil markaj, birincil/destek presi ve ayrışma uygulanıp test edildi.
5. Taktik avantaj/dezavantajı: konum/iş yükü/enerji farkları doğrulandı; rekabetçi denge garantisi yok.
6. Temsilî rol/görevler ve maç içi müdahale: 19 profil, slot değişimi, duraklatılmış komut ve yeniden üretim test edildi. Eksik roller seçilemez; [2B listesi](DESIGN.md) açık.
7. Testler ve üretim derlemesi: geçti. Renderer motor kararlarını üretmez.
8. Önce/sonra karşılaştırması: ham veriler, tanımlar ve kaynaklar paylaşıldı.

Ofsayt, faul/kart, hava topu, tam duran top kuralları, oyuncu değişikliği, sunucu/draft ve çevrim içi oda eklenmedi. Sonraki aşamada öncelik hâlâ pas karşılama/koridor dengesi, şut sonuç kalibrasyonu ve temel futbol kurallarıdır; gelişmiş ticari özelliklere geçiş önerilmez.

## Yeniden çalıştırma

```sh
npm ci
npm test
npm run test:e2e
npm run build
npm run benchmark -- /tmp/after.json 4 1
BENCHMARK_EXTENDED=1 npm run benchmark -- /tmp/holdout.json 8 101
```

Benchmark Node.js üzerinde çalışır, tarayıcıya ve duvar saati hızına bağlı değildir. Kaydedilen `engineSha256`, sıralı `src/engine/*.ts` dosyalarının adı+içeriğinin SHA-256 özetidir. `sourceCommit`, başlangıçta tam git SHA'sı; çalışma ağacı koşularında aday etiketi olabilir. Kalibrasyon karşılaştırmasından sonra yalnızca saf hedef-puanı hesaplamasının tekrarını kaldıran önbelleksiz yerel optimizasyon ve top kaybı olayındaki oyuncu/takım ilişkisinin düzeltilmesi yapıldı; maç fiziği/tercih parametreleri ayrı tohum kümesi sırasında değiştirilmedi.

Eski sürümü tekrar ölçmek için `0ea9563` arşivine mevcut `scripts/benchmark.ts` kopyalanabilir; `BENCHMARK_EXTENDED` kapalı tutulmalıdır. Yeni alanı olmayan eski olaylarda pas zorluk alt grupları mevcut değildir. `before.json` bu başlangıç koşulunun kayıtlı ham verisidir.

## Kontrollü fırsat kalitesi

Her durumda aynı 100 tohum, sabit kaleci başlangıcı `(103.5,34)`, şut koridorundan uzak saha oyuncuları ve 40 gerçek fizik adımı kullanıldı. Bu, deneysel xG formülünü kendi kendisine doğrulamak değildir; gol çizgisi geçişleri sayıldı. Ham sonuç: [shot-fixtures.json](shot-fixtures.json).

| Şut yeri              | Bitiricilik | 100 vuruşta kaleyi bulan | Gol |
| --------------------- | ----------: | -----------------------: | --: |
| (94,34), merkez, 11 m |          70 |                       95 |  21 |
| (80,34), merkez, 25 m |          70 |                       75 |   7 |
| (94,54), dar açı      |          70 |                       87 |   9 |
| (94,34), merkez, 11 m |          40 |                       82 |  15 |
| (94,34), merkez, 11 m |          95 |                       99 |  13 |

Merkez/yakın fırsat, uzak/dar açıdan daha fazla fiziksel gol üretti. Bitiricilik isabeti artırdı; fakat bu sabit kaleci senaryosunda gol oranı monoton artmadı. Bu küçük deney tüm bitiricilik dağılımını belirlemez; sabit köşe hedefi, hassasiyet ve kaleci tepkisi etkileşiminin henüz kalibre olmadığını gösteren bir inceleme işaretidir. Daha yüksek özelliğin her durumda daha yüksek gol oranını sağladığı iddia edilmiyor. **Şut yerleştirme/kaleci dengesi açık teknik borçtur.** İki ek regresyon testi geometri-sonuç ve nitelik-isabet ilişkilerini korur.

Toplam mesafe; yeniden başlatma için doğrudan konum ayarlamalarını ve oyun dışındaki modellenmeyen yürüyüşleri içermez. Referans ölçeğine yakınlık, fiziksel yük modelinin bütünüyle doğrulandığı anlamına gelmez.
