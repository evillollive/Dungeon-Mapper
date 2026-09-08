import type { BackgroundImage, DungeonMap, DungeonProject } from '../types/map';
import { buildThemeList, getThemeWithCustom } from './customThemes';
import { getGenerator, parseSeed, pickGeneratorForTheme } from './generators';
import { createEmptyGrid, createFogGrid } from './mapUtils';
import { buildPremadeProject } from './premadeMaps';
import { renderMapToCanvas } from './renderMap';

export const CREATION_LIMITS = { minDimension: 10, maxDimension: 100, maxImageBytes: 10 * 1024 * 1024, maxImagePixels: 24_000_000 } as const;

export interface TraceImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface MapOptions {
  name: string;
  width: number;
  height: number;
  themeId: string;
}

export type ProjectCreationOptions =
  | { path: 'sample'; sampleId: string }
  | (MapOptions & { path: 'blank' })
  | (MapOptions & { path: 'generator'; seed: string; density: number; algorithm?: string })
  | (MapOptions & { path: 'trace'; image: TraceImage; opacity: number });

function copyProjectLibraries(sourceProject?: DungeonProject): Pick<DungeonProject, 'customThemes' | 'customStamps' | 'sceneTemplates'> {
  const libraries: Pick<DungeonProject, 'customThemes' | 'customStamps' | 'sceneTemplates'> = {};
  if (sourceProject?.customThemes) libraries.customThemes = structuredClone(sourceProject.customThemes);
  if (sourceProject?.customStamps) libraries.customStamps = structuredClone(sourceProject.customStamps);
  if (sourceProject?.sceneTemplates) libraries.sceneTemplates = structuredClone(sourceProject.sceneTemplates);
  return libraries;
}

/**
 * Copy a saved template into its own level, without placing it in the editor.
 * Template dimensions can be smaller than the guided generator's minimum.
 * Entity IDs are local to the new map and need no remapping. Unknown template
 * fields remain intact in the copied library, not promoted into project identity.
 */
export function createProjectFromTemplate(sourceProject: DungeonProject, templateId: string): DungeonProject {
  const template = sourceProject.sceneTemplates?.find(item => item.id === templateId);
  if (!template) throw new Error('That scene template is no longer available.');
  const { width, height, name } = template;
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0) ||
      template.tiles.length !== height || template.tiles.some(row => row.length !== width)) {
    throw new Error('The template grid does not match its dimensions. Keep the original template and correct it before creating a project.');
  }
  const activeMap = sourceProject.levels[sourceProject.activeLevelIndex];
  return {
    name,
    levels: [{
      meta: { name, width, height, tileSize: activeMap?.meta.tileSize ?? 32, theme: activeMap?.meta.theme ?? 'dungeon' },
      tiles: structuredClone(template.tiles),
      notes: structuredClone(template.notes),
      stamps: structuredClone(template.stamps),
      fog: createFogGrid(width, height),
      fogEnabled: false,
      tokens: [],
      annotations: [],
      markers: [],
    }],
    activeLevelIndex: 0,
    stairLinks: [],
    ...copyProjectLibraries(sourceProject),
  };
}

/** Fit the whole reference inside the grid without stretching or cropping it. */
export function alignTraceImage(image: TraceImage, width: number, height: number, tileSize: number, opacity: number): BackgroundImage {
  if (![image.width, image.height, width, height, tileSize].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Image and map dimensions must be positive numbers.');
  }
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new Error('Opacity must be between 0 and 1.');
  const scale = Math.min(width * tileSize / image.width, height * tileSize / image.height);
  return {
    dataUrl: image.dataUrl,
    scale,
    offsetX: (width - image.width * scale / tileSize) / 2,
    offsetY: (height - image.height * scale / tileSize) / 2,
    opacity,
  };
}

/** Portable content only. The parent owns identity allocation and persistence. */
export function createProjectCandidate(options: ProjectCreationOptions, sourceProject?: DungeonProject): DungeonProject {
  if (options.path === 'sample') return buildPremadeProject(options.sampleId);
  const { width, height, themeId } = options;
  if (![width, height].every(value => Number.isInteger(value) && value >= CREATION_LIMITS.minDimension && value <= CREATION_LIMITS.maxDimension)) {
    throw new Error(`Map dimensions must be whole numbers from ${CREATION_LIMITS.minDimension} to ${CREATION_LIMITS.maxDimension}.`);
  }
  const name = options.name.trim();
  if (!name || name.length > 100) throw new Error('Give your map a name of 1 to 100 characters.');
  if (!buildThemeList(sourceProject?.customThemes).some(theme => theme.id === themeId)) throw new Error('Choose an available environment / theme.');

  const map: DungeonMap = {
    meta: { name, width, height, tileSize: 32, theme: themeId },
    tiles: createEmptyGrid(width, height),
    notes: [],
    fog: createFogGrid(width, height),
    fogEnabled: false,
    tokens: [],
    annotations: [],
    markers: [],
  };
  if (options.path === 'generator') {
    if (!Number.isFinite(options.density) || options.density < 0.5 || options.density > 1.5) throw new Error('Choose a complexity between 0.5 and 1.5.');
    const baseTheme = sourceProject?.customThemes?.find(theme => theme.id === themeId)?.baseThemeId ?? themeId;
    const generator = options.algorithm ? getGenerator(options.algorithm) : pickGeneratorForTheme(baseTheme);
    const generated = generator.generate({
      width, height, themeId: baseTheme, density: options.density,
      seed: parseSeed(options.seed.trim() || 'first-adventure'), labelRooms: true,
    });
    map.tiles = generated.tiles;
    map.notes = generated.notes;
    map.roomShapes = generated.roomShapes;
    map.rivers = generated.rivers;
  }
  if (options.path === 'trace') map.backgroundImage = alignTraceImage(options.image, width, height, map.meta.tileSize, options.opacity);
  // Clone only reusable libraries, never editor content or local identity.
  return { name, levels: [map], activeLevelIndex: 0, stairLinks: [], ...copyProjectLibraries(sourceProject) };
}

function aborted(): DOMException {
  return new DOMException('Creation cancelled.', 'AbortError');
}

function loadImage(dataUrl: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', cancel);
    };
    const cancel = () => { cleanup(); image.src = ''; reject(aborted()); };
    image.onload = () => {
      cleanup();
      if (!image.naturalWidth || !image.naturalHeight) reject(new Error('This image has no usable dimensions.'));
      else resolve(image);
    };
    image.onerror = () => { cleanup(); reject(new Error('The image could not be decoded. Try another PNG, JPEG, or WebP.')); };
    signal.addEventListener('abort', cancel, { once: true });
    image.src = dataUrl;
  });
}

/** Reads local raster files only, with abort handling during both read and decode. */
export async function readTraceImage(file: File, signal: AbortSignal): Promise<TraceImage> {
  if (signal.aborted) throw aborted();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (!file.size || file.size > CREATION_LIMITS.maxImageBytes) throw new Error('Choose a non-empty image smaller than 10 MB.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => {
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      signal.removeEventListener('abort', cancel);
    };
    const cancel = () => { cleanup(); reader.abort(); reject(aborted()); };
    reader.onload = () => {
      cleanup();
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('The image could not be read. Please choose it again.'));
    };
    reader.onerror = () => { cleanup(); reject(new Error('The image could not be read. Please choose it again.')); };
    reader.onabort = () => { cleanup(); reject(aborted()); };
    signal.addEventListener('abort', cancel, { once: true });
    reader.readAsDataURL(file);
  });
  const image = await loadImage(dataUrl, signal);
  if (image.naturalWidth * image.naturalHeight > CREATION_LIMITS.maxImagePixels) throw new Error('This image is too large. Resize it to 24 megapixels or less.');
  return { dataUrl, width: image.naturalWidth, height: image.naturalHeight };
}

/** Render every level, so multilevel samples can be inspected before creation. */
export async function renderCreationPreviews(project: DungeonProject, signal: AbortSignal): Promise<string[]> {
  const previews: string[] = [];
  for (const map of project.levels) {
    if (signal.aborted) throw aborted();
    const tileSize = Math.min(24, 1200 / Math.max(map.meta.width, map.meta.height));
    const canvas = renderMapToCanvas(map, {
      tileSize, themeId: map.meta.theme ?? 'dungeon', viewMode: 'gm',
      customThemes: project.customThemes, customStamps: project.customStamps,
    });
    // The export renderer omits reference backgrounds. Trace candidates contain
    // empty tiles, so add the reference and its alignment grid explicitly.
    if (map.backgroundImage) {
      const bg = map.backgroundImage;
      const image = await loadImage(bg.dataUrl, signal);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering is unavailable.');
      ctx.save();
      ctx.globalAlpha = bg.opacity;
      const ratio = tileSize / map.meta.tileSize;
      ctx.drawImage(image, bg.offsetX * tileSize, bg.offsetY * tileSize, image.naturalWidth * bg.scale * ratio, image.naturalHeight * bg.scale * ratio);
      ctx.restore();
      ctx.strokeStyle = getThemeWithCustom(map.meta.theme ?? 'dungeon', project.customThemes).gridColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x <= map.meta.width; x++) { ctx.moveTo(x * tileSize, 0); ctx.lineTo(x * tileSize, canvas.height); }
      for (let y = 0; y <= map.meta.height; y++) { ctx.moveTo(0, y * tileSize); ctx.lineTo(canvas.width, y * tileSize); }
      ctx.stroke();
    }
    if (signal.aborted) throw aborted();
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl.startsWith('data:image/png')) throw new Error('The preview could not be rendered.');
    previews.push(dataUrl);
  }
  return previews;
}
