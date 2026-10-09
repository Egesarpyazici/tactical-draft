import type { Choice, MatchState, Player, Vec } from './types';
import { clamp, distance, inside } from './math';
import { direction, localX } from './tactics';
import { organize, pressureTarget, receivingTarget, type TeamPlan } from './organization';
import { passOption, pressure, shotOpportunity } from './opportunities';
import { ROLES, roleFit } from './roles';
const choice = (
  action: Choice['action'],
  utility: number,
  target: Vec,
  reason: string,
  receiver?: string,
): Choice => ({ action, utility, target: inside(target), reason, receiver });
export function evaluate(s: MatchState, p: Player, plan: TeamPlan = organize(s, p.team)): Choice[] {
  const t = s.teams[p.team].tactics,
    a = p.attributes,
    dir = direction(p.team, s.half),
    base = plan.targets.get(p.id)!;
  const profile = ROLES[p.roleId],
    fit = roleFit(p, p.roleId).score / 100;
  const rivals = s.players.filter((q) => q.team !== p.team),
    mates = s.players.filter((q) => q.team === p.team && q.id !== p.id);
  const list: Choice[] = [];
  if (s.ball.owner === p.id) {
    const chance = shotOpportunity(s, p),
      stress = pressure(s, p);
    list.push(
      choice(
        'shoot',
        p.keeper
          ? -10
          : 0.53 +
              chance.xg * 2.8 +
              a.finishing * 0.0015 -
              chance.blockers * 0.08 +
              (p.duty === 'attack' ? 0.035 : 0),
        chance.goal,
        'Kale açısı, baskı, blok koridoru ve kaleci konumu',
      ),
    );
    for (const turn of [-0.65, 0, 0.65]) {
      const angle = (dir === 1 ? 0 : Math.PI) + turn,
        target = inside({ x: p.pos.x + Math.cos(angle) * 7, y: p.pos.y + Math.sin(angle) * 7 });
      const space = Math.min(...rivals.map((q) => distance(q.pos, target)));
      list.push(
        choice(
          'dribble',
          0.36 +
            a.dribbling * 0.002 +
            clamp(space / 12) * 0.25 -
            stress * 0.2 -
            Math.abs(turn) * 0.06,
          target,
          'İleri koridordaki boşluk, risk ve top koruma',
        ),
      );
    }
    for (const mate of mates) {
      const option = passOption(s, p, mate),
        d = option.distance;
      if (d < 4 || d > 35 + a.vision * 0.35) continue;
      const progress = (option.target.x - p.pos.x) * dir;
      const desired =
        9 + t.passLength * 0.28 + (t.buildUp === 'direct' ? 10 : t.buildUp === 'short' ? -5 : 0);
      const safe = clamp(1 - option.danger * 0.85 - option.difficulty * 0.28);
      const transition = s.time - s.possessionChangedAt < 7 && t.transition === 'counter' ? 0.1 : 0;
      const creative = profile.creative * fit;
      const utility =
        0.32 +
        safe * 0.57 +
        clamp(progress / 25, -1, 1) * (0.18 + transition + creative) +
        clamp(option.openness / 6) * 0.06 +
        stress * 0.09 -
        Math.abs(d - desired) * 0.008 +
        (t.tempo - 50) * 0.001 -
        (1 - option.control) * 0.12 +
        profile.riskTaking * option.danger * 0.15;
      list.push(
        choice(
          'pass',
          utility,
          option.target,
          'Varış zamanı, pas koridoru, alıcı kontrolü ve rolün risk tercihi',
          mate.id,
        ),
      );
    }
  } else if (p.keeper) {
    let target = base;
    if (s.ball.flight?.kind === 'shot' && s.ball.flight.team !== p.team) {
      const x = dir === 1 ? 1.1 : 103.9,
        vx = s.ball.velocity.x,
        time = vx === 0 ? 0 : (x - s.ball.pos.x) / vx;
      target = { x, y: clamp(s.ball.pos.y + s.ball.velocity.y * Math.max(0, time), 29.3, 38.7) };
    }
    list.push(choice('keeper', 1, target, 'Kale açısını tut, şutta çizgi kesişimine tepki ver'));
    const local = localX(s.ball.pos.x, p.team, s.half),
      ownTime = distance(p.pos, s.ball.pos) / (4 + a.pace * 0.025);
    const rivalTime = Math.min(
      ...rivals.map((q) => distance(q.pos, s.ball.pos) / (4 + q.attributes.pace * 0.025)),
    );
    if (
      !s.ball.owner &&
      s.ball.flight?.kind !== 'shot' &&
      local < (p.roleId === 'sweeper' ? 24 : 10) &&
      Math.abs(s.ball.pos.y - 34) < 20 &&
      ownTime + 0.3 < rivalTime
    )
      list.push(
        choice(
          'recover',
          1.3,
          receivingTarget(s, p),
          'Rakipten önce ulaşılabilen güvenli serbest top',
        ),
      );
  } else {
    list.push(
      choice(
        'shape',
        0.6 + a.positioning * 0.001,
        base,
        'Ortak savunma hattı, hat mesafesi ve görev',
      ),
    );
    if (s.possession === p.team) {
      const bd = distance(p.pos, s.ball.pos);
      const support = { x: base.x + (s.ball.pos.x - base.x) * 0.1, y: base.y };
      list.push(
        choice(
          'support',
          0.62 + a.vision * 0.001 + profile.creative * 0.2 - (bd < 6 ? 0.25 : 0),
          support,
          'Alan paylaşımı ve top taşıyana üçgen bağlantı',
        ),
      );
      const opponentLine =
        rivals
          .filter((q) => !q.keeper)
          .map((q) => localX(q.pos.x, p.team, s.half))
          .sort((a, b) => b - a)[0] ?? 90;
      const runX = Math.min(
        localX(base.x, p.team, s.half) + 5 + (p.duty === 'attack' ? 4 : 0),
        Math.max(localX(s.ball.pos.x, p.team, s.half), opponentLine - 0.8),
      );
      const run = { x: localX(runX, p.team, s.half), y: base.y };
      const space = Math.min(...rivals.map((q) => distance(q.pos, run)));
      list.push(
        choice(
          'run',
          0.35 +
            a.offBall * 0.002 +
            clamp(space / 12) * 0.12 +
            profile.run +
            (p.duty === 'attack' ? 0.08 : 0) +
            (s.time - s.possessionChangedAt < 7 && t.transition === 'counter' ? 0.08 : 0),
          run,
          'Rolün ileri koşusu; savunma çizgisini zamanlama',
        ),
      );
    } else {
      if (plan.primary === p.id)
        list.push(
          choice(
            'press',
            0.9 + t.pressing * 0.002 + profile.press,
            pressureTarget(s, p),
            'Takımın birincil baskı oyuncusu; müdahale ayrı değerlendirilir',
          ),
        );
      if (plan.support === p.id) {
        const goalSide = {
          x: s.ball.pos.x - dir * 5,
          y: s.ball.pos.y + (base.y < s.ball.pos.y ? -5 : 5),
        };
        list.push(
          choice('screen', 0.91, goalSide, 'İkinci oyuncu topa yığılmaz; pas çıkışını kapatır'),
        );
      }
      const marked = rivals.find((q) => q.id === plan.marks.get(p.id));
      if (marked) {
        const target = {
          x: marked.pos.x - dir * 1.9,
          y: marked.pos.y + (34 - marked.pos.y) * 0.04,
        };
        list.push(
          choice(
            'mark',
            0.64 + a.marking * 0.001 + profile.mark * 0.2,
            target,
            'Tekil markaj paylaşımı ve kale tarafı kademe',
          ),
        );
      }
    }
    if (!s.ball.owner && plan.recoverer === p.id && s.ball.flight?.kind !== 'shot')
      list.push(
        choice(
          'recover',
          1.4,
          receivingTarget(s, p),
          'Pas alıcısına öncelik; diğer oyuncular bağlantı konumlarını korur',
        ),
      );
  }
  const noise = (1 - a.decisions / 100) * 0.025 + (1 - fit) * 0.02;
  return list
    .map((c, i) => ({
      ...c,
      utility: c.utility + noise * Math.sin(p.number * 7 + i * 3 + Math.floor(s.tick / 10)),
    }))
    .sort((a, b) => b.utility - a.utility);
}
