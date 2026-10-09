import type { MatchEvent, MatchState } from '../engine/types';
export const clock = (time: number) =>
  `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
export function describe(e: MatchEvent, s: MatchState) {
  const name =
    s.players.find((p) => p.id === e.player)?.name ??
    (e.team !== undefined ? s.teams[e.team].name : '');
  const target = s.players.find((p) => p.id === e.target)?.name;
  switch (e.kind) {
    case 'goal':
      return `${name} — GOL! ${e.detail ?? 'Top kale çizgisini geçti.'}`;
    case 'shot':
      return `${name} şutunu çekiyor${e.onTarget ? ' — kaleyi buluyor.' : '.'}`;
    case 'save':
      return `${name} kalede müdahale ediyor.`;
    case 'block':
      return `${name} şutu engelliyor.`;
    case 'kickoff':
      return `${name} başlama vuruşunu kullanıyor.`;
    case 'throwIn':
      return `${name} taç atışını kullanıyor.`;
    case 'corner':
      return `${name} köşe vuruşunu kullanıyor.`;
    case 'goalKick':
      return `${name} kale vuruşuyla oyunu başlatıyor.`;
    case 'halfTime':
      return 'İlk yarı sona erdi. Taktik müdahale zamanı.';
    case 'fullTime':
      return 'Son düdük. Maç tamamlandı.';
    case 'tackleAttempt':
      return `${name} müdahale deniyor.`;
    case 'turnover':
      return `${name} topu kaybetti.`;
    case 'tackle':
      return `${name} müdahaleyle topu kazandı.`;
    case 'interception':
      return `${name} pas arasına girdi.`;
    case 'pass':
      return `${name}, ${target ?? 'takım arkadaşı'} için pasını gönderdi.`;
    case 'passComplete':
      return `${target} pası kontrol etti.`;
    case 'miscontrol':
      return `${name} ilk kontrolde topu açtı.`;
    case 'tactics':
      return `${name}: taktik talimatları güncellendi.`;
  }
}
