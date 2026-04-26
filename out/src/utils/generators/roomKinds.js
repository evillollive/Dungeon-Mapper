/**
 * Per-theme room-archetype palettes used by the rooms-and-corridors
 * generator to give carved rooms theme-appropriate names (Bridge,
 * Throne Room, Saloon, …) instead of leaving every room generic.
 *
 * The palette is purely additive: themes that don't appear in
 * `THEME_ROOM_PALETTES` still produce unlabeled rooms (the legacy
 * behavior), and the dialog's "Label rooms" toggle defaults to `false`
 * for those themes.
 *
 * Each `RoomKind` carries:
 *  - `label`: the user-facing room name.
 *  - `weight`: relative sampling weight (default 1).
 *  - `size`: optional bias toward a particular room footprint. Exactly
 *    one `large` kind is reserved for the largest carved room when the
 *    palette contains one, since "Bridge" / "Great Hall" / "Lobby" reads
 *    best as the central space.
 *  - `bias.treasure`/`bias.trap`: multipliers applied to the per-room
 *    POI placement weight, letting storage rooms (Vault, Cargo Bay,
 *    Powder Magazine) attract treasure while defensive rooms attract
 *    traps.
 */
const CASTLE = [
    { label: 'Great Hall', size: 'large', weight: 1, bias: { treasure: 0.5 } },
    { label: 'Throne Room', size: 'large', weight: 0.5, bias: { treasure: 1 } },
    { label: 'Armory', weight: 1, bias: { treasure: 1.5, trap: 0.5 } },
    { label: 'Strongroom', size: 'small', weight: 1, bias: { treasure: 3, trap: 2 } },
    { label: 'Chapel', weight: 0.8 },
    { label: 'Barracks', weight: 1.2 },
    { label: 'Guard Room', weight: 1, bias: { trap: 1.5 } },
    { label: 'Kitchen', weight: 1 },
    { label: 'Pantry', size: 'small', weight: 0.7, bias: { treasure: 0.5 } },
    { label: 'Library', weight: 0.6 },
    { label: 'Solar', weight: 0.6 },
];
const STARSHIP = [
    { label: 'Bridge', size: 'large', weight: 1, bias: { treasure: 0.5 } },
    { label: 'Engineering', weight: 1, bias: { trap: 1.5 } },
    { label: 'Cargo Bay', weight: 1, bias: { treasure: 2.5 } },
    { label: 'Crew Quarters', weight: 1.5 },
    { label: 'Mess Hall', weight: 0.8 },
    { label: 'Med Bay', weight: 0.8 },
    { label: 'Armory', size: 'small', weight: 0.8, bias: { treasure: 1.5, trap: 0.5 } },
    { label: 'Airlock', size: 'small', weight: 0.6 },
    { label: 'Computer Core', weight: 0.5, bias: { treasure: 1.5, trap: 1 } },
    { label: 'Hydroponics', weight: 0.6 },
];
const ALIEN = [
    { label: 'Hive Chamber', size: 'large', weight: 1 },
    { label: 'Hatchery', weight: 1, bias: { trap: 1.5 } },
    { label: 'Spore Garden', weight: 0.8, bias: { trap: 1.5 } },
    { label: 'Egg Cluster', size: 'small', weight: 1 },
    { label: 'Resin Pool', weight: 0.7 },
    { label: 'Relic Shrine', size: 'small', weight: 0.6, bias: { treasure: 2.5 } },
    { label: 'Brood Pit', weight: 0.7, bias: { trap: 1.2 } },
];
const OLDWEST = [
    { label: 'Saloon', size: 'large', weight: 1 },
    { label: 'General Store', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Sheriff’s Office', weight: 0.8, bias: { trap: 0.5 } },
    { label: 'Jail', size: 'small', weight: 0.8, bias: { trap: 1.5 } },
    { label: 'Bank', size: 'small', weight: 0.7, bias: { treasure: 3, trap: 1.5 } },
    { label: 'Stables', weight: 0.8 },
    { label: 'Bunkhouse', weight: 1 },
    { label: 'Boarding House', weight: 0.8 },
    { label: 'Smithy', weight: 0.7 },
    { label: 'Telegraph Office', size: 'small', weight: 0.5 },
];
const STEAMPUNK = [
    { label: 'Workshop', size: 'large', weight: 1, bias: { treasure: 1.2 } },
    { label: 'Boiler Room', weight: 1, bias: { trap: 1.5 } },
    { label: 'Drawing Room', weight: 0.8 },
    { label: 'Library', weight: 0.7 },
    { label: 'Conservatory', weight: 0.6 },
    { label: 'Clockwork Vault', size: 'small', weight: 0.7, bias: { treasure: 2.5, trap: 1.2 } },
    { label: 'Engine Room', weight: 0.9, bias: { trap: 1.5 } },
    { label: 'Parlor', weight: 0.8 },
];
const CYBERPUNK = [
    { label: 'Server Farm', size: 'large', weight: 1, bias: { trap: 1.2 } },
    { label: 'Hab Block', weight: 1.5 },
    { label: 'Black Market', weight: 0.8, bias: { treasure: 2 } },
    { label: 'Data Vault', size: 'small', weight: 0.6, bias: { treasure: 3, trap: 1.5 } },
    { label: 'Noodle Bar', weight: 0.7 },
    { label: 'Drone Bay', weight: 0.7, bias: { trap: 1.2 } },
    { label: 'Clinic', weight: 0.7 },
    { label: 'Security Hub', weight: 0.6, bias: { trap: 1.5 } },
];
const MODERNCITY = [
    { label: 'Lobby', size: 'large', weight: 1 },
    { label: 'Office', weight: 2 },
    { label: 'Conference Room', weight: 0.8 },
    { label: 'Server Room', size: 'small', weight: 0.7, bias: { treasure: 1.5, trap: 1 } },
    { label: 'Vault', size: 'small', weight: 0.5, bias: { treasure: 3, trap: 1.5 } },
    { label: 'Break Room', weight: 0.8 },
    { label: 'Storage', weight: 0.8, bias: { treasure: 1.2 } },
    { label: 'Mailroom', weight: 0.5 },
    { label: 'Lab', weight: 0.6, bias: { trap: 1 } },
];
const PIRATE = [
    { label: 'Captain’s Cabin', size: 'large', weight: 1, bias: { treasure: 1.5 } },
    { label: 'Crew Quarters', weight: 1.5 },
    { label: 'Galley', weight: 0.8 },
    { label: 'Powder Magazine', size: 'small', weight: 0.7, bias: { treasure: 1.5, trap: 2 } },
    { label: 'Cargo Hold', weight: 1, bias: { treasure: 2.5 } },
    { label: 'Brig', size: 'small', weight: 0.6, bias: { trap: 1.2 } },
    { label: 'Officers’ Mess', weight: 0.6 },
];
const DUNGEON = [
    { label: 'Crypt', weight: 1, bias: { trap: 1.5 } },
    { label: 'Antechamber', weight: 1 },
    { label: 'Vault', size: 'small', weight: 0.7, bias: { treasure: 2.5, trap: 1.5 } },
    { label: 'Shrine', weight: 0.7 },
    { label: 'Guard Chamber', weight: 1, bias: { trap: 1.2 } },
    { label: 'Reliquary', size: 'small', weight: 0.5, bias: { treasure: 2 } },
    { label: 'Cells', weight: 0.6 },
    { label: 'Torture Chamber', weight: 0.5, bias: { trap: 1.5 } },
    { label: 'Great Hall', size: 'large', weight: 0.8 },
];
// Lost-civilization temple complex: a hall of pillars at the center, a few
// burial / ritual spaces on the sides, and a small treasure-rich vault.
const ANCIENT = [
    { label: 'Hall of Pillars', size: 'large', weight: 1 },
    { label: 'Antechamber', weight: 1 },
    { label: 'Tomb', weight: 1, bias: { treasure: 1.5, trap: 1.5 } },
    { label: 'Shrine', weight: 0.8 },
    { label: 'Sanctum', weight: 0.6, bias: { trap: 1.2 } },
    { label: 'Ritual Chamber', weight: 0.7, bias: { trap: 1.5 } },
    { label: 'Hall of Statues', weight: 0.7 },
    { label: 'Treasury', size: 'small', weight: 0.6, bias: { treasure: 3, trap: 1.5 } },
    { label: 'Reliquary', size: 'small', weight: 0.5, bias: { treasure: 2 } },
    { label: 'Collapsed Hall', weight: 0.6, bias: { trap: 1.2 } },
];
export const THEME_ROOM_PALETTES = {
    castle: CASTLE,
    starship: STARSHIP,
    alien: ALIEN,
    oldwest: OLDWEST,
    steampunk: STEAMPUNK,
    cyberpunk: CYBERPUNK,
    moderncity: MODERNCITY,
    pirate: PIRATE,
    dungeon: DUNGEON,
    ancient: ANCIENT,
};
/** Returns the palette for a theme, or `undefined` if the theme has none. */
export function getRoomPalette(themeId) {
    if (!themeId)
        return undefined;
    return THEME_ROOM_PALETTES[themeId];
}
/** True when the theme defines a room palette and per-room labels are useful. */
export function themeSupportsRoomLabels(themeId) {
    return !!getRoomPalette(themeId);
}
