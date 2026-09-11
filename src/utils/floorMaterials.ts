import type { TileType } from '../types/map';

/** Cosmetic substrates only. These helpers do not define movement or sight. */
export function hasFloorMaterialSurface(type: TileType): boolean {
  return [
    'floor', 'trap', 'treasure', 'start', 'stairs-up', 'stairs-down', 'pillar',
    'door-h', 'door-v', 'locked-door-h', 'locked-door-v', 'trapped-door-h',
    'trapped-door-v', 'archway', 'portcullis', 'barricade',
  ].includes(type);
}

export function isConnectedFloorGround(type: TileType): boolean {
  return ['floor', 'trap', 'treasure', 'start', 'stairs-up', 'stairs-down'].includes(type);
}
