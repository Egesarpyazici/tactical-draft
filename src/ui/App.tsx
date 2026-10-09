import { useEffect, useRef, useState } from 'react';
import { Match } from '../engine/match';
import { createTeams } from '../data/teams';
import { MatchDirector } from '../viewing/director';
import { TacticalDraft } from '../viewing/draft';
import { viewNames, type ViewMode } from '../viewing/highlights';
import { TacticalFeedback } from './TacticalFeedback';
import type { TeamId, Tactics, SingleTacticalCommand } from '../engine/types';
import { Pitch } from './Pitch';
import { RoleEditor } from './RoleEditor';
import { TacticsPanel } from './TacticsPanel';
import { clock, describe } from './commentary';
const actions: Record<string, string> = {
  shape: 'Dizilişe dön',
  support: 'Pas desteği',
  run: 'Boşluğa koşu',
  press: 'Topa baskı',
  mark: 'Markaj',
  screen: 'Pas açısını kapat',
  recover: 'Topu kazan',
  dribble: 'Top sür',
  pass: 'Pas ver',
  shoot: 'Şut çek',
  keeper: 'Kaleyi koru',
};
export function App() {
  const [initialEngine] = useState(() => new Match(createTeams()));
  const [initialDirector] = useState(() => new MatchDirector(initialEngine));
  const director = useRef(initialDirector);
  const [draft, setDraft] = useState<TacticalDraft | null>(null);
  const [s, setS] = useState(() => director.current.state),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [mode, setMode] = useState<ViewMode>('key'),
    [seed, setSeed] = useState('2026'),
    [selected, setSelected] = useState<string | null>('0-9'),
    [team, setTeam] = useState<TeamId>(0),
    [tab, setTab] = useState<'events' | 'players'>('events'),
    [error, setError] = useState('');
  useEffect(() => {
    if (!running) return;
    let last = performance.now(),
      frame = 0;
    const run = (now: number) => {
      director.current.speed = speed;
      director.current.advance(Math.min((now - last) / 1000, 0.25));
      last = now;
      setS(director.current.state);
      if (director.current.state.phase !== 'playing') {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [running, speed]);
  const sync = () => setS(director.current.state);
  const start = () => {
    if (draft?.commands.length) return;
    if (s.phase === 'playing') director.current.pause();
    else director.current.start();
    setRunning(director.current.state.phase === 'playing');
    sync();
  };
  const reset = () => {
    const n = Number(seed);
    if (!/^\d+$/.test(seed) || !Number.isInteger(n) || n < 0 || n > 0xffffffff) {
      setError('Tohum 0–4294967295 arası tam sayı olmalı.');
      return;
    }
    setRunning(false);
    const teams = createTeams();
    teams.forEach((t, i) => (t.tactics = { ...s.teams[i].tactics }));
    director.current = new MatchDirector(new Match(teams, n));
    director.current.mode = mode;
    setDraft(null);
    setError('');
    sync();
  };
  const edit = (c: SingleTacticalCommand) => {
    const next = new TacticalDraft(director.current.current);
    for (const command of draft?.commands ?? []) next.edit(command);
    next.edit(c);
    setDraft(next);
  };
  const setTactics = (t: Tactics) => edit({ kind: 'tactics', team, tactics: t });
  const editorState = draft?.preview.state ?? s;
  const changeMode = (next: ViewMode) => {
    director.current.setMode(next);
    setMode(next);
    sync();
  };
  const total = s.stats[0].possessionTicks + s.stats[1].possessionTicks;
  const possession = total ? Math.round((s.stats[0].possessionTicks / total) * 100) : 50;
  const player = s.players.find((p) => p.id === selected),
    pstats = player ? s.playerStats[player.id] : null;
  const keyEvents = s.events
    .filter(
      (e) => !['pass', 'passComplete', 'miscontrol', 'tackleAttempt', 'turnover'].includes(e.kind),
    )
    .slice(-50)
    .reverse();
  const exportMatch = () => {
    const blob = new Blob([JSON.stringify({ version: 3, ...s }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `tactical-draft-${s.seed}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="app">
      <aside className="rail">
        <div className="brand-icon">
          TD
          <span />
        </div>
        <div className="rail-active" title="Maç merkezi">
          ▣
        </div>
        <div className="rail-bottom">01</div>
      </aside>
      <div className="workspace">
        <header>
          <div className="wordmark">
            TACTICAL<span>DRAFT</span>
            <small>FOOTBALL SIMULATION LAB</small>
          </div>
          <div className="header-meta">
            <span className="status-dot" /> YEREL SİMÜLASYON{' '}
            <span className="version">ALPHA 0.2B-1</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">HAZIRLIK MAÇI / MOTOR GELİŞTİRME SÜRÜMÜ</div>
              <h1>
                Maç merkezi<span>.</span>
              </h1>
            </div>
            <button className="secondary export" onClick={exportMatch}>
              Maç verisini indir ↗
            </button>
          </div>
          <section className="scoreboard">
            <div className="team home">
              <div className="crest atlas">A</div>
              <div>
                <span className="overline">EV SAHİBİ</span>
                <h2>{s.teams[0].name}</h2>
                <p>
                  {s.teams[0].tactics.formation} <span>·</span> Kurgusal takım
                </p>
              </div>
            </div>
            <div className="score">
              <div className="score-numbers">
                <b>{s.stats[0].goals}</b>
                <span>:</span>
                <b>{s.stats[1].goals}</b>
              </div>
              <div className="match-clock" data-testid="match-clock">
                {clock(s.time)}{' '}
                <span>
                  {s.phase === 'ready'
                    ? 'HAZIR'
                    : s.phase === 'halfTime'
                      ? 'DEVRE ARASI'
                      : s.phase === 'finished'
                        ? 'MAÇ SONU'
                        : running
                          ? 'CANLI'
                          : 'DURAKLATILDI'}
                </span>
              </div>
            </div>
            <div className="team away">
              <div>
                <span className="overline">DEPLASMAN</span>
                <h2>{s.teams[1].name}</h2>
                <p>
                  {s.teams[1].tactics.formation} <span>·</span> Kurgusal takım
                </p>
              </div>
              <div className="crest bos">B</div>
            </div>
          </section>
          <div className="match-layout">
            <div className="left-column">
              <section className="pitch-panel panel">
                <div className="pitch-heading">
                  <span>
                    <i className={running ? 'live-dot' : 'idle-dot'} />
                    {s.half}. YARI <span className="muted">/ 2D TAKTİK GÖRÜNÜM</span>
                  </span>
                  <span className="muted">105 × 68 m</span>
                </div>
                <div
                  className={`view-stage ${director.current.status === 'searching' && running ? 'searching' : ''}`}
                >
                  <Pitch
                    state={s}
                    selected={selected}
                    onSelect={(id) => {
                      setSelected(id);
                      setTeam(s.players.find((p) => p.id === id)!.team);
                    }}
                  />
                  {running && director.current.status === 'searching' && (
                    <div className="view-overlay">
                      <strong>
                        {mode === 'quick'
                          ? 'Maç simüle ediliyor'
                          : 'Maç akıyor · sıradaki pozisyon aranıyor'}
                      </strong>
                      <span>{clock(s.time)} · İstediğiniz an duraklatabilirsiniz</span>
                    </div>
                  )}
                  {s.events.some(
                    (e) => e.kind === 'goal' && s.tick - e.tick >= 0 && s.tick - e.tick < 25,
                  ) &&
                    director.current.status !== 'searching' && (
                      <div
                        className="goal-banner"
                        key={s.events.filter((e) => e.kind === 'goal').at(-1)?.id}
                      >
                        GOL{' '}
                        <span>
                          {s.stats[0].goals} — {s.stats[1].goals}
                        </span>
                      </div>
                    )}
                </div>
                <div className="view-modes" aria-label="Maç izleme modu">
                  {(Object.keys(viewNames) as ViewMode[]).map((m) => (
                    <button
                      key={m}
                      aria-pressed={mode === m}
                      className={mode === m ? 'active' : ''}
                      onClick={() => changeMode(m)}
                    >
                      {viewNames[m]}
                    </button>
                  ))}
                </div>
                <p className="view-caption">
                  {mode === 'full'
                    ? 'Kesintisiz saha görünümü · 1×, maç saatini 12 kat ilerletir.'
                    : mode === 'quick'
                      ? 'Görüntü beklemeden hesaplama · devre arasında durur.'
                      : 'Gerçek pozisyonların gelişimi ve sonucu · 1×, pozisyonları 4 kat hızla gösterir.'}
                </p>
                <div className="pitch-legend">
                  <span>
                    <i className="lime" /> ATL
                  </span>
                  <span>
                    <i className="blue" /> BOS
                  </span>
                  <span>
                    <i className="gold" /> Kaleci
                  </span>
                  <span className="muted">Detay için bir oyuncu seçin</span>
                </div>
                {s.phase === 'halfTime' && (
                  <div className="notice">
                    <strong>Devre arası · Taktik müdahale</strong>
                    <span>
                      İki takımın talimatlarını düzenleyin; hazır olduğunuzda ikinci yarıyı
                      başlatın.
                    </span>
                  </div>
                )}
                {s.phase === 'finished' && (
                  <div className="notice">
                    <strong>
                      Maç tamamlandı · {s.stats[0].goals}–{s.stats[1].goals}
                    </strong>
                    <span>İstatistikler gerçekleşen maç olaylarından hesaplandı.</span>
                  </div>
                )}
                <div className="playback">
                  <button
                    className="primary"
                    disabled={s.phase === 'finished' || !!draft?.commands.length}
                    onClick={start}
                  >
                    {s.phase === 'ready'
                      ? '▶ Maçı başlat'
                      : s.phase === 'halfTime'
                        ? '▶ İkinci yarıyı başlat'
                        : running
                          ? 'Ⅱ Duraklat'
                          : '▶ Devam et'}
                  </button>
                  <div className="speed" hidden={mode === 'quick'}>
                    <span>HIZ</span>
                    {[1, 2, 4].map((n) => (
                      <button
                        key={n}
                        className={speed === n ? 'active' : ''}
                        onClick={() => setSpeed(n)}
                        aria-label={`${n} kat hız`}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                  <span className="simulation-time">{Math.floor(s.time / 60)} / 90 dk</span>
                </div>
              </section>
              <div className="bottom-grid">
                <section className="panel stats">
                  <div className="section-title">
                    <span>MAÇ İSTATİSTİKLERİ</span>
                    <span className="tag">GERÇEK VERİ</span>
                  </div>
                  <div className="possession-label">
                    <b>{total ? `${possession}%` : '—'}</b>
                    <span>Topa sahip olma</span>
                    <b>{total ? `${100 - possession}%` : '—'}</b>
                  </div>
                  <div className="possession-bar">
                    <i style={{ width: `${possession}%` }} />
                  </div>
                  {(
                    [
                      ['shots', 'Şut'],
                      ['shotsOnTarget', 'Kaleyi bulan şut'],
                      ['passes', 'Pas denemesi'],
                      ['completedPasses', 'Tamamlanan pas'],
                      ['tackleAttempts', 'Müdahale girişimi'],
                      ['tackles', 'Başarılı müdahale'],
                      ['turnovers', 'Top kaybı'],
                      ['saves', 'Kaleci müdahalesi'],
                      ['corners', 'Köşe vuruşu'],
                    ] as const
                  ).map(([k, label]) => (
                    <div className="stat-row" key={k}>
                      <b>{s.stats[0][k]}</b>
                      <span>{label}</span>
                      <b>{s.stats[1][k]}</b>
                    </div>
                  ))}
                </section>
                <section className="panel feed">
                  <div className="tabs">
                    <button
                      className={tab === 'events' ? 'active' : ''}
                      onClick={() => setTab('events')}
                    >
                      Maç akışı
                    </button>
                    <button
                      className={tab === 'players' ? 'active' : ''}
                      onClick={() => setTab('players')}
                    >
                      Kadrolar
                    </button>
                  </div>
                  <div className="feed-content">
                    {tab === 'events' ? (
                      keyEvents.length ? (
                        keyEvents.map((e) => (
                          <div className={`event ${e.kind === 'goal' ? 'goal' : ''}`} key={e.id}>
                            <time>{clock(e.time)}</time>
                            <span>{describe(e, s)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="empty">
                          <span>90 dakika. İki farklı plan.</span>
                          <p>
                            Maçı başlatın. Olaylar motor tarafından üretildikçe burada görünecek.
                          </p>
                        </div>
                      )
                    ) : (
                      s.players.map((p) => (
                        <button className="roster-row" key={p.id} onClick={() => setSelected(p.id)}>
                          <span style={{ color: s.teams[p.team].color }}>
                            {p.number.toString().padStart(2, '0')}
                          </span>
                          <span>{p.name}</span>
                          <small>{Math.round(p.energy * 100)}%</small>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
            <aside className="right-column">
              <div className="team-switch" aria-label="Taktiği düzenlenen takım">
                {s.teams.map((t) => (
                  <button
                    className={team === t.id ? 'active' : ''}
                    key={t.id}
                    onClick={() => setTeam(t.id)}
                  >
                    {t.short} <span>{t.id === 0 ? 'Ev sahibi' : 'Deplasman'}</span>
                  </button>
                ))}
              </div>
              <TacticalFeedback director={director.current} team={team} />
              <TacticsPanel
                team={editorState.teams[team]}
                editable={s.phase === 'ready' || s.phase === 'halfTime' || s.phase === 'paused'}
                onChange={setTactics}
              />
              {draft?.commands.length ? (
                <div className="draft-actions" role="status">
                  <strong>Uygulanmamış taktik taslağı</strong>
                  <span>Devam etmeden uygulayın veya vazgeçin.</span>
                  <button
                    className="primary"
                    onClick={() => {
                      director.current.apply(draft.commands);
                      setDraft(null);
                      sync();
                    }}
                  >
                    Değişiklikleri Uygula
                  </button>
                  <button className="secondary" onClick={() => setDraft(null)}>
                    Vazgeç
                  </button>
                </div>
              ) : null}
              {player && pstats && (
                <section className="panel player-card">
                  <div className="section-title">
                    <span>OYUNCU İNCELEMESİ</span>
                    <span className="tag">#{player.number}</span>
                  </div>
                  <h3>{player.name}</h3>
                  <div className="player-sub">
                    {s.teams[player.team].short} · {player.role} · {actions[player.action]}
                  </div>
                  <div className="energy">
                    <span>Kondisyon</span>
                    <b>{Math.round(player.energy * 100)}%</b>
                  </div>
                  <div className="energy-bar">
                    <i style={{ width: `${player.energy * 100}%` }} />
                  </div>
                  <div className="player-metrics">
                    <span>
                      <b>{(pstats.distance / 1000).toFixed(2)}</b> km
                    </span>
                    <span>
                      <b>{pstats.passes}</b> pas
                    </span>
                    <span>
                      <b>{pstats.shots}</b> şut
                    </span>
                  </div>
                  <RoleEditor
                    state={editorState}
                    p={editorState.players.find((p) => p.id === player.id)!}
                    editable={s.phase === 'ready' || s.phase === 'paused' || s.phase === 'halfTime'}
                    onCommand={edit}
                  />
                  <details>
                    <summary>Özellikler ve karar gerekçesi</summary>
                    <div className="attribute-grid">
                      {(
                        [
                          ['passing', 'Pas'],
                          ['dribbling', 'Top sürme'],
                          ['finishing', 'Bitiricilik'],
                          ['pace', 'Hız'],
                          ['tackling', 'Müdahale'],
                          ['vision', 'Oyun görüşü'],
                        ] as const
                      ).map(([k, label]) => (
                        <span key={k}>
                          {label}
                          <b>{player.attributes[k]}</b>
                        </span>
                      ))}
                    </div>
                    {player.choices.slice(0, 3).map((c, i) => (
                      <div className="decision" key={i}>
                        <b>
                          {actions[c.action]} · {c.utility.toFixed(2)}
                        </b>
                        <span>{c.reason}</span>
                      </div>
                    ))}
                  </details>
                </section>
              )}
            </aside>
          </div>
          <footer>
            <div>
              <strong>Tekrarlanabilir maç</strong>
              <span>Aynı tohum + aynı talimatlar = aynı simülasyon</span>
            </div>
            <label>
              Tohum{' '}
              <input
                aria-label="Rastgelelik tohumu"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <button className="secondary" onClick={reset}>
              Yeni maç hazırla
            </button>
            {error && <span role="alert">{error}</span>}
          </footer>
          <p className="scope-note">
            Motor v0.2B-1 · Yerel tek kullanıcı · Ofsayt, faul, kart, oyuncu değişikliği ve hava
            topu henüz uygulanmadı. Bu sürüm rekabetçi denge iddiası taşımaz.
          </p>
        </main>
      </div>
    </div>
  );
}
