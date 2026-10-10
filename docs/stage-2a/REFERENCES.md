# Gerçek futbol referansları

9 Ekim 2026 tarihinde erişildi. Kaynaklar farklı organizasyonlar ve olay tanımları kullanır. Aşağıdaki bantlar geliştirme sırasında toplu sonuçları incelemek için seçilen **tanısal aralıklardır**; motor maç başına gol, pas, müdahale veya koşu kotası uygulamaz.

| Ölçüm                | Kaynakta gözlenen veri                                                                 | Bu aşamadaki karşılaştırma yaklaşımı                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toplam gol / maç     | EURO 2024: 117 gol / 51 maç = 2.30. Premier League 2023/24: 3.28                       | Büyük örneklem ortalamasında yaklaşık 2–4 incelenir; tek maç skoru sınırlanmaz.                                                                       |
| Şut / maç, iki takım | Premier League 2023/24: 27.60; 2017–2023 ortalaması 24.90                              | Kabaca 20–35, kalibrasyon hedefi olarak; oynanış farkları ayrıca açıklanır.                                                                           |
| Pas / maç, iki takım | Premier League 2023/24: 941                                                            | Yaklaşık 800–1100 başlangıç inceleme bandı.                                                                                                           |
| Pas tamamlama        | Premier League 2023/24: %82.87; EURO 2024 üst sıraları %89–91.2                        | Takım/tarza bağlı %75–90 gelişim hedefi. EURO üst sıraları turnuva ortalaması değildir.                                                               |
| Müdahale             | EURO 2024: İspanya 88, İngiltere 81, Slovenya 79 turnuva toplamı                       | Yüzlerce başarılı müdahale / takım / maçın sorun olduğunu destekler. Farklı sağlayıcıların attempt/won tanımları nedeniyle katı bir eşitlik kurulmaz. |
| Topa sahip olma      | EURO 2024: Portekiz %64.8, Almanya %59.2, İspanya %58.2                                | %50'ye zorlamak yanlış; nitelik ve taktiklerle dağılım incelenir.                                                                                     |
| Mesafe               | FIFA Katar 2022: takım başına 108.1 km; kaleci ve uzatma hariç, 90+ dakikaya normalize | Saha oyuncuları toplamında yaklaşık 95–120 km inceleme bandı. Motor tam 90 dk oynar; bire bir aynı süre tanımı değildir.                              |
| Kondisyon, rol uyumu | Bu motorun 0–1 / 0–100 ölçekleri                                                       | Gerçek futbol kaynaklarıyla eşit sayısal ölçek iddiası yok; aynı başlangıçta göreli iş yükü karşılaştırılır.                                          |
| Top kaybı            | Motor kontrollü sahip takımın değişimini sayar, yeniden başlatmalar hariç              | Veri sağlayıcılarının her başarısız aksiyonu içerebilen “possession lost” değeriyle eşitlenmez.                                                       |

Kaynaklar:

1. [Premier League, Season trends: Clinical finishing key to record goals total (27 Mayıs 2024)](https://www.premierleague.com/en/news/4027257). Aynı sayfadaki şut isabet yüzdeleri blok hariç sınıflandırmalar içerir; motorun vuruş anındaki kale çizgisi yörüngesi ölçümüyle doğrudan eşit değildir.
2. [UEFA, EURO 2024 statistics](https://www.uefa.com/uefaeuro/history/seasons/2024/statistics/). Gol, topa sahip olma, pas ve müdahale sıralamaları. Turnuva toplamları maç ortalaması gibi kullanılmadı.
3. [FIFA Training Centre, Dr Paul Bradley, What distances did teams cover? (24 Mayıs 2023)](https://www.fifatrainingcentre.com/en/fwc2022/physical-analysis/what-distances-did-teams-cover.php). Mesafe tanımındaki kaleci ve ekstra süre dışlaması gözetilir.
4. [Premier League, Stats explained](https://www.premierleague.com/en/stats/clarification). Resmî olay verisi Opta tarafından toplanır; oyun motorunun sadeleştirilmiş olay sözleşmesi bu sınıflandırmanın tam uygulaması değildir.

Bu kaynaklardaki değerleri motora başarı katsayısı veya sonradan istatistik düzeltmesi olarak yerleştirmedik. Karar, pozisyon, vuruş ve temas modeli üzerinden çıkan ham sonuçlar raporlanır.
