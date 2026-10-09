import type { Formation, Tactics, Team } from '../engine/types';
const sliders: [
  keyof Pick<Tactics, 'pressing' | 'line' | 'width' | 'tempo' | 'passLength' | 'mentality'>,
  string,
  string,
  string,
][] = [
  ['pressing', 'Pres yoğunluğu', 'Bekle', 'Yoğun'],
  ['line', 'Savunma çizgisi', 'Derin', 'Yüksek'],
  ['width', 'Takım genişliği', 'Dar', 'Geniş'],
  ['tempo', 'Pas temposu', 'Sakin', 'Hızlı'],
  ['passLength', 'Pas uzunluğu', 'Kısa', 'Uzun'],
  ['mentality', 'Hücum anlayışı', 'Temkinli', 'Cesur'],
];
export function TacticsPanel({
  team,
  editable,
  onChange,
}: {
  team: Team;
  editable: boolean;
  onChange: (t: Tactics) => void;
}) {
  const t = team.tactics;
  return (
    <section className="panel tactics">
      <div className="section-title">
        <span>TAKTİK TAHTASI</span>
        <span className="tag">{team.short}</span>
      </div>
      <label className="select-label">
        Diziliş
        <select
          aria-label="Diziliş"
          value={t.formation}
          disabled={!editable}
          onChange={(e) => onChange({ ...t, formation: e.target.value as Formation })}
        >
          {['4-3-3', '4-2-3-1', '4-4-2', '3-5-2'].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <div className="sliders">
        {sliders.map(([key, label, low, high]) => (
          <label className="slider" key={key}>
            <span>
              {label}
              <b>{t[key]}</b>
            </span>
            <input
              aria-label={label}
              type="range"
              min="0"
              max="100"
              value={t[key]}
              disabled={!editable}
              onChange={(e) => onChange({ ...t, [key]: +e.target.value })}
            />
            <small>
              <span>{low}</span>
              <span>{high}</span>
            </small>
          </label>
        ))}
      </div>
      <label className="select-label">
        Savunmadan çıkış
        <select
          value={t.buildUp}
          disabled={!editable}
          onChange={(e) => onChange({ ...t, buildUp: e.target.value as Tactics['buildUp'] })}
        >
          <option value="short">Kısa paslarla</option>
          <option value="mixed">Dengeli</option>
          <option value="direct">Doğrudan</option>
        </select>
      </label>
      <label className="select-label">
        Geçiş hücumu
        <select
          value={t.transition}
          disabled={!editable}
          onChange={(e) => onChange({ ...t, transition: e.target.value as Tactics['transition'] })}
        >
          <option value="hold">Topu koru</option>
          <option value="counter">Hızlı çık</option>
        </select>
      </label>
      <p className="muted small">
        {editable
          ? 'Değişiklikler motorun konum ve karar hesaplarına uygulanır.'
          : 'Taktikler devre arasında yeniden düzenlenebilir.'}
      </p>
    </section>
  );
}
