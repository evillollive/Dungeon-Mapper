export interface SampleGuide {
  role: 'Launch encounter' | 'Generated example' | 'Art reference';
  purpose: string;
  use: string;
}

export const SAMPLE_GUIDES: Record<string, SampleGuide> = {
  'sunken-crypt': {
    role: 'Generated example',
    purpose: 'A starting point for a flooded-crypt exploration, demonstrating looped rooms, an underground stream and hidden routes.',
    use: 'Choose one existing cache as the expedition objective, assign the Crypt Warden a motive, and review water and sight lines before play. Room names and actors are prompts, not a finished scenario.',
  },
  'winding-depths': {
    role: 'Generated example',
    purpose: 'A cavern-lair template for an expedition that must find a route through branching pools and chambers.',
    use: 'Use the Lost Prospector as a guide or rescue hook, select a destination in the deep chambers, and decide which creatures can be avoided. Check the return route before starting a session.',
  },
  'goblin-warren': {
    role: 'Generated example',
    purpose: 'A compact infiltration template for studying chokepoints, ambush positions and alternate approaches.',
    use: 'Adapt the Caged Scout into a rescue objective or choose a stolen cache to recover. Decide which doors are barred and how the inhabitants respond; the map does not script patrols or combat.',
  },
  'ironhold-keep': {
    role: 'Generated example',
    purpose: 'A castle-interior template for an audience, investigation or guarded retrieval.',
    use: 'Choose the room the party needs to reach, give Castellan Rowan a reason to admit or refuse them, and mark public versus restricted areas. Generated room labels are a starting point for your prep.',
  },
  'castle-grounds': {
    role: 'Generated example',
    purpose: 'A fortified-compound template demonstrating a keep and supporting buildings linked by outdoor approaches.',
    use: 'Pick one building as the destination, then plan a permitted entrance and a covert alternative. Use the stablemaster and guards to establish access rather than assuming every actor starts hostile.',
  },
  'iss-constellation': {
    role: 'Generated example',
    purpose: 'A two-deck starship template for a mission that moves between crew spaces and engineering.',
    use: 'Follow the linked stairs through both decks before assigning a recovery or repair objective. Decide what the AI and engineer know, and use Show this level deliberately during play; deck changes are not automatic publication.',
  },
  'alien-hive': {
    role: 'Generated example',
    purpose: 'An organic-facility template for a survey, retrieval or first-contact encounter.',
    use: 'Choose what the researcher wants from the central chambers and which inhabitants can be approached peacefully. Assign meaning to the spore and relic markers before presenting the map to players.',
  },
  'xenoflora-caves': {
    role: 'Generated example',
    purpose: 'An alien-cavern template demonstrating pools, narrow passages and unusual light.',
    use: 'Select a survey location or specimen cache, make the Surveyor a source of information, and review the return route. Decide locally what the hazard symbols mean in your rules.',
  },
  'dusty-gulch': {
    role: 'Generated example',
    purpose: 'A frontier-town template for a social investigation that can spread across Main Street.',
    use: 'Choose a person or building the party must find, give Marshal Ada a lead, and establish what would escalate the scene. The generated town is not a scripted shootout.',
  },
  'silver-vein-mine': {
    role: 'Generated example',
    purpose: 'An abandoned-mine template for finding a claim, missing worker or ore cache and returning to daylight.',
    use: 'Pick the destination and an exit route, ask what Old Miner Beck knows, and assign effects to the cave-in markers. Keep any countdown an explicit DM choice, not an assumed map behavior.',
  },
  'cogsworth-manor': {
    role: 'Generated example',
    purpose: 'A clockwork-manor template for an invitation, investigation or vault retrieval.',
    use: 'Choose a room as the objective and decide whether the inventor is host, ally or obstacle. Review boiler hazards and alternate corridors; locks and machinery are visual prompts, not automated puzzles.',
  },
  'brasswick-station': {
    role: 'Generated example',
    purpose: 'An industrial-district template for tracing a theft or sabotage through a station neighborhood.',
    use: 'Choose a destination such as a workshop or dock, give the inspector a lead, and connect two locations with clues. Set the incident and stakes yourself before using the generated actors.',
  },
  'verdant-crossing': {
    role: 'Generated example',
    purpose: 'An outdoor-travel template demonstrating river banks, clearings and sight-blocking terrain.',
    use: 'Choose the far-side destination and check how the party can cross. Give Trail Guide Mira useful route knowledge and decide which predators can be avoided or distracted.',
  },
  'millbrook-hamlet': {
    role: 'Generated example',
    purpose: 'A countryside-settlement template for gathering information or resolving a local problem.',
    use: 'Choose one household or landmark as the destination and connect it to two useful leads. Keep the village usable for conversation; generated hazards and actors do not require a battle.',
  },
  'nexus-tower': {
    role: 'Generated example',
    purpose: 'A server-floor template for an access-and-extraction mission in a cyberpunk setting.',
    use: 'Select a data cache as the objective, define the credential or negotiation route, and decide how security reacts to a bypass. Data and ICE markers do not implement hacking rules.',
  },
  'lowtown-market': {
    role: 'Generated example',
    purpose: 'A dense street-market template for meeting a contact, following a lead or finding an exit.',
    use: 'Pick the rendezvous and a fallback meeting point, then assign motives to the existing actors. Review alleys and visibility before running a pursuit; no chase behavior is automated.',
  },
  'the-wastes': {
    role: 'Generated example',
    purpose: 'A wasteland-travel template for reaching a supply cache through exposed terrain.',
    use: 'Select the cache and extraction point, decide which hazards are active, and offer a safer route as well as a direct one. Adapt the placed actors to your setting and party.',
  },
  'refuge': {
    role: 'Generated example',
    purpose: 'A survivor-settlement template for negotiating entry, obtaining supplies or solving a community problem.',
    use: 'Choose the service or person the party needs, define what the refuge asks in return, and identify public versus restricted buildings. Barricades are map symbols, not faction logic.',
  },
  'downtown-office': {
    role: 'Generated example',
    purpose: 'An office-floor template for an interview, evidence retrieval or discreet extraction.',
    use: 'Choose an office or vault as the destination and establish an authorized route and a bypass. Assign meaning to cameras, locks and hazards before play instead of assuming automated security.',
  },
  'city-block': {
    role: 'Generated example',
    purpose: 'An urban-block template for a multi-location investigation or street encounter.',
    use: 'Pick a starting contact and a destination in another building, then connect them with a lead. Review street crossings and entrances; the generated district supplies locations, not a finished mystery.',
  },
  'black-harpy': {
    role: 'Generated example',
    purpose: 'A three-deck pirate-vessel template for boarding, parley or a cargo retrieval.',
    use: 'Trace the linked stairs from main deck to hold, choose the mission destination, and define the return route. Decide crew loyalties before play and publish deck changes explicitly.',
  },
  'port-havoc': {
    role: 'Generated example',
    purpose: 'A harbor-district template for arranging passage, finding cargo or meeting a smuggler.',
    use: 'Choose the relevant dock or warehouse and give the dockmaster a useful lead. Review water crossings and alternate streets; the harbor is a staging map, not a scripted naval encounter.',
  },
  'shifting-sands': {
    role: 'Generated example',
    purpose: 'A desert-travel template for navigating between scarce landmarks and shelter.',
    use: 'Choose the destination and a water or rest stop, then give the caravan guide route knowledge. Decide how sand and hazard markers affect travel in your chosen rules before starting.',
  },
  'sandstone-bazaar': {
    role: 'Generated example',
    purpose: 'An oasis-settlement template for a market negotiation or relic investigation.',
    use: 'Choose a seller, contact or building as the objective and give the Bazaar Elder a lead. Keep the return path to the caravan clear; the map does not supply prices, clues or faction rules.',
  },
  'forgotten-sun': {
    role: 'Generated example',
    purpose: 'A linked temple-and-catacomb template for an expedition that descends beneath a ceremonial site.',
    use: 'Choose the relic or discovery goal, trace both directions through the stairs, and decide what the professor and torchbearer know. Review glyph hazards and publication separately on each level.',
  },
  'buried-city': {
    role: 'Generated example',
    purpose: 'A ruined-city template for locating an archaeological site among several districts.',
    use: 'Pick a destination building, use the cartographer to establish a lead, and identify a route back to arrival. Supply the mystery and actor motives yourself rather than treating generated labels as a complete adventure.',
  },
  'folio-cistern': {
    role: 'Art reference',
    purpose: 'Demonstrate Dungeon Folio wall connections, stone floors, muted water and private/public map rendering.',
    use: 'Inspect corners and narrow passages at fit-to-map and close zoom, then compare Player preview and monochrome export. This is a visual reference, not a balanced encounter; add a goal before playing it.',
  },
  'folio-materials': {
    role: 'Art reference',
    purpose: 'Compare flagstone, worn wood and earth on the same map without changing movement or sight.',
    use: 'Inspect the quarters and storeroom, paint a small test patch in your copy, and compare color with print patterns and transitions. Materials are decorative finishes, not new gameplay terrain rules.',
  },
  'folio-keepers-hall': {
    role: 'Art reference',
    purpose: 'Demonstrate the original eight Folio furnishings in a compact inhabited room layout.',
    use: 'Select a furnishing and try scale, rotation or flips, then Undo. Compare the player view with the private supply area and export styling. Add your own objective before treating the reference as an encounter.',
  },
  'folio-wayfarers-refuge': {
    role: 'Art reference',
    purpose: 'Show all 24 Folio furnishings in a hall, sleeping area, chapel and campsite.',
    use: 'Inspect the objects you want to reuse, compare their color and print silhouettes, and adapt a copy for your own scene. Furnishing fires, tents and foliage do not add light, collisions or sight blocking.',
  },
  'folio-token-watch': {
    role: 'Art reference',
    purpose: 'Compare the original Folio token silhouettes and affiliation frames in a small furnished scene.',
    use: 'Inspect the party, NPC and hostile tokens, then compare Player preview and monochrome export. Token kind and visibility remain meaningful; the sample is an art demonstration, not a combat balance example.',
  },
  'folio-crooked-company': {
    role: 'Art reference',
    purpose: 'Show the complete twelve-design Folio token catalog with party, NPC and hostile affiliations.',
    use: 'Compare small silhouettes and shape-coded frames, try a different icon on a token, and Undo. Use the cast as visual examples, not an implied encounter roster or ruleset.',
  },
  'launch-lantern-crypt': {
    role: 'Launch encounter',
    purpose: 'Explore the memorial, recover its brass key and return to the lantern stair without disturbing the burial watch.',
    use: 'Begin at the south stair. The basin holds the objective; the keeper ledger suggests an optional cache route. Negotiate with the watch or leave the sealed chamber alone. Success is returning with the key, not clearing every room. DM notes hold the discoveries; resolve them in your chosen rules.',
  },
  'launch-alder-crossing': {
    role: 'Launch encounter',
    purpose: 'Get the party across the timber bridge and continue along the far-side trail without provoking the lookout wolf.',
    use: 'Start on the western trail and speak with the bridge keeper, who asks for news rather than coin. The camp is a safe place to pause; food or a calm approach can avoid the wolf. Success is reaching the eastern trail together. Use your chosen rules; no toll or creature behavior is automated.',
  },
  'launch-kestrel-bay': {
    role: 'Launch encounter',
    purpose: 'Release the stranded engineer from sealed crew quarters and escort them to the aft airlock.',
    use: 'Use port control for a quiet interlock release and security standby, or take cargo tools to the locked entrance for a manual bypass. Warn before a noisy attempt alerts security. The coolant core is stable, combat is optional, and the engineer can walk once freed. Read the DM notes for each area.',
  },
};

export function sampleGuide(id: string): SampleGuide {
  const guide = Object.hasOwn(SAMPLE_GUIDES, id) ? SAMPLE_GUIDES[id] : undefined;
  if (!guide) throw new Error(`Missing purpose and usage guidance for sample: ${id}`);
  return guide;
}

export function sampleGuideText(name: string, guide: SampleGuide): string {
  return `Sample guide: ${name}\nRole: ${guide.role}\nPurpose: ${guide.purpose}\nHow to use: ${guide.use}`;
}
