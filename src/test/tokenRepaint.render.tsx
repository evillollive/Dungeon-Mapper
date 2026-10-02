import React, { createRef, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import MapCanvas, { type MapCanvasHandle } from '../components/MapCanvas';
import { createDefaultMap } from '../hooks/mapStateUtils';
import type { CustomThemeDefinition, DungeonMap, StampDef, Tile } from '../types/map';
import { FOLIO_THEME_ID } from '../themes/folio-v1/art';

const EMPTY_THEMES: CustomThemeDefinition[] = [];
const EMPTY_STAMPS: readonly StampDef[] = [];
const noop = () => {};
const noToken = () => null;
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function fixture(size: number, fog: boolean, text: boolean, tileSize: number): DungeonMap {
  const map = createDefaultMap('Token repaint proof');
  map.meta = { ...map.meta, theme: FOLIO_THEME_ID, width: 24, height: 24, tileSize };
  map.tiles = Array.from({ length: 24 }, (_, y) => Array.from({ length: 24 }, (_, x): Tile => ({
    type: x === 0 || y === 0 || x === 23 || y === 23 ? 'wall'
      : x >= 17 && y >= 4 && y <= 8 ? 'water' : 'floor',
    ...(x < 8 ? { floorMaterial: 'folio-worn-wood-v1' } : x > 15 ? { floorMaterial: 'folio-earth-v1' } : {}),
  })));
  map.tokens = [
    { id: 1, x: 4, y: 5, kind: 'player', size, label: 'Scout', icon: text ? 'TEXT' : 'warrior' },
    { id: 2, x: 7, y: 5, kind: 'monster', size: 2, label: 'Overlap', icon: 'folio-token-v1-brute' },
  ];
  map.notes = [{ id: 1, x: 5, y: 5, label: 'Under token', description: 'Private synthetic note' }];
  map.stamps = [
    { id: 1, stampId: 'folio-furnishings-v1-chair', x: 4, y: 5, rotation: 45, scale: 2, opacity: 0.6, flipX: false, flipY: false, locked: false },
    { id: 2, stampId: 'folio-furnishings-v1-barrel', x: 7, y: 5, rotation: 0, scale: 1.5, opacity: 1, flipX: false, flipY: false, locked: false },
  ];
  map.lightSources = [{ id: 1, x: 5, y: 6, radius: 4, color: '#f97316', label: 'Lantern' }];
  map.wallSegments = [{ id: 1, points: [{ x: 3, y: 4 }, { x: 10, y: 7 }], color: '#293330', thickness: 0.1 }];
  map.pathSegments = [{ id: 1, points: [{ x: 3, y: 8 }, { x: 10, y: 5 }], color: '#8b7355', width: 0.3 }];
  map.rivers = [{ id: 1, controlPoints: [{ x: 20, y: 1 }, { x: 20, y: 22 }],
    width: 1, type: 'water', flowDirection: 90 }];
  map.roomShapes = [{ id: 1, x: 14, y: 14, width: 6, height: 5, shapeType: 'circle', fillTile: 'floor' }];
  map.fogEnabled = fog;
  map.fog = map.tiles.map(row => row.map(() => true));
  map.paperTexture = { enabled: true, pattern: 'parchment', opacity: 0.6, grain: 0.3, vignette: 0.25 };
  map.edgeBlend = { enabled: true, style: 'dither', intensity: 0.35, opacity: 0.6 };
  map.lightingAtmosphere = { enabled: true, aoIntensity: 0.4, aoRadius: 0.35,
    stampShadowOpacity: 0.3, stampShadowOffset: 0.1, colorGrading: 'none', colorGradingIntensity: 0.25, opacity: 0.8 };
  return map;
}

export async function mountTokenRepaintProof(size = 1, fog = false, text = false, omitStamps = false, tileSize = 24) {
  const map = fixture(size, fog, text, tileSize);
  if (omitStamps) map.stamps = [];
  const stats = {
    candidate: { full: 0, partial: 0 },
    reference: { full: 0, partial: 0 },
  };
  const refs = { candidate: createRef<MapCanvasHandle>(), reference: createRef<MapCanvasHandle>() };
  const commits: { candidate: DungeonMap; reference: DungeonMap } = { candidate: map, reference: map };
  const hosts = (['candidate', 'reference'] as const).map(mode => {
    const host = document.createElement('div');
    host.dataset.proof = mode;
    document.body.append(host);
    return { host, root: createRoot(host) };
  });
  const modeOf = (canvas: HTMLCanvasElement) => canvas.getAttribute('role') === 'application'
    ? canvas.closest<HTMLElement>('[data-proof]')?.dataset.proof : undefined;
  const width = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')!;
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  const inStack = new WeakSet<HTMLCanvasElement>();
  const count = (canvas: HTMLCanvasElement, kind: 'full' | 'partial') => {
    const mode = modeOf(canvas);
    if ((mode !== 'candidate' && mode !== 'reference') || inStack.has(canvas)) return;
    stats[mode][kind]++;
    inStack.add(canvas);
    queueMicrotask(() => inStack.delete(canvas));
  };
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
    ...width, set(value) {
      width.set!.call(this, value);
      count(this, 'full');
    },
  });
  CanvasRenderingContext2D.prototype.fillRect = function (...args) {
    count(this.canvas, 'partial');
    fill.apply(this, args);
  };

  function View({ mode }: { mode: keyof typeof refs }) {
    const [source, setSource] = useState(map);
    const [, refresh] = useState(0);
    const move = useCallback((id: number, x: number, y: number) => setSource(current => ({
      ...current, tokens: current.tokens!.map(token => token.id === id ? { ...token, x, y } : token),
    })), []);
    commits[mode] = source;
    return <div onPointerMoveCapture={() => { if (mode === 'reference') refresh(value => value + 1); }}>
      <MapCanvas ref={refs[mode]} map={source} viewportKey={`proof:${mode}`}
        activeTool="move-token" activeTile="floor" themeId={FOLIO_THEME_ID}
        customThemes={EMPTY_THEMES} customStamps={EMPTY_STAMPS} printMode={false} viewMode="gm" gmShowFog={fog}
        selectedNoteId={null} selectedTokenId={1} drawColor="#000000" drawWidth={2} gmDrawColor="#000000" gmDrawWidth={2}
        onSetTile={noop} onSetTiles={noop} onFillTile={noop} onAddNote={noop} onSelectNote={noop}
        onEraseTiles={noop} onSetFogCells={noop} onAddToken={noToken}
        onMoveToken={mode === 'reference' ? (id, x, y) => move(id, x, y) : move}
        onRemoveToken={noop} onAddAnnotation={noop} onRemoveAnnotation={noop}
        onAddMarker={noToken} onRemoveMarker={noop} markerShape="circle" markerColor="#ff0000" markerSize={1}
        lightSources={source.lightSources} />
    </div>;
  }
  flushSync(() => hosts.forEach(({ root }, index) => root.render(<View mode={index === 0 ? 'candidate' : 'reference'} />)));
  await frame();
  for (const ref of Object.values(refs)) {
    const canvas = ref.current!.getCanvas()!;
    // Synthetic events are for pixel comparison only; production journeys use native input.
    canvas.setPointerCapture = noop;
    canvas.releasePointerCapture = noop;
    canvas.hasPointerCapture = () => false;
  }
  const pointer = async (type: string, x: number, y: number) => {
    for (const mode of ['candidate', 'reference'] as const) {
      const canvas = refs[mode].current!.getCanvas()!, box = canvas.getBoundingClientRect();
      canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        clientX: box.x + (x + 0.5) * box.width / 24, clientY: box.y + (y + 0.5) * box.height / 24,
      }));
    }
    await frame();
  };
  return {
    pointer,
    compare: () => {
      const a = refs.candidate.current!.getCanvas()!, b = refs.reference.current!.getCanvas()!;
      if (a.width !== b.width || a.height !== b.height) throw new Error('Reference dimensions differ');
      const left = a.getContext('2d')!.getImageData(0, 0, a.width, a.height).data;
      const right = b.getContext('2d')!.getImageData(0, 0, b.width, b.height).data;
      let maximum = 0, alpha = 0, total = 0;
      let worst = null;
      const changed = { minX: a.width, minY: a.height, maxX: -1, maxY: -1 };
      for (let i = 0; i < left.length; i++) {
        const delta = Math.abs(left[i] - right[i]);
        if (delta > 0) {
          const pixel = Math.floor(i / 4), x = pixel % a.width, y = Math.floor(pixel / a.width);
          changed.minX = Math.min(changed.minX, x); changed.minY = Math.min(changed.minY, y);
          changed.maxX = Math.max(changed.maxX, x); changed.maxY = Math.max(changed.maxY, y);
          if (delta > maximum) worst = { x, y, actual: Array.from(left.slice(pixel * 4, pixel * 4 + 4)),
            expected: Array.from(right.slice(pixel * 4, pixel * 4 + 4)) };
        }
        maximum = Math.max(maximum, delta);
        if (i % 4 === 3) alpha = Math.max(alpha, delta);
        total += delta;
      }
      const state = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!;
        return { alpha: ctx.globalAlpha, composite: ctx.globalCompositeOperation,
          transform: Array.from(ctx.getTransform().toFloat64Array()), cap: ctx.lineCap, join: ctx.lineJoin,
          width: ctx.lineWidth, fill: ctx.fillStyle, stroke: ctx.strokeStyle };
      };
      return { maximum, alpha, mean: total / left.length, changed, worst, stats: structuredClone(stats),
        paintState: { candidate: state(a), reference: state(b) },
        nativeTilePitch: a.getContext('2d')!.getTransform().a * map.meta.tileSize,
        dimensions: { width: a.width, height: a.height },
        committed: { candidate: commits.candidate.tokens![0], reference: commits.reference.tokens![0] } };
    },
    dispose: () => {
      flushSync(() => hosts.forEach(({ root }) => root.unmount()));
      hosts.forEach(({ host }) => host.remove());
      Object.defineProperty(HTMLCanvasElement.prototype, 'width', width);
      CanvasRenderingContext2D.prototype.fillRect = fill;
    },
  };
}
