import type { IconDef } from '../../utils/iconLibrary';

export const FOLIO_TOKENS = [
  {
    id: 'folio-token-v1-warden',
    name: 'Folio Warden',
    category: 'Folio tokens',
    path: 'M198 108Q202 60 256 52Q310 60 314 108L326 174L278 198V130H234V198L186 174ZM140 204L210 222V276L170 286V410H112V266ZM372 204L402 232V338H370V410H324V270L302 260V222ZM222 228L316 266V340Q300 400 250 434Q200 400 184 340V266ZM240 264V368L210 338V284ZM222 422L240 438V464H182V414ZM268 438L286 422L326 414V464H268Z',
  },
  {
    id: 'folio-token-v1-wayfinder',
    name: 'Folio Wayfinder',
    category: 'Folio tokens',
    path: 'M244 48Q164 110 158 196L188 220L154 270L110 422L226 462L334 424L300 304L316 252L284 218L312 196Q304 110 244 48ZM242 108Q278 142 278 178L242 202L206 178Q206 142 242 108ZM212 252L188 382L226 404ZM332 80L354 48L392 62L410 96L390 124L374 114L382 92L370 82L354 98L364 132V456H338V132ZM298 244L358 228L372 254L310 284Z',
  },
  {
    id: 'folio-token-v1-drake',
    name: 'Folio Drake',
    category: 'Folio tokens',
    path: 'M126 56L218 112L292 88L354 48L336 146L376 182L420 194L394 260L338 270L366 316L332 332L352 370L300 368L308 402L258 390L254 432L208 398L182 448Q102 366 124 286L158 218L150 166ZM278 158L326 182L284 202ZM332 222L376 218L366 240L340 240ZM184 258Q152 316 186 368L206 326Z',
  },
] satisfies IconDef[];

export const FOLIO_TOKEN_BY_ID: ReadonlyMap<string, IconDef> = new Map(
  FOLIO_TOKENS.map(icon => [icon.id, icon]),
);

const SOURCE_HASHES: Record<string, string> = {
  'folio-token-v1-warden': '4ea371810f55dc338f9d73d1b4004105b079c21aaaa03ccacb179b469fc905a2',
  'folio-token-v1-wayfinder': '8a1ea6841143bbcc55395f8c78cbee72822f29c1adf423be093126e339806e61',
  'folio-token-v1-drake': '01cd786dbcefc55d3394bdf3e27f74d43b4e2d63b305a935fb1c599da3667f10',
};

export const FOLIO_TOKEN_MANIFEST = {
  schemaVersion: 1,
  packId: 'dungeon-folio-tokens',
  version: '0.1.0',
  renderVersion: 1,
  approval: 'Pending owner visual review',
  author: 'Dungeon Mapper contributors',
  attribution: 'Original vector silhouettes and affiliation frames for Dungeon Mapper, 2026.',
  license: 'AGPL-3.0-or-later',
  delivery: 'bundled-vector',
  previewSampleId: 'folio-token-watch',
  frameSource: 'src/utils/folioTokenRender.ts',
  assets: FOLIO_TOKENS.map(icon => ({
    id: icon.id, name: icon.name, viewBox: '0 0 512 512',
    source: `src/assets/folio-tokens-v1/${icon.id.replace('folio-token-v1-', '')}.svg`,
    sourceHash: `sha256:${SOURCE_HASHES[icon.id]}`,
    anchor: [256, 256], frameCells: [1, 1],
  })),
} as const;
