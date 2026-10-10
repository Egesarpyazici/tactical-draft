import { useEffect, useRef, useState } from 'react';
import { ArcadeMatch } from '../engine/match';
import { managerSkills, STRATEGIES } from '../engine/model';
import { practiceChance, resolveShot } from '../engine/shot';
import type { Chance, ShotInput, ShotResult, Side, Strategy } from '../engine/types';
import { ArcadePitch } from './ArcadePitch';
import { ShotPanel } from './ShotPanel';
import './arcade.css';
const clock = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
export function ArcadeApp() {
  const [initial] = useState(() => new ArcadeMatch()),
    engine = useRef(initial),
    [s, setS] = useState(() => initial.snapshot());
  const [tab, setTab] = useState<'match' | 'practice'>('match'),
    [running, setRunning] = useState(false),
    [progress, setProgress] = useState(1),
    pRef = useRef(1),
    [view, setView] = useState('highlights');
  const [seed, setSeed] = useState('2026'),
    [names, setNames] = useState<[string, string]>(['Ege Arslan', 'Mira Deniz']),
    [plans, setPlans] = useState<[Strategy, Strategy]>(['high_press', 'compact_counter']),
    [error, setError] = useState('');
  const [resolved, setResolved] = useState<{ chance: Chance; result: ShotResult } | null>(null);
  const [practiceSeed, setPracticeSeed] = useState(1),
    [practiceSide, setPracticeSide] = useState<Side>(0),
    [pressure, setPressure] = useState(0.3),
    [practiceResult, setPracticeResult] = useState<ShotResult | null>(null);
  const practice = practiceChance(practiceSeed, practiceSide, pressure);
  const sync = () => setS(engine.current.snapshot());
  const next = () => {
    engine.current.advance();
    pRef.current = 0;
    setProgress(0);
    sync();
  };
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      last = performance.now();
    const run = (now: number) => {
      const duration = view === 'quick' ? 80 : view === 'extended' ? 6000 : 4000;
      pRef.current = Math.min(1, pRef.current + (now - last) / duration);
      last = now;
      setProgress(pRef.current);
      if (pRef.current >= 1) {
        if (engine.current.state.phase === 'playing') {
          next();
        } else setRunning(false);
        return;
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [running, s.sequence, s.phase, view]);
  const reset = () => {
    setRunning(false);
    setResolved(null);
    const n = Number(seed);
    if (!/^\d+$/.test(seed) || n > 0xffffffff) {
      setError('Tohum 0–4294967295 arasında olmalı.');
      return;
    }
    try {
      engine.current = new ArcadeMatch(n, { managerNames: names });
      plans.forEach((plan, i) => engine.current.tactic(i as Side, plan));
      pRef.current = 1;
      setProgress(1);
      setError('');
      sync();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const start = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (s.phase === 'ready') {
      const n = Number(seed);
      if (!/^\d+$/.test(seed) || n > 0xffffffff || names.some((n) => !n.trim())) {
        setError('Geçerli tohum ve iki yönetici adı gerekli.');
        return;
      }
      engine.current = new ArcadeMatch(n, { managerNames: names });
      plans.forEach((p, i) => engine.current.tactic(i as Side, p));
    }
    engine.current.continue();
    if (pRef.current >= 1 && engine.current.state.phase === 'playing') next();
    setRunning(true);
  };
  const setPlan = (team: Side, strategy: Strategy) => {
    const nextPlans = [...plans] as [Strategy, Strategy];
    nextPlans[team] = strategy;
    setPlans(nextPlans);
    engine.current.tactic(team, strategy);
    sync();
  };
  const manual = (i: ShotInput) => {
    const chance = s.pending!;
    const seq = engine.current.shoot(chance.team, i);
    setResolved({ chance, result: seq.shot!.result });
    sync();
  };
  const exportGame = () => {
    const blob = new Blob([JSON.stringify({ format: 'arcade-slice-a-1', ...s }, null, 2)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `arcade-${s.seed}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const canEdit = !running && !resolved && !['manual', 'finished'].includes(s.phase);
  const shot = resolved?.chance ?? (s.phase === 'manual' && progress >= 1 ? s.pending : null);
  const phases = {
    ready: 'HAZIRLIK',
    playing: running ? 'SEKANS' : 'DURAKLATILDI',
    halftime: 'DEVRE ARASI',
    lastResort: 'SON ÇARE KARARI',
    manual: 'MANUEL ŞUT',
    finished: 'MAÇ SONU',
  };
  return (
    <div className="arcade">
      <header className="ar-header">
        <a className="ar-brand" href="/arcade">
          <b>
            TACTICAL<span>DRAFT</span>
          </b>
          <small>
            ARCADE EDITION <i>SLICE A</i>
          </small>
        </a>
        <div className="ar-local">
          YEREL İKİ TARAFLI OYUN <span>Çevrim içi oda yok</span>
        </div>
        <a className="ar-classic" href="/">
          Klasik laboratuvar ↗
        </a>
      </header>
      <main className="ar-main">
        <div className="ar-heading">
          <div>
            <small>TAKTİĞİ SEN KUR. FIRSATI SAHADA KAZAN.</small>
            <h1>
              {tab === 'practice' ? 'Son vuruş, senin elinde.' : 'Doksan dakika. Bir son çare.'}
            </h1>
          </div>
          <nav className="ar-segment" aria-label="Arcade ekranı">
            <button aria-pressed={tab === 'match'} onClick={() => setTab('match')}>
              Maç Merkezi
            </button>
            <button
              aria-pressed={tab === 'practice'}
              onClick={() => {
                setRunning(false);
                setTab('practice');
              }}
            >
              Şut Antrenmanı
            </button>
          </nav>
        </div>
        {error && (
          <p className="ar-error" role="alert">
            {error}
          </p>
        )}
        {tab === 'practice' ? (
          <>
            <div className="ar-practice-top ar-panel">
              <div>
                <small>MAÇ SONUCUNU ETKİLEMEZ</small>
                <h2>Şut laboratuvarı</h2>
                <p>
                  Hedefi değiştir, gücü dengele, yeşil aralıkta bırak. İki taraf aynı fiziği
                  kullanır.
                </p>
              </div>
              <label>
                Kontrol edilen taraf
                <select
                  aria-label="Antrenman takımı"
                  value={practiceSide}
                  onChange={(e) => {
                    setPracticeSide(Number(e.target.value) as Side);
                    setPracticeResult(null);
                  }}
                >
                  <option value="0">Kadıköy Atlas</option>
                  <option value="1">Bosphorus Athletic</option>
                </select>
              </label>
              <label>
                Savunma baskısı
                <select
                  aria-label="Antrenman baskısı"
                  value={pressure}
                  onChange={(e) => {
                    setPressure(Number(e.target.value));
                    setPracticeResult(null);
                  }}
                >
                  <option value="0.15">Düşük</option>
                  <option value="0.3">Orta</option>
                  <option value="0.8">Yüksek</option>
                </select>
              </label>
            </div>
            <ShotPanel
              key={`practice-${practiceSeed}-${practiceSide}-${pressure}`}
              chance={practice}
              name={names[practiceSide]}
              result={practiceResult}
              onShoot={(i) => setPracticeResult(resolveShot(practice, i))}
              onDone={() => {
                setPracticeSeed((n) => n + 1);
                setPracticeResult(null);
              }}
            />
          </>
        ) : (
          <>
            <section className="ar-scoreboard">
              <div className="ar-team-title">
                <div className="ar-crest">A</div>
                <div>
                  <small>EV SAHİBİ · OYUNCU 1</small>
                  <h2>{s.teams[0].name}</h2>
                  <span>{STRATEGIES[s.teams[0].strategy].name}</span>
                </div>
              </div>
              <div className="ar-score">
                <strong>
                  {s.stats[0].goals} <em>:</em> {s.stats[1].goals}
                </strong>
                <span data-testid="arcade-clock">
                  {clock(s.time)} · {phases[s.phase]}
                </span>
              </div>
              <div className="ar-team-title ar-away">
                <div>
                  <small>DEPLASMAN · OYUNCU 2</small>
                  <h2>{s.teams[1].name}</h2>
                  <span>{STRATEGIES[s.teams[1].strategy].name}</span>
                </div>
                <div className="ar-crest">B</div>
              </div>
            </section>
            {shot ? (
              <ShotPanel
                key={`match-${shot.id}-${shot.team}`}
                chance={shot}
                name={s.teams[shot.team].managerName}
                result={resolved?.result ?? null}
                onShoot={manual}
                onDone={() => {
                  setResolved(null);
                  pRef.current = 1;
                  setProgress(1);
                  if (engine.current.state.phase === 'playing') {
                    next();
                    setRunning(true);
                  }
                }}
              />
            ) : null}
            <div className={`ar-layout ${shot ? 'ar-dimmed' : ''}`}>
              <div className="ar-watch">
                <section className="ar-panel ar-field">
                  <div className="ar-section">
                    <span>
                      <i className={running ? 'ar-live' : ''} />{' '}
                      {s.last?.title ?? 'İki plan, aynı kurallar'}
                    </span>
                    <small>2D SEKANS · ATL → / ← BOS</small>
                  </div>
                  <ArcadePitch state={s} progress={progress} />
                  <div className="ar-sequence">
                    <b>{s.last ? `${clock(s.last.start)} — ${clock(s.last.end)}` : 'SAHA HAZIR'}</b>
                    <span>
                      {s.last?.reasons.join(' ') ??
                        'Bir strateji seçin. Kazanılan fırsatlar, maçın akışını oluşturacak.'}
                    </span>
                  </div>
                  <div className="ar-playback">
                    <button
                      className="ar-primary"
                      disabled={
                        (s.phase === 'finished' && progress >= 1) ||
                        !!shot ||
                        (s.phase === 'manual' && progress >= 1)
                      }
                      onClick={start}
                    >
                      {running
                        ? 'Duraklat'
                        : s.phase === 'ready'
                          ? 'Maçı Başlat'
                          : s.phase === 'halftime'
                            ? 'İkinci Yarıyı Başlat'
                            : s.phase === 'lastResort'
                              ? 'Kararı Onayla ve Devam Et'
                              : 'Devam Et'}
                    </button>
                    <label>
                      İzleme
                      <select
                        aria-label="Arcade izleme modu"
                        value={view}
                        onChange={(e) => setView(e.target.value)}
                      >
                        <option value="highlights">Önemli sekanslar · 4 sn</option>
                        <option value="extended">Genişletilmiş · 6 sn</option>
                        <option value="quick">Hızlı sonuç</option>
                      </select>
                    </label>
                    <span className="ar-muted">Saat: sekans sonu</span>
                  </div>
                  {s.phase === 'lastResort' && progress >= 1 && (
                    <div className="ar-notice" role="status">
                      <b>70′ · İki tarafın Son Çare hakkı açıldı.</b>
                      <span>
                        Her iki oyuncu da sağdaki panelden kararını versin. Girmek zorunlu değil;
                        şut fırsatı garanti değil.
                      </span>
                    </div>
                  )}
                  {s.phase === 'halftime' && progress >= 1 && (
                    <div className="ar-notice">
                      <b>Devre arası</b>
                      <span>Planları gözden geçirin. İkinci yarı sizin kararınızla başlar.</span>
                    </div>
                  )}
                  {s.phase === 'finished' && progress >= 1 && (
                    <div className="ar-notice" data-testid="arcade-final">
                      <b>
                        Maç tamamlandı · {s.stats[0].goals}–{s.stats[1].goals}
                      </b>
                      <span>Sonuç ve bütün sayaçlar gerçekleşen sekanslardan hesaplandı.</span>
                    </div>
                  )}
                </section>
                <div className="ar-bottom">
                  <section className="ar-panel">
                    <div className="ar-section">
                      <h3>Maçın izi</h3>
                      <small>OLAY VERİSİ</small>
                    </div>
                    {(
                      [
                        ['shots', 'Şut'],
                        ['chances', 'Şut fırsatı'],
                        ['entries', 'Son üçte bire giriş'],
                        ['pressWins', 'Baskıyla top kazanımı'],
                        ['completed', 'Tamamlanan pas'],
                        ['saves', 'Kaleci kurtarışı'],
                      ] as const
                    ).map(([k, label]) => (
                      <div className="ar-stat" key={k}>
                        <b>{s.stats[0][k]}</b>
                        <span>{label}</span>
                        <b>{s.stats[1][k]}</b>
                      </div>
                    ))}
                    <div className="ar-stat">
                      <b>
                        {Math.round(
                          (s.teams[0].players.reduce((n, p) => n + p.energy, 0) / 11) * 100,
                        )}
                        %
                      </b>
                      <span>Ortalama kondisyon</span>
                      <b>
                        {Math.round(
                          (s.teams[1].players.reduce((n, p) => n + p.energy, 0) / 11) * 100,
                        )}
                        %
                      </b>
                    </div>
                  </section>
                  <section className="ar-panel">
                    <div className="ar-section">
                      <h3>Maç akışı</h3>
                      <button className="ar-text" onClick={exportGame}>
                        JSON indir ↗
                      </button>
                    </div>
                    <div className="ar-feed">
                      {s.events
                        .filter((e) => !['buildup', 'possession'].includes(e.kind))
                        .slice(-40)
                        .reverse()
                        .map((e) => (
                          <div key={e.id} className={e.kind === 'goal' ? 'ar-goal-event' : ''}>
                            <time>{clock(e.time)}</time>
                            <span>
                              <b>{s.teams[e.team].short}</b> {e.text}
                            </span>
                          </div>
                        ))}
                      {!s.events.length && (
                        <p className="ar-muted">
                          Maç başladığında gerçek olaylar burada görünecek.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
              <aside className="ar-tactics">
                {s.teams.map((t, index) => {
                  const team = index as Side,
                    stats = s.stats[team],
                    lastChange = s.events
                      .filter((e) => e.team === team && e.kind === 'tactic' && e.time > 0)
                      .at(-1),
                    before = lastChange
                      ? s.events.filter(
                          (e) =>
                            e.team === team &&
                            e.kind === 'chance' &&
                            e.time > Math.max(0, lastChange.time - 600) &&
                            e.time <= lastChange.time,
                        ).length
                      : 0,
                    after = lastChange
                      ? s.events.filter(
                          (e) =>
                            e.team === team &&
                            e.kind === 'chance' &&
                            e.time > lastChange.time &&
                            e.time <= lastChange.time + 600,
                        ).length
                      : 0;
                  return (
                    <section className="ar-panel" key={team}>
                      <div className="ar-section">
                        <small>
                          OYUNCU {team + 1} · {t.short}
                        </small>
                        <span className={team === 0 ? 'ar-lime' : 'ar-blue'}>●</span>
                      </div>
                      <label>
                        Oyun planı
                        <select
                          aria-label={`${t.short} stratejisi`}
                          disabled={!canEdit}
                          value={t.strategy}
                          onChange={(e) => setPlan(team, e.target.value as Strategy)}
                        >
                          {Object.entries(STRATEGIES).map(([key, plan]) => (
                            <option key={key} value={key}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p>{STRATEGIES[t.strategy].description}</p>
                      <p className="ar-muted">Bedeli: {STRATEGIES[t.strategy].risk}</p>
                      <div className="ar-mini">
                        <span>
                          Pres kazanımı <b>{stats.pressWins}</b>
                        </span>
                        <span>
                          Fırsat kalitesi{' '}
                          <b>
                            {stats.chances
                              ? `${Math.round((stats.quality / stats.chances) * 100)}/100`
                              : '—'}
                          </b>
                        </span>
                        <span>
                          Kazanım bölgesi{' '}
                          <b>
                            {stats.recoveryX.length
                              ? `${Math.round(stats.recoveryX.reduce((a, b) => a + b, 0) / stats.recoveryX.length)} m`
                              : '—'}
                          </b>
                        </span>
                      </div>
                      <p className="ar-muted ar-small">
                        Hücum fırsatı üst / orta / alt: {stats.channels.join(' / ')}. Kalite
                        deneysel fırsat puanıdır.
                      </p>
                      {lastChange && (
                        <p className="ar-muted ar-small">
                          Son değişim öncesi / sonrası fırsat: {before} / {after} (en çok 10 dk).
                          Sonraki gözlem: {Math.min(600, s.time - lastChange.time)} sn.{' '}
                          {s.time - lastChange.time < 120
                            ? 'Veri henüz yetersiz.'
                            : 'Rakip ve oyun fazı da etkiler; nedensel üstünlük kanıtı değildir.'}
                        </p>
                      )}
                      <div className="ar-manager">
                        <small>SON ÇARE · TEK KULLANIM</small>
                        {s.phase === 'ready' ? (
                          <label>
                            Yönetici adı
                            <input
                              aria-label={`${t.short} yönetici adı`}
                              maxLength={32}
                              value={names[team]}
                              onChange={(e) => {
                                const n = [...names] as [string, string];
                                n[team] = e.target.value;
                                setNames(n);
                              }}
                            />
                          </label>
                        ) : (
                          <h3>{t.managerName}</h3>
                        )}
                        <p className="ar-muted ar-small">
                          Bitiricilik {managerSkills.finishing} · Pas {managerSkills.passing} · Hız{' '}
                          {managerSkills.pace}. Santrforun yerine girer; takım 11 kişi kalır.
                        </p>
                        {s.time < s.options.unlockMinute * 60 ? (
                          <span className="ar-lock">70. dakikada açılır · iki taraf için eşit</span>
                        ) : (
                          <button
                            className="ar-resort"
                            aria-label={`${t.short} Son Çare`}
                            disabled={running || !!resolved || !engine.current.canEnter(team)}
                            onClick={() => {
                              engine.current.enterManager(team);
                              sync();
                            }}
                          >
                            {t.used ? 'YÖNETİCİ SAHADA' : 'SON ÇARE · SAHAYA GİR'}
                          </button>
                        )}
                        <p className="ar-muted ar-small">
                          {t.used
                            ? stats.managerShots
                              ? `Manuel şut ${stats.managerShots}/1 · Gol ${stats.managerGoals}. Yönetici artık pas desteğinde.`
                              : s.phase === 'finished'
                                ? 'Yeterli şut pozisyonu oluşmadı.'
                                : 'Fırsat aranıyor; otomatik şut veya gol garantisi yok.'
                            : 'Tek manuel şut ancak uygun pozisyon kazanılırsa açılır.'}
                        </p>
                      </div>
                      <details>
                        <summary>Kadro · {t.players.length} oyuncu</summary>
                        {t.players.map((p) => (
                          <div className="ar-roster" key={p.id}>
                            <span>
                              #{p.number} {p.name}
                            </span>
                            <small>
                              {p.profile} · %{Math.round(p.energy * 100)}
                            </small>
                          </div>
                        ))}
                      </details>
                    </section>
                  );
                })}
              </aside>
            </div>
            <footer className="ar-footer">
              <span>YEREL PROTOTİP · Aynı tohum + komutlar = aynı maç</span>
              <label>
                Tohum
                <input
                  aria-label="Arcade tohumu"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <button className="ar-secondary" onClick={reset}>
                Yeni maç hazırla
              </button>
            </footer>
          </>
        )}
        <p className="ar-scope">
          Slice A · Sekans tabanlı arcade model. Tam futbol fizik/kural simülasyonu, çevrim içi
          odalar ve draft henüz yok. İstemci otoritesi yalnız yerel test içindir.
        </p>
      </main>
    </div>
  );
}
