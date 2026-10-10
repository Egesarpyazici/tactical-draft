# Tactical Draft — Arcade Tactics + Last Resort (prototype brief)

Status: design/development brief, not yet implemented.
Branch: `feat/arcade-manager-shot-prototype`, based on `feat/simulation-foundation`.
Keep the previous prototype and PR #1 intact. This is a separate experiment. Do not merge into main or publish publicly.

## Product definition
A **web-based competitive football draft tactics game** that feels strategic and arcade-fun. Two players ultimately compete by drafting footballers, designing tactics, watching short 2D attack sequences, and using a **single last-resort self-substitution** to try to score a manually controlled shot. Tactical skill determines how/where chances arise; manual shot skill affects the chance's finish, not its creation. Do not promise Football Manager simulation depth or an exact FM replica.

## Visual identity — must match the approved chat concept
Professional restrained dark-green football UI, legible typography, careful whitespace and alignment. Dark pine pitch, thin off-white goal outline and markings, lime accent for controlled player / aim, warm gold goalkeeper, modest electric blue for opponent. A compact, responsive shot control panel:
- Stylized, top-down 2D shooting vignette with goal, keeper, ball, user-controlled manager-forward and reticle.
- Direction selection (left / middle / right) with a finer tap/click aim point; power control; skill-based timing / release cue; primary 'ŞUT ÇEK' action.
- Ball travel and keeper reaction shown from computed shot physics/outcome. Clear short feedback for goal/save/miss. Accessible keyboard and touch support.
- The proposed in-chat demo is only a visual/interaction *reference*, not a pre-existing code asset. Recreate the concept in real React/Phaser components. Controls MUST actually change shot outcomes. No faux interactions.

Keep design original: do not copy FM logos, third-party player images, licensed players or another game's UI. All first-prototype footballers remain fictional.

## Mandatory first milestone: narrow playable vertical slice
Create a NEW experimental arcade mode. Preserve existing match engine and its UI as a legacy/classic mode, or preserve them on the original branch if a clean isolation makes that easier. Do not rewrite the entire project in one shot.

### 1. Tactical event-based hybrid match
- New independent, deterministic, testable TypeScript simulation module, separated from UI and visualization. A match progresses through time-stamped possession, buildup, press/escape, chance, shooting and defensive sequences. The 2D pitch visualization replays outcomes/paths genuinely generated from those sequences.
- Model at least three differentiated strategy presets: `high_press`, `compact_counter`, `possession`. Each has meaningful physical/tactical tradeoffs: win-the-ball zones, risk of exposed space, fatigue, pass control, transition quality, and chance quality. Tactical counters are contextual, not fixed rock-paper-scissors win bonuses.
- Tactical and player attributes influence decisions and chance quality; give traceable sequence reasons. No scripted score, hard goal quota, invisible predetermined match, or fake match statistics. 2D visualization must not invent results absent from model.
- Minimum: two fictional 11-player lineups and position profiles. Use existing player attribute data if practical. Keep hooks for future draft and substitutes.
- A 90-minute simulated match should be watchable in roughly 4–8 real minutes in default highlights mode (device-dependent); include pause and halftime and never skip user action windows. Preserve fast-result and extended-view architecture if feasible.
- Manual tactic changes apply to future states. If buffering future sequences, invalidate future simulation/replay after commands. Seed + input command log should reproduce outcome.
- Display game-relevant feedback (e.g. pressing recoveries, entry into final third, chances by channel, fatigue) based on events, including before/after tactical change. Avoid correlation = causation claims.

### 2. Manager 'SON ÇARE' — *both players*, fair game rules
- Each side has the same **one-time** Last Resort action starting at 70' (prototype rule; make configurable).
- A manager-forward substitutes for an outfield player, preferably the striker, leaving 11 active players. Manager is not a star by default; modest transparent attributes and tradeoffs (e.g. loss of passing support, lower finishing/fitness).
- No guaranteed goal or arbitrary shot. A manual shooting window is triggered only when the manager-forward reaches an actual high-enough quality shooting position through the simulated tactical phase. If that never occurs, Last Resort can fail without a shot. For UX testing, also provide an explicitly labelled **shot practice mode** that can trigger situations without rigging competitive matches.
- When shooting window occurs, pause at a consistent simulation checkpoint. Display the approved interactive UI style. User chooses target/angle, power and skill-based timing; include goalkeeper position/reaction, defender pressure, shooter attributes and shot quality. Show real possible outcomes: goal, save, wide/over (if modeled). Avoid one unbeatable option or guaranteed corner goals; do not automatically favor the trailing team.
- The shot mechanic must be available identically to BOTH sides, not only the local player. First prototype can support *local pass-and-play* or test sessions against bot, with transparent indication that online rooms are NOT implemented. Future online design: server-authoritative shot validation, time limit and replay/command verification.
- Fairness: both sides can trigger their one chance independently; shot occurrence depends on tactical opportunity, no arbitrary bonus for entering. Keep coaching choices more important than arcade shot selection across many matches.

### 3. Minimal UI (working flows)
- Initial screen with two fictional teams, tactics strategy selector, basic squad/manager setup.
- Professional match centre with readable event visualizer and clock, important chance cards and tactic controls.
- Contextual Last Resort button appears at 70', turns unavailable once used.
- Interactive shot interface matching the styling and mechanics above.
- End screen with final score, genuine match event timeline, tactics performance summary, shot attempts and manager performance.
- Mobile usable; desktop excellent. No fake online buttons, empty draft screens, mock data asserted as live, or gratuitous emoji.

### 4. Testing / acceptance
- Test the seed, tactical commands and shot inputs for determinism, invariants, valid substitutions (11 active; 1 keeper), one-shot limit, shot position gating, and fair availability to both sides.
- Unit tests: different tactics yield demonstrably different location/quality/pressure/fatigue measures over repeated seeded matches; shot power/aim/timing/goalkeeper pressure alter outcomes for physically explained reasons; misses/saves occur. No fixed tactic dominates the entire small test set; report remaining risks.
- Browser tests: 90-minute match completed, halftime, pause/tactics, Manager substitution, shot practice, one true shot opportunity, both sides, and match end.
- Make prototype enjoyable to click through in a browser; build/test and verify screens. Be explicit about what is actually working vs future roadmap.
- Do not silently mask failings by changing random seeds, fudging displays or claiming sophistication. Preserve existing work.

## Phased implementation
**Slice A (do NOW):** arcade engine shell + 3 tactic presets + event-based 2D highlights + minimal interactive Manager shot practice UI, one actual matched opportunity for each side when earned, baseline automated tests and browser working demo. Prioritize a well-crafted professional UI for these screens. Do not build online multiplayer yet.

**Slice B (later):** full draft snake selection, expanded player library, reserve/substitution system, detailed roles, richer tactical setup and responsive UI.

**Slice C (later):** online friend codes, authoritative server match engine, room reconnects, competitive fairness / anti-cheat and commercially releasable UX.

## Rules for Codex tasks
1. Inspect repo/PR/progress; DO NOT start from empty `main`. Work only in `feat/arcade-manager-shot-prototype`.
2. Write architecture with acceptance criteria and then implement **Slice A**; do not silently expand scope.
3. Keep the repository private, no commercial publishing, no paid resources, no branch merging.
4. Write `docs/ARCADE_PROGRESS.md` with actual completed work, failures, tests, next steps. Commit code to this branch and open **a separate draft PR targeting `feat/simulation-foundation`** for review, if supported; never alter PR #1 or `main` without approval.
5. Validate developer commands and provide runnable Codespaces instructions.
