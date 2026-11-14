import assert from 'node:assert/strict';
import { join } from 'node:path';
import { expect } from 'playwright/test';
import { records } from './ux02Creation.browser.mjs';

// The runner opens ?view=library for other journeys. This one starts where a new visitor does.
export default async function welcome(page, { output, engine }) {
  const base = page.url().split('?')[0];
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  const title = page.getByRole('heading', { level: 1, name: 'Make the map tonight, and run it tomorrow.' });
  await expect(title).toBeVisible();
  await expect(title).toBeFocused();
  await expect(page.getByText(/free map builder for tabletop RPGs/)).toBeVisible();
  await expect(page.locator('.welcome .offline-status')).toHaveCount(1);
  for (const image of await page.locator('.welcome img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const before = await records(page);
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.locator('.welcome').evaluate(element => { element.scrollTop = 0; });
    assert.equal(await page.locator('.welcome').evaluate(element => element.scrollWidth > element.clientWidth), false,
      `No horizontal overflow at ${width}px`);
    if (width === 1440) await expect(title).toBeInViewport();
    await page.screenshot({ path: join(output, `${engine}-welcome-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('navigation', { name: 'Welcome' }).getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Get started', exact: true })).toBeInViewport();
  await page.getByRole('link', { name: 'See how it works' }).click();
  await expect(page.getByRole('heading', { name: 'From blank grid to game night in three steps.' })).toBeInViewport();
  const explore = page.getByRole('button', { name: 'Explore a sample map' }).first();
  await explore.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Choose a sample', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(explore).toBeFocused();
  await page.getByRole('button', { name: 'Create a map' }).first().click();
  await expect(page.getByRole('button', { name: 'Start blank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.deepEqual(await records(page), before, 'Exploring and cancelling must leave stored projects intact');
  await page.getByRole('navigation', { name: 'Welcome' }).getByRole('button', { name: 'Your maps' }).click();
  await expect(page.getByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('view'), 'library');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Welcome', exact: true }).click();
  await expect(title).toBeVisible();
  await page.getByRole('button', { name: 'Explore a sample map' }).first().click();
  await page.getByRole('button', { name: 'Preview map', exact: true }).click();
  await page.getByRole('button', { name: 'Use this map', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved on this device' }).waitFor();
  await page.getByRole('button', { name: 'Your maps', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Your maps', exact: true })).toBeVisible();
  await expect(title).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.project-library').evaluate(element => { element.scrollTop = 0; });
    await expect(page.getByRole('button', { name: 'Continue last map', exact: true })).toBeInViewport();
    assert.equal(await page.locator('.project-library').evaluate(element => element.scrollWidth > element.clientWidth), false);
  }
  await page.getByRole('button', { name: 'Continue last map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Your maps', exact: true })).toBeVisible();
  return { welcome: 'first visit lands on Welcome; responsive; images load; offline control mounted',
    creation: 'sample and create paths reachable without altering projects until accepted',
    returning: 'Your maps opens for returning users and ?view=library; Welcome stays one click away' };
}
