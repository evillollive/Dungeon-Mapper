import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const srcRoot = join(repoRoot, 'src');

const auditedModules = [
  { path: 'src/components/MapCanvas.tsx', maxLines: 3400 },
  { path: 'src/components/MobileToolbar.tsx', maxLines: 700 },
  { path: 'src/hooks/useMapState.ts', maxLines: 1400 },
] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === '__tests__' || entry === 'test') return [];
      return sourceFiles(fullPath);
    }
    if (!['.ts', '.tsx'].includes(extname(entry))) return [];
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx') || entry.endsWith('.spec.ts') || entry.endsWith('.spec.tsx')) return [];
    return [fullPath];
  });
}

function lineCount(source: string): number {
  return source.trimEnd().split('\n').length;
}

describe('Phase 12.2 codebase audit guardrails', () => {
  it('keeps audited god-module candidates under their current size budgets', () => {
    const failures = auditedModules.flatMap(module => {
      const source = readFileSync(join(repoRoot, module.path), 'utf8');
      const lines = lineCount(source);
      return lines <= module.maxLines ? [] : `${module.path}: ${lines}/${module.maxLines}`;
    });

    expect(failures).toEqual([]);
  });

  it('keeps production sources free of explicit any annotations', () => {
    const explicitAny = /(:\s*any\b|\bas\s+any\b|<any>)/;
    const offenders = sourceFiles(srcRoot).flatMap(file => {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      return explicitAny.test(source) ? [relative(repoRoot, file)] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('does not reintroduce embedded mobile toolbar CSS dead code', () => {
    const source = readFileSync(join(repoRoot, 'src/components/MobileToolbar.tsx'), 'utf8');

    expect(source).not.toContain('MOBILE_TOOLBAR_CSS');
    expect(source).not.toContain('/* ===== Mobile Toolbar');
  });
});
