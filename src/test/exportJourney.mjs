export async function downloadExportText(page, kind) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
  if (kind === 'backup') await dialog.getByRole('button', { name: /Back up project/ }).click();
  else await dialog.getByLabel('Format', { exact: true }).selectOption('svg');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: kind === 'backup' ? 'Download private backup' : 'Export SVG', exact: true }).click(),
  ]);
  let text = '';
  for await (const chunk of await download.createReadStream()) text += chunk.toString();
  await dialog.getByRole('button', { name: 'Close Export', exact: true }).click();
  return text;
}
