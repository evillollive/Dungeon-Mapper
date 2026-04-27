/**
 * Curated icon library for token placement. Each icon is a simple SVG path
 * that can be rendered at any size. The paths are designed to fit within a
 * 512×512 viewBox (standard for game-icons.net CC-BY-3.0 icons).
 *
 * Attribution: Icons inspired by game-icons.net (CC BY 3.0).
 * Original authors: Lorc, Delapouite, and contributors.
 * https://game-icons.net/about.html#authors
 *
 * These are simplified/redrawn paths for use in this project.
 */

export interface IconDef {
  /** Unique identifier. */
  id: string;
  /** Human-readable label. */
  name: string;
  /** Category for grouping in the picker. */
  category: string;
  /**
   * SVG path `d` attribute string. Designed for a 0 0 512 512 viewBox.
   * The path should be filled (no stroke).
   */
  path: string;
}

export const ICON_CATEGORIES = [
  'Characters',
  'Weapons',
  'Magic',
  'Creatures',
  'Items',
  'Environment',
] as const;

/**
 * Curated icon set. Each path is an original simplified design that evokes
 * common RPG archetypes. All paths use a 512×512 coordinate space.
 */
export const ICONS: IconDef[] = [
  // ── Characters ──
  {
    id: 'warrior',
    name: 'Warrior',
    category: 'Characters',
    path: 'M256 48c-30 0-54 24-54 54s24 54 54 54 54-24 54-54-24-54-54-54zm-80 140l-48 160h40l24-80 64 196 64-196 24 80h40l-48-160c-16-12-36-20-60-20s-44 8-60 20z',
  },
  {
    id: 'mage',
    name: 'Mage',
    category: 'Characters',
    path: 'M256 32l-32 96-96 32 96 32 32 96 32-96 96-32-96-32-32-96zm-80 288l-48 48v96h256v-96l-48-48H176z',
  },
  {
    id: 'rogue',
    name: 'Rogue',
    category: 'Characters',
    path: 'M256 48c-30 0-54 24-54 54s24 54 54 54 54-24 54-54-24-54-54-54zm-96 136l32 280h128l32-280c-24-16-56-24-96-24s-72 8-96 24z M208 240l-64 64 32 32 48-48zm96 0l48 48 32-32-64-64z',
  },
  {
    id: 'cleric',
    name: 'Cleric',
    category: 'Characters',
    path: 'M232 32v80h-80v48h80v80h48v-80h80v-48h-80V32h-48zm-56 256l-48 48v128h256V336l-48-48H176z',
  },
  {
    id: 'archer',
    name: 'Archer',
    category: 'Characters',
    path: 'M256 48c-30 0-54 24-54 54s24 54 54 54 54-24 54-54-24-54-54-54zm120 64l-152 152-72-24-24 72 152-8-56-56 152-152v16h32V112h-32zm-200 76l-48 276h128l24-160-64 16-40-132z',
  },
  {
    id: 'king',
    name: 'King',
    category: 'Characters',
    path: 'M256 24l-32 64-64-24 16 72-80 8 56 48-40 0 144 48 144-48-40 0 56-48-80-8 16-72-64 24-32-64zm-80 248l-48 48v144h256V320l-48-48H176z',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    category: 'Characters',
    path: 'M256 32c-40 0-72 32-72 72 0 28 16 52 40 64v16h-48v32h48v32l-64 96v128h48v-96l40-60v156h48V416l40 60v96h48V444l-64-96v-32h48v-32h-48v-16c24-12 40-36 40-64 0-40-32-72-72-72zm-24 56a16 16 0 110 32 16 16 0 010-32zm48 0a16 16 0 110 32 16 16 0 010-32z',
  },
  // ── Weapons ──
  {
    id: 'sword',
    name: 'Sword',
    category: 'Weapons',
    path: 'M384 48L192 240l-32-32-48 48 32 32-16 16-48-48-32 32 48 48-48 48 64 64 48-48 48-48-32-32 16-16 32 32 48-48-32-32L384 48z',
  },
  {
    id: 'axe',
    name: 'Axe',
    category: 'Weapons',
    path: 'M320 48c-48 32-80 80-96 136L96 312l-48 48 104 104 48-48 128-128c56-16 104-48 136-96l-8-8c-96 64-152 40-192 0s-64-96 0-192l-8-8zm-176 304l-40 40 64 64 40-40-64-64z',
  },
  {
    id: 'bow',
    name: 'Bow',
    category: 'Weapons',
    path: 'M400 48c-96 16-224 96-288 224l48 48-48 48 32 32L256 288c0 0 80 80 112 112l32-32-48-48 48-48C528 208 464 48 400 48zm-8 40c24 0 48 80 16 176l-128 128c0-24-8-56-32-88s-64-56-88-56L288 120c48-24 80-32 104-32z',
  },
  {
    id: 'shield',
    name: 'Shield',
    category: 'Weapons',
    path: 'M256 48L96 128v128c0 112 68 192 160 224 92-32 160-112 160-224V128L256 48zm0 48l128 64v112c0 88-52 152-128 180-76-28-128-92-128-180V160l128-64z',
  },
  {
    id: 'dagger',
    name: 'Dagger',
    category: 'Weapons',
    path: 'M336 48L208 240l-48-16-16 48 48 16-16 16-48-16-16 48 48 16-48 80 80-48 16 48 48-16-16-48 16-16 16 48 48-16-16-48L464 176 336 48z',
  },
  {
    id: 'staff',
    name: 'Staff',
    category: 'Weapons',
    path: 'M256 16a48 48 0 00-48 48 48 48 0 0024 42v16c-32 8-56 36-56 72a80 80 0 0032 64v16L176 464h160l-32-190v-16a80 80 0 0032-64c0-36-24-64-56-72v-16A48 48 0 00304 64a48 48 0 00-48-48z',
  },
  // ── Magic ──
  {
    id: 'fireball',
    name: 'Fireball',
    category: 'Magic',
    path: 'M256 32c-8 48-40 96-24 160 0 0-48-48-48-112-48 64-56 144-24 208-32-16-56-48-72-88-8 96 40 176 120 216-24-24-40-56-48-96 32 48 80 104 152 120a200 200 0 00144-56c-56 16-104 8-136-24 64 8 112-16 152-72-40 24-88 24-120 0 48-8 96-48 120-104-40 32-80 40-112 16 40-32 72-80 80-136-24 32-56 48-88 48 32-32 56-72 64-120-32 24-64 40-88 40z',
  },
  {
    id: 'lightning',
    name: 'Lightning',
    category: 'Magic',
    path: 'M320 32l-96 192h80l-128 256 48-176h-80L256 32h64z',
  },
  {
    id: 'potion',
    name: 'Potion',
    category: 'Magic',
    path: 'M216 32v32h-16v32h16v32c-64 32-96 96-96 168v40c0 32 24 56 56 56h160c32 0 56-24 56-56v-40c0-72-32-136-96-168V96h16V64h-16V32h-80zm16 144c8 0 16 4 24 8v48c0 24 16 40 40 40h32c8 24 12 48 12 64v40c0 8-8 16-16 16H188c-8 0-16-8-16-16v-40c0-48 24-108 60-128v-24c0-8 0-8 0-8z',
  },
  {
    id: 'scroll',
    name: 'Scroll',
    category: 'Magic',
    path: 'M160 64c-32 0-64 16-64 48v288c0 32 32 48 64 48h32v-48c-16 0-32-8-32-24V136c0-16 8-24 16-24h192v312c0 16-16 24-32 24v48h32c32 0 64-16 64-48V112c0-32-32-48-64-48H160zm32 80v32h160v-32H192zm0 64v32h128v-32H192zm0 64v32h160v-32H192z',
  },
  {
    id: 'crystal',
    name: 'Crystal',
    category: 'Magic',
    path: 'M256 32l-80 176-48 128 128 144 128-144-48-128L256 32zm0 48l56 128h-112l56-128zm-72 160h144l-72 104-72-104z',
  },
  {
    id: 'eye',
    name: 'Evil Eye',
    category: 'Magic',
    path: 'M256 128C128 128 48 256 48 256s80 128 208 128 208-128 208-128-80-128-208-128zm0 48c44 0 80 36 80 80s-36 80-80 80-80-36-80-80 36-80 80-80zm0 32c-26 0-48 22-48 48s22 48 48 48 48-22 48-48-22-48-48-48z',
  },
  // ── Creatures ──
  {
    id: 'dragon',
    name: 'Dragon',
    category: 'Creatures',
    path: 'M128 48l48 80c-40 16-72 48-88 88L32 192l40 80c-8 24-8 48 0 72l-40 80 56-24c16 40 48 72 88 88L128 464l80-40c24 8 48 8 72 0l80 40-48-56c40-16 72-48 88-88l56 24-40-80c8-24 8-48 0-72l40-80-56 24c-16-40-48-72-88-88L464 48l-80 40c-24-8-48-8-72 0L232 48zm128 112a96 96 0 110 192 96 96 0 010-192zm0 48a48 48 0 100 96 48 48 0 000-96z',
  },
  {
    id: 'wolf',
    name: 'Wolf',
    category: 'Creatures',
    path: 'M320 80l-48 48-64-32-32 80-96 48 48 80-48 80h80l32 48h128l48-48 64-48-32-80 16-64-48 16-48-48v-80zm-96 128a24 24 0 110 48 24 24 0 010-48z',
  },
  {
    id: 'spider',
    name: 'Spider',
    category: 'Creatures',
    path: 'M256 176a80 80 0 100 160 80 80 0 000-160zm0 32a48 48 0 110 96 48 48 0 010-96zM176 224l-80-96-24 20 80 96zm160 0l-24-20 80-96 24 20-80 96zM144 272l-112-32-8 28 112 32zm224 0l8-28 112 32-8 28-112-32zM176 312l-80 96 24 20 80-96zm160 0l24-20 80 96-24 20-80-96z',
  },
  {
    id: 'bat',
    name: 'Bat',
    category: 'Creatures',
    path: 'M256 144c-24 0-44 20-44 44 0 14 6 26 16 34l-108-54-88 88 120-24-48 80 96-48c0 8-4 16-4 24 0 56 24 104 60 104s60-48 60-104c0-8-4-16-4-24l96 48-48-80 120 24-88-88-108 54c10-8 16-20 16-34 0-24-20-44-44-44z',
  },
  {
    id: 'snake',
    name: 'Snake',
    category: 'Creatures',
    path: 'M352 80c-48 0-80 32-96 64s-48 64-96 64c-64 0-96 48-96 96s32 96 96 96c48 0 80-32 96-64s48-64 96-64c64 0 96-48 96-96s-32-96-96-96zm-192 256a32 32 0 110-64 32 32 0 010 64zm192-192a32 32 0 110-64 32 32 0 010 64z',
  },
  // ── Items ──
  {
    id: 'chest',
    name: 'Chest',
    category: 'Items',
    path: 'M96 160c-16 0-32 16-32 32v32h384v-32c0-16-16-32-32-32H96zm-32 96v112c0 16 16 32 32 32h320c16 0 32-16 32-32V256H64zm168 24h48v32h32v48h-32v32h-48v-32h-32v-48h32v-32z',
  },
  {
    id: 'key',
    name: 'Key',
    category: 'Items',
    path: 'M352 48c-62 0-112 50-112 112 0 18 4 34 10 50L96 364v100h100l24-48h48l24-48h48l12-12c16 6 32 10 50 10 62 0 112-50 112-112S414 48 352 48zm32 72a40 40 0 110 80 40 40 0 010-80z',
  },
  {
    id: 'gem',
    name: 'Gem',
    category: 'Items',
    path: 'M160 128l-64 96 160 240 160-240-64-96H160zm16 32h160l40 64H136l40-64zm-24 96h208L256 416 152 256z',
  },
  {
    id: 'coin',
    name: 'Coin',
    category: 'Items',
    path: 'M256 48C150 48 64 134 64 240v32c0 106 86 192 192 192s192-86 192-192v-32c0-106-86-192-192-192zm0 32c88 0 160 72 160 160v32c0 88-72 160-160 160S96 360 96 272v-32c0-88 72-160 160-160zm0 48c-62 0-112 50-112 112s50 112 112 112 112-50 112-112-50-112-112-112zm-12 40h24v32h24v24h-24v72h-24v-72h-24v-24h24v-32z',
  },
  {
    id: 'torch',
    name: 'Torch',
    category: 'Items',
    path: 'M256 32c-24 32-48 64-48 104 0 40 20 72 48 72s48-32 48-72c0-40-24-72-48-104zm-32 192v240h64V224h-64z',
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'Items',
    path: 'M256 48c-96 0-176 72-176 168 0 64 32 120 80 152v48c0 16 16 32 32 32v16h128v-16c16 0 32-16 32-32v-48c48-32 80-88 80-152 0-96-80-168-176-168zm-56 120a32 32 0 110 64 32 32 0 010-64zm112 0a32 32 0 110 64 32 32 0 010-64zm-80 104h48v48l-24 16-24-16v-48z',
  },
  // ── Environment ──
  {
    id: 'tree',
    name: 'Tree',
    category: 'Environment',
    path: 'M256 32l-96 144h48l-72 112h56l-72 112h272l-72-112h56l-72-112h48L256 32zm-24 400v48h48v-48h-48z',
  },
  {
    id: 'mountain',
    name: 'Mountain',
    category: 'Environment',
    path: 'M256 64L64 448h384L256 64zm0 80l48 80h-32l48 80h-32l56 112H168l56-112h-32l48-80h-32l48-80z',
  },
  {
    id: 'campfire',
    name: 'Campfire',
    category: 'Environment',
    path: 'M256 48c-16 40-40 72-40 112 0 32 16 56 40 56s40-24 40-56c0-40-24-72-40-112zm-120 272l80-48h-48l88-72 88 72h-48l80 48H136zm-40 32v48h320v-48H96z',
  },
  {
    id: 'door',
    name: 'Door',
    category: 'Environment',
    path: 'M144 64v384h224V64H144zm32 32h160v320H176V96zm64 144v48h32v-48h-32z',
  },
  {
    id: 'flag',
    name: 'Flag',
    category: 'Environment',
    path: 'M160 48v416h32V304l192-64V48l-192 64V48h-32zm32 80l160-52v128l-160 52V128z',
  },
  {
    id: 'beartrap',
    name: 'Bear Trap',
    category: 'Environment',
    path: 'M176 128l-64 128h48l-48 96 96-64v48l48-80 48 80v-48l96 64-48-96h48l-64-128h-48l-16-48h-48l-16 48h-32zm80 64a48 48 0 110 96 48 48 0 010-96z',
  },
];

/**
 * Index icons by id for O(1) lookup.
 */
export const ICON_BY_ID: ReadonlyMap<string, IconDef> = new Map(
  ICONS.map(icon => [icon.id, icon])
);
