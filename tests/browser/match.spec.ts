import { expect, test } from '@playwright/test';
test('play, pause, halftime tactical change, full time and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error('Browser error:', e.message);
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Maçı başlat' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/match-ready.png', fullPage: true });
  await page.getByRole('button', { name: 'Hızlı Sonuç', exact: true }).click();
  await page.getByLabel('Oyuncu rolü').selectOption('falseNine');
  await page.getByRole('button', { name: 'Değişiklikleri Uygula' }).click();
  await page.getByRole('button', { name: 'Maçı başlat' }).click();
  await expect(page.getByLabel('Pres yoğunluğu')).toBeDisabled();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Duraklat' }).click();
  const paused = await page.getByTestId('match-clock').innerText();
  await page.waitForTimeout(400);
  expect(await page.getByTestId('match-clock').innerText()).toBe(paused);
  await expect(page.getByLabel('Oyuncu rolü')).toBeEnabled();
  await page.getByLabel('Oyuncu rolü').selectOption('pressingForward');
  await page.getByLabel('Oyuncu görevi').selectOption('attack');
  await page.getByLabel('Pres yoğunluğu').fill('80');
  await page.screenshot({ path: 'test-results/live-roles.png', fullPage: true });
  await page.getByRole('button', { name: 'Değişiklikleri Uygula' }).click();
  await page.getByRole('button', { name: 'Devam et' }).click();
  await expect(page.getByRole('button', { name: 'İkinci yarıyı başlat' })).toBeVisible({
    timeout: 70000,
  });
  await expect(page.getByTestId('match-clock')).toContainText('45:00');
  await page.getByLabel('Pres yoğunluğu').fill('90');
  await page.getByLabel('Diziliş', { exact: true }).selectOption('3-5-2');
  await page.screenshot({ path: 'test-results/halftime.png', fullPage: true });
  await page.getByRole('button', { name: 'Değişiklikleri Uygula' }).click();
  await page.getByRole('button', { name: 'İkinci yarıyı başlat' }).click();
  await expect(page.getByTestId('match-clock')).toContainText('MAÇ SONU', { timeout: 70000 });
  await expect(page.getByTestId('match-clock')).toContainText('90:00');
  await expect(page.getByText('Maç tamamlandı ·')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Maç verisini indir' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const fs = await import('node:fs/promises');
  const match = JSON.parse(await fs.readFile(path!, 'utf8'));
  expect(match.phase).toBe('finished');
  expect(match.players).toHaveLength(22);
  expect(
    match.commands.some(
      (c: { tick: number; command: { kind: string; commands?: { roleId?: string }[] } }) =>
        c.tick > 0 &&
        c.command.kind === 'batch' &&
        c.command.commands?.some((x) => x.roleId === 'pressingForward'),
    ),
  ).toBe(true);
  expect(match.commands.every((c: { sequence: number }, i: number) => c.sequence === i)).toBe(true);
  expect(match.teams[0].tactics.pressing).toBe(90);
  expect(match.stats[0].goals).toBe(
    match.events.filter((e: { kind: string; team: number }) => e.kind === 'goal' && e.team === 0)
      .length,
  );
  await page.screenshot({ path: 'test-results/match-finished.png', fullPage: true });
  await page.getByRole('button', { name: 'Yeni maç hazırla' }).click();
  await expect(page.getByTestId('match-clock')).toContainText('00:00');
  expect(errors).toEqual([]);
});
test('mobile layout and invalid seed feedback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByLabel('Rastgelelik tohumu').fill('-1');
  await page.getByRole('button', { name: 'Yeni maç hazırla' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('highlight viewing, atomic draft and readable tactical feedback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Önemli Anlar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Maçı başlat' }).click();
  await expect(page.locator('.view-stage.searching')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.view-stage:not(.searching)')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'test-results/highlight.png', fullPage: true });
  await page.getByRole('button', { name: 'Duraklat' }).click();
  const clock = await page.getByTestId('match-clock').innerText();
  await page.getByLabel('Pres yoğunluğu').fill('60');
  await page.getByLabel('Pres yoğunluğu').fill('85');
  await page.getByLabel('Oyuncu rolü').selectOption('falseNine');
  await expect(page.getByRole('button', { name: 'Devam et' })).toBeDisabled();
  await expect(page.locator('.event').filter({ hasText: 'Taktik planı uygulandı.' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Değişiklikleri Uygula' }).click();
  await expect(page.locator('.event').filter({ hasText: 'Taktik planı uygulandı.' })).toHaveCount(
    1,
  );
  await expect(page.getByTestId('match-clock')).toHaveText(clock);
  await page.locator('.tactical-feedback summary').click();
  await expect(page.getByText('Karşılaştırma için henüz yeterli gözlem yok.')).toBeVisible();
  expect(
    await page.locator('.tactical-feedback').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/intervention.png', fullPage: true });
  await page.getByRole('button', { name: 'Genişletilmiş', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Duraklat' }).click();
  await page.getByRole('button', { name: 'Tüm Maç', exact: true }).click();
  await page.getByRole('button', { name: 'Devam et' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Duraklat' }).click();
  expect(errors).toEqual([]);
});

test('default key highlights complete both halves with synchronized final data', async ({
  page,
}) => {
  test.setTimeout(360000);
  await page.goto('/');
  const started = Date.now();
  await page.getByRole('button', { name: 'Maçı başlat' }).click();
  await expect(page.getByRole('button', { name: 'İkinci yarıyı başlat' })).toBeVisible({
    timeout: 175000,
  });
  await expect(page.getByTestId('match-clock')).toContainText('45:00');
  await page.getByRole('button', { name: 'İkinci yarıyı başlat' }).click();
  await expect(page.getByTestId('match-clock')).toContainText('90:00', { timeout: 175000 });
  await expect(page.getByText('Maç tamamlandı ·')).toBeVisible();
  console.log(
    `Default key highlights, seed 2026: ${((Date.now() - started) / 1000).toFixed(1)} wall seconds including halftime click`,
  );
  await page.screenshot({ path: 'test-results/key-full-time.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Maç verisini indir' }).click();
  const path = await (await downloadPromise).path();
  const fs = await import('node:fs/promises');
  const s = JSON.parse(await fs.readFile(path!, 'utf8'));
  expect(s.tick).toBe(54000);
  expect(s.events.filter((e: { kind: string }) => e.kind === 'halfTime')).toHaveLength(1);
  expect(s.events.filter((e: { kind: string }) => e.kind === 'fullTime')).toHaveLength(1);
  expect(s.stats.map((t: { goals: number }) => t.goals)).toEqual(
    [0, 1].map(
      (team) =>
        s.events.filter((e: { kind: string; team: number }) => e.kind === 'goal' && e.team === team)
          .length,
    ),
  );
});
