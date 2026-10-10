import { Match } from './match';
import type { MatchState, Team } from './types';
/** Reconstruct from initial inputs + ordered tick commands; no renderer or wall clock involved. */
export function replayMatch(
  teams: [Team, Team],
  seed: number,
  commands: MatchState['commands'],
  endTick = 54000,
): Match {
  if (!Number.isInteger(endTick) || endTick < 0 || endTick > 54000)
    throw new Error('Invalid replay end');
  for (let i = 0; i < commands.length; i++)
    if (
      commands[i].sequence !== i ||
      !Number.isInteger(commands[i].tick) ||
      commands[i].tick < 0 ||
      commands[i].tick > 54000 ||
      (i && commands[i].tick < commands[i - 1].tick)
    )
      throw new Error('Commands must be ordered by tick and sequence');
  const m = new Match(teams, seed);
  let index = 0;
  while (true) {
    const phase = m.state.phase;
    if (commands[index]?.tick === m.state.tick) {
      if (phase === 'playing') m.pause();
      while (commands[index]?.tick === m.state.tick) m.command(commands[index++].command);
      if (phase === 'playing') m.resume();
    }
    if (m.state.tick === endTick) break;
    if (m.state.phase === 'ready') m.start();
    if (m.state.phase === 'halfTime') m.resumeHalf();
    m.step();
  }
  return m;
}
