import { Match } from '../src/engine/match';
import { createTeams } from '../src/data/teams';
const count = Number(process.argv[2] ?? 12);
const rows = [];
for (let seed = 1; seed <= count; seed++) {
  for (const pressing of [15, 85]) {
    const teams = createTeams();
    teams[0].tactics.pressing = pressing;
    const m = new Match(teams, seed);
    m.start();
    m.step(27000);
    m.resumeHalf();
    m.step(27000);
    const s = m.state,
      home = s.players.filter((p) => p.team === 0);
    rows.push({
      seed,
      pressing,
      score: s.stats.map((t) => t.goals).join('-'),
      shots: s.stats[0].shots,
      passes: s.stats[0].passes,
      completed: s.stats[0].completedPasses,
      pressSeconds: Math.round(home.reduce((v, p) => v + s.playerStats[p.id].pressSeconds, 0)),
      energy: Number((home.reduce((v, p) => v + p.energy, 0) / 11).toFixed(3)),
      events: s.events.length,
    });
  }
}
console.log(JSON.stringify({ matches: rows.length, rows }, null, 2));
