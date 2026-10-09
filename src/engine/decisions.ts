import type { Choice, MatchState, Player, Vec } from './types';
import { clamp, distance, inside, segmentDistance } from './math';
import { anchor, direction, localX } from './tactics';
const rate = (n: number) => n / 100;
const choice = (
  action: Choice['action'],
  utility: number,
  target: Vec,
  reason: string,
  receiver?: string,
): Choice => ({ action, utility, target: inside(target), reason, receiver });
/** Utility candidates are inspectable. Execution randomness is deliberately separate. */
export function evaluate(s: MatchState, p: Player): Choice[] {
  const t = s.teams[p.team].tactics,
    a = p.attributes,
    dir = direction(p.team, s.half),
    base = anchor(s, p);
  const mates = s.players.filter((q) => q.team === p.team && q.id !== p.id),
    rivals = s.players.filter((q) => q.team !== p.team);
  const nearest = Math.min(...rivals.map((q) => distance(q.pos, p.pos)));
  const owns = s.ball.owner === p.id,
    attacking = s.possession === p.team;
  const list: Choice[] = [];
  if (owns) {
    const goal = { x: dir === 1 ? 105 : 0, y: 34 },
      range = distance(p.pos, goal);
    const pressure = clamp((8 - nearest) / 8),
      centrality = 1 - Math.abs(p.pos.y - 34) / 34;
    const trailing =
      s.stats[p.team].goals < s.stats[(1 - p.team) as 0 | 1].goals && s.time > 3600 ? 0.1 : 0;
    list.push(
      choice(
        'shoot',
        p.keeper
          ? -10
          : 1.12 -
              clamp(range / 36, 0, 3) +
              rate(a.finishing) * 0.28 +
              centrality * 0.18 -
              pressure * (1 - rate(a.composure)) * 0.45 +
              trailing,
        goal,
        'Mesafe, açı, bitiricilik ve baskı',
      ),
    );
    const forward = inside({
      x: p.pos.x + dir * (6 + rate(a.dribbling) * 3),
      y: p.pos.y + (34 - p.pos.y) * 0.12,
    });
    list.push(
      choice(
        'dribble',
        0.38 + rate(a.dribbling) * 0.23 + clamp(nearest / 14) * 0.2 - pressure * 0.4,
        forward,
        'Boş koridor ve top sürme becerisi',
      ),
    );
    for (const mate of mates) {
      const d = distance(p.pos, mate.pos);
      if (d < 3 || d > 52 + rate(a.vision) * 15) continue;
      const progress = (mate.pos.x - p.pos.x) * dir;
      const lane = Math.min(...rivals.map((q) => segmentDistance(q.pos, p.pos, mate.pos)));
      const openness = Math.min(...rivals.map((q) => distance(q.pos, mate.pos)));
      const desired =
        8 + t.passLength * 0.28 + (t.buildUp === 'direct' ? 12 : t.buildUp === 'short' ? -5 : 0);
      const transition =
        s.time - s.possessionChangedAt < 8 && t.transition === 'counter' ? 0.18 : 0;
      const utility =
        0.48 +
        clamp(progress / 25, -1, 1) * (0.27 + transition) +
        clamp(lane / 5) * 0.25 +
        clamp(openness / 8) * 0.19 +
        pressure * 0.24 +
        rate(a.passing) * 0.13 -
        Math.abs(d - desired) * 0.007 +
        (t.tempo - 50) * 0.002;
      list.push(
        choice(
          'pass',
          utility,
          { x: mate.pos.x + mate.velocity.x * 0.35, y: mate.pos.y + mate.velocity.y * 0.35 },
          'İlerleme, pas koridoru, alıcı boşluğu ve tempo',
          mate.id,
        ),
      );
    }
  } else if (p.keeper) {
    let keeperTarget = base;
    if (s.ball.flight?.kind === 'shot' && s.ball.flight.team !== p.team) {
      const bx = s.ball.pos.x,
        vx = s.ball.velocity.x;
      const ownX = dir === 1 ? 1.8 : 103.2;
      const time = vx === 0 ? 0 : (ownX - bx) / vx;
      keeperTarget = {
        x: ownX,
        y: clamp(s.ball.pos.y + s.ball.velocity.y * Math.max(0, time), 29.7, 38.3),
      };
    }
    list.push(choice('keeper', 1, keeperTarget, 'Kale-top açısı ve şut yörüngesi'));
    if (!s.ball.owner && localX(s.ball.pos.x, p.team, s.half) < 15)
      list.push(choice('recover', 1.2, s.ball.pos, 'Ceza alanındaki serbest top'));
  } else {
    const ballD = distance(p.pos, s.ball.pos);
    list.push(
      choice(
        'shape',
        0.52 + rate(a.positioning) * 0.12,
        base,
        'Diziliş, çizgi yüksekliği ve genişlik',
      ),
    );
    if (attacking) {
      const support = {
        x: base.x + (s.ball.pos.x - base.x) * 0.24,
        y: base.y + (s.ball.pos.y - base.y) * 0.12,
      };
      list.push(
        choice(
          'support',
          0.57 + rate(a.vision) * 0.13 - clamp((10 - ballD) / 10) * 0.35,
          support,
          'Top taşıyana pas açısı oluştur',
        ),
      );
      const run = { x: base.x + dir * (6 + t.mentality * 0.08), y: base.y };
      const space = Math.min(...rivals.map((q) => distance(q.pos, run)));
      list.push(
        choice(
          'run',
          0.38 +
            rate(a.offBall) * 0.24 +
            clamp(space / 15) * 0.15 +
            (t.transition === 'counter' && s.time - s.possessionChangedAt < 8 ? 0.2 : 0),
          run,
          'Savunma arkasındaki boşluk ve geçiş talimatı',
        ),
      );
    } else {
      const rank = mates.filter((q) => !q.keeper && distance(q.pos, s.ball.pos) < ballD).length;
      const execution = 0.55 + rate(a.decisions + a.pressing) * 0.225;
      const radius = 9 + t.pressing * 0.24;
      list.push(
        choice(
          'press',
          (0.3 + rate(t.pressing) * 0.65) * execution +
            clamp(1 - ballD / radius) * 0.4 -
            rank * 0.16,
          s.ball.pos,
          'Baskı mesafesi, pres talimatı ve yakın takım arkadaşları',
        ),
      );
      const opponent = rivals
        .filter((q) => !q.keeper)
        .reduce(
          (best, q) => (distance(q.pos, base) < distance(best.pos, base) ? q : best),
          rivals.find((q) => !q.keeper)!,
        );
      const mark = { x: opponent.pos.x - dir * 1.8, y: opponent.pos.y };
      list.push(
        choice(
          'mark',
          0.54 + rate(a.marking + a.awareness) * 0.19 - distance(mark, base) * 0.01,
          mark,
          'Bölgedeki rakibi kale tarafından karşıla',
        ),
      );
      const screen = {
        x: base.x + (s.ball.pos.x - base.x) * 0.2,
        y: base.y + (s.ball.pos.y - base.y) * 0.25,
      };
      list.push(
        choice(
          'screen',
          0.45 + rate(a.awareness) * 0.2,
          screen,
          'Top ile savunma bölgesi arasındaki pas açısını kapat',
        ),
      );
    }
    if (!s.ball.owner) {
      const rank = mates.filter((q) => distance(q.pos, s.ball.pos) < ballD).length;
      list.push(
        choice(
          'recover',
          1.35 - ballD * 0.012 - rank * 0.25,
          {
            x: s.ball.pos.x + s.ball.velocity.x * 0.25,
            y: s.ball.pos.y + s.ball.velocity.y * 0.25,
          },
          'Serbest topa takım içi mesafe sıralaması',
        ),
      );
    }
  }
  // Better decisions distinguish useful candidates more reliably; deterministic perception bias.
  return list
    .map((c, i) => ({
      ...c,
      utility:
        c.utility + (1 - rate(a.decisions)) * 0.08 * Math.sin(p.number * 7 + i * 3 + s.tick / 13),
    }))
    .sort((a, b) => b.utility - a.utility);
}
