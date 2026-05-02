/**
 * Built-in stamp catalog — a small set of universal stamps for immediate
 * use. Phase 6.4.3 will expand this to 40+ stamps with a picker UI and
 * Phase 6.4.5 adds per-theme stamp sets.
 */
import type { StampDef } from '../types/map';

export const BUILT_IN_STAMPS: StampDef[] = [
  {
    id: 'chest',
    name: 'Chest',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M96 192h320v192H96V192zm0 0c0-35.3 28.7-64 64-64h192c35.3 0 64 28.7 64 64H96zm128 96h64v48h-64v-48zm-16-16a16 16 0 1 0 0-32 16 16 0 0 0 0 32z',
  },
  {
    id: 'table',
    name: 'Table',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M64 192h384v32H64v-32zm80 32v160h32V224H144zm192 0v160h32V224h-32z',
  },
  {
    id: 'chair',
    name: 'Chair',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M192 128h128v192H192V128zm-16 192h160v32H176v-32zm16 32v96h32v-96h-32zm96 0v96h32v-96h-32z',
  },
  {
    id: 'barrel',
    name: 'Barrel',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160c44.2 0 80 35.8 80 80v160c0 44.2-35.8 80-80 80H176c-44.2 0-80-35.8-80-80V176c0-44.2 35.8-80 80-80zm0 32c-26.5 0-48 21.5-48 48v160c0 26.5 21.5 48 48 48h160c26.5 0 48-21.5 48-48V176c0-26.5-21.5-48-48-48H176zm-64 96h288v64H112v-64z',
  },
  {
    id: 'campfire',
    name: 'Campfire',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64c0 0 80 96 80 192s-35.8 128-80 128-80-32-80-128S256 64 256 64zm-96 320l64 64m64 0l96-64m-192 0c0 0-32 32-48 32m288-32c0 0 32 32 48 32',
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64c-88.4 0-160 71.6-160 160 0 60 33 112.2 82 139.6V416h156v-52.4c49-27.4 82-79.6 82-139.6 0-88.4-71.6-160-160-160zm-48 160a24 24 0 1 1 0-48 24 24 0 0 1 0 48zm96 0a24 24 0 1 1 0-48 24 24 0 0 1 0 48zm-72 64h48v48h-48v-48z',
  },
  {
    id: 'tree',
    name: 'Tree',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64l-96 160h48l-64 128h56l-40 96h192l-40-96h56l-64-128h48L256 64zm-16 320h32v64h-32v-64z',
  },
  {
    id: 'pillar',
    name: 'Pillar',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M208 96h96v32h-96V96zm-16 32h128v320H192V128zm-16 320h160v32H176v-32z',
  },
];

/** Lookup a stamp definition by id. Returns undefined if not found. */
export function getStampDef(stampId: string): StampDef | undefined {
  return BUILT_IN_STAMPS.find(s => s.id === stampId);
}
