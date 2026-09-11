// Callable with a Page on the production Pages base path. Uses an isolated
// context and the real sample, save, theme and preview controls.
export default async function runArtJourney(page) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const base = `${page.url().split('/Dungeon-Mapper/')[0]}/Dungeon-Mapper/`;
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const tab = await context.newPage();
    tab.setDefaultTimeout(15000);
    await tab.goto(base);
    await tab.getByRole('button', { name: 'Open a sample', exact: true }).click();
    await tab.getByRole('combobox').selectOption('folio-cistern');
    await tab.getByRole('button', { name: 'Preview map', exact: true }).click();
    await tab.getByRole('button', { name: 'Use this map', exact: true }).click();
    await tab.getByText('Saved on this device', { exact: true }).waitFor();
    await tab.getByRole('button', { name: 'Look', exact: true }).click();
    assert(await tab.getByText('Dungeon Folio 1.0.0', { exact: true }).isVisible(), 'Pinned pack details missing');
    await tab.reload();
    await tab.getByRole('button', { name: 'Look', exact: true }).click();
    assert(await tab.getByTitle('Map theme', { exact: true }).inputValue() === 'dungeon-folio-v1', 'Pack did not survive reload');
    await tab.screenshot({ path: 'docs/media/ux07/editor.png' });
    const pointerFrames = await tab.evaluate(async () => {
      const canvas = document.querySelector('canvas[role="application"]');
      const bounds = canvas.getBoundingClientRect();
      const times = [];
      for (let i = 0; i < 32; i++) {
        const start = performance.now();
        canvas.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 0,
          clientX: bounds.x + 80 + i * 4, clientY: bounds.y + 120,
        }));
        await new Promise(requestAnimationFrame);
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      return { medianMs: times[16], p95Ms: times[30], maxMs: times[31], samples: times.length };
    });
    await tab.getByRole('button', { name: 'Player preview', exact: true }).click();
    const playerText = await tab.locator('body').innerText();
    assert(!playerText.includes('Cistern sentinel') && !playerText.includes('A key rests'), 'Player text exposed private content');
    await tab.screenshot({ path: 'docs/media/ux07/player.png' });
    await tab.setViewportSize({ width: 390, height: 844 });
    await tab.screenshot({ path: 'docs/media/ux07/player-phone.png' });
    return { browser: context.browser().version(), sample: 'folio-cistern', savedVersion: 'dungeon-folio-v1', pointerFrames, passed: true };
  } finally {
    await context.close();
  }
}
