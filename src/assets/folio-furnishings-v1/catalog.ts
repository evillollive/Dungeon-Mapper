import type { StampCategory, StampDef, StampSvgPath } from '../../types/map';
import { FOLIO_THEME_ID } from '../../themes/folio-v1/art';
import table from './table.svg?raw';
import chair from './chair.svg?raw';
import bed from './bed.svg?raw';
import shelf from './shelf.svg?raw';
import crate from './crate.svg?raw';
import barrel from './barrel.svg?raw';
import altar from './altar.svg?raw';
import rubble from './rubble.svg?raw';
import roundTable from './round-table.svg?raw';
import bench from './bench.svg?raw';
import stool from './stool.svg?raw';
import desk from './desk.svg?raw';
import chest from './chest.svg?raw';
import wardrobe from './wardrobe.svg?raw';
import weaponRack from './weapon-rack.svg?raw';
import brazier from './brazier.svg?raw';
import sarcophagus from './sarcophagus.svg?raw';
import sacks from './sacks.svg?raw';
import boulder from './boulder.svg?raw';
import fern from './fern.svg?raw';
import shrub from './shrub.svg?raw';
import campfire from './campfire.svg?raw';
import bedroll from './bedroll.svg?raw';
import tent from './tent.svg?raw';

export interface FolioFurnishing extends StampDef {
  defaultScale: number;
  sourceFile: string;
  shadowPath: string;
  printPaths: StampSvgPath[];
}

/** Deliberately limited to our authored path-only sources, not an upload parser. */
export function parseBundledFolioSvg(source: string): StampSvgPath[] {
  const body = source.trim().match(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 64 64" fill="none">([\s\S]*)<\/svg>$/)?.[1];
  if (!body) throw new Error('Invalid bundled Folio furnishing SVG header.');
  const paths: StampSvgPath[] = [];
  const nodes = /<path\s+([^<>]+)\/>/g;
  for (const node of body.matchAll(nodes)) {
    const attributes = [...node[1].matchAll(/(d|fill|stroke|stroke-width)="([^"]*)"/g)];
    if (node[1].replace(/(d|fill|stroke|stroke-width)="([^"]*)"/g, '').trim() ||
        new Set(attributes.map(attribute => attribute[1])).size !== attributes.length) {
      throw new Error('Unsupported attribute in bundled Folio furnishing SVG.');
    }
    const values = Object.fromEntries(attributes.map(attribute => [attribute[1], attribute[2]]));
    if (!values.d || !/^[MmLlHhVvQqTtCcSsAaZzEe0-9.,+\-\s]+$/.test(values.d)) {
      throw new Error('Invalid path in bundled Folio furnishing SVG.');
    }
    for (const color of [values.fill, values.stroke]) {
      if (color !== undefined && color !== 'none' && !/^#[0-9a-f]{6}$/i.test(color)) {
        throw new Error('Unsupported paint in bundled Folio furnishing SVG.');
      }
    }
    const strokeWidth = values['stroke-width'] === undefined ? undefined : Number(values['stroke-width']);
    if (strokeWidth !== undefined && (!Number.isFinite(strokeWidth) || strokeWidth <= 0 || strokeWidth > 4)) {
      throw new Error('Invalid stroke width in bundled Folio furnishing SVG.');
    }
    const fill = values.fill === 'none' ? undefined : values.fill;
    const stroke = values.stroke === 'none' ? undefined : values.stroke;
    if (!fill && !stroke) throw new Error('Unpainted path in bundled Folio furnishing SVG.');
    paths.push({ path: values.d, fill, stroke, strokeWidth });
  }
  if (body.replace(nodes, '').trim() || paths.length === 0 || paths.length > 16 || !paths[0].fill) {
    throw new Error('Bundled Folio furnishing SVG must contain painted paths and a leading silhouette.');
  }
  return paths;
}

const sources: { key: string; name: string; category: StampCategory; scale: number; source: string }[] = [
  { key: 'table', name: 'Folio table', category: 'furniture', scale: 2, source: table },
  { key: 'chair', name: 'Folio chair', category: 'furniture', scale: 1, source: chair },
  { key: 'bed', name: 'Folio bed', category: 'furniture', scale: 1.75, source: bed },
  { key: 'shelf', name: 'Folio shelf', category: 'furniture', scale: 1.5, source: shelf },
  { key: 'crate', name: 'Folio crate', category: 'dungeon-dressing', scale: 1, source: crate },
  { key: 'barrel', name: 'Folio barrel', category: 'dungeon-dressing', scale: 0.8, source: barrel },
  { key: 'altar', name: 'Folio altar', category: 'dungeon-dressing', scale: 1.5, source: altar },
  { key: 'rubble', name: 'Folio rubble', category: 'dungeon-dressing', scale: 1.25, source: rubble },
  { key: 'round-table', name: 'Folio round table', category: 'furniture', scale: 1.5, source: roundTable },
  { key: 'bench', name: 'Folio bench', category: 'furniture', scale: 1.75, source: bench },
  { key: 'stool', name: 'Folio stool', category: 'furniture', scale: 0.9, source: stool },
  { key: 'desk', name: 'Folio writing desk', category: 'furniture', scale: 1.5, source: desk },
  { key: 'chest', name: 'Folio chest', category: 'furniture', scale: 1, source: chest },
  { key: 'wardrobe', name: 'Folio wardrobe', category: 'furniture', scale: 1.5, source: wardrobe },
  { key: 'weapon-rack', name: 'Folio weapon rack', category: 'dungeon-dressing', scale: 1.5, source: weaponRack },
  { key: 'brazier', name: 'Folio brazier', category: 'dungeon-dressing', scale: 0.85, source: brazier },
  { key: 'sarcophagus', name: 'Folio sarcophagus', category: 'dungeon-dressing', scale: 2, source: sarcophagus },
  { key: 'sacks', name: 'Folio supply sacks', category: 'dungeon-dressing', scale: 1, source: sacks },
  { key: 'boulder', name: 'Folio boulder', category: 'nature', scale: 1.5, source: boulder },
  { key: 'fern', name: 'Folio fern', category: 'nature', scale: 0.9, source: fern },
  { key: 'shrub', name: 'Folio shrub', category: 'nature', scale: 1.25, source: shrub },
  { key: 'campfire', name: 'Folio campfire', category: 'dungeon-dressing', scale: 1.25, source: campfire },
  { key: 'bedroll', name: 'Folio bedroll', category: 'furniture', scale: 1.5, source: bedroll },
  { key: 'tent', name: 'Folio tent', category: 'structures', scale: 2.5, source: tent },
];

export const FOLIO_FURNISHINGS: FolioFurnishing[] = sources.map(source => {
  const paths = parseBundledFolioSvg(source.source);
  return {
    id: `folio-furnishings-v1-${source.key}`,
    name: source.name,
    category: source.category,
    themeId: FOLIO_THEME_ID,
    viewBox: '0 0 64 64',
    sourceFile: `src/assets/folio-furnishings-v1/${source.key}.svg`,
    defaultScale: source.scale,
    paths,
    shadowPath: paths[0].path,
    printPaths: paths.map(path => ({
      path: path.path,
      fill: path.fill ? '#ffffff' : undefined,
      stroke: '#202820',
      strokeWidth: path.strokeWidth ?? 0.7,
    })),
  };
});

const BY_ID = new Map(FOLIO_FURNISHINGS.map(stamp => [stamp.id, stamp]));

/** Custom definitions with the same ID must keep their existing override behavior. */
export function getFolioFurnishing(def: StampDef | undefined): FolioFurnishing | undefined {
  return def && BY_ID.get(def.id) === def ? BY_ID.get(def.id) : undefined;
}

export function isUnavailableFolioFurnishing(id: string, customStamps: readonly StampDef[] = []): boolean {
  return id.startsWith('folio-furnishings-') && !BY_ID.has(id) && !customStamps.some(stamp => stamp.id === id);
}

export const UNAVAILABLE_FOLIO_FURNISHING: StampDef = {
  id: 'folio-furnishings-unavailable',
  name: 'Unavailable Folio furnishing',
  category: 'dungeon-dressing',
  viewBox: '0 0 64 64',
  paths: [
    { path: 'M32 8L56 32L32 56L8 32Z', fill: '#c4c4ac', stroke: '#465243', strokeWidth: 1.5 },
    { path: 'M24 24Q25 17 32 18Q42 18 41 26Q41 31 33 34V38', stroke: '#465243', strokeWidth: 3 },
    { path: 'M35 45A3 3 0 1 1 29 45A3 3 0 1 1 35 45Z', fill: '#465243' },
  ],
};
