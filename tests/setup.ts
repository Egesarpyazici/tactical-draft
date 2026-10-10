import { afterEach } from 'vitest';
// Full games are intentionally synchronous. Let worker IPC/diagnostics flush between tests;
// this never advances the simulation and avoids starving Vitest's RPC acknowledgements.
afterEach(async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
});
