import type { DungeonMap, Token } from '../types/map';
import type { TileBounds } from './canvasGeometry';
import { ICON_BY_ID } from './iconLibrary';
import { FOLIO_TOKEN_BY_ID } from '../assets/folio-tokens-v1/catalog';

export const MAX_TOKEN_PAINT_BOXES = 2048;

export interface TokenPaintFrame {
  map: DungeonMap;
  inputs: object;
  state: readonly unknown[];
  canvas: object;
  width: number;
  height: number;
  dpr: number;
  eligible: boolean;
  draggingTokenId: number | null;
  selectedTokenId: number | null;
}

export interface TokenDamage {
  x: number;
  y: number;
  width: number;
  height: number;
  cells: TileBounds;
  tiles: TileBounds;
}

export interface PaintBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function sameRepaintInputs(a: object, b: object, except?: string): boolean {
  const keys = Object.keys(a).filter(key => key !== except);
  return keys.length === Object.keys(b).filter(key => key !== except).length &&
    keys.every(key => Object.hasOwn(b, key) && Object.is(Reflect.get(a, key), Reflect.get(b, key)));
}

export function tokenPaintBounds(token: Token, frame: TokenPaintFrame): PaintBox | null {
  const { meta } = frame.map;
  const size = token.size ?? 1;
  if (![token.x, token.y, size].every(Number.isSafeInteger) || size < 1 || size > 3 ||
      token.x < 0 || token.y < 0 || token.x + size > meta.width || token.y + size > meta.height ||
      !token.icon || (!ICON_BY_ID.has(token.icon) && !FOLIO_TOKEN_BY_ID.has(token.icon))) return null;
  const pixels = meta.tileSize * size;
  const radius = Math.max(pixels / 2, frame.selectedTokenId === token.id
    ? pixels * 0.42 + Math.max(2, pixels * 0.1) + Math.max(2, pixels * 0.12) / 2 : 0);
  const gutter = 2 / frame.dpr;
  const cx = token.x * meta.tileSize + pixels / 2, cy = token.y * meta.tileSize + pixels / 2;
  return { left: cx - radius - gutter, top: cy - radius - gutter,
    right: cx + radius + gutter, bottom: cy + radius + gutter };
}

/** A null plan means the complete existing renderer must run. */
export function tokenRepaintDamage(previous: TokenPaintFrame | null, next: TokenPaintFrame): TokenDamage | null {
  if (!previous?.eligible || !next.eligible || next.draggingTokenId === null ||
      (previous.draggingTokenId !== null && next.draggingTokenId !== previous.draggingTokenId) || next.canvas !== previous.canvas ||
      next.width !== previous.width || next.height !== previous.height || next.dpr !== previous.dpr ||
      next.selectedTokenId !== previous.selectedTokenId ||
      !sameRepaintInputs(previous.inputs, next.inputs) ||
      previous.state.length !== next.state.length || previous.state.some((value, i) => !Object.is(value, next.state[i])) ||
      !sameRepaintInputs(previous.map, next.map, 'tokens')) return null;
  if (![next.width, next.height].every(value => Number.isSafeInteger(value) && value > 0) ||
      !Number.isFinite(next.dpr) || next.dpr <= 0 || !Number.isFinite(next.map.meta.tileSize) ||
      next.map.meta.tileSize < 8 || !Number.isInteger(next.map.meta.tileSize * next.dpr)) return null;
  const before = previous.map.tokens, after = next.map.tokens;
  if (!before || !after || before.length !== after.length) return null;
  let moved: { before: Token; after: Token } | null = null;
  for (let i = 0; i < before.length; i++) {
    const a = before[i], b = after[i];
    if (a.id !== b.id) return null;
    if (a === b) continue;
    const { x: ax, y: ay, ...otherA } = a, { x: bx, y: by, ...otherB } = b;
    if (!sameRepaintInputs(otherA, otherB)) return null;
    if (ax === bx && ay === by) continue;
    if (moved || b.id !== next.draggingTokenId) return null;
    moved = { before: a, after: b };
  }
  if (!moved) return null;
  const a = tokenPaintBounds(moved.before, previous), b = tokenPaintBounds(moved.after, next);
  if (!a || !b) return null;
  const size = next.map.meta.tileSize;
  const minX = Math.max(0, Math.floor(Math.min(a.left, b.left) / size));
  const minY = Math.max(0, Math.floor(Math.min(a.top, b.top) / size));
  const maxX = Math.min(next.map.meta.width, Math.ceil(Math.max(a.right, b.right) / size));
  const maxY = Math.min(next.map.meta.height, Math.ceil(Math.max(a.bottom, b.bottom) / size));
  return damageFromCells({ minX, minY, maxX, maxY }, next);
}

function damageFromCells(cells: TileBounds, next: TokenPaintFrame): TokenDamage | null {
  const { minX, minY, maxX, maxY } = cells;
  const size = next.map.meta.tileSize;
  const x = Math.floor(minX * size * next.dpr), y = Math.floor(minY * size * next.dpr);
  const right = Math.min(next.width, Math.ceil(maxX * size * next.dpr));
  const bottom = Math.min(next.height, Math.ceil(maxY * size * next.dpr));
  const width = right - x, height = bottom - y;
  if (width <= 0 || height <= 0 || width * height > next.width * next.height * 0.25) return null;
  return {
    x, y, width, height, cells,
    tiles: { minX: Math.max(0, minX - 1), minY: Math.max(0, minY - 1),
      maxX: Math.min(next.map.meta.width, maxX + 1), maxY: Math.min(next.map.meta.height, maxY + 1) },
  };
}

/** Include complete overlapping artwork, or fall back when closure grows too large. */
export function expandTokenDamage(damage: TokenDamage, boxes: readonly PaintBox[] | null, frame: TokenPaintFrame): TokenDamage | null {
  if (!boxes || boxes.length > MAX_TOKEN_PAINT_BOXES) return null;
  const size = frame.map.meta.tileSize, pad = 2 / frame.dpr;
  if (!Number.isInteger(size * frame.dpr)) return null;
  let cells = { ...damage.cells };
  for (let pass = 0; pass < 16; pass++) {
    // Preserve native canvas-edge clipping rather than clipping those primitives twice.
    if (cells.minX === 0 || cells.minY === 0 ||
        cells.maxX === frame.map.meta.width || cells.maxY === frame.map.meta.height ||
        !damageFromCells(cells, frame)) return null;
    let changed = false;
    for (const box of boxes) {
      if (![box.left, box.top, box.right, box.bottom].every(Number.isFinite) ||
          box.right < box.left || box.bottom < box.top) return null;
      if (box.right + pad < cells.minX * size || box.left - pad > cells.maxX * size ||
          box.bottom + pad < cells.minY * size || box.top - pad > cells.maxY * size) continue;
      const next = {
        minX: Math.max(0, Math.min(cells.minX, Math.floor((box.left - pad) / size))),
        minY: Math.max(0, Math.min(cells.minY, Math.floor((box.top - pad) / size))),
        maxX: Math.min(frame.map.meta.width, Math.max(cells.maxX, Math.ceil((box.right + pad) / size))),
        maxY: Math.min(frame.map.meta.height, Math.max(cells.maxY, Math.ceil((box.bottom + pad) / size))),
      };
      if (!sameRepaintInputs(cells, next)) {
        cells = next;
        changed = true;
        if (!damageFromCells(cells, frame)) return null;
      }
    }
    if (!changed) return damageFromCells(cells, frame);
  }
  return null;
}
