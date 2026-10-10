# Arcade Slice A — development checkpoint

Branch: `feat/arcade-manager-shot-prototype`. Classic engine/UI and PR #1 are preserved; Arcade is available at `/arcade`.

Implemented: independent seeded possession engine; three strategies with spatial, fatigue and passing tradeoffs; real event statistics; 45/70/90 minute boundaries; both teams' striker-to-manager substitutions; one earned manual shot per manager; direction, height, power, timing and goalkeeper interception; isolated two-sided practice; Phaser playback; pause, speed, tactical controls; command export/replay; responsive pine/lime UI.

Verification at checkpoint: 19 Arcade unit tests pass; production build passes. Browser suite: 2 pass, 1 fails due to an undefined ball-path point in Phaser, despite reaching full time and both earned manual shots. This rendering failure is NOT resolved yet. StrictMode duplicate canvas creation was fixed. Investigate negative initial requestAnimationFrame elapsed time next.

Remaining: resolve browser error; rerun full regression and build; inspect screenshots; run held-out tactical comparisons; report balance limitations and supported controls; commit/push final changes and create a separate draft PR targeting `feat/simulation-foundation`.

Known limits: possession strategy needs further balancing; current arcade goal totals are high, not calibrated professional-football statistics. No online rooms, draft, full rule set, general substitutions or role editor. Current sequence is resolved before playback; tactics affect subsequent sequences. Last Resort does not guarantee a shot. Browser coverage uses seed 1 and deliberate misses to exercise both earned windows without forcing chances in the engine.

## Second checkpoint

Resolved negative RAF progress (with regression coverage), duplicate StrictMode canvas startup, initial formation display, sequence position continuity and save-event attribution. Arcade tests: 20/20 pass before the final full regression; Arcade browser tests: 3/3 pass after the RAF fix. Final build passes. Held-out 216-match report and local/Codespaces instructions are in `docs/arcade/VALIDATION.md` and `PLAY.md`. Full legacy+Arcade regression and final browser rerun are underway. Final PR still pending.
