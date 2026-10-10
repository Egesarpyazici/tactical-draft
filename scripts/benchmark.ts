import { writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
const fingerprint = createHash('sha256');
for (const file of readdirSync('src/engine')
  .filter((f) => f.endsWith('.ts'))
  .sort())
  fingerprint.update(file).update(readFileSync('src/engine/' + file));
const engineSha256 = fingerprint.digest('hex');
import { Match } from '../src/engine/match';
import { createTeams } from '../src/data/teams';
import { distance } from '../src/engine/math';
import type { Attributes } from '../src/engine/types';
const output = process.argv[2] ?? '/tmp/benchmark.json',
  count = Number(process.argv[3] ?? 4),
  start = Number(process.argv[4] ?? 1);
const scenarios = ['balanced', 'low-press', 'high-press', 'wide-352', 'strong-home', 'weak-home'];
if (process.env.BENCHMARK_EXTENDED === '1')
  scenarios.push('compact-442', 'strong-high', 'weak-low', 'roles');
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(start) || start < 0)
  throw new Error('Invalid benchmark range');
type MeasuredTeam = import('../src/engine/types').TeamStats & {
  passCompletion: number;
  observedTurnovers: number;
  tackleAttempts: number;
  distanceKm: number;
  outfieldKm: number[];
  energy: number;
  pressSeconds: number;
};
const rows: {
  seed: number;
  scenario: string;
  goals: number;
  homeGoalDifference: number;
  closePairs: number;
  rapidTurnovers: number;
  team: MeasuredTeam[];
  passBins: { name: string; attempts: number; completed: number }[];
}[] = [];
for (let seed = start; seed < start + count; seed++)
  for (const scenario of scenarios) {
    const teams = createTeams();
    if (scenario === 'low-press') teams[0].tactics.pressing = 15;
    if (scenario === 'high-press') teams[0].tactics.pressing = 85;
    if (scenario === 'wide-352')
      Object.assign(teams[0].tactics, {
        formation: '3-5-2',
        width: 85,
        line: 65,
        passLength: 65,
        buildUp: 'direct',
      });
    if (scenario === 'compact-442')
      Object.assign(teams[0].tactics, {
        formation: '4-4-2',
        width: 25,
        line: 25,
        transition: 'counter',
        pressing: 25,
      });
    if (scenario === 'strong-high') Object.assign(teams[0].tactics, { pressing: 85, line: 70 });
    if (scenario === 'weak-low')
      Object.assign(teams[0].tactics, { pressing: 15, line: 25, transition: 'counter' });
    if (scenario.startsWith('strong-') || scenario.startsWith('weak-'))
      for (const p of teams[0].players)
        for (const key of Object.keys(p.attributes) as (keyof Attributes)[])
          p.attributes[key] = Math.max(
            20,
            Math.min(95, p.attributes[key] + (scenario.startsWith('strong-') ? 15 : -15)),
          );
    const m = new Match(teams, seed);
    if (scenario === 'roles') {
      for (const [player, slot, roleId, duty] of [
        ['0-1', 1, 'invertedBack', 'support'],
        ['0-9', 9, 'falseNine', 'support'],
      ] as const)
        m.command({ kind: 'assignment', team: 0, player, slot, roleId, duty });
    }
    m.start();
    let samples = 0,
      closePairs = 0,
      turnovers = [0, 0],
      attempts = [0, 0],
      returns = 0,
      lastTurnover = -100;
    let prevChallenges = m.state.players.map((p) => p.challengeAt);
    for (let tick = 0; tick < 54000; tick++) {
      if (m.state.phase === 'halfTime') m.resumeHalf();
      const before = m.state.possession;
      m.step();
      const s = m.state;
      if (s.possession !== before && !s.restart) {
        turnovers[before]++;
        if (s.tick - lastTurnover <= 20) returns++;
        lastTurnover = s.tick;
      }
      s.players.forEach((p, i) => {
        if (p.challengeAt !== prevChallenges[i] && p.challengeAt === s.tick + 12)
          attempts[p.team]++;
        prevChallenges[i] = p.challengeAt;
      });
      if (tick % 10 === 0 && !s.restart) {
        samples++;
        for (let i = 0; i < 22; i++)
          for (let j = i + 1; j < 22; j++)
            if (
              s.players[i].team === s.players[j].team &&
              distance(s.players[i].pos, s.players[j].pos) < 2
            )
              closePairs++;
      }
    }
    const s = m.state;
    const team = s.stats.map((t, id) => {
      const players = s.players.filter((p) => p.team === id);
      return {
        ...t,
        passCompletion: t.passes ? t.completedPasses / t.passes : 0,
        observedTurnovers: turnovers[id],
        tackleAttempts: 'tackleAttempts' in t ? t.tackleAttempts : attempts[id],
        distanceKm: players.reduce((v, p) => v + s.playerStats[p.id].distance, 0) / 1000,
        outfieldKm: players
          .filter((p) => !p.keeper)
          .map((p) => s.playerStats[p.id].distance / 1000),
        energy: players.reduce((v, p) => v + p.energy, 0) / 11,
        pressSeconds: players.reduce((v, p) => v + s.playerStats[p.id].pressSeconds, 0),
      };
    });
    const completed = new Set(
      s.events.filter((e) => e.kind === 'passComplete').map((e) => e.relatedEvent),
    );
    const passes = s.events.filter((e) => e.kind === 'pass');
    const passBins = [
      ['short', 0, 15],
      ['medium', 15, 30],
      ['long', 30, 200],
      ['safe', 0, 0.35],
      ['risky', 0.35, 1.1],
    ].map(([name, lo, hi]) => {
      const subset = passes.filter((e) => {
        const value = name === 'safe' || name === 'risky' ? e.difficulty : e.distance;
        return value !== undefined && value >= Number(lo) && value < Number(hi);
      });
      return {
        name: String(name),
        attempts: subset.length,
        completed: subset.filter((e) => completed.has(e.id)).length,
      };
    });
    rows.push({
      passBins,
      seed,
      scenario,
      goals: s.stats[0].goals + s.stats[1].goals,
      homeGoalDifference: s.stats[0].goals - s.stats[1].goals,
      closePairs: closePairs / samples,
      rapidTurnovers: returns,
      team,
    });
    writeFileSync(output + '.partial.json', JSON.stringify(rows));
    console.error(`${seed} ${scenario}: ${s.stats[0].goals}-${s.stats[1].goals}`);
  }
const avg = (a: number[]) => a.reduce((v, n) => v + n, 0) / a.length;
const summaries = Object.fromEntries(
  scenarios.map((name) => {
    const a = rows.filter((r) => r.scenario === name),
      goals = a.map((r) => r.goals).sort((a, b) => a - b);
    return [
      name,
      {
        matches: a.length,
        meanGoals: avg(goals),
        medianGoals:
          (goals[Math.floor((goals.length - 1) / 2)] + goals[Math.floor(goals.length / 2)]) / 2,
        goalDistribution: Object.fromEntries(
          [...new Set(goals)].map((g) => [g, goals.filter((x) => x === g).length]),
        ),
        homeGoalDifference: avg(a.map((r) => r.homeGoalDifference)),
        closePairs: avg(a.map((r) => r.closePairs)),
        rapidTurnovers: avg(a.map((r) => r.rapidTurnovers)),
        home: {
          passCompletion: avg(a.map((r) => r.team[0].passCompletion)),
          passes: avg(a.map((r) => r.team[0].passes)),
          tackles: avg(a.map((r) => r.team[0].tackles)),
          attempts: avg(a.map((r) => Number(r.team[0].tackleAttempts))),
          turnovers: avg(a.map((r) => r.team[0].observedTurnovers)),
          shots: avg(a.map((r) => r.team[0].shots)),
          onTarget: avg(a.map((r) => r.team[0].shotsOnTarget)),
          possession: avg(
            a.map(
              (r) =>
                r.team[0].possessionTicks / (r.team[0].possessionTicks + r.team[1].possessionTicks),
            ),
          ),
          distanceKm: avg(a.map((r) => r.team[0].distanceKm)),
          energy: avg(a.map((r) => r.team[0].energy)),
          pressSeconds: avg(a.map((r) => r.team[0].pressSeconds)),
        },
      },
    ];
  }),
);
writeFileSync(
  output,
  JSON.stringify(
    {
      sourceCommit: process.env.BENCHMARK_REVISION ?? 'working-tree',
      engineSha256,
      seedStart: start,
      seeds: count,
      matches: rows.length,
      attemptNote:
        'Before stage 2A, attempts reconstructed from challengeAt=tick+12; after stage 2A, explicit events. Turnovers exclude restarts; rapid = opposing acquisitions within 2 seconds; closePairs = same-team pairs within 2m, sampled every second.',
      summaries,
      rows,
    },
    null,
    2,
  ) + '\n',
);
unlinkSync(output + '.partial.json');
console.log(JSON.stringify(summaries, null, 2));
