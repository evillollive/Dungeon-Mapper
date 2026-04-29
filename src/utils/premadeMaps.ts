import type {
  DungeonMap,
  DungeonProject,
  LightSource,
  MapNote,
  StairLink,
  Tile,
  TileType,
  Token,
  TokenKind,
} from '../types/map';
import { createFogGrid } from './mapUtils';
import { getGenerator, type GenerateContext } from './generators';
import { makeRng, seedFromString } from './generators/random';

export interface PremadeMapSummary {
  id: string;
  name: string;
  themeId: string;
  themeLabel: string;
  category: string;
  sizeLabel: string;
  levelCount: number;
  description: string;
}

interface TokenRequest {
  kind: TokenKind;
  label: string;
  icon: string;
  role: 'player' | 'ally' | 'foe' | 'boss';
  size?: number;
}

interface LevelSpec {
  name: string;
  generatorId: string;
  themeId: string;
  width: number;
  height: number;
  density: number;
  seed: string;
  tileMix?: GenerateContext['tileMix'];
  corridorStrategy?: string;
  corridorContinuity?: number;
  dungeonShape?: string;
  deadEndRemoval?: number;
  labelRooms?: boolean;
  nameRooms?: boolean;
  noteFlavor: string;
  tokenTheme: TokenRequest[];
  lightColor?: string;
}

interface PremadeMapSpec {
  id: string;
  name: string;
  themeId: string;
  themeLabel: string;
  category: string;
  description: string;
  levels: LevelSpec[];
  linkLevels?: boolean;
}

const PLAYER_PARTY: TokenRequest[] = [
  { kind: 'player', label: 'Vera', icon: 'warrior', role: 'player' },
  { kind: 'player', label: 'Nix', icon: 'rogue', role: 'player' },
];

const BUILT_LIGHT = '#f97316';
const TECH_LIGHT = '#38bdf8';
const WILD_LIGHT = '#fbbf24';
const STRANGE_LIGHT = '#a78bfa';
const PASSABLE_TOKEN_TILE_TYPES = new Set<TileType>([
  'floor',
  'door-h',
  'door-v',
  'locked-door-h',
  'locked-door-v',
  'trapped-door-h',
  'trapped-door-v',
  'archway',
  'stairs-up',
  'stairs-down',
  'trap',
  'treasure',
  'start',
]);

function encounter(
  ally: [string, string],
  foeA: [string, string],
  foeB: [string, string],
  boss?: [string, string]
): TokenRequest[] {
  return [
    ...PLAYER_PARTY,
    { kind: 'npc', label: ally[0], icon: ally[1], role: 'ally' },
    { kind: 'monster', label: foeA[0], icon: foeA[1], role: 'foe' },
    { kind: 'monster', label: foeB[0], icon: foeB[1], role: 'foe' },
    ...(boss ? [{ kind: 'monster' as const, label: boss[0], icon: boss[1], role: 'boss' as const, size: 2 }] : []),
  ];
}

const PREMADE_MAP_SPECS: PremadeMapSpec[] = [
  {
    id: 'sunken-crypt',
    name: 'The Sunken Crypt',
    themeId: 'dungeon',
    themeLabel: 'Dungeon',
    category: 'Crypt delve',
    description: 'A flooded crypt complex with named chambers, hidden doors, traps, and a treasure vault.',
    levels: [{
      name: 'The Sunken Crypt',
      generatorId: 'rooms-and-corridors',
      themeId: 'dungeon',
      width: 40,
      height: 40,
      density: 1.15,
      seed: 'premade:sunken-crypt',
      tileMix: { water: 0.04, treasure: 0.045, trap: 0.026, secretDoors: 0.14, lockedDoors: 0.1 },
      corridorStrategy: 'loops',
      corridorContinuity: 0.45,
      dungeonShape: 'rectangle',
      deadEndRemoval: 0.15,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'Damp stone, black water, and burial niches give this location a ready-to-run crypt objective.',
      tokenTheme: encounter(['Crypt Warden', 'cleric'], ['Restless Dead', 'skeleton'], ['Tomb Spider', 'spider'], ['Drowned Guardian', 'skull']),
      lightColor: BUILT_LIGHT,
    }],
  },
  {
    id: 'winding-depths',
    name: 'The Winding Depths',
    themeId: 'dungeon',
    themeLabel: 'Dungeon',
    category: 'Cavern lair',
    description: 'An organic cave delve with branching chambers, pools, and a hoard in the deep rock.',
    levels: [{
      name: 'The Winding Depths',
      generatorId: 'cavern',
      themeId: 'dungeon',
      width: 48,
      height: 40,
      density: 1.1,
      seed: 'premade:winding-depths',
      tileMix: { wall: 0.47, water: 0.04, treasure: 5, trap: 0.018, areas: 5, stairsDown: 1 },
      noteFlavor: 'Natural chambers are labeled for immediate exploration beats and hidden dangers.',
      tokenTheme: encounter(['Lost Prospector', 'archer'], ['Cave Bat Swarm', 'bat'], ['Bone Serpent', 'snake'], ['Deep Drake', 'dragon']),
      lightColor: BUILT_LIGHT,
    }],
  },
  {
    id: 'goblin-warren',
    name: 'The Goblin Warren',
    themeId: 'dungeon',
    themeLabel: 'Dungeon',
    category: 'Monster den',
    description: 'A cramped cross-shaped lair with chokepoints, dead ends, and ambush rooms.',
    levels: [{
      name: 'The Goblin Warren',
      generatorId: 'rooms-and-corridors',
      themeId: 'dungeon',
      width: 32,
      height: 32,
      density: 1.45,
      seed: 'premade:goblin-warren',
      tileMix: { roomSize: 0.75, treasure: 0.025, trap: 0.035, secretDoors: 0.08, trappedDoors: 0.15, archways: 0.1 },
      corridorStrategy: 'winding',
      corridorContinuity: 0.2,
      dungeonShape: 'cross',
      deadEndRemoval: 0,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'Small rooms and winding paths set up ambushes without copying any specific source map.',
      tokenTheme: encounter(['Caged Scout', 'rogue'], ['Goblin Cutter', 'dagger'], ['Goblin Archer', 'bow'], ['Warren Boss', 'axe']),
      lightColor: BUILT_LIGHT,
    }],
  },
  {
    id: 'ironhold-keep',
    name: 'Ironhold Keep',
    themeId: 'castle',
    themeLabel: 'Castle',
    category: 'Keep interior',
    description: 'A named castle floor with a great hall, guard rooms, chapel, stores, and a strongroom.',
    levels: [{
      name: 'Ironhold Keep',
      generatorId: 'rooms-and-corridors',
      themeId: 'castle',
      width: 48,
      height: 40,
      density: 1,
      seed: 'premade:ironhold-keep',
      tileMix: { roomSize: 1.15, treasure: 0.038, trap: 0.012, doors: 0.9, lockedDoors: 0.16, archways: 0.18 },
      corridorStrategy: 'mst',
      corridorContinuity: 0.75,
      dungeonShape: 'rectangle',
      deadEndRemoval: 0.45,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'Formal rooms, locked doors, and warm torchlight make this keep usable as a social or combat site.',
      tokenTheme: encounter(['Castellan Rowan', 'king'], ['Gate Guard', 'shield'], ['Armory Veteran', 'sword'], ['Rebel Knight', 'axe']),
      lightColor: BUILT_LIGHT,
    }],
  },
  {
    id: 'castle-grounds',
    name: 'Castle Grounds',
    themeId: 'castle',
    themeLabel: 'Castle',
    category: 'Fortified compound',
    description: 'A walled castle compound with keep, bailey, barracks, chapel, stables, and stores.',
    levels: [{
      name: 'Castle Grounds',
      generatorId: 'village',
      themeId: 'castle',
      width: 56,
      height: 48,
      density: 1.05,
      seed: 'premade:castle-grounds',
      tileMix: { walls: 1, buildingSize: 1.08, treasure: 0.016, trap: 0.008 },
      noteFlavor: 'The settlement generator is directed into a defensible castle yard instead of a town grid.',
      tokenTheme: encounter(['Stablemaster Elen', 'archer'], ['Bailey Guard', 'shield'], ['Tower Crossbow', 'bow'], ['Siege Captain', 'sword']),
      lightColor: BUILT_LIGHT,
    }],
  },
  {
    id: 'iss-constellation',
    name: 'ISS Constellation',
    themeId: 'starship',
    themeLabel: 'Starship',
    category: 'Linked ship decks',
    description: 'A two-level starship project with linked decks, named rooms, crew tokens, hazards, and dynamic fog.',
    linkLevels: true,
    levels: [
      {
        name: 'ISS Constellation — Main Deck',
        generatorId: 'rooms-and-corridors',
        themeId: 'starship',
        width: 56,
        height: 32,
        density: 1,
        seed: 'premade:constellation-main',
        tileMix: { roomSize: 1.05, treasure: 0.035, trap: 0.022, doors: 0.95, lockedDoors: 0.1, archways: 0.15 },
        corridorStrategy: 'mst',
        corridorContinuity: 0.85,
        dungeonShape: 'rectangle',
        deadEndRemoval: 0.35,
        labelRooms: true,
        nameRooms: true,
        noteFlavor: 'Bridge, quarters, and support spaces are named for immediate starship play.',
        tokenTheme: encounter(['Ship AI Avatar', 'eye'], ['Boarding Drone', 'lightning'], ['Hull Parasite', 'spider'], ['Void Hunter', 'dragon']),
        lightColor: TECH_LIGHT,
      },
      {
        name: 'ISS Constellation — Lower Deck',
        generatorId: 'rooms-and-corridors',
        themeId: 'starship',
        width: 56,
        height: 32,
        density: 1.1,
        seed: 'premade:constellation-lower',
        tileMix: { roomSize: 0.95, treasure: 0.045, trap: 0.03, doors: 1, lockedDoors: 0.16, trappedDoors: 0.08 },
        corridorStrategy: 'loops',
        corridorContinuity: 0.7,
        dungeonShape: 'rectangle',
        deadEndRemoval: 0.25,
        labelRooms: true,
        nameRooms: true,
        noteFlavor: 'Cargo and engineering areas support a second linked deck encounter.',
        tokenTheme: encounter(['Chief Engineer Pax', 'staff'], ['Security Drone', 'shield'], ['Reactor Wisp', 'fireball'], ['Deck Stalker', 'eye']),
        lightColor: TECH_LIGHT,
      },
    ],
  },
  {
    id: 'alien-hive',
    name: 'The Hive',
    themeId: 'alien',
    themeLabel: 'Alien World',
    category: 'Organic structure',
    description: 'An alien hive with brood rooms, spore hazards, relics, and a central chamber.',
    levels: [{
      name: 'The Hive',
      generatorId: 'rooms-and-corridors',
      themeId: 'alien',
      width: 48,
      height: 48,
      density: 1.25,
      seed: 'premade:alien-hive',
      tileMix: { roomSize: 1.1, treasure: 0.04, trap: 0.035, doors: 0.55, archways: 0.42 },
      corridorStrategy: 'winding',
      corridorContinuity: 0.25,
      dungeonShape: 'hexagon',
      deadEndRemoval: 0.05,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'The layout leans organic through winding corridors and archways while staying generator-built.',
      tokenTheme: encounter(['Xeno-Researcher Iri', 'scroll'], ['Sporeling', 'snake'], ['Brood Guardian', 'spider'], ['Hive Matriarch', 'eye']),
      lightColor: STRANGE_LIGHT,
    }],
  },
  {
    id: 'xenoflora-caves',
    name: 'Xenoflora Caves',
    themeId: 'alien',
    themeLabel: 'Alien World',
    category: 'Alien cavern',
    description: 'Bioluminescent cave pockets, strange pools, spores, and alien relics.',
    levels: [{
      name: 'Xenoflora Caves',
      generatorId: 'cavern',
      themeId: 'alien',
      width: 48,
      height: 48,
      density: 1.2,
      seed: 'premade:xenoflora-caves',
      tileMix: { wall: 0.44, water: 0.085, treasure: 6, trap: 0.026, areas: 5, stairsDown: 1 },
      noteFlavor: 'Named cavern pockets and violet lights create a strange-world expedition map.',
      tokenTheme: encounter(['Surveyor Kez', 'crystal'], ['Spore Bloom', 'fireball'], ['Cave Strider', 'spider'], ['Crystal Devourer', 'dragon']),
      lightColor: STRANGE_LIGHT,
    }],
  },
  {
    id: 'dusty-gulch',
    name: 'Dusty Gulch',
    themeId: 'oldwest',
    themeLabel: 'Old West',
    category: 'Frontier town',
    description: 'A frontier main street with saloon, store, sheriff, bank, stables, hotel, and trouble brewing.',
    levels: [{
      name: 'Dusty Gulch',
      generatorId: 'village',
      themeId: 'oldwest',
      width: 64,
      height: 48,
      density: 0.95,
      seed: 'premade:dusty-gulch',
      tileMix: { walls: 0, buildingSize: 0.95, treasure: 0.014, trap: 0.006 },
      noteFlavor: 'Main Street and district labels turn the village generator into a western town.',
      tokenTheme: encounter(['Marshal Ada', 'shield'], ['Outlaw Lookout', 'bow'], ['Card Sharp', 'dagger'], ['Bandit Boss', 'axe']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'silver-vein-mine',
    name: 'Silver Vein Mine',
    themeId: 'oldwest',
    themeLabel: 'Old West',
    category: 'Abandoned mine',
    description: 'A directed cavern map representing mine shafts, cave-ins, strongboxes, and lower passages.',
    levels: [{
      name: 'Silver Vein Mine',
      generatorId: 'cavern',
      themeId: 'oldwest',
      width: 48,
      height: 40,
      density: 1,
      seed: 'premade:silver-vein-mine',
      tileMix: { wall: 0.49, water: 0.018, treasure: 6, trap: 0.024, areas: 4, stairsDown: 1 },
      noteFlavor: 'Cavern generation is directed into an Old West mine with cave-in hazards and ore caches.',
      tokenTheme: encounter(['Old Miner Beck', 'mountain'], ['Claim Jumper', 'dagger'], ['Tunnel Rattler', 'snake'], ['Mine Horror', 'skull']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'cogsworth-manor',
    name: 'Cogsworth Manor',
    themeId: 'steampunk',
    themeLabel: 'Steampunk',
    category: 'Clockwork manor',
    description: 'A manor-workshop hybrid with boiler hazards, parlors, libraries, and a clockwork vault.',
    levels: [{
      name: 'Cogsworth Manor',
      generatorId: 'rooms-and-corridors',
      themeId: 'steampunk',
      width: 48,
      height: 40,
      density: 1.05,
      seed: 'premade:cogsworth-manor',
      tileMix: { roomSize: 1.1, treasure: 0.034, trap: 0.026, doors: 0.95, lockedDoors: 0.14, trappedDoors: 0.08 },
      corridorStrategy: 'mst',
      corridorContinuity: 0.7,
      dungeonShape: 'rectangle',
      deadEndRemoval: 0.35,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'Named rooms and steam-vent hazards make the manor playable as an intrigue or heist site.',
      tokenTheme: encounter(['Inventor Cogsworth', 'staff'], ['Clockwork Guard', 'shield'], ['Steam Mephit', 'fireball'], ['Brass Automaton', 'axe']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'brasswick-station',
    name: 'Brasswick Station',
    themeId: 'steampunk',
    themeLabel: 'Steampunk',
    category: 'Industrial district',
    description: 'A steampunk station district with clocktower square, foundry, workshops, and an airship dock.',
    levels: [{
      name: 'Brasswick Station',
      generatorId: 'village',
      themeId: 'steampunk',
      width: 56,
      height: 48,
      density: 1,
      seed: 'premade:brasswick-station',
      tileMix: { walls: 0, buildingSize: 1.05, treasure: 0.014, trap: 0.008 },
      noteFlavor: 'Village districts become a station-centered industrial neighborhood.',
      tokenTheme: encounter(['Station Inspector', 'key'], ['Gear Thief', 'rogue'], ['Foundry Brute', 'axe'], ['Airship Saboteur', 'lightning']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'verdant-crossing',
    name: 'The Verdant Crossing',
    themeId: 'wilderness',
    themeLabel: 'Wilderness',
    category: 'Outdoor encounter',
    description: 'A forest crossing with water, boulders, named clearings, caches, and ambush predators.',
    levels: [{
      name: 'The Verdant Crossing',
      generatorId: 'open-terrain',
      themeId: 'wilderness',
      width: 48,
      height: 48,
      density: 1.15,
      seed: 'premade:verdant-crossing',
      tileMix: { wall: 0.105, water: 0.07, pillar: 0.016, treasure: 3, trap: 0.004, areas: 5 },
      noteFlavor: 'Open terrain is tuned into a ready wilderness ambush map rather than a blank clearing.',
      tokenTheme: encounter(['Trail Guide Mira', 'tree'], ['Dire Wolf', 'wolf'], ['Giant Spider', 'spider'], ['Old Bear', 'dragon']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'millbrook-hamlet',
    name: 'Millbrook Hamlet',
    themeId: 'wilderness',
    themeLabel: 'Wilderness',
    category: 'Rural village',
    description: 'A countryside hamlet with village green, cottages, mill, farmsteads, chapel, and store.',
    levels: [{
      name: 'Millbrook Hamlet',
      generatorId: 'village',
      themeId: 'wilderness',
      width: 56,
      height: 48,
      density: 0.9,
      seed: 'premade:millbrook-hamlet',
      tileMix: { walls: 0, buildingSize: 0.9, treasure: 0.01, trap: 0.004 },
      noteFlavor: 'A calm settlement starter map with enough tokens and fog to run an immediate scene.',
      tokenTheme: encounter(['Miller Tamsin', 'campfire'], ['Woods Bandit', 'bow'], ['Hungry Wolf', 'wolf'], ['Bog Witch', 'mage']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'nexus-tower',
    name: 'Nexus Tower — Server Level',
    themeId: 'cyberpunk',
    themeLabel: 'Cyberpunk',
    category: 'Corporate facility',
    description: 'A neon server level with data vaults, hab blocks, security hubs, and ICE hazards.',
    levels: [{
      name: 'Nexus Tower — Server Level',
      generatorId: 'rooms-and-corridors',
      themeId: 'cyberpunk',
      width: 48,
      height: 40,
      density: 1.15,
      seed: 'premade:nexus-tower',
      tileMix: { roomSize: 1, treasure: 0.04, trap: 0.025, doors: 0.95, lockedDoors: 0.2, trappedDoors: 0.12 },
      corridorStrategy: 'mst',
      corridorContinuity: 0.8,
      dungeonShape: 'rectangle',
      deadEndRemoval: 0.4,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'High-security rooms, locked doors, and blue lighting support a ready cyberpunk infiltration.',
      tokenTheme: encounter(['Ripperdoc Liaison', 'potion'], ['Corp Sec', 'shield'], ['ICE Sprite', 'lightning'], ['Blacksite Agent', 'eye']),
      lightColor: TECH_LIGHT,
    }],
  },
  {
    id: 'lowtown-market',
    name: 'Lowtown Market',
    themeId: 'cyberpunk',
    themeLabel: 'Cyberpunk',
    category: 'Neon district',
    description: 'A street-market district with neon plaza, hab stacks, black market, noodle bar, and drone bay.',
    levels: [{
      name: 'Lowtown Market',
      generatorId: 'village',
      themeId: 'cyberpunk',
      width: 64,
      height: 48,
      density: 1.05,
      seed: 'premade:lowtown-market',
      tileMix: { walls: 0, buildingSize: 1, treasure: 0.02, trap: 0.008 },
      noteFlavor: 'The village generator is steered into a dense cyberpunk neighborhood.',
      tokenTheme: encounter(['Noodle Vendor Jin', 'coin'], ['Street Samurai', 'sword'], ['Drone Swarm', 'lightning'], ['Syndicate Fixer', 'rogue']),
      lightColor: TECH_LIGHT,
    }],
  },
  {
    id: 'the-wastes',
    name: 'The Wastes',
    themeId: 'postapocalypse',
    themeLabel: 'Post-Apocalypse',
    category: 'Ruined open ground',
    description: 'A wasteland encounter with scrap caches, ruins, hazards, and a fortified outpost point.',
    levels: [{
      name: 'The Wastes',
      generatorId: 'open-terrain',
      themeId: 'postapocalypse',
      width: 56,
      height: 48,
      density: 1.2,
      seed: 'premade:the-wastes',
      tileMix: { wall: 0.12, water: 0.015, pillar: 0.022, treasure: 4, trap: 0.006, areas: 5 },
      noteFlavor: 'Open terrain becomes a playable wasteland with scrap, snares, and cover.',
      tokenTheme: encounter(['Wasteland Trader', 'coin'], ['Raider Scout', 'bow'], ['Scrap Hound', 'wolf'], ['Mutant Brute', 'skull']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'refuge',
    name: 'Refuge',
    themeId: 'postapocalypse',
    themeLabel: 'Post-Apocalypse',
    category: 'Survivor settlement',
    description: 'A survivor refuge with scrap yard, shelters, trading post, purifier, lookout, and barricades.',
    levels: [{
      name: 'Refuge',
      generatorId: 'village',
      themeId: 'postapocalypse',
      width: 56,
      height: 48,
      density: 1,
      seed: 'premade:refuge',
      tileMix: { walls: 1, buildingSize: 0.95, treasure: 0.018, trap: 0.012 },
      noteFlavor: 'A walled settlement map ready for defense, trade, or siege scenarios.',
      tokenTheme: encounter(['Water Tech Sol', 'potion'], ['Gate Raider', 'axe'], ['Snare Setter', 'beartrap'], ['Warlord Vex', 'sword']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'downtown-office',
    name: 'Downtown Office — Penthouse Level',
    themeId: 'moderncity',
    themeLabel: 'Modern City',
    category: 'Office interior',
    description: 'A modern office floor with lobby, offices, conference rooms, server room, storage, and vault.',
    levels: [{
      name: 'Downtown Office — Penthouse Level',
      generatorId: 'rooms-and-corridors',
      themeId: 'moderncity',
      width: 48,
      height: 40,
      density: 1,
      seed: 'premade:downtown-office',
      tileMix: { roomSize: 1, treasure: 0.03, trap: 0.008, doors: 0.95, lockedDoors: 0.18, trappedDoors: 0.08 },
      corridorStrategy: 'mst',
      corridorContinuity: 0.9,
      dungeonShape: 'rectangle',
      deadEndRemoval: 0.45,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'Alarms, office rooms, and a vault make this a ready modern heist map.',
      tokenTheme: encounter(['Night Janitor', 'key'], ['Security Guard', 'shield'], ['Alarm Drone', 'lightning'], ['Corporate Handler', 'king']),
      lightColor: TECH_LIGHT,
    }],
  },
  {
    id: 'city-block',
    name: 'City Block',
    themeId: 'moderncity',
    themeLabel: 'Modern City',
    category: 'Urban block',
    description: 'A city block with plaza, apartments, office tower, garage, shop, station, restaurant, and clinic.',
    levels: [{
      name: 'City Block',
      generatorId: 'village',
      themeId: 'moderncity',
      width: 64,
      height: 56,
      density: 1.05,
      seed: 'premade:city-block',
      tileMix: { walls: 0, buildingSize: 1.08, treasure: 0.012, trap: 0.006 },
      noteFlavor: 'The village generator creates a block-scale modern city scene with labeled destinations.',
      tokenTheme: encounter(['Paramedic Noa', 'cleric'], ['Street Tough', 'axe'], ['Rooftop Sniper', 'bow'], ['Crime Boss', 'king']),
      lightColor: TECH_LIGHT,
    }],
  },
  {
    id: 'black-harpy',
    name: 'The Black Harpy',
    themeId: 'pirate',
    themeLabel: 'Pirate',
    category: 'Ship interior',
    description: 'A pirate ship interior with captain cabin, cargo hold, galley, brig, powder magazine, and treasure.',
    levels: [{
      name: 'The Black Harpy',
      generatorId: 'rooms-and-corridors',
      themeId: 'pirate',
      width: 48,
      height: 32,
      density: 1,
      seed: 'premade:black-harpy',
      tileMix: { roomSize: 0.95, treasure: 0.055, trap: 0.015, doors: 0.9, lockedDoors: 0.12, trappedDoors: 0.08 },
      corridorStrategy: 'mst',
      corridorContinuity: 0.85,
      dungeonShape: 'rectangle',
      deadEndRemoval: 0.35,
      labelRooms: true,
      nameRooms: true,
      noteFlavor: 'A compact ship-deck layout with high treasure and powder-magazine hazards.',
      tokenTheme: encounter(['Cabin Boy Pip', 'flag'], ['Deck Raider', 'sword'], ['Powder Monkey', 'fireball'], ['Captain Harpy', 'dagger']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'port-havoc',
    name: 'Port Havoc',
    themeId: 'pirate',
    themeLabel: 'Pirate',
    category: 'Pirate port',
    description: 'A pirate harbor with tavern, market, warehouses, shipwright, customs house, and lookout.',
    levels: [{
      name: 'Port Havoc',
      generatorId: 'village',
      themeId: 'pirate',
      width: 64,
      height: 48,
      density: 1,
      seed: 'premade:port-havoc',
      tileMix: { walls: 0, buildingSize: 1, treasure: 0.024, trap: 0.006 },
      noteFlavor: 'Harbor districts and treasure-heavy notes create a port map for raids or negotiations.',
      tokenTheme: encounter(['Dockmaster Sable', 'key'], ['Smuggler', 'chest'], ['Press-Gang Thug', 'axe'], ['Harbor Witch', 'mage']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'shifting-sands',
    name: 'The Shifting Sands',
    themeId: 'desert',
    themeLabel: 'Desert',
    category: 'Desert encounter',
    description: 'A desert travel map with oasis point, sand pits, scattered rocks, caches, and named terrain.',
    levels: [{
      name: 'The Shifting Sands',
      generatorId: 'open-terrain',
      themeId: 'desert',
      width: 56,
      height: 48,
      density: 1.1,
      seed: 'premade:shifting-sands',
      tileMix: { wall: 0.09, water: 0.012, pillar: 0.018, treasure: 2, trap: 0.006, areas: 4 },
      noteFlavor: 'Sparse water, more hazards, and named features turn open terrain into a desert scene.',
      tokenTheme: encounter(['Caravan Guide Samir', 'mountain'], ['Dune Raider', 'bow'], ['Sand Viper', 'snake'], ['Glass Scorpion', 'spider']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'sandstone-bazaar',
    name: 'Sandstone Bazaar',
    themeId: 'desert',
    themeLabel: 'Desert',
    category: 'Oasis settlement',
    description: 'A desert settlement with oasis, bazaar, caravanserai, well house, homes, shrine, and granary.',
    levels: [{
      name: 'Sandstone Bazaar',
      generatorId: 'village',
      themeId: 'desert',
      width: 56,
      height: 48,
      density: 0.95,
      seed: 'premade:sandstone-bazaar',
      tileMix: { walls: 1, buildingSize: 0.95, treasure: 0.018, trap: 0.008 },
      noteFlavor: 'A walled oasis town supports market encounters, chases, and desert intrigue.',
      tokenTheme: encounter(['Bazaar Elder', 'scroll'], ['Relic Thief', 'rogue'], ['Watchtower Archer', 'bow'], ['Efreeti Agent', 'fireball']),
      lightColor: WILD_LIGHT,
    }],
  },
  {
    id: 'forgotten-sun',
    name: 'Temple of the Forgotten Sun',
    themeId: 'ancient',
    themeLabel: 'Lost Civilization',
    category: 'Linked temple complex',
    description: 'A two-level lost-civilization project linking an ancient temple to catacombs below.',
    linkLevels: true,
    levels: [
      {
        name: 'Temple of the Forgotten Sun',
        generatorId: 'rooms-and-corridors',
        themeId: 'ancient',
        width: 56,
        height: 48,
        density: 1.1,
        seed: 'premade:forgotten-sun-temple',
        tileMix: { roomSize: 1.18, treasure: 0.04, trap: 0.032, doors: 0.82, secretDoors: 0.16, trappedDoors: 0.12, archways: 0.22 },
        corridorStrategy: 'mst',
        corridorContinuity: 0.75,
        dungeonShape: 'octagon',
        deadEndRemoval: 0.25,
        labelRooms: true,
        nameRooms: true,
        noteFlavor: 'Pillared halls, cursed glyphs, and treasure-rich sanctums provide the temple level.',
        tokenTheme: encounter(['Professor Vale', 'scroll'], ['Stone Sentinel', 'shield'], ['Glyph Shade', 'eye'], ['Sun Idol Guardian', 'dragon']),
        lightColor: STRANGE_LIGHT,
      },
      {
        name: 'The Catacombs Below',
        generatorId: 'cavern',
        themeId: 'ancient',
        width: 56,
        height: 48,
        density: 1.05,
        seed: 'premade:forgotten-sun-catacombs',
        tileMix: { wall: 0.46, water: 0.012, treasure: 7, trap: 0.028, areas: 5, stairsDown: 1 },
        noteFlavor: 'The lower level uses cavern generation for tomb passages under the temple.',
        tokenTheme: encounter(['Torchbearer Iko', 'torch'], ['Mummified Guard', 'skeleton'], ['Cursed Serpent', 'snake'], ['Buried Oracle', 'eye']),
        lightColor: STRANGE_LIGHT,
      },
    ],
  },
  {
    id: 'buried-city',
    name: 'The Buried City',
    themeId: 'ancient',
    themeLabel: 'Lost Civilization',
    category: 'Ruined city',
    description: 'A lost city map with central plaza, temple, marketplace, dwellings, granary, bathhouse, and guard posts.',
    levels: [{
      name: 'The Buried City',
      generatorId: 'village',
      themeId: 'ancient',
      width: 64,
      height: 56,
      density: 1.05,
      seed: 'premade:buried-city',
      tileMix: { walls: 1, buildingSize: 1.02, treasure: 0.022, trap: 0.01 },
      noteFlavor: 'Village generation is directed into an ancient city district with ruins and ceremonial spaces.',
      tokenTheme: encounter(['Relic Cartographer', 'scroll'], ['Tomb Robber', 'dagger'], ['Animated Statue', 'shield'], ['Obsidian Priest', 'mage']),
      lightColor: STRANGE_LIGHT,
    }],
  },
];

function isPassable(type: TileType): boolean {
  return PASSABLE_TOKEN_TILE_TYPES.has(type);
}

function tileSizeFor(width: number, height: number): number {
  const maxDim = Math.max(width, height);
  if (maxDim >= 64) return 12;
  if (maxDim >= 56) return 16;
  return 20;
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

function collectCells(tiles: Tile[][], predicate: (tile: Tile, x: number, y: number) => boolean): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < (tiles[y]?.length ?? 0); x++) {
      const tile = tiles[y][x];
      if (predicate(tile, x, y)) cells.push({ x, y });
    }
  }
  return cells;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findStartCell(tiles: Tile[][]): { x: number; y: number } {
  const start = collectCells(tiles, tile => tile.type === 'start')[0];
  if (start) return start;
  const passable = collectCells(tiles, tile => isPassable(tile.type));
  return passable[0] ?? { x: 0, y: 0 };
}

function canPlaceToken(
  tiles: Tile[][],
  occupied: Set<string>,
  x: number,
  y: number,
  size: number
): boolean {
  for (let yy = y; yy < y + size; yy++) {
    for (let xx = x; xx < x + size; xx++) {
      if (!tiles[yy]?.[xx] || !isPassable(tiles[yy][xx].type) || occupied.has(keyOf(xx, yy))) return false;
    }
  }
  return true;
}

function reserve(occupied: Set<string>, x: number, y: number, size: number): void {
  for (let yy = y; yy < y + size; yy++) {
    for (let xx = x; xx < x + size; xx++) occupied.add(keyOf(xx, yy));
  }
}

function chooseTokenCell(
  tiles: Tile[][],
  occupied: Set<string>,
  start: { x: number; y: number },
  role: TokenRequest['role'],
  size: number
): { x: number; y: number } {
  const passable = collectCells(tiles, tile => isPassable(tile.type));
  const sorted = [...passable].sort((a, b) => {
    const da = distance(a, start);
    const db = distance(b, start);
    const foeDistance = Math.max(8, Math.min(18, tiles.length / 2));
    if (role === 'player') return da - db;
    if (role === 'ally') return Math.abs(da - 4) - Math.abs(db - 4);
    if (role === 'boss') return db - da;
    return Math.abs(da - foeDistance) - Math.abs(db - foeDistance);
  });
  return sorted.find(cell => canPlaceToken(tiles, occupied, cell.x, cell.y, size)) ?? start;
}

function placeTokens(tiles: Tile[][], requests: TokenRequest[]): Token[] {
  const start = findStartCell(tiles);
  const occupied = new Set<string>();
  return requests.map((request, index) => {
    const size = request.size ?? 1;
    const cell = chooseTokenCell(tiles, occupied, start, request.role, size);
    reserve(occupied, cell.x, cell.y, size);
    return {
      id: index + 1,
      x: cell.x,
      y: cell.y,
      kind: request.kind,
      label: request.label,
      icon: request.icon,
      size,
    };
  });
}

function placeLights(tiles: Tile[][], color: string | undefined, seed: string): LightSource[] {
  const rng = makeRng(seedFromString(`${seed}:lights`));
  const noteCells = collectCells(tiles, tile => tile.noteId !== undefined && isPassable(tile.type));
  const passable = collectCells(tiles, tile => isPassable(tile.type));
  const candidates = noteCells.length > 0 ? noteCells : passable;
  const lights: LightSource[] = [];
  const used = new Set<string>();
  const target = Math.min(Math.max(4, Math.floor(passable.length / 180)), 9, candidates.length);
  let attempts = 0;
  while (lights.length < target && attempts < candidates.length * 3) {
    attempts++;
    const cell = rng.pick(candidates);
    const key = keyOf(cell.x, cell.y);
    if (used.has(key)) continue;
    if (lights.some(light => distance(light, cell) < 8)) continue;
    used.add(key);
    lights.push({
      id: lights.length + 1,
      x: cell.x,
      y: cell.y,
      radius: 6,
      color: color ?? BUILT_LIGHT,
      label: lights.length === 0 ? 'Primary Light' : `Scene Light ${lights.length + 1}`,
    });
  }
  return lights;
}

function describeNotes(notes: MapNote[], noteFlavor: string): MapNote[] {
  return notes.map(note => ({
    ...note,
    description: note.description || `${note.label}. ${noteFlavor}`,
  }));
}

function ensureUpStairAtStart(map: DungeonMap): { x: number; y: number } {
  const up = collectCells(map.tiles, tile => tile.type === 'stairs-up')[0];
  if (up) return up;
  const start = findStartCell(map.tiles);
  map.tiles[start.y][start.x] = { ...map.tiles[start.y][start.x], type: 'stairs-up' };
  return start;
}

function ensureDownStair(map: DungeonMap): { x: number; y: number } {
  const down = collectCells(map.tiles, tile => tile.type === 'stairs-down')[0];
  if (down) return down;
  const start = findStartCell(map.tiles);
  const passable = collectCells(map.tiles, tile => isPassable(tile.type));
  const far = [...passable].sort((a, b) => distance(b, start) - distance(a, start))[0] ?? start;
  map.tiles[far.y][far.x] = { ...map.tiles[far.y][far.x], type: 'stairs-down' };
  return far;
}

function buildLevel(spec: LevelSpec): DungeonMap {
  const generator = getGenerator(spec.generatorId);
  const generated = generator.generate({
    width: spec.width,
    height: spec.height,
    seed: seedFromString(spec.seed),
    density: spec.density,
    themeId: spec.themeId,
    tileMix: spec.tileMix,
    corridorStrategy: spec.corridorStrategy,
    corridorContinuity: spec.corridorContinuity,
    dungeonShape: spec.dungeonShape,
    deadEndRemoval: spec.deadEndRemoval,
    labelRooms: spec.labelRooms ?? true,
    nameRooms: spec.nameRooms ?? true,
  });

  const tiles = generated.tiles.map(row => row.map(tile => ({ ...tile })));
  const tokens = placeTokens(tiles, spec.tokenTheme);
  const notes = describeNotes(generated.notes, spec.noteFlavor);
  return {
    meta: {
      name: spec.name,
      width: generated.width,
      height: generated.height,
      tileSize: tileSizeFor(generated.width, generated.height),
      theme: spec.themeId,
    },
    tiles,
    notes,
    fog: createFogGrid(generated.width, generated.height, true),
    fogEnabled: true,
    dynamicFogEnabled: true,
    explored: createFogGrid(generated.width, generated.height, false),
    tokens,
    annotations: [],
    markers: [],
    initiative: tokens.map(token => token.id),
    lightSources: placeLights(tiles, spec.lightColor, spec.seed),
  };
}

export const PREMADE_MAP_SUMMARIES: PremadeMapSummary[] = PREMADE_MAP_SPECS.map(spec => ({
  id: spec.id,
  name: spec.name,
  themeId: spec.themeId,
  themeLabel: spec.themeLabel,
  category: spec.category,
  sizeLabel: spec.levels.map(level => `${level.width}×${level.height}`).join(' + '),
  levelCount: spec.levels.length,
  description: spec.description,
}));

export function buildPremadeProject(id: string): DungeonProject {
  const spec = PREMADE_MAP_SPECS.find(item => item.id === id);
  if (!spec) throw new Error(`Unknown premade map: ${id}`);

  const levels = spec.levels.map(buildLevel);
  const stairLinks: StairLink[] = [];
  if (spec.linkLevels && levels.length > 1) {
    for (let i = 0; i < levels.length - 1; i++) {
      const fromCell = ensureDownStair(levels[i]);
      const toCell = ensureUpStairAtStart(levels[i + 1]);
      stairLinks.push({ fromLevel: i, fromCell, toLevel: i + 1, toCell });
    }
  }

  return {
    name: spec.name,
    levels,
    activeLevelIndex: 0,
    stairLinks,
  };
}
