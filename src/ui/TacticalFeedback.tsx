import type { MatchDirector } from '../viewing/director';
import type { TeamId } from '../engine/types';
import { summarize } from '../viewing/analysis';
export function TacticalFeedback({ director, team }: { director: MatchDirector; team: TeamId }) {
  const s = director.state,
    tick = s.tick,
    change = director.interventions.filter((i) => i.teams.includes(team)).at(-1)?.tick;
  const after = summarize(
    director.observations,
    team,
    change ?? Math.max(0, tick - 1200),
    Math.min(tick, (change ?? tick) + 1200),
  );
  const before =
    change === undefined
      ? null
      : summarize(director.observations, team, Math.max(0, change - 1200), change);
  const value = (n: number | null, unit: string) => (n === null ? '—' : `${n.toFixed(1)} ${unit}`);
  const links = new Map<string, number>();
  for (const e of s.events)
    if (e.kind === 'passComplete' && e.team === team && e.tick > tick - 1200) {
      const key = `${e.player}→${e.target}`;
      links.set(key, (links.get(key) ?? 0) + 1);
    }
  const name = (id: string) => s.players.find((p) => p.id === id)?.number ?? '?';
  const gains = director.regains.filter(
    (r) => r.team === team && r.tick <= tick && r.tick > tick - 1200,
  );
  return (
    <details className="panel tactical-feedback">
      <summary>Sahadaki etki · {s.teams[team].short}</summary>
      <p className="small muted">
        {before
          ? 'Son müdahaleden önce / sonra · en çok 120 saniyelik pencereler'
          : 'Son 120 simülasyon saniyesi · aktif oyun örnekleri'}
      </p>
      {(
        [
          ['line', 'Stoper hattı (kendi kalesinden)', 'm'],
          ['width', 'Takım genişliği', 'm'],
          ['pressers', 'Aynı anda baskı yapan', 'oyuncu'],
        ] as const
      ).map(([key, label, unit]) => (
        <div className="stat-row" key={key}>
          <span>{label}</span>
          <b>
            {before ? `${value(before[key], unit)} → ` : ''}
            {value(after[key], unit)}
          </b>
        </div>
      ))}
      <p className="small">
        Aktif örnek: {before ? `${before.seconds} sn → ` : ''}
        {after.seconds} sn
      </p>
      {after.seconds < 30 || (before && before.seconds < 30) ? (
        <p className="small muted">Karşılaştırma için henüz yeterli gözlem yok.</p>
      ) : (
        <p className="small muted">
          Gözlenen değişimdir; rakip, top konumu ve oyun fazı da etkiler. Başarı veya nedensellik
          garantisi değildir.
        </p>
      )}
      <p className="small">
        İleri bölge sahipliği, saha üst / orta / alt şerit: {after.lanes.join(' / ')} sn
      </p>
      <p className="small">
        Son 120 sn top kazanımı, savunma / orta / hücum üçlüsü:{' '}
        {[0, 1, 2]
          .map((i) => gains.filter((g) => Math.min(2, Math.floor(g.x / 35)) === i).length)
          .join(' / ')}
      </p>
      <p className="small">
        Son 120 sn pas bağlantıları:{' '}
        {[...links]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k, n]) => `${k.split('→').map(name).join(' → ')} (${n})`)
          .join(' · ') || 'Henüz yok'}
      </p>
      <p className="small muted">
        Hat yüksekliği arkadaki mesafeyi gösterir; rakibe bırakılan kullanılabilir alanın tamamını
        ölçmez.
      </p>
    </details>
  );
}
