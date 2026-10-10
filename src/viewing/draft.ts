import { Match } from '../engine/match';
import type { MatchCheckpoint } from '../engine/match';
import type { SingleTacticalCommand } from '../engine/types';
/** Preview has its own state. Consecutive slider edits replace each other. */
export class TacticalDraft {
  commands: SingleTacticalCommand[] = [];
  preview: Match;
  constructor(private base: MatchCheckpoint) {
    this.preview = Match.restore(base);
  }
  edit(c: SingleTacticalCommand) {
    const commands = this.commands.slice(),
      last = commands.at(-1);
    if (
      last?.kind === c.kind &&
      last.team === c.team &&
      (c.kind === 'tactics' ||
        (last.kind === 'assignment' && last.player === c.player && last.slot === c.slot))
    )
      commands.pop();
    commands.push(structuredClone(c));
    const candidate = Match.restore(this.base);
    for (const command of commands) candidate.command(command);
    this.commands = commands;
    this.preview = candidate;
  }
}
