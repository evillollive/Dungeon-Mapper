import assert from 'node:assert/strict';
import { join } from 'node:path';
import { expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';

export default async function libraryOverview(page, { output, engine }) {
  await page.waitForLoadState('networkidle');
  const overview = page.getByRole('region', { name: 'Dungeon Mapper overview' });
  const title = page.getByRole('heading', { name: 'Make battle maps that look great fast.' });
  await expect(title).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dungeon Mapper', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Explore a sample' })).toBeEnabled();
  await expect(overview.getByRole('img')).toHaveJSProperty('naturalWidth', 1224);
  const before = await records(page);
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.locator('.project-library').evaluate(element => { element.scrollTop = 0; });
    assert.equal(await page.locator('.project-library').evaluate(element => element.scrollWidth > element.clientWidth), false,
      `No horizontal overflow at ${width}px`);
    if (width === 1440) await expect(title).toBeInViewport();
    await page.screenshot({ path: join(output, `${engine}-overview-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: 'Go to your maps' }).click();
  await expect(page.getByRole('heading', { name: 'Your maps', exact: true })).toBeInViewport();
  const collapse = page.getByRole('button', { name: 'Collapse overview' });
  await collapse.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeFocused();
  assert.deepEqual(await records(page), before, 'Collapsing the overview must not change stored projects');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Overview', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(title).toBeHidden();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(title).toBeVisible();
  await page.reload();
  await expect(title).toBeVisible();
  await page.getByRole('button', { name: 'Explore a sample', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Choose a sample', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Sample map')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Explore a sample', exact: true })).toBeFocused();
  assert.deepEqual(await records(page), before, 'Exploring and cancelling must leave stored projects intact');
  await page.getByRole('button', { name: 'Create a map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start blank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Explore a sample', exact: true }).click();
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  await page.getByRole('button', { name: 'Your maps', exact: true }).click();
  await expect(title).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.project-library').evaluate(element => { element.scrollTop = 0; });
    await expect(page.getByRole('button', { name: 'Continue last map', exact: true })).toBeInViewport();
    assert.equal(await page.locator('.project-library').evaluate(element => element.scrollWidth > element.clientWidth), false);
  }
  await page.getByRole('button', { name: 'Continue last map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Your maps', exact: true })).toBeVisible();
  return { overview: 'responsive, keyboard usable, remembered and reversible',
    creation: 'sample and create paths reachable without altering projects until accepted',
    returning: 'overview stays expanded until explicitly collapsed; continue stays above it' };
}
