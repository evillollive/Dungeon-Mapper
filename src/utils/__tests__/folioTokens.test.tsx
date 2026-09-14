import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FOLIO_TOKENS, FOLIO_TOKEN_MANIFEST } from '../../assets/folio-tokens-v1/catalog';
import { FOLIO_TOKEN_FRAMES, FOLIO_TOKEN_INK, FOLIO_TOKEN_PAPER, drawFolioToken, folioTokenPaths, folioTokenSVG } from '../folioTokenRender';
import { ICONS, ICON_BY_ID } from '../iconLibrary';
import { buildFolioTokenReference, FOLIO_TOKEN_REFERENCE_ID,
  buildFolioTokenCatalogReference, FOLIO_TOKEN_CATALOG_ID } from '../folioTokenReference';
import { buildFolioFurnishingReference } from '../folioFurnishingReference';
import { buildPremadeProject } from '../premadeMaps';
import { decodeProject, encodeProject } from '../projectSchema';
import { projectForAudience } from '../audienceProjection';
import { buildMapSVG } from '../export';
import { getTheme } from '../../themes';
import { contrastRatio, parseHexColor } from '../accessibility';
import IconPicker from '../../components/IconPicker';
import InitiativePanel from '../../components/InitiativePanel';
import type { TokenKind } from '../../types/map';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const kinds: TokenKind[] = ['player', 'npc', 'monster'];

describe('Folio token catalog', () => {
  it('registers twelve original versioned silhouettes, with matching editable SVG sources', () => {
    expect(FOLIO_TOKENS).toHaveLength(12);
    expect(new Set(ICONS.map(icon => icon.id)).size).toBe(ICONS.length);
    const sources = FOLIO_TOKEN_MANIFEST.assets.map(asset => {
      const source = readFileSync(asset.source, 'utf8');
      expect(asset.sourceHash).toBe(`sha256:${createHash('sha256').update(source).digest('hex')}`);
      const svg = new DOMParser().parseFromString(source, 'image/svg+xml');
      expect(svg.querySelector('parsererror')).toBeNull();
      expect(svg.documentElement.getAttribute('viewBox')).toBe(asset.viewBox);
      expect(svg.querySelector('path')?.getAttribute('d')).toBe(ICON_BY_ID.get(asset.id)?.path);
      expect(svg.querySelector('path')?.getAttribute('fill-rule')).toBe('evenodd');
      expect(source).not.toMatch(/<script|<image|onload|href=/);
      return source;
    });
    expect(gzipSync(sources.slice(0, 3).join('')).byteLength).toBeLessThan(2048);
    expect(gzipSync(sources.join('')).byteLength).toBeLessThan(6 * 1024);
    expect(FOLIO_TOKEN_MANIFEST.license).toBe('AGPL-3.0-or-later');
  });

  it('preserves unaffected approved sources and gives every character one short sentence', () => {
    expect(FOLIO_TOKEN_MANIFEST.assets.filter(asset => asset.id === 'folio-token-v1-wayfinder').map(asset => asset.sourceHash)).toEqual([
      'sha256:8a1ea6841143bbcc55395f8c78cbee72822f29c1adf423be093126e339806e61',
    ]);
    expect(FOLIO_TOKENS.slice(0, 3).map(icon => icon.blurb)).toEqual([
      'Brings a shield to every argument.', 'Definitely knows a shortcut.', 'Small token, big fire hazard.',
    ]);
    for (const icon of FOLIO_TOKENS) {
      expect(icon.blurb).toMatch(/^[^.!?]+[.]$/);
      expect(icon.blurb.split(/\s+/).length).toBeLessThanOrEqual(10);
      expect(kinds).toContain(icon.previewKind);
    }
    for (const icon of FOLIO_TOKENS.slice(0, 3)) {
      expect(folioTokenPaths({ icon: icon.id, kind: icon.previewKind })![2].transform)
        .toEqual({ x: 87.04, y: 92.16, scale: 0.66 });
    }
  });

  it('keeps affiliation independent of silhouette, with three distinct outlines and marks in print', () => {
    expect(new Set(kinds.map(kind => FOLIO_TOKEN_FRAMES[kind].outline)).size).toBe(3);
    expect(new Set(kinds.map(kind => FOLIO_TOKEN_FRAMES[kind].mark)).size).toBe(3);
    for (const icon of FOLIO_TOKENS) for (const kind of kinds) {
      const paths = folioTokenPaths({ icon: icon.id, kind })!;
      const print = folioTokenPaths({ icon: icon.id, kind, color: '#ff00ff' }, true)!;
      expect(paths.map(path => path.path)).toEqual(print.map(path => path.path));
      expect(paths[2].path).toBe(icon.path);
      expect(print.every(path => ['#000000', '#ffffff'].includes(path.fill))).toBe(true);
      expect(print.filter(path => path.stroke).every(path => path.stroke === '#000000')).toBe(true);
    }
    expect(contrastRatio(parseHexColor(FOLIO_TOKEN_INK)!, parseHexColor(FOLIO_TOKEN_PAPER)!)).toBeGreaterThan(12);
    const paths = FOLIO_TOKENS.flatMap(icon => kinds.flatMap(kind =>
      folioTokenPaths({ icon: icon.id, kind })!.map(path => path.path)));
    expect(new Set(paths).size).toBe(21);
  });

  it('adds a fresh full-catalog sample without changing the original three-token reference', () => {
    const original = buildFolioTokenReference();
    expect(original.levels[0].tokens).toHaveLength(4);
    expect(original.levels[0].tokens!.slice(0, 3).map(token => [token.icon, token.x, token.y])).toEqual([
      ['folio-token-v1-warden', 6, 11], ['folio-token-v1-wayfinder', 8, 5], ['folio-token-v1-drake', 10, 8],
    ]);
    const project = buildPremadeProject(FOLIO_TOKEN_CATALOG_ID);
    expect(project).toEqual(buildFolioTokenCatalogReference());
    expect(decodeProject(encodeProject(project))).toEqual(project);
    const map = project.levels[0];
    const visible = projectForAudience(map).map.tokens!;
    expect(visible).toHaveLength(12);
    expect(new Set(visible.map(token => token.icon))).toEqual(new Set(FOLIO_TOKENS.map(icon => icon.id)));
    expect(new Set(visible.map(token => `${token.x},${token.y}`)).size).toBe(12);
    expect(visible.every(token => map.tiles[token.y][token.x].type === 'floor')).toBe(true);
    expect(visible.some(token => token.label === 'Hidden lookout')).toBe(false);
    map.tokens![0].x = 0;
    expect(buildFolioTokenReference()).toEqual(original);
    expect(buildFolioTokenCatalogReference().levels[0].tokens![0].x).toBe(10);
  });

  it('keeps existing tokens and samples unchanged and does not reinterpret unknown IDs', () => {
    for (const icon of ['warrior', 'wolf', 'X', '', 'folio-token-v9-warden']) {
      expect(folioTokenPaths({ icon, kind: 'player' })).toBeNull();
      const ctx = document.createElement('canvas').getContext('2d')!;
      const save = vi.spyOn(ctx, 'save');
      expect(drawFolioToken(ctx, { id: 1, x: 0, y: 0, kind: 'player', label: 'Old', icon }, 32)).toBe(false);
      expect(save).not.toHaveBeenCalled();
      save.mockRestore();
    }
    expect(buildFolioFurnishingReference().levels[0].tokens?.map(token => token.icon)).toEqual(['warrior', 'rogue']);
    expect(ICON_BY_ID.get('warrior')?.category).toBe('Characters');
  });

  it('round-trips the opt-in sample, kind, size and custom color without mutating the furnished source', () => {
    const original = buildFolioFurnishingReference();
    const project = buildPremadeProject(FOLIO_TOKEN_REFERENCE_ID);
    project.levels[0].tokens![0].color = '#123456';
    project.levels[0].tokens![2].size = 2;
    expect(decodeProject(encodeProject(project))).toEqual(project);
    expect(buildFolioFurnishingReference()).toEqual(original);
    expect(project.levels[0].stamps).toEqual(original.levels[0].stamps);
    expect(folioTokenPaths(project.levels[0].tokens![0])![0].fill).toBe('#123456');
  });

  it('excludes private and partly fogged Folio tokens from projection and SVG', () => {
    const map = buildFolioTokenReference().levels[0];
    const visible = projectForAudience(map).map.tokens!;
    expect(visible).toHaveLength(3);
    expect(visible.some(token => token.label === 'Hidden lookout')).toBe(false);
    map.tokens![2].size = 2;
    map.fog![9][11] = true;
    const svg = buildMapSVG(map, getTheme(map.meta.theme), undefined, { viewMode: 'player' });
    expect(projectForAudience(map).map.tokens).toHaveLength(2);
    expect(svg).toContain(FOLIO_TOKENS[0].path);
    expect(svg).not.toContain(FOLIO_TOKENS[2].path);
  });

  it('uses the same normalized geometry in canvas and SVG for multi-cell tokens and sanitizes paints', () => {
    const token = { ...buildFolioTokenReference().levels[0].tokens![0], x: 3, y: 4, size: 2 };
    const ctx = document.createElement('canvas').getContext('2d')!;
    const scale = vi.spyOn(ctx, 'scale');
    const translate = vi.spyOn(ctx, 'translate');
    const fill = vi.spyOn(ctx, 'fill');
    expect(drawFolioToken(ctx, token, 32)).toBe(true);
    expect(translate).toHaveBeenNthCalledWith(1, 96, 128);
    expect(scale).toHaveBeenNthCalledWith(1, 64 / 512, 64 / 512);
    expect(fill).toHaveBeenCalledTimes(4);
    expect(fill.mock.calls.every(call => call[1] === 'evenodd')).toBe(true);
    for (const path of folioTokenPaths(token)!) expect(folioTokenSVG(token)).toContain(path.path);
    for (const color of ['url(https://example.test/a)', '"><script>bad</script>']) {
      const svg = folioTokenSVG({ ...token, color })!;
      expect(svg).not.toContain(color);
      expect(svg).toContain(FOLIO_TOKEN_FRAMES.player.color);
    }
  });

  it('offers searchable opt-in artwork with the pending token affiliation and leaves cancellation untouched', () => {
    const select = vi.fn();
    const cancel = vi.fn();
    render(<IconPicker open kind="monster" onSelect={select} onCancel={cancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Folio tokens', exact: true }));
    expect(screen.getByText(/Hostile hexagon/)).toBeInTheDocument();
    for (const icon of FOLIO_TOKENS) expect(screen.getByRole('button', { name: icon.name, exact: true })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search icons' }), { target: { value: 'warden' } });
    const button = screen.getByRole('button', { name: 'Folio Warden', exact: true });
    expect(button.querySelector('path')?.getAttribute('d')).toBe(FOLIO_TOKEN_FRAMES.monster.outline);
    fireEvent.click(button);
    expect(select).toHaveBeenCalledWith('folio-token-v1-warden');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('keeps the complete frame visible in initiative without replacing the token label or selection state', () => {
    const token = buildFolioTokenReference().levels[0].tokens![0];
    render(<InitiativePanel tokens={[token]} initiative={[token.id]} selectedTokenId={token.id}
      onSelectToken={vi.fn()} onRenameToken={vi.fn()} onReorder={vi.fn()} onClear={vi.fn()} viewMode="gm" />);
    const button = screen.getByRole('button', { name: /Vera the Warden, position/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.querySelector('svg')?.getAttribute('width')).toBe('32');
    expect(button.querySelector('path')?.getAttribute('d')).toBe(FOLIO_TOKEN_FRAMES.player.outline);
  });
});
