// Execute this function with Playwright MCP browser_run_code_unsafe(filename).
// Start the repository Vite server on 5187 first. Uses only bundled sample data.
async (page) => {
  const base = 'http://127.0.0.1:5187/Dungeon-Mapper/';
  const output = 'docs/media/ux-00/';
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p = await context.newPage();
  const results = { browser: browser.version(), viewport: [1440, 900], baseline: [], prototype: [], layouts: [] };
  try {
    // Fresh context for the baseline, then two reloads of that context.
    for (let i = 0; i < 3; i++) {
      await p.goto(base);
      await p.waitForLoadState('networkidle');
      if (i === 0) await p.screenshot({ path: output + 'before-desktop.png', scale: 'css' });
      const start = Date.now();
      await p.getByRole('button', { name: 'Open Generate Hub', exact: true }).click();
      await p.getByRole('tab', { name: /Sample Maps/ }).click();
      await p.getByRole('button', { name: 'Load Sample', exact: true }).click();
      await p.waitForFunction(() => document.querySelector('input[aria-label="Map name"]').value === 'The Sunken Crypt');
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      results.baseline.push(Date.now() - start);
    }
    await p.screenshot({ path: output + 'before-sample.png', scale: 'css' });
    await p.getByRole('button', { name: 'Switch to Present mode' }).click();
    await p.screenshot({ path: output + 'before-present.png', scale: 'css' });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({ path: output + 'before-mobile-present.png', scale: 'css' });
    await p.setViewportSize({ width: 1440, height: 900 });

    const prototype = base + 'docs/prototypes/ux-00/';
    for (let i = 0; i < 3; i++) {
      await p.goto(prototype);
      await p.waitForLoadState('networkidle');
      const start = Date.now();
      await p.getByRole('button', { name: 'Open a sample', exact: true }).click();
      await p.getByRole('button', { name: 'Use The Sunken Crypt sample', exact: true }).click();
      await p.getByRole('heading', { name: 'Edit', exact: true }).waitFor();
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      results.prototype.push(Date.now() - start);
    }
    for (const route of ['library', 'edit', 'run', 'player']) {
      await p.getByRole('combobox', { name: 'Screen', exact: true }).selectOption(route);
      for (const scenario of ['normal', 'empty', 'error']) {
        await p.getByRole('combobox', { name: 'Scenario', exact: true }).selectOption(scenario);
        await p.screenshot({ path: output + `after-${route}${scenario === 'normal' ? '' : '-' + scenario}.png`, scale: 'css' });
        if (route === 'player' && scenario !== 'normal' && await p.locator('canvas').count()) {
          throw new Error('Neutral player states must not render a sample map');
        }
      }
    }
    for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [1024, 768], [1440, 900]]) {
      await p.setViewportSize({ width, height });
      for (const route of ['library', 'edit', 'run', 'player']) {
        await p.getByRole('combobox', { name: 'Screen', exact: true }).selectOption(route);
        await p.getByRole('combobox', { name: 'Scenario', exact: true }).selectOption('normal');
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        results.layouts.push({ width, height, route, overflow });
        if (overflow) throw new Error(`Page overflow: ${route}, ${width} x ${height}`);
      }
      if (width === 390) await p.screenshot({ path: output + 'after-mobile-player.png', scale: 'css' });
    }
    await p.getByRole('combobox', { name: 'Screen', exact: true }).selectOption('run');
    await p.getByRole('button', { name: 'Pause display', exact: true }).click();
    await p.getByRole('button', { name: 'Open player preview', exact: true }).click();
    if (await p.locator('canvas').count()) throw new Error('Paused player preview must be blank');
    await p.screenshot({ path: output + 'after-player-paused.png', scale: 'css' });
    return results;
  } finally {
    await context.close();
  }
}
