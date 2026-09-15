// Original Dungeon Mapper artwork. SPDX-License-Identifier: AGPL-3.0-or-later
// Editable 240 x 144 SVG scenes. Decorative only; never derived from project data.
interface IllustrationLayer {
  d: string;
  treatment: 'paper' | 'wash' | 'accent' | 'line' | 'detail' | 'route' | 'connector' | 'guide';
}

export type FirstUseScene = 'create' | 'backup' | 'display';

export const FIRST_USE_ILLUSTRATIONS: Record<FirstUseScene, readonly IllustrationLayer[]> = {
  create: [
    { treatment: 'paper', d: 'm36 39 48-17 55 15 52-13-7 88-47 13-57-15-50 13 6-84Z' },
    { treatment: 'wash', d: 'm84 22 55 15-2 88-57-15 4-88Z' },
    { treatment: 'detail', d: 'm84 22-4 88m59-73-2 88M44 46l18-6m-19 12 10-3M149 104l24-6m-24 12 14-4' },
    { treatment: 'line', d: 'm45 65 23-7-1 21-23 6 1-20Zm51-11 29 8v21l-29-8V54Zm8 43 20 5v13l-20-5V97Z' },
    { treatment: 'route', d: 'm57 85-1 11 32-8 15 5m21-24 13 3 18-4' },
    { treatment: 'accent', d: 'm183 22 17 14-34 42-20 8 6-22 31-42Z' },
    { treatment: 'paper', d: 'm152 64 14 14-20 8 6-22Z' },
    { treatment: 'line', d: 'm179 27 17 14m-34 22 23-29m-36 44 5 4' },
    { treatment: 'accent', d: 'm52 9 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z' },
  ],
  backup: [
    { treatment: 'paper', d: 'M67 101h12v13l12 6H55l12-6v-13Z' },
    { treatment: 'paper', d: 'M30 36h89v65H30V36Zm7 7h75v51H37V43Z' },
    { treatment: 'wash', d: 'M37 43h75v51H37V43Z' },
    { treatment: 'paper', d: 'm49 54 14-4 17 5 17-4v30l-17 4-17-5-14 4V54Z' },
    { treatment: 'detail', d: 'm63 50 0 30m17-25v30m-26-19 6-2m6-1 9 3m8 3 9-2' },
    { treatment: 'connector', d: 'M124 48h20q8 0 8 8v9' },
    { treatment: 'guide', d: 'm147 61 5 5 5-5' },
    { treatment: 'wash', d: 'm158 81 43-6 10 47-48 5-5-46Z' },
    { treatment: 'paper', d: 'M154 72h31l16 16v38h-47V72Z' },
    { treatment: 'accent', d: 'M185 72v16h16M164 96h27v22h-27V96Z' },
    { treatment: 'line', d: 'm167 100 7-2 8 3 6-2v12l-6 2-8-3-7 2v-12Zm7-2v12m8-9v12' },
  ],
  display: [
    { treatment: 'paper', d: 'M141 104h17v13l15 7h-47l15-7v-13Z' },
    { treatment: 'paper', d: 'M89 27h122v77H89V27Zm8 8h106v61H97V35Z' },
    { treatment: 'wash', d: 'M97 35h106v61H97V35Z' },
    { treatment: 'accent', d: 'M143 82V48h13a11 11 0 0 1 0 22h-5v12h-8Zm8-27v8h5a4 4 0 0 0 0-8h-5Z' },
    { treatment: 'detail', d: 'M103 46v-5h8m78 0h8v5m0 39v5h-8m-78 0h-8v-5' },
    { treatment: 'paper', d: 'm33 73 19-6 22 7-4 50-22-7-18 5 3-49Z' },
    { treatment: 'detail', d: 'm52 67-4 50m-10-30 9-3m-9 8 7-2m11-7 10 3m-11 3 6 2' },
    { treatment: 'line', d: 'm55 102 11 3-1 10-11-3 1-10Z' },
    { treatment: 'connector', d: 'M56 56V43q0-9 9-9h10' },
    { treatment: 'guide', d: 'm71 29 5 5-5 5' },
  ],
};
