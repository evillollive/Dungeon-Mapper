import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function publisherStaticFiles(base: string) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../dist');
  if (!existsSync(join(root, 'index.html'))) throw new Error('Build the local publisher client with npm run build:publisher before starting it.');
  const rootStat = lstatSync(root), manifestStat = lstatSync(join(root, '.vite/manifest.json'));
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !manifestStat.isFile() || manifestStat.isSymbolicLink()) {
    throw new Error('Publisher build roots and manifests must be ordinary files/directories.');
  }
  const types: Record<string, string> = {
    js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
    html: 'text/html; charset=utf-8', svg: 'image/svg+xml', png: 'image/png',
    woff: 'font/woff', woff2: 'font/woff2',
  };
  const files = new Map<string, { type: string; bytes: Buffer }>();
  function collect(directory: string, prefix = ''): void {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('Publisher build assets must not be symbolic links.');
      if (name === '.vite') continue;
      if (stat.isDirectory()) collect(path, prefix + name + '/');
      else {
        const type = types[name.split('.').at(-1) ?? ''];
        if (!stat.isFile() || !type) throw new Error('Unexpected publisher build asset.');
        const key = prefix + name === 'index.html' ? base : base + prefix + name;
        files.set(key, { type, bytes: readFileSync(path) });
      }
    }
  }
  collect(root);
  const manifest: unknown = JSON.parse(readFileSync(join(root, '.vite/manifest.json'), 'utf8'));
  if (!manifest || typeof manifest !== 'object' || !('index.html' in manifest)) throw new Error('Publisher build manifest is invalid.');
  const entry = manifest['index.html'];
  if (!entry || typeof entry !== 'object' || !('css' in entry) || !Array.isArray(entry.css) ||
      !entry.css.length || entry.css.some(path => typeof path !== 'string' || !files.has(base + path))) {
    throw new Error('Publisher stylesheet manifest is invalid.');
  }
  return { files, stylePaths: entry.css.map((path: string) => base + path) };
}
