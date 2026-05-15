import type { River, RiverBankType, RiverEndpointMarker, RiverType, Tile } from '../types/map';

interface BankPalette {
  sand: string;
  dirt: string;
  rock: string;
  stone: string;
  scorched: string;
}

const DEFAULT_BANK_PALETTE: BankPalette = {
  sand: '#c9a96a',
  dirt: '#7a5a36',
  rock: '#6b7280',
  stone: '#8b8172',
  scorched: '#2f1f1a',
};

const THEME_BANK_PALETTES: Record<string, Partial<BankPalette>> = {
  wilderness: { sand: '#c9b273', dirt: '#6f5a2e', rock: '#6b725a', stone: '#7d806c' },
  dungeon: { sand: '#8b7a55', dirt: '#5b4630', rock: '#56514b', stone: '#625a50' },
  cavern: { sand: '#8b7a55', dirt: '#5b4630', rock: '#56514b', stone: '#625a50' },
  castle: { sand: '#b49a68', dirt: '#6d563c', rock: '#7b7469', stone: '#928875' },
  pirate: { sand: '#d6b56d', dirt: '#6b4a2b', rock: '#5f6870', stone: '#8a7962' },
  desert: { sand: '#d6b66f', dirt: '#9a6b3d', rock: '#9b8062', stone: '#b08d5f' },
  ancient: { sand: '#c9ad72', dirt: '#8b6842', rock: '#9a8868', stone: '#b6a273' },
  oldwest: { sand: '#c99b5a', dirt: '#8a5a2b', rock: '#7c6a55', stone: '#9b8260' },
  moderncity: { sand: '#a99570', dirt: '#5f5547', rock: '#54585f', stone: '#777b80' },
  postapocalypse: { sand: '#9f8359', dirt: '#5d4b39', rock: '#565047', stone: '#6b6255', scorched: '#241915' },
  steampunk: { sand: '#a98b57', dirt: '#5f4428', rock: '#625d54', stone: '#857761' },
  cyberpunk: { sand: '#4c7a88', dirt: '#263f4a', rock: '#394255', stone: '#56606f', scorched: '#140f24' },
  starship: { sand: '#667788', dirt: '#3b4652', rock: '#46505e', stone: '#718093', scorched: '#161b22' },
  alien: { sand: '#92a852', dirt: '#4f6b32', rock: '#566255', stone: '#72825f', scorched: '#1b2214' },
};

const ENDPOINT_LABELS: Record<RiverEndpointMarker, string> = {
  spring: 'S',
  waterfall: 'W',
  cave: 'C',
  delta: 'M',
  'lava-vent': 'V',
  outflow: 'O',
};

export function getRiverBankColor(themeId: string | undefined, bank: RiverBankType, riverType?: RiverType): string {
  const palette = { ...DEFAULT_BANK_PALETTE, ...(themeId ? THEME_BANK_PALETTES[themeId] : undefined) };
  if (riverType === 'lava') return palette.scorched;
  if (riverType === 'underground-stream' && bank !== 'scorched') return palette.rock;
  return palette[bank];
}

export function getRiverEndpointMarker(river: River, endpoint: 'source' | 'mouth'): RiverEndpointMarker {
  if (endpoint === 'source') {
    return river.sourceMarker ?? getDefaultSourceMarker(river.type);
  }
  return river.mouthMarker ?? (river.parentRiverId !== undefined ? 'outflow' : 'delta');
}

function getDefaultSourceMarker(riverType: RiverType): RiverEndpointMarker {
  if (riverType === 'lava') return 'lava-vent';
  if (riverType === 'underground-stream') return 'cave';
  return 'spring';
}

export function drawRiverBanks(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  width: number,
  height: number,
  tileSize: number,
  themeId?: string,
  printMode = false,
): void {
  ctx.save();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y]?.[x];
      if (!tile?.riverBank) continue;
      const inset = Math.max(1, tileSize * 0.14);
      ctx.fillStyle = printMode ? '#d1d5db' : getRiverBankColor(themeId, tile.riverBank, tile.riverBankType);
      ctx.globalAlpha = printMode ? 0.4 : 0.55;
      ctx.fillRect(x * tileSize + inset, y * tileSize + inset, tileSize - inset * 2, tileSize - inset * 2);
    }
  }
  ctx.restore();
}

export function drawRiverEndpointMarkers(
  ctx: CanvasRenderingContext2D,
  rivers: readonly River[],
  tileSize: number,
  printMode = false,
): void {
  ctx.save();
  for (const river of rivers) {
    if (river.controlPoints.length === 0) continue;
    drawEndpoint(ctx, river.controlPoints[0], getRiverEndpointMarker(river, 'source'), tileSize, printMode, true);
    drawEndpoint(ctx, river.controlPoints[river.controlPoints.length - 1], getRiverEndpointMarker(river, 'mouth'), tileSize, printMode, false);
  }
  ctx.restore();
}

function drawEndpoint(
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  marker: RiverEndpointMarker,
  tileSize: number,
  printMode: boolean,
  isSource: boolean,
): void {
  const cx = point.x * tileSize;
  const cy = point.y * tileSize;
  const r = Math.max(4, tileSize * 0.22);
  ctx.save();
  ctx.globalAlpha = printMode ? 1 : 0.9;
  ctx.fillStyle = printMode ? '#ffffff' : (isSource ? '#ecfeff' : '#dbeafe');
  ctx.strokeStyle = printMode ? '#000000' : (isSource ? '#0891b2' : '#1d4ed8');
  ctx.lineWidth = Math.max(1, tileSize * 0.06);
  ctx.beginPath();
  if (isSource) {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = printMode ? '#000000' : '#0f172a';
  ctx.font = `bold ${Math.max(7, tileSize * 0.28)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ENDPOINT_LABELS[marker], cx, cy + 0.5);
  ctx.restore();
}
