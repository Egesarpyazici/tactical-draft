import type { MatchEvent, MatchState } from '../engine/types';
import { localX } from '../engine/tactics';
export type ViewMode = 'key' | 'extended' | 'full' | 'quick';
export const viewNames: Record<ViewMode, string> = {
  key: 'Önemli Anlar',
  extended: 'Genişletilmiş',
  full: 'Tüm Maç',
  quick: 'Hızlı Sonuç',
};
/** Descriptive selectors, never bonuses or commands to the football engine. */
export function highlightReason(
  s: MatchState,
  events: MatchEvent[],
  mode: ViewMode,
): string | null {
  if (events.some((e) => e.kind === 'goal')) return 'Gol';
  if (events.some((e) => e.kind === 'save')) return 'Kaleci müdahalesi';
  if (events.some((e) => e.kind === 'shot' && (e.xg ?? 0) >= 0.18)) return 'Kaliteli şut fırsatı';
  const advanced = localX(s.ball.pos.x, s.possession, s.half) > 72;
  if (
    advanced &&
    events.some((e) => ['tackle', 'interception'].includes(e.kind) && e.team === s.possession)
  )
    return 'İleri bölgede top kazanımı';
  if (mode !== 'extended') return null;
  if (events.some((e) => e.kind === 'shot')) return 'Şut gelişimi';
  if (advanced && s.time - s.possessionChangedAt < 7 && !s.restart) return 'Hızlı hücum';
  const owner = s.players.find((p) => p.id === s.ball.owner);
  const lastDefender = Math.max(
    ...s.players
      .filter((p) => p.team !== s.possession && !p.keeper)
      .map((p) => localX(p.pos.x, s.possession, s.half)),
  );
  if (
    owner &&
    advanced &&
    s.players.some(
      (p) =>
        p.team === owner.team &&
        p.action === 'run' &&
        localX(p.pos.x, p.team, s.half) > lastDefender,
    )
  )
    return 'Savunma arkasına koşu';
  if (
    advanced &&
    s.events
      .slice(-12)
      .filter((e) => e.kind === 'passComplete' && e.team === s.possession && e.tick > s.tick - 120)
      .length >= 3
  )
    return 'Paslarla hücum organizasyonu';
  if (
    advanced &&
    s.players.filter((p) => p.team !== s.possession && p.action === 'press').length >= 2
  )
    return 'Koordineli baskı';
  return null;
}
