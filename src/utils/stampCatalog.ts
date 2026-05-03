/**
 * Built-in stamp catalog — 40 universal SVG stamps for immediate use.
 * Organized by category: furniture, dungeon-dressing, nature, structures, markers.
 * Phase 6.4.5 will add per-theme stamp sets (160+ stamps).
 */
import type { StampDef } from '../types/map';

export const BUILT_IN_STAMPS: StampDef[] = [
  // ── Furniture ─────────────────────────────────────────────────────────────
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
    id: 'bed',
    name: 'Bed',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M96 192h320v128H96V192zm0-48h96v48H96v-48zm0 176h32v48H96v-48zm288 0h32v48h-32v-48zM96 144c0-26.5 21.5-48 48-48h48v48H96z',
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M112 80h288v352H112V80zm32 32v96h64V112h-64zm96 0v96h64V112h-64zm96 0v96h64V112h-64zm-192 128v96h64V240h-64zm96 0v96h64V240h-64zm96 0v96h64V240h-64z',
  },
  {
    id: 'throne',
    name: 'Throne',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M192 176h128v192H192V176zm-48-48h224v48H144v-48zm0 240h224v32H144v-32zm-32-288v288h32V128h-32zm288 0v288h-32V128h32zm-320-32h352v32H112V96z',
  },
  {
    id: 'cabinet',
    name: 'Cabinet',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M128 96h256v320H128V96zm0 160h256M256 96v320m-96 0h192v16H160v-16zm72-208v48m48-48v48',
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M96 352h320v64H96v-64zm32-192h256v192H128V160zm64 64c0 0 32 48 64 48s64-48 64-48c0 48-28.7 96-64 96s-64-48-64-96z',
  },
  {
    id: 'rug',
    name: 'Rug',
    category: 'furniture',
    viewBox: '0 0 512 512',
    svgPath: 'M96 160h320v192H96V160zm16 16h288v160H112V176zm128 16l48 48-48 48-48-48 48-48z',
  },

  // ── Dungeon Dressing ──────────────────────────────────────────────────────
  {
    id: 'chest',
    name: 'Chest',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M96 192h320v192H96V192zm0 0c0-35.3 28.7-64 64-64h192c35.3 0 64 28.7 64 64H96zm128 96h64v48h-64v-48zm-16-16a16 16 0 1 0 0-32 16 16 0 0 0 0 32z',
  },
  {
    id: 'barrel',
    name: 'Barrel',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160c44.2 0 80 35.8 80 80v160c0 44.2-35.8 80-80 80H176c-44.2 0-80-35.8-80-80V176c0-44.2 35.8-80 80-80zm0 32c-26.5 0-48 21.5-48 48v160c0 26.5 21.5 48 48 48h160c26.5 0 48-21.5 48-48V176c0-26.5-21.5-48-48-48H176zm-64 96h288v64H112v-64z',
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64c-88.4 0-160 71.6-160 160 0 60 33 112.2 82 139.6V416h156v-52.4c49-27.4 82-79.6 82-139.6 0-88.4-71.6-160-160-160zm-48 160a24 24 0 1 1 0-48 24 24 0 0 1 0 48zm96 0a24 24 0 1 1 0-48 24 24 0 0 1 0 48zm-72 64h48v48h-48v-48z',
  },
  {
    id: 'trap',
    name: 'Trap',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M128 128h256v256H128V128zm32 32l192 192m0-192L160 352m96-224v256m-128-128h256',
  },
  {
    id: 'altar',
    name: 'Altar',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M176 224h160v96H176V224zm-32 96h224v32H144V320zm32 32v64h32v-64h-32zm128 0v64h32v-64h-32zm-96-224l64-64 64 64h-128z',
  },
  {
    id: 'lever',
    name: 'Lever',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M224 352h64v64H224v-64zm32-224v224m-64 32h128v16H192v-16zm64-256a16 16 0 1 1 0 32 16 16 0 0 1 0-32z',
  },
  {
    id: 'cage',
    name: 'Cage',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M144 96h224v320H144V96zm48 0v320m48-320v320m48-320v320m48-320v320M144 208h224M144 320h224',
  },
  {
    id: 'cauldron',
    name: 'Cauldron',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M160 208c0-53 43-96 96-96s96 43 96 96v64c0 53-43 96-96 96s-96-43-96-96v-64zm-32 32a16 16 0 1 1 0-32 16 16 0 0 1 0 32zm256 0a16 16 0 1 1 0-32 16 16 0 0 1 0 32zm-192 160h128m-96 0v32m64-32v32',
  },
  {
    id: 'sarcophagus',
    name: 'Sarcophagus',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M176 112h160c17.7 0 32 14.3 32 32v224c0 17.7-14.3 32-32 32H176c-17.7 0-32-14.3-32-32V144c0-17.7 14.3-32 32-32zm16 32h128v64H192V144zm40 96h48v96h-48V240z',
  },
  {
    id: 'treasure-pile',
    name: 'Treasure',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M160 320c0-53 43-96 96-96s96 43 96 96H160zm-32 0h256v48H128v-48zm48-128a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm96 16a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm-48-64a24 24 0 1 1 48 0 24 24 0 0 1-48 0z',
  },
  {
    id: 'well',
    name: 'Well',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 48c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80z',
  },

  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: 'tree',
    name: 'Tree',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64l-96 160h48l-64 128h56l-40 96h192l-40-96h56l-64-128h48L256 64zm-16 320h32v64h-32v-64z',
  },
  {
    id: 'campfire',
    name: 'Campfire',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64c0 0 80 96 80 192s-35.8 128-80 128-80-32-80-128S256 64 256 64zm-96 320l64 64m64 0l96-64m-192 0c0 0-32 32-48 32m288-32c0 0 32 32 48 32',
  },
  {
    id: 'rock',
    name: 'Rock',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M192 320l-48-96 64-64 80-16 96 32 32 80-48 80-96 16-80-32z',
  },
  {
    id: 'bush',
    name: 'Bush',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm-64 32c-35.3 0-64 28.7-64 64s28.7 64 64 64m128-128c35.3 0 64 28.7 64 64s-28.7 64-64 64',
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c-70.7 0-128 40-128 96h256c0-56-57.3-96-128-96zm-32 96v160h64V224h-64zm-80 160h224v32H144v-32z',
  },
  {
    id: 'pond',
    name: 'Pond',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 144c88.4 0 160 50 160 112s-71.6 112-160 112-160-50-160-112 71.6-112 160-112zm0 32c-70.7 0-128 35.8-128 80s57.3 80 128 80 128-35.8 128-80-57.3-80-128-80z',
  },
  {
    id: 'log',
    name: 'Log',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M128 224h256c17.7 0 32 14.3 32 32v0c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32v0c0-17.7 14.3-32 32-32zm0 48h256c17.7 0 32 14.3 32 32v0c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32v0c0-17.7 14.3-32 32-32z',
  },
  {
    id: 'vine',
    name: 'Vine',
    category: 'nature',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64v384M224 128c-32 16-48 48-32 80s48 48 80 32M288 224c32 16 48 48 32 80s-48 48-80 32M224 320c-32 16-48 48-32 80',
  },

  // ── Structures ────────────────────────────────────────────────────────────
  {
    id: 'pillar',
    name: 'Pillar',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M208 96h96v32h-96V96zm-16 32h128v320H192V128zm-16 320h160v32H176v-32z',
  },
  {
    id: 'door',
    name: 'Door',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160v320H176V96zm16 16h128v288H192V112zm96 144a16 16 0 1 1 0 32 16 16 0 0 1 0-32z',
  },
  {
    id: 'ladder',
    name: 'Ladder',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M192 64v384m128-384v384M192 128h128M192 208h128M192 288h128M192 368h128',
  },
  {
    id: 'stairs-up',
    name: 'Stairs Up',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M128 384h64v-64h64v-64h64v-64h64v-64h-256v256zm128-192h128v64H256v-64zm0 64h96v64h-96v-64zm0 64h64v64h-64v-64z',
  },
  {
    id: 'stairs-down',
    name: 'Stairs Down',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M128 128h256v256h-64v-64h-64v-64h-64v-64h-64V128zm0 0h64v64h64v64h64v64h64v64',
  },
  {
    id: 'bridge',
    name: 'Bridge',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M128 208h256v96H128V208zm0 0v-48m256 48v-48M128 304v48m256-48v48M160 208v96m64-96v96m64-96v96m64-96v96',
  },
  {
    id: 'gate',
    name: 'Gate',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M144 128h64v256h-64V128zm160 0h64v256h-64V128zM208 128h96v32H208V128zm0 224h96v32H208v-32zm48-224v256m-48-128h96',
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'structures',
    viewBox: '0 0 512 512',
    svgPath: 'M128 192h256v16H128v-16zm0 96h256v16H128v-16zM160 160v192m64-192v192m64-192v192m64-192v192m-192-224l16-32 16 32m48-32l16-32 16 32m48-32l16-32 16 32m48-32l16-32 16 32',
  },

  // ── Markers ───────────────────────────────────────────────────────────────
  {
    id: 'flag',
    name: 'Flag',
    category: 'markers',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96v320m0-320h192l-48 64 48 64H176',
  },
  {
    id: 'star',
    name: 'Star',
    category: 'markers',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96l48 112h120l-96 72 36 116-108-80-108 80 36-116-96-72h120l48-112z',
  },
  {
    id: 'arrow-marker',
    name: 'Arrow',
    category: 'markers',
    viewBox: '0 0 512 512',
    svgPath: 'M256 416V96m0 0l-96 96m96-96l96 96',
  },
  {
    id: 'question-mark',
    name: 'Unknown',
    category: 'markers',
    viewBox: '0 0 512 512',
    svgPath: 'M192 192c0-35.3 28.7-64 64-64s64 28.7 64 64c0 28-18 52-43 61v35h-42v-64c24-4 43-25 43-48 0-26.5-21.5-48-48-48s-48 21.5-48 48h-32zm48 160h32v32h-32v-32z',
  },
  {
    id: 'cross-marker',
    name: 'X Mark',
    category: 'markers',
    viewBox: '0 0 512 512',
    svgPath: 'M144 144l224 224m0-224L144 368',
  },
  {
    id: 'key',
    name: 'Key',
    category: 'markers',
    viewBox: '0 0 512 512',
    svgPath: 'M320 192a64 64 0 1 1-128 0 64 64 0 0 1 128 0zm-64 64v160m-32-64h64m-64-48h64',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Per-Theme Stamps (Phase 6.4.5)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Dungeon ────────────────────────────────────────────────────────────────
  {
    id: 'dungeon-iron-maiden',
    name: 'Iron Maiden',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M192 96h128v320c0 17.7-14.3 32-32 32h-64c-17.7 0-32-14.3-32-32V96zm0 0c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32m-112 48h96m-96 64h96m-96 64h96m-48-176v16m0 40v16m0 40v16',
  },
  {
    id: 'dungeon-portcullis',
    name: 'Portcullis',
    category: 'structures',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M112 96h288v320H112V96zm48 0v320m48-320v320m48-320v320m48-320v320m48-320v320M112 160h288M112 224h288M112 288h288M112 352h288',
  },
  {
    id: 'dungeon-brazier',
    name: 'Brazier',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M176 288h160v48H176v-48zm16-32h128l16 32H176l16-32zm48-128c0 0 32 48 48 64s-16 64-48 64-64-48-48-64 48-64 48-64zm-48 208v96m128-96v96m-64 0h-64m128 0h-64',
  },
  {
    id: 'dungeon-weapon-rack',
    name: 'Weapon Rack',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M144 128h224v256H144V128zm48 0v256m128-256v256M144 208h224M144 288h224m-176-80v-16l16-16m48 16v-16l16-16m48 16v-16l16-16m-128 160v16l16 16m48-16v16l16 16m48-16v16l16 16',
  },
  {
    id: 'dungeon-chains',
    name: 'Chains',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M208 96v64a32 32 0 0 0 32 32 32 32 0 0 0 32-32V96m-64 128v64a32 32 0 0 0 32 32 32 32 0 0 0 32-32V224m-64 128v64a32 32 0 0 0 32 32 32 32 0 0 0 32-32V352m-128-256v64a32 32 0 0 0 32 32m96-96v64a32 32 0 0 1-32 32',
  },
  {
    id: 'dungeon-torch-sconce',
    name: 'Torch Sconce',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M240 224h32v160h-32V224zm16-96c0 0 40 40 40 72s-17.9 48-40 48-40-16-40-48 40-72 40-72zm-48 256h96v16H208v-16zm32-288a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm32 0a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  },
  {
    id: 'dungeon-pit',
    name: 'Pit',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 32c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z',
  },
  {
    id: 'dungeon-cobweb',
    name: 'Cobweb',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M96 96l160 160M96 96c0 80 32 128 80 160M96 96c80 0 128 32 160 80m-160 80c16 16 40 24 64 24m-64-24l160 0m-96-80c0 16 8 40 24 64m-24-64l0 160',
  },
  {
    id: 'dungeon-gargoyle',
    name: 'Gargoyle',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c-44.2 0-80 35.8-80 80v32h160v-32c0-44.2-35.8-80-80-80zm-48 48a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm96 0a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm-96 64v96l-32 48h48v-32l32 32 32-32v32h48l-32-48v-96m-64 96h128',
  },
  {
    id: 'dungeon-manacles',
    name: 'Manacles',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M176 192a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm64 0a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm-64 0h48m16 0h48m-80 48v128m-48-128v128m-16 0h16m48 0h16m-80 0v32m48-32v32',
  },
  {
    id: 'dungeon-bone-pile',
    name: 'Bone Pile',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M160 320h192v32H160v-32zm16-32l160 0m-144-32h128m-96-48l16 48m96-48l-16 48m-128-48l64 48m64-48l-64 48m-32 112a16 16 0 1 1 32 0 16 16 0 0 1-32 0zm96 0a16 16 0 1 1 32 0 16 16 0 0 1-32 0z',
  },
  {
    id: 'dungeon-mossy-stone',
    name: 'Mossy Stone',
    category: 'nature',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M160 224h192v96H160v-96zm16 16h48v32h-48v-32zm64 0h48v32h-48v-32zm64 0h48v32h-48v-32zm-128 48h48v32h-48v-32zm64 0h48v32h-48v-32zm-48-96c-8 0-16 8-16 16m48-16c-4-12-12-16-24-16m96 16c8 0 16 8 16 16',
  },

/** All stamp categories with display labels. */
export const STAMP_CATEGORY_LABELS: Record<string, string> = {
  'all': 'All',
  'theme': '🎨 Theme',
  'furniture': 'Furniture',
  'dungeon-dressing': 'Dungeon',
  'nature': 'Nature',
  'structures': 'Structures',
  'markers': 'Markers',
  'custom': 'Custom',
};

/** Lookup a stamp definition by id. Returns undefined if not found. */
export function getStampDef(stampId: string, customStamps: readonly StampDef[] = []): StampDef | undefined {
  return customStamps.find(s => s.id === stampId) ?? BUILT_IN_STAMPS.find(s => s.id === stampId);
}
