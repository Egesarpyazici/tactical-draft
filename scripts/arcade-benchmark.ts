import { writeFileSync } from 'node:fs';
import { ArcadeMatch } from '../src/arcade/engine/match';
import type { Strategy, Side } from '../src/arcade/engine/types';
const plans: Strategy[] = ['high_press', 'compact_counter', 'possession'];
const count = Number(process.argv[3] ?? 24),
  start = Number(process.argv[4] ?? 1);
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(start) || start < 0)
  throw new Error('Invalid sample range');
const rows: {
  seed: number;
  home: Strategy;
  away: Strategy;
  score: number[];
  sequences: number;
  stats: import('../src/arcade/engine/types').Stat[];
  energy: number[];
}[] = [];
for (let seed = start; seed < start + count; seed++)
  for (const home of plans)
    for (const away of plans) {
      const m = new ArcadeMatch(seed);
      m.tactic(0, home);
      m.tactic(1, away);
      while (m.state.phase !== 'finished') {
        if (m.state.phase === 'lastResort') {
          m.enterManager(0);
          m.enterManager(1);
        }
        if (m.state.phase === 'manual')
          m.shoot(m.state.pending!.team, { aim: 0.8, height: 0.25, power: 0.76, timing: 0.5 });
        else {
          m.continue();
          m.advance();
        }
      }
      rows.push({
        seed,
        home,
        away,
        score: m.state.stats.map((s) => s.goals),
        sequences: m.state.sequence,
        stats: m.state.stats,
        energy: m.state.teams.map((t) => t.players.reduce((n, p) => n + p.energy, 0) / 11),
      });
    }
const summaries = plans.flatMap((home) =>
  plans.map((away) => {
    const rs = rows.filter((r) => r.home === home && r.away === away),
      avg = (f: (r: (typeof rows)[number]) => number) =>
        rs.reduce((n, r) => n + f(r), 0) / rs.length;
    return {
      home,
      away,
      matches: rs.length,
      wins: rs.filter((r) => r.score[0] > r.score[1]).length,
      draws: rs.filter((r) => r.score[0] === r.score[1]).length,
      goals: avg((r) => r.score[0] + r.score[1]),
      sides: ([0, 1] as Side[]).map((t) => ({
        pressWins: avg((r) => r.stats[t].pressWins),
        recoveryX: avg(
          (r) =>
            r.stats[t].recoveryX.reduce((n, x) => n + x, 0) / (r.stats[t].recoveryX.length || 1),
        ),
        entries: avg((r) => r.stats[t].entries),
        chances: avg((r) => r.stats[t].chances),
        quality: avg((r) => r.stats[t].quality / (r.stats[t].chances || 1)),
        pressure: avg((r) => r.stats[t].pressure / (r.stats[t].chances || 1)),
        passRate: avg((r) => r.stats[t].completed / (r.stats[t].passes || 1)),
        energy: avg((r) => r.energy[t]),
        managerShots: avg((r) => r.stats[t].managerShots),
        managerGoals: avg((r) => r.stats[t].managerGoals),
      })),
    };
  }),
);
const report = {
  seedStart: start,
  seeds: count,
  matches: rows.length,
  note: 'Each side enters at 70 minutes; same fixed manual input when earned. No forced opportunity. Fictional asymmetric lineups; no causal balance guarantee.',
  summaries,
  rows,
};
writeFileSync(process.argv[2] ?? '/tmp/arcade-benchmark.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(summaries, null, 2));
