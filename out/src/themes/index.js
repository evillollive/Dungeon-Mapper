import { dungeonTheme } from './dungeon';
import { castleTheme } from './castle';
import { starshipTheme } from './starship';
import { alienTheme } from './alien';
import { oldwestTheme } from './oldwest';
import { steampunkTheme } from './steampunk';
import { wildernessTheme } from './wilderness';
import { cyberpunkTheme } from './cyberpunk';
import { postapocalypseTheme } from './postapocalypse';
import { moderncityTheme } from './moderncity';
import { pirateTheme } from './pirate';
import { desertTheme } from './desert';
import { ancientTheme } from './ancient';
export const THEME_REGISTRY = {
    dungeon: dungeonTheme,
    castle: castleTheme,
    starship: starshipTheme,
    alien: alienTheme,
    oldwest: oldwestTheme,
    steampunk: steampunkTheme,
    wilderness: wildernessTheme,
    cyberpunk: cyberpunkTheme,
    postapocalypse: postapocalypseTheme,
    moderncity: moderncityTheme,
    pirate: pirateTheme,
    desert: desertTheme,
    ancient: ancientTheme,
};
// Themes are exposed to the UI sorted alphabetically by display name so the
// theme dropdown is easy to scan. The registry above keeps insertion order
// for any code that relies on it.
export const THEME_LIST = Object.values(THEME_REGISTRY).sort((a, b) => a.name.localeCompare(b.name));
// Legacy theme-id aliases. Older saved maps reference previous combined
// themes; resolve those to one of the new split themes so existing content
// keeps rendering. "fantasy" → "dungeon" (split into Dungeon + Castle), and
// "scifi" → "starship" (split into Starship + Alien World).
const THEME_ALIASES = {
    fantasy: 'dungeon',
    scifi: 'starship',
};
export function getTheme(id) {
    const resolved = THEME_ALIASES[id] ?? id;
    return THEME_REGISTRY[resolved] ?? dungeonTheme;
}
