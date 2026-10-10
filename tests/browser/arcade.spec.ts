import { expect, test, type Page } from '@playwright/test';
async function shoot(page: Page, miss = false) {
  await page.getByLabel('Yatay hedef', { exact: true }).fill(miss ? '130' : '90');
  await page.getByLabel('Hedef yüksekliği', { exact: true }).fill(miss ? '130' : '20');
  await page.getByLabel('Şut gücü', { exact: true }).fill(miss ? '100' : '80');
  await page.getByRole('button', { name: 'ZAMANLAMAYI BAŞLAT', exact: true }).click();
  await page.waitForFunction(() => {
    const n = Number(
      document.querySelector('[data-testid="shot-timing"]')?.getAttribute('aria-valuenow'),
    );
    return n > 43 && n < 57;
  });
  await page.getByRole('button', { name: 'ŞUT ÇEK', exact: true }).click();
  await expect(page.locator('.ar-result')).toBeVisible();
}
test('arcade seed 1: halftime, equal unlock, both earned manager shots and 90-minute result', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error(e.stack);
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/arcade');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByLabel('Arcade tohumu').fill('1');
  await page.getByLabel('Arcade izleme modu').selectOption('quick');
  await page.screenshot({ path: 'test-results/arcade-ready.png', fullPage: true });
  await page.getByRole('button', { name: 'Maçı Başlat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'İkinci Yarıyı Başlat', exact: true })).toBeVisible(
    { timeout: 30000 },
  );
  await expect(page.getByTestId('arcade-clock')).toContainText('45:00');
  await page.getByRole('button', { name: 'İkinci Yarıyı Başlat', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kararı Onayla ve Devam Et', exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('arcade-clock')).toContainText('70:00');
  await expect(page.getByLabel('ATL Son Çare', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('BOS Son Çare', { exact: true })).toBeEnabled();
  await page.getByLabel('ATL Son Çare', { exact: true }).click();
  await expect(page.getByLabel('ATL Son Çare', { exact: true })).toBeDisabled();
  await page.getByLabel('BOS Son Çare', { exact: true }).click();
  await page.screenshot({ path: 'test-results/arcade-last-resort.png', fullPage: true });
  await page.getByRole('button', { name: 'Kararı Onayla ve Devam Et', exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await expect(page.getByRole('region', { name: 'Manuel şut penceresi' })).toBeVisible({
      timeout: 30000,
    });
    const before = await page.getByTestId('arcade-clock').innerText();
    await page.waitForTimeout(200);
    expect(await page.getByTestId('arcade-clock').innerText()).toBe(before);
    await page.screenshot({ path: `test-results/arcade-earned-shot-${i}.png`, fullPage: true });
    await shoot(page, true);
    await page.getByRole('button', { name: 'Maça dön', exact: true }).click();
  }
  await expect(page.getByTestId('arcade-final')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('arcade-clock')).toContainText('90:00');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON indir' }).click();
  const path = await (await download).path();
  const fs = await import('node:fs/promises');
  const s = JSON.parse(await fs.readFile(path!, 'utf8'));
  expect(s.stats.map((t: { managerShots: number }) => t.managerShots)).toEqual([1, 1]);
  expect(s.teams.every((t: { players: unknown[] }) => t.players.length === 11)).toBe(true);
  expect(s.commands.filter((c: { kind: string }) => c.kind === 'shot')).toHaveLength(2);
  expect(s.events.filter((e: { kind: string }) => e.kind === 'halftime')).toHaveLength(1);
  await page.screenshot({ path: 'test-results/arcade-finished.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('arcade pause and tactical plan apply to the next sequence', async ({ page }) => {
  await page.goto('/arcade');
  await page.getByRole('button', { name: 'Maçı Başlat', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Duraklat', exact: true }).click();
  const before = await page.getByTestId('arcade-clock').innerText();
  await page.getByLabel('ATL stratejisi', { exact: true }).selectOption('possession');
  await page.waitForTimeout(200);
  expect(await page.getByTestId('arcade-clock').innerText()).toBe(before);
  await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
  await expect(page.getByLabel('ATL stratejisi', { exact: true })).toBeDisabled();
  await page.waitForTimeout(4500);
  expect(await page.getByTestId('arcade-clock').innerText()).not.toBe(before);
});
test('mobile shot practice is independent and works for both sides with keyboard controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/arcade');
  await page.getByRole('button', { name: 'Şut Antrenmanı', exact: true }).click();
  for (const team of ['0', '1']) {
    await page.getByLabel('Antrenman takımı').selectOption(team);
    await page.getByRole('button', { name: 'Sağ', exact: true }).click();
    await page.getByLabel('Şut gücü', { exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await shoot(page);
    await page.screenshot({ path: `test-results/arcade-practice-${team}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Yeni deneme', exact: true }).click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Maç Merkezi', exact: true }).click();
  await expect(page.getByTestId('arcade-clock')).toContainText('00:00');
});
