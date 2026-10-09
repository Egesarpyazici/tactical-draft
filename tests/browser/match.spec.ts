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
  await page.getByRole('button', { name: '120 kat hız', exact: true }).click();
  await page.getByRole('button', { name: 'Maçı başlat' }).click();
  await expect(page.getByLabel('Pres yoğunluğu')).toBeDisabled();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Duraklat' }).click();
  const paused = await page.getByTestId('match-clock').innerText();
  await page.waitForTimeout(400);
  expect(await page.getByTestId('match-clock').innerText()).toBe(paused);
  await page.getByRole('button', { name: 'Devam et' }).click();
  await expect(page.getByRole('button', { name: 'İkinci yarıyı başlat' })).toBeVisible({
    timeout: 40000,
  });
  await expect(page.getByTestId('match-clock')).toContainText('45:00');
  await page.getByLabel('Pres yoğunluğu').fill('90');
  await page.getByLabel('Diziliş', { exact: true }).selectOption('3-5-2');
  await page.screenshot({ path: 'test-results/halftime.png', fullPage: true });
  await page.getByRole('button', { name: 'İkinci yarıyı başlat' }).click();
  await expect(page.getByTestId('match-clock')).toContainText('MAÇ SONU', { timeout: 40000 });
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
