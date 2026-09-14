import type { IconDef } from '../../utils/iconLibrary';
import type { TokenKind } from '../../types/map';

export interface FolioTokenDef extends IconDef {
  blurb: string;
  previewKind: TokenKind;
  glyphScale?: number;
}

export const FOLIO_TOKENS = [
  {
    id: 'folio-token-v1-warden',
    name: 'Folio Warden',
    category: 'Folio tokens',
    blurb: 'Brings a shield to every argument.',
    previewKind: 'player',
    path: 'M256 80L386 138V244C386 324 330 390 256 438C182 390 126 324 126 244V138ZM256 124L166 166V244C166 304 208 356 256 392Z',
  },
  {
    id: 'folio-token-v1-wayfinder',
    name: 'Folio Wayfinder',
    category: 'Folio tokens',
    blurb: 'Definitely knows a shortcut.',
    previewKind: 'npc',
    path: 'M244 48Q164 110 158 196L188 220L154 270L110 422L226 462L334 424L300 304L316 252L284 218L312 196Q304 110 244 48ZM242 108Q278 142 278 178L242 202L206 178Q206 142 242 108ZM212 252L188 382L226 404ZM332 80L354 48L392 62L410 96L390 124L374 114L382 92L370 82L354 98L364 132V456H338V132ZM298 244L358 228L372 254L310 284Z',
  },
  {
    id: 'folio-token-v1-drake',
    name: 'Folio Drake',
    category: 'Folio tokens',
    blurb: 'Small token, big fire hazard.',
    previewKind: 'monster',
    path: 'M144 444C132 396 112 332 146 278L116 248L162 250C176 214 180 192 176 168L142 114L200 132C210 108 232 94 258 94L250 54C294 64 310 94 310 116C336 126 350 148 358 166L410 182C438 190 454 206 440 228L424 252L348 256C338 278 310 294 290 300C300 350 340 404 366 444ZM292 154L326 166L294 180ZM396 202A8 8 0 1 0 412 202A8 8 0 1 0 396 202ZM336 222Q376 228 418 218L414 234L342 240ZM204 292Q184 344 222 408H250Q210 350 238 302Z',
  },
  {
    id: 'folio-token-v1-ranger',
    name: 'Folio Ranger',
    category: 'Folio tokens',
    blurb: 'Never misses a shot at your cooking.',
    previewKind: 'player',
    path: 'M152 62Q182 64 192 104C204 150 300 182 312 232L326 238V276L312 282C300 334 204 350 192 392Q182 418 152 420ZM166 100V394L178 380C194 344 272 320 286 280L274 276V238L286 234C272 194 194 158 178 116ZM338 244H406L392 378Q378 408 356 390ZM354 264H390L386 282H356ZM340 150L350 112L368 150L358 164V244H346V164ZM374 184L384 146L402 184L392 198V244H380V198Z',
  },
  {
    id: 'folio-token-v1-duelist',
    name: 'Folio Duelist',
    category: 'Folio tokens',
    blurb: 'Has a point, and insists on making it.',
    previewKind: 'player',
    path: 'M108 178Q138 154 170 150L182 104Q220 86 258 98L278 138C286 94 314 72 364 54C362 96 346 128 310 148Q344 154 374 174L356 190Q304 182 264 190Q200 204 146 192ZM184 144Q218 130 268 142L276 156Q230 144 188 164ZM300 134Q324 104 346 84Q328 122 300 146ZM182 362L350 194L390 180L374 220L206 386L224 404L210 418L192 400L168 424L148 404L172 382L154 364L168 350Z',
  },
  {
    id: 'folio-token-v1-arcanist',
    name: 'Folio Arcanist',
    category: 'Folio tokens',
    blurb: 'Read the spellbook, skipped the warnings.',
    previewKind: 'player',
    path: 'M94 294Q120 274 142 268L196 102Q202 84 226 80L276 92L232 110L258 174L274 258Q298 266 310 290Q272 322 218 318Q142 324 94 294ZM158 246Q214 262 266 242L272 260Q220 280 150 264ZM376 72L414 118L394 156L318 430L292 422L358 150L338 118ZM376 100L394 120L376 140L358 120Z',
  },
  {
    id: 'folio-token-v1-sunkeeper',
    name: 'Folio Sunkeeper',
    category: 'Folio tokens',
    blurb: 'Offers healing and unsolicited life advice.',
    previewKind: 'npc',
    path: 'M256 80L288 135L344 104L344 168L408 168L377 224L432 256L377 288L408 344L344 344L344 408L288 377L256 432L224 377L168 408L168 344L104 344L135 288L80 256L135 224L104 168L168 168L168 104L224 135ZM256 170A86 86 0 1 0 256 342A86 86 0 1 0 256 170ZM256 202A54 54 0 1 1 256 310A54 54 0 1 1 256 202Z',
  },
  {
    id: 'folio-token-v1-brute',
    name: 'Folio Brute',
    category: 'Folio tokens',
    blurb: 'Solves puzzles by removing the wall.',
    previewKind: 'monster',
    path: 'M162 160C158 108 196 80 252 80C312 80 344 110 340 160L386 144L380 216L346 242L342 292C332 350 300 396 256 420C212 396 180 350 170 292L164 242L128 218L122 148ZM184 192L230 206L190 226ZM278 206L326 192L320 226ZM244 230H268L278 264H234ZM190 264L218 294H292L318 258L312 322Q254 362 198 320Z',
  },
  {
    id: 'folio-token-v1-wolf',
    name: 'Folio Wolf',
    category: 'Folio tokens',
    blurb: 'A very good boy with terrible references.',
    previewKind: 'monster',
    path: 'M114 54L208 122L256 100L314 120L402 58L384 214L412 254L362 272L378 310L334 322L346 356L298 364L258 458L216 366L168 358L180 322L134 310L150 272L102 256L132 208ZM158 122L182 164L152 186ZM342 128L318 164L350 182ZM164 230L220 246L194 272ZM294 246L350 230L322 272ZM220 318L258 298L296 318L258 350ZM232 368L258 382L282 368L258 420Z',
  },
  {
    id: 'folio-token-v1-owl',
    name: 'Folio Owl',
    category: 'Folio tokens',
    blurb: 'Judging your plan from a better angle.',
    previewKind: 'npc',
    path: 'M146 124L134 66L204 102Q256 84 308 102L378 66L366 124Q404 176 394 250L380 328Q366 382 302 410L284 442L256 420L228 442L210 410Q144 382 132 328L118 252Q108 180 146 124ZM156 184C160 148 210 142 240 180L256 202L272 180C302 142 352 148 356 184C374 230 330 266 280 244L256 274L232 244C182 266 138 230 156 184ZM190 184A16 20 0 1 0 222 184A16 20 0 1 0 190 184ZM290 184A16 20 0 1 0 322 184A16 20 0 1 0 290 184ZM156 278Q166 332 206 368Q154 350 146 300ZM356 278Q348 332 306 368Q360 350 366 300ZM228 302L256 326L284 302L256 350Z',
  },
  {
    id: 'folio-token-v1-spider',
    name: 'Folio Spider',
    category: 'Folio tokens',
    blurb: 'Eight legs, zero respect for personal space.',
    previewKind: 'monster',
    glyphScale: 0.5,
    path: 'M208 182Q182 132 218 106L202 72L224 60L244 94H268L288 60L310 72L294 106Q330 134 304 182Q354 218 338 300Q324 362 256 394Q188 362 174 300Q156 220 208 182ZM226 122A12 12 0 1 0 226 146A12 12 0 1 0 226 122ZM286 122A12 12 0 1 0 286 146A12 12 0 1 0 286 122ZM256 214L220 258L256 320L292 258ZM178 186L122 128L100 52L72 60L96 146L162 216ZM164 234L90 200L42 142L24 166L76 228L158 264ZM162 282L82 300L40 382L68 396L102 326L172 310ZM182 328L132 382L130 464H160L162 396L202 354ZM334 186L390 128L412 52L440 60L416 146L350 216ZM348 234L422 200L470 142L488 166L436 228L354 264ZM350 282L430 300L472 382L444 396L410 326L340 310ZM330 328L380 382L382 464H352L350 396L310 354Z',
  },
  {
    id: 'folio-token-v1-ooze',
    name: 'Folio Ooze',
    category: 'Folio tokens',
    blurb: 'Going places, mostly under doors.',
    previewKind: 'monster',
    glyphScale: 0.58,
    path: 'M86 350L118 334Q130 294 144 252C148 184 178 142 240 140C298 140 314 180 322 220L344 286Q352 316 384 326L416 336Q450 350 440 374Q420 402 364 402H142Q92 398 72 372Q60 356 86 350ZM170 248C166 208 192 178 224 178Q190 210 190 256ZM272 282A14 14 0 1 0 300 282A14 14 0 1 0 272 282ZM140 356Q224 376 320 358Q270 390 148 378Z',
  },
] satisfies FolioTokenDef[];

export const FOLIO_TOKEN_BY_ID: ReadonlyMap<string, FolioTokenDef> = new Map(
  FOLIO_TOKENS.map(icon => [icon.id, icon]),
);

const SOURCE_HASHES: Record<string, string> = {
  'folio-token-v1-warden': 'b5d2069fd29343bcf94704554df8643e4a0d4d858ca7f2f2b9bb7c59364f49b0',
  'folio-token-v1-wayfinder': '8a1ea6841143bbcc55395f8c78cbee72822f29c1adf423be093126e339806e61',
  'folio-token-v1-drake': '30aef312b63e5f98e191d93fcaf474852181977a4c07f8fc4cacd4b8107684f3',
  'folio-token-v1-ranger': '0ee6ad28cd4d44d5b14b47e63066a9a04c22a801b6a53d4762230a6d7cada503',
  'folio-token-v1-duelist': 'dba9827e610da9b11034817e2456a21e6c864b6bc81e2acc3c2dea71c58249a3',
  'folio-token-v1-arcanist': 'af165daa2dc63bd52c2596a495cf8824692409a2df2e230ab06d05d405b966ab',
  'folio-token-v1-sunkeeper': 'a82d4444bcde26ed18f986e443d93a5c0c429002725a0ee2b261488f1b4a0e5c',
  'folio-token-v1-brute': '28acb08e0778b5ab148735ecb979d6a5bcd308a68d5689f2c9b1f814f15d9eb6',
  'folio-token-v1-wolf': 'ae61963e8f65b1a1ae88372909c17424bd3b9d79c48c52b57f567cac6721e4d3',
  'folio-token-v1-owl': '7876b9ce5ad8cca1e25b5490667c8acabe82523139c5d2369156828c33cd93d0',
  'folio-token-v1-spider': 'a9cfa2886b097963ac4d80673037164b8db6c876318053ee8e3311f8b81fdae0',
  'folio-token-v1-ooze': '4b8b7c2e83db14ec43ca6351fdc470b6e646bcc577746c05c0b3a5b1f063a672',
};

export const FOLIO_TOKEN_MANIFEST = {
  schemaVersion: 1,
  packId: 'dungeon-folio-tokens',
  version: '1.0.0',
  renderVersion: 1,
  approval: 'Complete catalog, affiliation frames and one-line copy approved September 14, 2026.',
  author: 'Dungeon Mapper contributors',
  attribution: 'Original vector silhouettes and affiliation frames for Dungeon Mapper, 2026.',
  license: 'AGPL-3.0-or-later',
  delivery: 'bundled-vector',
  previewSampleId: 'folio-crooked-company',
  referenceSampleId: 'folio-token-watch',
  frameSource: 'src/utils/folioTokenRender.ts',
  assets: FOLIO_TOKENS.map(icon => ({
    id: icon.id, name: icon.name, viewBox: '0 0 512 512',
    source: `src/assets/folio-tokens-v1/${icon.id.replace('folio-token-v1-', '')}.svg`,
    sourceHash: `sha256:${SOURCE_HASHES[icon.id]}`,
    anchor: [256, 256], frameCells: [1, 1],
  })),
} as const;
