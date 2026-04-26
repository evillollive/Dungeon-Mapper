import { generateRoomsCorridors } from './roomsCorridors';
import { generateOpenTerrain } from './openTerrain';
import { generateCavern } from './cavern';
export { randomSeed, parseSeed, seedToString } from './random';
const roomsCorridors = {
    id: 'rooms-and-corridors',
    name: 'Rooms & Corridors',
    description: 'Rectangular rooms connected by L-shaped corridors. Best for dungeons, castles, ships, and other built spaces.',
    preferredThemes: [
        'dungeon', 'castle', 'starship', 'alien', 'steampunk',
        'cyberpunk', 'moderncity', 'pirate', 'oldwest', 'ancient',
    ],
    generate: generateRoomsCorridors,
};
const openTerrain = {
    id: 'open-terrain',
    name: 'Open Terrain',
    description: 'Open ground scattered with obstacles, water, and standing stones. Best for outdoor / overland maps.',
    preferredThemes: ['wilderness', 'desert', 'postapocalypse'],
    generate: generateOpenTerrain,
};
const cavern = {
    id: 'cavern',
    name: 'Cavern',
    description: 'Organic cave system carved out via cellular-automata smoothing. Single connected region.',
    preferredThemes: [],
    generate: generateCavern,
};
export const GENERATOR_REGISTRY = {
    [roomsCorridors.id]: roomsCorridors,
    [openTerrain.id]: openTerrain,
    [cavern.id]: cavern,
};
/** Display order for the algorithm dropdown. */
export const GENERATOR_LIST = [roomsCorridors, openTerrain, cavern];
/**
 * Pick a sensible default generator for a given theme. Falls back to
 * rooms-and-corridors so unrecognized / future themes still get a useful
 * starting choice in the dropdown.
 */
export function pickGeneratorForTheme(themeId) {
    for (const g of GENERATOR_LIST) {
        if (g.preferredThemes?.includes(themeId))
            return g;
    }
    return roomsCorridors;
}
export function getGenerator(id) {
    return GENERATOR_REGISTRY[id] ?? roomsCorridors;
}
