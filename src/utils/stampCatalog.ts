/**
 * Built-in stamp catalog — 226 SVG stamps (70 universal + 156 per-theme).
 * Organized by category: furniture, dungeon-dressing, nature, structures, markers.
 * Per-theme stamps are tagged with themeId and filtered via StampPicker.
 *
 * Universal stamps use multi-path (`paths[]`) for rich layered rendering:
 * each sub-path carries its own fill, stroke, and strokeWidth so stamps
 * render with depth, shading, and variable line weight.
 */
import type { StampDef } from '../types/map';

export const BUILT_IN_STAMPS: StampDef[] = [
  // ── Furniture ─────────────────────────────────────────────────────────────
  {
    id: 'table',
    name: 'Table',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M80 200 h360 v40 q0 8 -8 8 H88 q-8 0 -8 -8Z', fill: 'rgba(0,0,0,0.15)' },
      // Legs
      { path: 'M136 240v148 M376 240v148 M172 240v140 M340 240v140', stroke: '#5a3a1a', strokeWidth: 14 },
      // Table top
      { path: 'M72 180 h368 q8 0 8 8 v44 q0 8 -8 8 H72 q-8 0 -8 -8 v-44 q0 -8 8 -8Z', fill: '#8b6914', stroke: '#5a3a1a', strokeWidth: 10 },
      // Wood grain
      { path: 'M96 200 h320 M96 216 h320 M96 208 c80 -4 160 4 240 -2', stroke: '#7a5a10', strokeWidth: 2 },
      // Highlight
      { path: 'M88 188 h336', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 4 },
    ],
  },
  {
    id: 'chair',
    name: 'Chair',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M192 148 h128 v180 H192Z', fill: 'rgba(0,0,0,0.1)' },
      // Back rest
      { path: 'M192 108 h128 v24 q0 8 -8 8 H200 q-8 0 -8 -8Z', fill: '#7a5a14', stroke: '#4a3010', strokeWidth: 8 },
      // Seat
      { path: 'M180 244 h152 v32 q0 6 -6 6 H186 q-6 0 -6 -6Z', fill: '#8b6914', stroke: '#4a3010', strokeWidth: 8 },
      // Legs
      { path: 'M196 276v108 M316 276v108', stroke: '#5a3a1a', strokeWidth: 12 },
      // Back spindles
      { path: 'M220 132v112 M256 132v112 M292 132v112', stroke: '#6a4a14', strokeWidth: 6 },
    ],
  },
  {
    id: 'bed',
    name: 'Bed',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M88 170 h340 v180 H88Z', fill: 'rgba(0,0,0,0.08)' },
      // Frame
      { path: 'M80 160 h352 q8 0 8 8 v184 q0 8 -8 8 H80 q-8 0 -8 -8 v-184 q0 -8 8 -8Z', fill: '#7a5a14', stroke: '#4a3010', strokeWidth: 10 },
      // Mattress
      { path: 'M100 176 h312 q6 0 6 6 v140 q0 6 -6 6 H100 q-6 0 -6 -6 v-140 q0 -6 6 -6Z', fill: '#e8dcc8', stroke: '#c2b090', strokeWidth: 4 },
      // Pillow
      { path: 'M112 184 q0 -4 4 -4 h80 q4 0 4 4 v40 q0 4 -4 4 h-80 q-4 0 -4 -4Z', fill: '#f4efe4', stroke: '#c8c0b0', strokeWidth: 3 },
      // Blanket fold
      { path: 'M100 260 h312 M100 290 c60 12 120 -8 180 6 c40 8 92 -4 132 2', stroke: '#b8a888', strokeWidth: 3 },
      // Headboard
      { path: 'M80 148 h100 v28 H80Z', fill: '#6a4a10', stroke: '#3a2a08', strokeWidth: 6 },
      // Legs
      { path: 'M92 352v40 M420 352v40', stroke: '#5a3a1a', strokeWidth: 10 },
    ],
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Frame
      { path: 'M104 68 h304 q8 0 8 8 v360 q0 8 -8 8 H104 q-8 0 -8 -8 v-360 q0 -8 8 -8Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 10 },
      // Shelves
      { path: 'M112 196h288 M112 308h288', stroke: '#5a3a10', strokeWidth: 10 },
      // Books row 1
      { path: 'M128 96v92 M146 88v104 M162 92v100 M180 84v108 M198 90v102 M220 86v106 M240 94v98 M258 82v110 M278 90v102 M298 96v96 M318 84v108 M338 92v100 M358 88v104 M378 96v96', stroke: '#8a3a3a', strokeWidth: 10 },
      { path: 'M146 88v104 M180 84v108 M258 82v110 M318 84v108', stroke: '#2a5a8a', strokeWidth: 10 },
      { path: 'M220 86v106 M298 96v96 M378 96v96', stroke: '#3a6a3a', strokeWidth: 10 },
      // Books row 2
      { path: 'M128 210v90 M148 206v94 M168 212v88 M190 204v96 M212 210v90 M234 208v92 M256 214v86 M278 206v94 M300 212v88 M320 204v96 M342 210v90 M362 208v92 M382 214v86', stroke: '#6a4a8a', strokeWidth: 10 },
      { path: 'M148 206v94 M212 210v90 M300 212v88 M362 208v92', stroke: '#8a6a2a', strokeWidth: 10 },
      // Books row 3
      { path: 'M128 320v88 M150 316v92 M172 322v86 M196 314v94 M218 320v88 M240 318v90 M262 324v84 M286 316v92 M308 322v86 M330 314v94 M352 318v90 M374 320v88', stroke: '#4a4a6a', strokeWidth: 10 },
      { path: 'M150 316v92 M218 320v88 M308 322v86', stroke: '#8a5a3a', strokeWidth: 10 },
    ],
  },
  {
    id: 'throne',
    name: 'Throne',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M152 108 h208 v310 H152Z', fill: 'rgba(0,0,0,0.1)' },
      // Back
      { path: 'M168 80 h176 q16 0 16 16 v60 q0 8 -8 8 H160 q-8 0 -8 -8 v-60 q0 -16 16 -16Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 8 },
      // Armrests
      { path: 'M120 128 h48 v200 h-48Z', fill: '#7a5a18', stroke: '#3a2a08', strokeWidth: 8 },
      { path: 'M344 128 h48 v200 h-48Z', fill: '#7a5a18', stroke: '#3a2a08', strokeWidth: 8 },
      // Seat cushion
      { path: 'M172 240 h168 q8 0 8 8 v72 q0 8 -8 8 H172 q-8 0 -8 -8 v-72 q0 -8 8 -8Z', fill: '#8a2020', stroke: '#5a1010', strokeWidth: 6 },
      // Back cushion
      { path: 'M180 120 h152 v116 H180Z', fill: '#9a2828', stroke: '#5a1010', strokeWidth: 4 },
      // Gold trim
      { path: 'M168 80 h176 M120 128 h272', stroke: '#d4af37', strokeWidth: 6 },
      // Crown ornament
      { path: 'M224 68 l16 -20 l16 20 l16 -20 l16 20', stroke: '#d4af37', strokeWidth: 5, fill: 'none' },
      // Legs
      { path: 'M136 328v72 M376 328v72', stroke: '#5a3a1a', strokeWidth: 12 },
    ],
  },
  {
    id: 'cabinet',
    name: 'Cabinet',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Body
      { path: 'M136 84 h240 q8 0 8 8 v328 q0 8 -8 8 H136 q-8 0 -8 -8 v-328 q0 -8 8 -8Z', fill: '#7a5a14', stroke: '#3a2a08', strokeWidth: 10 },
      // Divider
      { path: 'M144 260 h224', stroke: '#4a3010', strokeWidth: 8 },
      // Center divide
      { path: 'M256 92 v328', stroke: '#4a3010', strokeWidth: 6 },
      // Handles
      { path: 'M232 178 a8 8 0 1 1 0 16 M280 178 a8 8 0 1 1 0 16', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
      { path: 'M232 330 a8 8 0 1 1 0 16 M280 330 a8 8 0 1 1 0 16', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
      // Feet
      { path: 'M148 420 v16 q0 4 -8 4 M364 420 v16 q0 4 8 4', stroke: '#5a3a1a', strokeWidth: 8 },
    ],
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Hearth base
      { path: 'M80 340 h352 v80 q0 8 -8 8 H88 q-8 0 -8 -8Z', fill: '#5a5a5a', stroke: '#2a2a2a', strokeWidth: 8 },
      // Stone surround
      { path: 'M112 140 h288 v200 H112Z', fill: '#8a8070', stroke: '#4a4038', strokeWidth: 10 },
      // Fire opening
      { path: 'M176 200 q80 -40 160 0 v140 H176Z', fill: '#1a1008', stroke: '#3a2a18', strokeWidth: 6 },
      // Fire
      { path: 'M220 320 q16 -50 36 -80 q20 30 36 80Z', fill: '#e84820' },
      { path: 'M236 320 q10 -36 20 -56 q10 20 20 56Z', fill: '#f0a820' },
      { path: 'M248 320 q4 -20 8 -32 q4 12 8 32Z', fill: '#f8e040' },
      // Mantle
      { path: 'M96 128 h320 v20 H96Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 6 },
      // Stone detail
      { path: 'M112 180h72 M112 220h60 M340 180h60 M350 220h50', stroke: '#6a6058', strokeWidth: 3 },
    ],
  },
  {
    id: 'rug',
    name: 'Rug',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M92 164 h336 v192 H92Z', fill: 'rgba(0,0,0,0.06)' },
      // Rug body
      { path: 'M80 148 h352 v216 H80Z', fill: '#8a2828', stroke: '#5a1818', strokeWidth: 6 },
      // Inner border
      { path: 'M108 172 h296 v168 H108Z', fill: 'none', stroke: '#d4af37', strokeWidth: 5 },
      // Inner field
      { path: 'M128 192 h256 v128 H128Z', fill: '#6a1818' },
      // Center diamond
      { path: 'M256 208 l64 48 l-64 48 l-64 -48Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
      // Corner ornaments
      { path: 'M140 204 l20 0 l0 20 M372 204 l-20 0 l0 20 M140 308 l20 0 l0 -20 M372 308 l-20 0 l0 -20', stroke: '#d4af37', strokeWidth: 4 },
      // Fringe
      { path: 'M96 148v-16 M128 148v-16 M160 148v-16 M192 148v-16 M224 148v-16 M256 148v-16 M288 148v-16 M320 148v-16 M352 148v-16 M384 148v-16 M416 148v-16', stroke: '#8a2828', strokeWidth: 4 },
      { path: 'M96 364v16 M128 364v16 M160 364v16 M192 364v16 M224 364v16 M256 364v16 M288 364v16 M320 364v16 M352 364v16 M384 364v16 M416 364v16', stroke: '#8a2828', strokeWidth: 4 },
    ],
  },

  // ── Dungeon Dressing ──────────────────────────────────────────────────────
  {
    id: 'chest',
    name: 'Chest',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M100 200 h320 v196 H100Z', fill: 'rgba(0,0,0,0.1)' },
      // Chest body
      { path: 'M88 224 h336 v160 q0 8 -8 8 H96 q-8 0 -8 -8Z', fill: '#7a5a14', stroke: '#3a2a08', strokeWidth: 10 },
      // Lid (arched)
      { path: 'M88 224 q168 -80 336 0Z', fill: '#8b6914', stroke: '#3a2a08', strokeWidth: 10 },
      // Metal bands
      { path: 'M176 160v232 M336 160v232', stroke: '#888', strokeWidth: 8 },
      // Lock plate
      { path: 'M232 280 h48 v40 h-48Z', fill: '#aaa', stroke: '#666', strokeWidth: 4 },
      // Keyhole
      { path: 'M256 292 a6 6 0 1 1 0 12 M254 304 v10 h4 v-10', fill: '#333' },
      // Lid highlight
      { path: 'M120 212 q136 -60 272 0', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 4 },
    ],
  },
  {
    id: 'barrel',
    name: 'Barrel',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M180 104 c70 -10 140 -10 200 0 v310 c-60 10 -140 10 -200 0Z', fill: 'rgba(0,0,0,0.08)' },
      // Barrel body (bulging shape)
      { path: 'M168 108 q88 -24 176 0 v296 q-88 24 -176 0Z', fill: '#8b6914', stroke: '#4a3010', strokeWidth: 10 },
      // Staves (vertical grain lines)
      { path: 'M208 100v312 M248 96v320 M296 96v320 M336 100v312', stroke: '#7a5a10', strokeWidth: 3 },
      // Metal hoops
      { path: 'M176 148 q80 -16 160 0 M172 252 q84 -20 168 0 M176 356 q80 -16 160 0', stroke: '#888', strokeWidth: 10 },
      // Lid ellipse
      { path: 'M176 108 q80 -20 160 0 q-80 20 -160 0Z', fill: '#9a7a20', stroke: '#5a3a10', strokeWidth: 4 },
      // Highlight
      { path: 'M200 140v220', stroke: 'rgba(255,255,255,0.12)', strokeWidth: 8 },
    ],
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M256 80 c-90 0 -164 72 -164 164 c0 62 34 116 84 144 v40 h160 v-40 c50 -28 84 -82 84 -144 c0 -92 -74 -164 -164 -164Z', fill: 'rgba(0,0,0,0.08)' },
      // Cranium
      { path: 'M256 72 c-86 0 -156 70 -156 156 c0 58 32 108 80 136 v44 h152 v-44 c48 -28 80 -78 80 -136 c0 -86 -70 -156 -156 -156Z', fill: '#e8e0d0', stroke: '#888070', strokeWidth: 8 },
      // Left eye socket
      { path: 'M196 200 q12 -20 32 -16 q20 4 20 28 q0 24 -20 28 q-20 4 -32 -16Z', fill: '#2a2018' },
      // Right eye socket
      { path: 'M264 200 q12 -20 32 -16 q20 4 20 28 q0 24 -20 28 q-20 4 -32 -16Z', fill: '#2a2018' },
      // Nose
      { path: 'M244 276 l12 -20 l12 20Z', fill: '#2a2018' },
      // Teeth
      { path: 'M208 312 h96 v28 H208Z', fill: '#d8d0c0', stroke: '#888070', strokeWidth: 3 },
      { path: 'M224 312v28 M240 312v28 M256 312v28 M272 312v28 M288 312v28', stroke: '#aaa090', strokeWidth: 2 },
      // Jaw line
      { path: 'M196 308 h120', stroke: '#888070', strokeWidth: 4 },
      // Crack detail
      { path: 'M280 100 q-8 40 4 60 q-4 20 8 40', stroke: '#aaa090', strokeWidth: 2 },
    ],
  },
  {
    id: 'trap',
    name: 'Trap',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Floor plate
      { path: 'M120 120 h272 v272 H120Z', fill: '#8a8070', stroke: '#5a5048', strokeWidth: 8 },
      // Inner plate (pressure)
      { path: 'M160 160 h192 v192 H160Z', fill: '#9a9080', stroke: '#6a6058', strokeWidth: 4 },
      // Warning X
      { path: 'M176 176 l160 160 M336 176 l-160 160', stroke: '#8a2020', strokeWidth: 12 },
      // Center diamond
      { path: 'M256 200 l40 56 l-40 56 l-40 -56Z', fill: '#8a2020', stroke: '#5a1010', strokeWidth: 4 },
      // Corner rivets
      { path: 'M140 140 a8 8 0 1 1 16 0 a8 8 0 1 1 -16 0', fill: '#aaa' },
      { path: 'M356 140 a8 8 0 1 1 16 0 a8 8 0 1 1 -16 0', fill: '#aaa' },
      { path: 'M140 356 a8 8 0 1 1 16 0 a8 8 0 1 1 -16 0', fill: '#aaa' },
      { path: 'M356 356 a8 8 0 1 1 16 0 a8 8 0 1 1 -16 0', fill: '#aaa' },
    ],
  },
  {
    id: 'altar',
    name: 'Altar',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Base/pedestal
      { path: 'M128 340 h256 v48 q0 8 -8 8 H136 q-8 0 -8 -8Z', fill: '#8a8070', stroke: '#5a5048', strokeWidth: 8 },
      // Altar table
      { path: 'M160 220 h192 v120 H160Z', fill: '#a09888', stroke: '#5a5048', strokeWidth: 8 },
      // Cloth drape
      { path: 'M152 210 h208 v24 q-40 16 -80 8 q-40 -8 -80 8 v-24Z', fill: '#8a2020', stroke: '#5a1010', strokeWidth: 4 },
      // Gold trim
      { path: 'M152 234 q52 16 104 0 q52 -16 104 0', stroke: '#d4af37', strokeWidth: 4 },
      // Candles
      { path: 'M176 180v30 M336 180v30', stroke: '#e8dcc8', strokeWidth: 8 },
      { path: 'M176 172 q0 -8 0 -16 M336 172 q0 -8 0 -16', stroke: '#f0a820', strokeWidth: 4 },
      // Holy symbol
      { path: 'M256 252 v48 M240 272 h32', stroke: '#d4af37', strokeWidth: 6 },
      // Legs
      { path: 'M176 340v0 M336 340v0', stroke: '#6a6058', strokeWidth: 10 },
    ],
  },
  {
    id: 'lever',
    name: 'Lever',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Base plate
      { path: 'M192 368 h128 v40 q0 6 -6 6 H198 q-6 0 -6 -6Z', fill: '#888', stroke: '#555', strokeWidth: 6 },
      // Slot
      { path: 'M240 372 h32 v28 h-32Z', fill: '#333' },
      // Lever arm
      { path: 'M256 380 l-48 -240', stroke: '#aaa', strokeWidth: 14 },
      // Handle ball
      { path: 'M208 140 a20 20 0 1 1 0 -1Z', fill: '#cc3030', stroke: '#8a2020', strokeWidth: 4 },
      // Hinge
      { path: 'M244 372 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0', fill: '#777', stroke: '#444', strokeWidth: 3 },
    ],
  },
  {
    id: 'cage',
    name: 'Cage',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M140 92 h232 v328 H140Z', fill: 'rgba(0,0,0,0.06)' },
      // Top bar
      { path: 'M136 88 h240 v16 H136Z', fill: '#888', stroke: '#555', strokeWidth: 4 },
      // Bottom bar
      { path: 'M136 408 h240 v16 H136Z', fill: '#888', stroke: '#555', strokeWidth: 4 },
      // Vertical bars
      { path: 'M176 88v336 M216 88v336 M256 88v336 M296 88v336 M336 88v336', stroke: '#777', strokeWidth: 8 },
      // Horizontal bands
      { path: 'M140 200 h232 M140 312 h232', stroke: '#888', strokeWidth: 6 },
      // Lock
      { path: 'M144 244 h24 v24 h-24Z', fill: '#aa8820', stroke: '#775510', strokeWidth: 3 },
    ],
  },
  {
    id: 'cauldron',
    name: 'Cauldron',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M160 204 q96 -20 192 0 v160 q-96 20 -192 0Z', fill: 'rgba(0,0,0,0.08)' },
      // Cauldron body
      { path: 'M148 200 q108 -28 216 0 v128 q-108 40 -216 0Z', fill: '#3a3a3a', stroke: '#1a1a1a', strokeWidth: 10 },
      // Rim
      { path: 'M140 196 q116 -32 232 0', stroke: '#555', strokeWidth: 14 },
      // Liquid
      { path: 'M168 220 q80 -16 176 0 v80 q-96 28 -176 0Z', fill: '#2a7a2a' },
      // Bubbles
      { path: 'M220 240 a8 8 0 1 1 16 0 a8 8 0 1 1 -16 0', fill: '#4aba4a' },
      { path: 'M280 250 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0', fill: '#4aba4a' },
      { path: 'M248 228 a4 4 0 1 1 8 0 a4 4 0 1 1 -8 0', fill: '#4aba4a' },
      // Handles
      { path: 'M136 220 q-32 0 -32 -24 q0 -24 32 -24', stroke: '#555', strokeWidth: 8, fill: 'none' },
      { path: 'M376 220 q32 0 32 -24 q0 -24 -32 -24', stroke: '#555', strokeWidth: 8, fill: 'none' },
      // Legs
      { path: 'M192 356v44 M320 356v44', stroke: '#333', strokeWidth: 10 },
    ],
  },
  {
    id: 'sarcophagus',
    name: 'Sarcophagus',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M176 112 h168 q20 0 20 20 v240 q0 20 -20 20 H176 q-20 0 -20 -20 v-240 q0 -20 20 -20Z', fill: 'rgba(0,0,0,0.08)' },
      // Body
      { path: 'M172 108 h168 q16 0 16 16 v248 q0 16 -16 16 H172 q-16 0 -16 -16 v-248 q0 -16 16 -16Z', fill: '#a09888', stroke: '#5a5048', strokeWidth: 10 },
      // Lid inset
      { path: 'M192 128 h128 v224 H192Z', fill: '#b8b0a0', stroke: '#8a8070', strokeWidth: 4 },
      // Face area
      { path: 'M216 148 h80 v60 H216Z', fill: '#c8c0b0', stroke: '#9a9080', strokeWidth: 3 },
      // Crossed arms
      { path: 'M208 240 l96 48 M304 240 l-96 48', stroke: '#8a8070', strokeWidth: 6 },
      // Hieroglyphics
      { path: 'M212 328 h88 M220 312 h72 M228 296 h56', stroke: '#9a9080', strokeWidth: 3 },
      // Gold accents
      { path: 'M232 160 h48 M256 148v24', stroke: '#d4af37', strokeWidth: 4 },
    ],
  },
  {
    id: 'treasure-pile',
    name: 'Treasure',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Coin pile base
      { path: 'M144 320 q56 -80 112 -80 q56 0 112 80Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 6 },
      // Gold mound highlights
      { path: 'M180 300 q40 -48 76 -48 q36 0 76 48', fill: '#e8c840' },
      { path: 'M216 280 q24 -28 40 -28 q16 0 40 28', fill: '#f0d848' },
      // Individual coins
      { path: 'M180 316 a10 4 0 1 1 20 0 a10 4 0 1 1 -20 0', fill: '#f0d848', stroke: '#c0a030', strokeWidth: 2 },
      { path: 'M280 308 a10 4 0 1 1 20 0 a10 4 0 1 1 -20 0', fill: '#f0d848', stroke: '#c0a030', strokeWidth: 2 },
      { path: 'M330 320 a10 4 0 1 1 20 0 a10 4 0 1 1 -20 0', fill: '#f0d848', stroke: '#c0a030', strokeWidth: 2 },
      // Gems
      { path: 'M228 268 l8 -12 l8 12 l-8 8Z', fill: '#e03030', stroke: '#8a1010', strokeWidth: 2 },
      { path: 'M296 280 l6 -10 l6 10 l-6 6Z', fill: '#3060e0', stroke: '#1030a0', strokeWidth: 2 },
      { path: 'M260 260 l5 -8 l5 8 l-5 5Z', fill: '#30c030', stroke: '#108010', strokeWidth: 2 },
      // Chest peek
      { path: 'M320 296 h60 v28 H320Z', fill: '#7a5a14', stroke: '#3a2a08', strokeWidth: 4 },
      // Floor line
      { path: 'M120 332 h272', stroke: '#8a8070', strokeWidth: 3 },
    ],
  },
  {
    id: 'well',
    name: 'Well',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M256 128 a132 132 0 1 1 -1 0Z', fill: 'rgba(0,0,0,0.06)' },
      // Stone ring outer
      { path: 'M256 120 a136 136 0 1 1 -1 0Z', fill: '#8a8070', stroke: '#5a5048', strokeWidth: 8 },
      // Water/darkness inside
      { path: 'M256 172 a84 84 0 1 1 -1 0Z', fill: '#1a2a4a' },
      // Inner ring
      { path: 'M256 172 a84 84 0 1 1 -1 0Z', fill: 'none', stroke: '#6a6058', strokeWidth: 6 },
      // Water reflection
      { path: 'M220 248 q36 -12 72 0', stroke: 'rgba(100,140,200,0.4)', strokeWidth: 4 },
      { path: 'M232 264 q24 -8 48 0', stroke: 'rgba(100,140,200,0.3)', strokeWidth: 3 },
      // Stone texture
      { path: 'M160 200 a100 100 0 0 1 40 -60 M320 160 a100 100 0 0 1 32 48', stroke: '#7a7060', strokeWidth: 3 },
    ],
  },

  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: 'tree',
    name: 'Tree',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M256 100 q-120 60 -100 200 q10 40 60 60 q40 20 80 0 q60 -20 60 -60 q20 -140 -100 -200Z', fill: 'rgba(0,0,0,0.08)' },
      // Trunk
      { path: 'M240 320 v88 h32 v-88Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 6 },
      // Roots
      { path: 'M236 400 q-20 12 -36 8 M276 400 q20 12 36 8', stroke: '#5a3a10', strokeWidth: 6 },
      // Canopy layers (back to front for depth)
      { path: 'M256 80 q-100 40 -108 140 q-4 60 48 88 q40 24 120 0 q52 -28 48 -88 q-8 -100 -108 -140Z', fill: '#2a6a1a', stroke: '#1a4a10', strokeWidth: 8 },
      { path: 'M256 100 q-80 36 -84 116 q-2 48 40 68 q32 20 88 0 q42 -20 40 -68 q-4 -80 -84 -116Z', fill: '#3a8a28' },
      { path: 'M256 120 q-56 28 -56 84 q0 32 28 48 q24 12 56 0 q28 -16 28 -48 q0 -56 -56 -84Z', fill: '#4a9a38' },
      // Light dapples
      { path: 'M224 180 q12 -4 20 4 M280 200 q8 -6 16 2 M248 160 q6 -4 14 0', stroke: '#5aaa48', strokeWidth: 4 },
    ],
  },
  {
    id: 'campfire',
    name: 'Campfire',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Glow
      { path: 'M256 160 a100 100 0 1 1 -1 0Z', fill: 'rgba(240,120,20,0.08)' },
      // Log ring
      { path: 'M160 340 l60 40 M352 340 l-60 40 M180 360 h152', stroke: '#5a3a1a', strokeWidth: 16 },
      { path: 'M164 336 l64 44 M348 336 l-64 44', stroke: '#6a4a20', strokeWidth: 12 },
      // Embers
      { path: 'M220 352 q36 -8 72 0', fill: '#e03020', stroke: '#a02010', strokeWidth: 4 },
      // Outer flame
      { path: 'M256 120 q-48 40 -48 120 q0 60 48 80 q48 -20 48 -80 q0 -80 -48 -120Z', fill: '#e84820' },
      // Mid flame
      { path: 'M256 160 q-32 32 -32 88 q0 40 32 56 q32 -16 32 -56 q0 -56 -32 -88Z', fill: '#f0a820' },
      // Inner flame
      { path: 'M256 200 q-16 24 -16 52 q0 24 16 32 q16 -8 16 -32 q0 -28 -16 -52Z', fill: '#f8e040' },
      // Sparks
      { path: 'M240 140 v-12 M272 144 v-16 M232 160 l-8 -8 M280 156 l8 -12', stroke: '#f0a820', strokeWidth: 3 },
    ],
  },
  {
    id: 'rock',
    name: 'Rock',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M184 328 l-56 -92 l68 -68 l84 -20 l100 36 l36 84 l-52 84 l-100 16Z', fill: 'rgba(0,0,0,0.1)' },
      // Rock body
      { path: 'M180 320 l-52 -88 l64 -64 l80 -16 l96 32 l32 80 l-48 80 l-96 12Z', fill: '#8a8478', stroke: '#5a5448', strokeWidth: 8 },
      // Highlight face
      { path: 'M192 232 l64 -64 l80 -16 l-64 80Z', fill: '#9a9488' },
      // Cracks
      { path: 'M240 200 l20 40 l-8 60 M300 220 l-16 48 M216 280 l28 20', stroke: '#6a6458', strokeWidth: 3 },
      // Highlight edge
      { path: 'M192 232 l64 -64', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 4 },
    ],
  },
  {
    id: 'bush',
    name: 'Bush',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M256 160 q100 0 108 96 q4 60 -48 80 q-48 20 -120 0 q-52 -20 -48 -80 q8 -96 108 -96Z', fill: 'rgba(0,0,0,0.06)' },
      // Left lobe
      { path: 'M176 260 q-48 -8 -48 -52 q0 -56 64 -56 q40 0 52 32', fill: '#2a7a1a', stroke: '#1a5a10', strokeWidth: 6 },
      // Right lobe
      { path: 'M336 260 q48 -8 48 -52 q0 -56 -64 -56 q-40 0 -52 32', fill: '#2a7a1a', stroke: '#1a5a10', strokeWidth: 6 },
      // Center mass
      { path: 'M256 144 q-80 0 -88 80 q-4 48 40 68 q40 20 96 0 q44 -20 40 -68 q-8 -80 -88 -80Z', fill: '#3a8a28', stroke: '#1a6a10', strokeWidth: 6 },
      // Leaf detail
      { path: 'M220 200 q16 -8 28 4 M280 196 q12 -4 24 8 M248 172 q8 -6 20 2 M232 240 q20 -4 32 8', stroke: '#4a9a38', strokeWidth: 4 },
      // Berries
      { path: 'M212 268 a5 5 0 1 1 10 0 a5 5 0 1 1 -10 0', fill: '#c03030' },
      { path: 'M296 264 a5 5 0 1 1 10 0 a5 5 0 1 1 -10 0', fill: '#c03030' },
    ],
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M216 256 h80 v148 H216Z', fill: 'rgba(0,0,0,0.06)' },
      // Stem
      { path: 'M224 256 q-4 60 0 120 q4 20 32 28 q28 -8 32 -28 q4 -60 0 -120Z', fill: '#e8dcc8', stroke: '#b8a888', strokeWidth: 6 },
      // Cap
      { path: 'M256 108 q-108 0 -108 80 q0 48 48 68 q36 12 60 12 q24 0 60 -12 q48 -20 48 -68 q0 -80 -108 -80Z', fill: '#a03030', stroke: '#6a1818', strokeWidth: 8 },
      // Cap spots
      { path: 'M216 168 a12 10 0 1 1 24 0 a12 10 0 1 1 -24 0', fill: '#e8dcc8' },
      { path: 'M272 156 a10 8 0 1 1 20 0 a10 8 0 1 1 -20 0', fill: '#e8dcc8' },
      { path: 'M240 200 a8 6 0 1 1 16 0 a8 6 0 1 1 -16 0', fill: '#e8dcc8' },
      { path: 'M296 188 a8 6 0 1 1 16 0 a8 6 0 1 1 -16 0', fill: '#e8dcc8' },
      { path: 'M192 196 a6 5 0 1 1 12 0 a6 5 0 1 1 -12 0', fill: '#e8dcc8' },
      // Underside gills hint
      { path: 'M184 244 q72 8 144 0', stroke: '#8a7060', strokeWidth: 3 },
    ],
  },
  {
    id: 'pond',
    name: 'Pond',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Muddy edge
      { path: 'M256 128 q120 0 168 80 q24 48 0 96 q-48 80 -168 80 q-120 0 -168 -80 q-24 -48 0 -96 q48 -80 168 -80Z', fill: '#6a8a5a', stroke: '#4a6a3a', strokeWidth: 6 },
      // Water body
      { path: 'M256 152 q100 0 144 68 q20 40 0 80 q-44 68 -144 68 q-100 0 -144 -68 q-20 -40 0 -80 q44 -68 144 -68Z', fill: '#2a5a8a', stroke: '#1a4a7a', strokeWidth: 4 },
      // Reflections
      { path: 'M208 240 q48 -12 96 0', stroke: 'rgba(120,180,240,0.4)', strokeWidth: 4 },
      { path: 'M224 268 q32 -8 64 0', stroke: 'rgba(120,180,240,0.3)', strokeWidth: 3 },
      { path: 'M216 296 q40 -6 80 0', stroke: 'rgba(120,180,240,0.2)', strokeWidth: 3 },
      // Lily pads
      { path: 'M312 216 a16 12 0 1 1 32 0 a16 12 0 1 1 -32 0', fill: '#3a7a2a', stroke: '#2a5a1a', strokeWidth: 2 },
      { path: 'M180 280 a14 10 0 1 1 28 0 a14 10 0 1 1 -28 0', fill: '#3a7a2a', stroke: '#2a5a1a', strokeWidth: 2 },
      // Reeds
      { path: 'M348 176 v-32 q4 -8 8 0 v24 M164 304 v-28 q4 -8 8 0 v20', stroke: '#4a6a2a', strokeWidth: 4 },
    ],
  },
  {
    id: 'log',
    name: 'Log',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M108 240 h300 q24 0 24 20 q0 20 -24 20 H108 q-24 0 -24 -20 q0 -20 24 -20Z', fill: 'rgba(0,0,0,0.08)' },
      // Log body
      { path: 'M104 216 h304 q20 0 20 24 v16 q0 24 -20 24 H104 q-20 0 -20 -24 v-16 q0 -24 20 -24Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 8 },
      // Bark texture
      { path: 'M120 228 c40 4 80 -2 120 2 c40 -4 80 6 120 -2 M120 256 c40 -2 80 4 120 0 c40 4 80 -2 120 2', stroke: '#5a3a10', strokeWidth: 3 },
      // End grain (left)
      { path: 'M84 220 q0 -16 20 -16 q20 0 20 16 v40 q0 16 -20 16 q-20 0 -20 -16Z', fill: '#c8a870', stroke: '#5a3a10', strokeWidth: 6 },
      // Rings
      { path: 'M96 240 a8 16 0 1 1 16 0 a8 16 0 1 1 -16 0', fill: 'none', stroke: '#a08050', strokeWidth: 2 },
      // Moss patches
      { path: 'M200 220 q12 -4 24 0 q-12 4 -24 0Z', fill: '#4a8a2a' },
      { path: 'M320 224 q8 -4 20 0 q-8 4 -20 0Z', fill: '#4a8a2a' },
      // Second log
      { path: 'M128 272 h256 q16 0 16 20 v12 q0 20 -16 20 H128 q-16 0 -16 -20 v-12 q0 -20 16 -20Z', fill: '#7a5a18', stroke: '#4a3010', strokeWidth: 6 },
    ],
  },
  {
    id: 'vine',
    name: 'Vine',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Main vine stem
      { path: 'M256 48 q-16 40 0 80 q16 40 0 80 q-16 40 0 80 q16 40 0 80 q-16 40 0 80 q16 40 0 80', stroke: '#3a6a1a', strokeWidth: 10 },
      // Tendrils
      { path: 'M256 108 q-40 -8 -56 16 M256 188 q40 -8 56 16 M256 268 q-44 -4 -60 20 M256 348 q44 -4 60 20', stroke: '#4a8a2a', strokeWidth: 6 },
      // Leaves left
      { path: 'M200 96 q-24 -4 -32 16 q8 12 32 8Z', fill: '#3a8a28', stroke: '#2a6a18', strokeWidth: 3 },
      { path: 'M192 256 q-28 -8 -40 12 q12 16 40 12Z', fill: '#3a8a28', stroke: '#2a6a18', strokeWidth: 3 },
      // Leaves right
      { path: 'M312 176 q24 -4 32 16 q-8 12 -32 8Z', fill: '#3a8a28', stroke: '#2a6a18', strokeWidth: 3 },
      { path: 'M316 336 q28 -8 40 12 q-12 16 -40 12Z', fill: '#3a8a28', stroke: '#2a6a18', strokeWidth: 3 },
      // Flowers
      { path: 'M176 116 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0', fill: '#d060d0' },
      { path: 'M328 196 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0', fill: '#e0e040' },
    ],
  },

  // ── Structures ────────────────────────────────────────────────────────────
  {
    id: 'pillar',
    name: 'Pillar',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M204 100 h112 v340 H204Z', fill: 'rgba(0,0,0,0.08)' },
      // Capital (top)
      { path: 'M184 84 h144 v28 q0 8 -12 8 H196 q-12 0 -12 -8Z', fill: '#b8b0a0', stroke: '#7a7060', strokeWidth: 6 },
      // Shaft
      { path: 'M200 120 h112 v280 H200Z', fill: '#a09888', stroke: '#6a6058', strokeWidth: 8 },
      // Fluting
      { path: 'M224 120v280 M256 120v280 M288 120v280', stroke: '#8a8070', strokeWidth: 4 },
      // Base
      { path: 'M184 400 h144 v28 q0 8 -8 8 H192 q-8 0 -8 -8Z', fill: '#b8b0a0', stroke: '#7a7060', strokeWidth: 6 },
      // Highlight
      { path: 'M208 124v272', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 6 },
      // Capital detail
      { path: 'M192 98 h128 M192 106 q32 8 64 0 q32 -8 64 0', stroke: '#8a8070', strokeWidth: 3 },
    ],
  },
  {
    id: 'door',
    name: 'Door',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Frame
      { path: 'M164 84 h184 v344 H164Z', fill: '#5a5048', stroke: '#3a3028', strokeWidth: 10 },
      // Door panel
      { path: 'M184 100 h144 v312 H184Z', fill: '#7a5a14', stroke: '#4a3010', strokeWidth: 8 },
      // Planks
      { path: 'M220 100v312 M256 100v312 M292 100v312', stroke: '#6a4a10', strokeWidth: 3 },
      // Cross brace
      { path: 'M192 200 h128 M192 300 h128', stroke: '#5a3a10', strokeWidth: 8 },
      // Handle
      { path: 'M300 252 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
      // Keyhole
      { path: 'M312 280 v12 M308 280 h8', stroke: '#333', strokeWidth: 3 },
      // Hinges
      { path: 'M184 160 h-12 v24 h12 M184 340 h-12 v24 h12', fill: '#666', stroke: '#444', strokeWidth: 3 },
      // Arch top
      { path: 'M184 100 q72 -32 144 0', stroke: '#5a5048', strokeWidth: 6 },
    ],
  },
  {
    id: 'ladder',
    name: 'Ladder',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M196 60 h128 v396 H196Z', fill: 'rgba(0,0,0,0.06)' },
      // Rails
      { path: 'M192 56 v400', stroke: '#6a4a14', strokeWidth: 16 },
      { path: 'M320 56 v400', stroke: '#6a4a14', strokeWidth: 16 },
      // Rungs
      { path: 'M192 112 h128 M192 184 h128 M192 256 h128 M192 328 h128 M192 400 h128', stroke: '#7a5a18', strokeWidth: 12 },
      // Rung shadows
      { path: 'M192 120 h128 M192 192 h128 M192 264 h128 M192 336 h128 M192 408 h128', stroke: 'rgba(0,0,0,0.15)', strokeWidth: 4 },
      // Highlight
      { path: 'M188 60v396', stroke: 'rgba(255,255,255,0.12)', strokeWidth: 4 },
    ],
  },
  {
    id: 'stairs-up',
    name: 'Stairs Up',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Stair treads (back to front)
      { path: 'M128 128 h256 v64 H128Z', fill: '#9a9488', stroke: '#6a6458', strokeWidth: 6 },
      { path: 'M128 192 h224 v64 H128Z', fill: '#8a8478', stroke: '#6a6458', strokeWidth: 6 },
      { path: 'M128 256 h192 v64 H128Z', fill: '#7a7468', stroke: '#5a5448', strokeWidth: 6 },
      { path: 'M128 320 h160 v64 H128Z', fill: '#6a6458', stroke: '#4a4438', strokeWidth: 6 },
      // Arrow indicator
      { path: 'M340 332 l40 -120 M380 212 l-20 8 M380 212 l-8 20', stroke: '#8a3a3a', strokeWidth: 8 },
      // Step edges
      { path: 'M128 192 h224 M128 256 h192 M128 320 h160', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 3 },
    ],
  },
  {
    id: 'stairs-down',
    name: 'Stairs Down',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Stair treads
      { path: 'M128 128 h160 v64 H128Z', fill: '#9a9488', stroke: '#6a6458', strokeWidth: 6 },
      { path: 'M128 192 h192 v64 H128Z', fill: '#8a8478', stroke: '#6a6458', strokeWidth: 6 },
      { path: 'M128 256 h224 v64 H128Z', fill: '#7a7468', stroke: '#5a5448', strokeWidth: 6 },
      { path: 'M128 320 h256 v64 H128Z', fill: '#6a6458', stroke: '#4a4438', strokeWidth: 6 },
      // Arrow indicator
      { path: 'M340 172 l40 120 M380 292 l-20 -8 M380 292 l-8 -20', stroke: '#8a3a3a', strokeWidth: 8 },
      // Step shadows
      { path: 'M128 192 h192 M128 256 h224 M128 320 h256', stroke: 'rgba(0,0,0,0.15)', strokeWidth: 3 },
    ],
  },
  {
    id: 'bridge',
    name: 'Bridge',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Water underneath
      { path: 'M96 200 h320 v120 H96Z', fill: '#2a5a8a' },
      { path: 'M120 248 q40 -8 80 0 q40 8 80 0 q40 -8 80 0', stroke: 'rgba(100,160,220,0.3)', strokeWidth: 3 },
      // Bridge deck
      { path: 'M120 196 h272 v108 H120Z', fill: '#7a5a14', stroke: '#4a3010', strokeWidth: 8 },
      // Planks
      { path: 'M152 196v108 M184 196v108 M216 196v108 M248 196v108 M280 196v108 M312 196v108 M344 196v108 M376 196v108', stroke: '#6a4a10', strokeWidth: 2 },
      // Railing posts
      { path: 'M128 148v48 M168 148v48 M256 148v48 M344 148v48 M384 148v48', stroke: '#5a3a1a', strokeWidth: 10 },
      { path: 'M128 304v48 M168 304v48 M256 304v48 M344 304v48 M384 304v48', stroke: '#5a3a1a', strokeWidth: 10 },
      // Railing rails
      { path: 'M128 160 h256 M128 340 h256', stroke: '#6a4a14', strokeWidth: 6 },
    ],
  },
  {
    id: 'gate',
    name: 'Gate',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Left tower
      { path: 'M128 112 h72 v288 H128Z', fill: '#8a8070', stroke: '#5a5048', strokeWidth: 8 },
      // Right tower
      { path: 'M312 112 h72 v288 H312Z', fill: '#8a8070', stroke: '#5a5048', strokeWidth: 8 },
      // Arch
      { path: 'M200 112 q56 -40 112 0 v180 H200Z', fill: '#1a1a1a', stroke: '#5a5048', strokeWidth: 6 },
      // Portcullis bars
      { path: 'M224 116v176 M256 100v192 M288 116v176', stroke: '#888', strokeWidth: 6 },
      { path: 'M204 160 h104 M204 220 h104', stroke: '#888', strokeWidth: 4 },
      // Battlements
      { path: 'M128 112 v-20h20v20h-20 M148 112v-20h16v20 M180 112v-20h20v20h-20', stroke: '#6a6058', strokeWidth: 3, fill: '#8a8070' },
      { path: 'M312 112 v-20h20v20h-20 M348 112v-20h16v20 M364 112v-20h20v20h-20', stroke: '#6a6058', strokeWidth: 3, fill: '#8a8070' },
      // Stone texture
      { path: 'M136 160h56 M136 208h56 M136 256h56 M136 304h56 M320 160h56 M320 208h56 M320 256h56 M320 304h56', stroke: '#7a7060', strokeWidth: 2 },
    ],
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Horizontal rails
      { path: 'M112 200 h288 M112 296 h288', stroke: '#7a5a14', strokeWidth: 12 },
      // Pickets with pointed tops
      { path: 'M144 152 l12 -24 l12 24 v196 h-24Z', fill: '#8b6914', stroke: '#5a3a10', strokeWidth: 4 },
      { path: 'M208 152 l12 -24 l12 24 v196 h-24Z', fill: '#8b6914', stroke: '#5a3a10', strokeWidth: 4 },
      { path: 'M272 152 l12 -24 l12 24 v196 h-24Z', fill: '#8b6914', stroke: '#5a3a10', strokeWidth: 4 },
      { path: 'M336 152 l12 -24 l12 24 v196 h-24Z', fill: '#8b6914', stroke: '#5a3a10', strokeWidth: 4 },
      // Post caps shadow
      { path: 'M144 152h24 M208 152h24 M272 152h24 M336 152h24', stroke: 'rgba(0,0,0,0.15)', strokeWidth: 3 },
    ],
  },

  // ── Markers ───────────────────────────────────────────────────────────────
  {
    id: 'flag',
    name: 'Flag',
    category: 'markers',
    viewBox: '0 0 512 512',
    paths: [
      // Pole
      { path: 'M168 80 v352', stroke: '#6a4a14', strokeWidth: 12 },
      // Flag body
      { path: 'M168 88 h200 l-48 56 l48 56 H168Z', fill: '#8a2020', stroke: '#5a1010', strokeWidth: 6 },
      // Flag fold shading
      { path: 'M220 88 q20 30 0 56 q-20 30 0 56', stroke: '#6a1818', strokeWidth: 4 },
      // Emblem
      { path: 'M280 128 l16 24 l-16 24 l-16 -24Z', fill: '#d4af37' },
      // Pole ball
      { path: 'M168 80 a10 10 0 1 1 0 -1Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
    ],
  },
  {
    id: 'star',
    name: 'Star',
    category: 'markers',
    viewBox: '0 0 512 512',
    paths: [
      // Glow
      { path: 'M256 80 l52 120 h128 l-104 80 l40 124 l-116 -88 l-116 88 l40 -124 l-104 -80 h128Z', fill: 'rgba(212,175,55,0.15)' },
      // Star body
      { path: 'M256 96 l48 112 h120 l-96 72 l36 116 l-108 -80 l-108 80 l36 -116 l-96 -72 h120Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 8 },
      // Inner highlight
      { path: 'M256 148 l28 64 h68 l-56 40 l20 68 l-60 -48 l-60 48 l20 -68 l-56 -40 h68Z', fill: '#e8c840' },
    ],
  },
  {
    id: 'arrow-marker',
    name: 'Arrow',
    category: 'markers',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M260 420 V100 l-100 100 M260 100 l100 100', stroke: 'rgba(0,0,0,0.1)', strokeWidth: 20 },
      // Shaft
      { path: 'M256 400 V120', stroke: '#8a3a3a', strokeWidth: 16 },
      // Head
      { path: 'M256 88 l-80 80 h48 v-80Z', fill: '#8a3a3a', stroke: '#5a1010', strokeWidth: 4 },
      { path: 'M256 88 l80 80 h-48 v-80Z', fill: '#a04040', stroke: '#5a1010', strokeWidth: 4 },
      // Fletching
      { path: 'M240 360 l-20 40 l36 -16 M272 360 l20 40 l-36 -16', fill: '#6a6058', stroke: '#4a4038', strokeWidth: 3 },
    ],
  },
  {
    id: 'question-mark',
    name: 'Unknown',
    category: 'markers',
    viewBox: '0 0 512 512',
    paths: [
      // Circle background
      { path: 'M256 64 a192 192 0 1 1 -1 0Z', fill: 'rgba(138,58,58,0.12)' },
      // Question mark body
      { path: 'M192 192 q0 -48 64 -48 q64 0 64 48 q0 32 -40 48 v40 h-48 v-60 q36 -8 40 -36 q2 -24 -16 -24 q-32 0 -32 32Z', fill: '#8a3a3a', stroke: '#5a1010', strokeWidth: 4 },
      // Dot
      { path: 'M236 336 h40 v40 h-40Z', fill: '#8a3a3a', stroke: '#5a1010', strokeWidth: 4 },
    ],
  },
  {
    id: 'cross-marker',
    name: 'X Mark',
    category: 'markers',
    viewBox: '0 0 512 512',
    paths: [
      // Background circle
      { path: 'M256 80 a176 176 0 1 1 -1 0Z', fill: 'rgba(138,32,32,0.1)' },
      // X strokes
      { path: 'M152 152 l208 208', stroke: '#8a2020', strokeWidth: 24 },
      { path: 'M360 152 l-208 208', stroke: '#8a2020', strokeWidth: 24 },
      // Highlight edges
      { path: 'M158 146 l208 208 M354 146 l-208 208', stroke: '#a03030', strokeWidth: 6 },
    ],
  },
  {
    id: 'key',
    name: 'Key',
    category: 'markers',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M328 192 a72 72 0 1 0 -144 0 a72 72 0 1 0 144 0Z', fill: 'rgba(0,0,0,0.06)' },
      // Bow (ring)
      { path: 'M320 184 a64 64 0 1 0 -128 0 a64 64 0 1 0 128 0Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 10 },
      // Bow inner
      { path: 'M292 184 a36 36 0 1 0 -72 0 a36 36 0 1 0 72 0Z', fill: '#e8c840', stroke: '#c0a030', strokeWidth: 4 },
      // Shaft
      { path: 'M256 248 v168', stroke: '#d4af37', strokeWidth: 14 },
      // Bit teeth
      { path: 'M256 352 h36 v24 h-36 M256 392 h28 v20 h-28', fill: '#d4af37', stroke: '#a08020', strokeWidth: 4 },
      // Highlight
      { path: 'M236 140 a40 40 0 0 1 40 -40', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 4 },
    ],
  },

  // ── New Stamps: Lighting ──────────────────────────────────────────────────
  {
    id: 'torch-wall',
    name: 'Wall Torch',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Glow
      { path: 'M256 120 a80 80 0 1 1 -1 0Z', fill: 'rgba(240,168,32,0.1)' },
      // Bracket
      { path: 'M208 280 h96 v24 H208Z', fill: '#888', stroke: '#555', strokeWidth: 4 },
      // Handle
      { path: 'M240 200 h32 v104 h-32Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 6 },
      // Flame outer
      { path: 'M256 100 q-28 28 -28 68 q0 32 28 44 q28 -12 28 -44 q0 -40 -28 -68Z', fill: '#e84820' },
      // Flame mid
      { path: 'M256 120 q-18 22 -18 48 q0 24 18 32 q18 -8 18 -32 q0 -26 -18 -48Z', fill: '#f0a820' },
      // Flame inner
      { path: 'M256 140 q-8 14 -8 28 q0 12 8 16 q8 -4 8 -16 q0 -14 -8 -28Z', fill: '#f8e040' },
    ],
  },
  {
    id: 'candelabra',
    name: 'Candelabra',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Base
      { path: 'M208 400 h96 v20 q0 8 -8 8 H216 q-8 0 -8 -8Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 4 },
      // Stem
      { path: 'M248 200 h16 v200 h-16Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
      // Arms
      { path: 'M256 220 q-60 0 -60 -40 M256 220 q60 0 60 -40', stroke: '#d4af37', strokeWidth: 8 },
      // Candles
      { path: 'M184 148 h24 v32 h-24Z', fill: '#e8dcc8', stroke: '#b8a888', strokeWidth: 3 },
      { path: 'M244 160 h24 v40 h-24Z', fill: '#e8dcc8', stroke: '#b8a888', strokeWidth: 3 },
      { path: 'M304 148 h24 v32 h-24Z', fill: '#e8dcc8', stroke: '#b8a888', strokeWidth: 3 },
      // Flames
      { path: 'M196 120 q-6 -16 0 -28 q6 12 0 28Z', fill: '#f0a820' },
      { path: 'M256 132 q-6 -16 0 -28 q6 12 0 28Z', fill: '#f0a820' },
      { path: 'M316 120 q-6 -16 0 -28 q6 12 0 28Z', fill: '#f0a820' },
    ],
  },
  {
    id: 'lantern',
    name: 'Lantern',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Glow
      { path: 'M256 180 a80 80 0 1 1 -1 0Z', fill: 'rgba(240,168,32,0.08)' },
      // Hook
      { path: 'M240 88 h32 q8 0 8 8 v24 h-48 v-24 q0 -8 8 -8Z', fill: '#888', stroke: '#555', strokeWidth: 3 },
      // Frame
      { path: 'M208 120 h96 v160 H208Z', fill: 'none', stroke: '#888', strokeWidth: 10 },
      // Glass panels
      { path: 'M216 128 h80 v144 H216Z', fill: 'rgba(240,200,100,0.3)', stroke: '#aa8820', strokeWidth: 3 },
      // Flame
      { path: 'M256 168 q-12 16 -12 36 q0 16 12 20 q12 -4 12 -20 q0 -20 -12 -36Z', fill: '#f0a820' },
      // Base
      { path: 'M204 280 h104 v16 q0 4 -4 4 H208 q-4 0 -4 -4Z', fill: '#888', stroke: '#555', strokeWidth: 4 },
    ],
  },

  // ── New Stamps: Food & Drink ──────────────────────────────────────────────
  {
    id: 'goblet',
    name: 'Goblet',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Base
      { path: 'M208 400 h96 v16 q0 4 -4 4 H212 q-4 0 -4 -4Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 4 },
      // Stem
      { path: 'M248 280 h16 v120 h-16Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 3 },
      // Cup
      { path: 'M192 140 q-4 60 20 100 q16 28 44 40 q28 -12 44 -40 q24 -40 20 -100Z', fill: '#d4af37', stroke: '#a08020', strokeWidth: 8 },
      // Wine
      { path: 'M204 168 q52 -8 104 0 q-8 48 -28 72 q-12 16 -24 20 q-12 -4 -24 -20 q-20 -24 -28 -72Z', fill: '#6a1020' },
      // Highlight
      { path: 'M212 160 q24 -4 40 0', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 4 },
    ],
  },
  {
    id: 'tankard',
    name: 'Tankard',
    category: 'furniture',
    viewBox: '0 0 512 512',
    paths: [
      // Body
      { path: 'M184 140 h128 q8 0 8 8 v232 q0 8 -8 8 H184 q-8 0 -8 -8 v-232 q0 -8 8 -8Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 8 },
      // Handle
      { path: 'M312 180 q48 0 48 48 v64 q0 48 -48 48', stroke: '#5a3a10', strokeWidth: 12, fill: 'none' },
      // Ale
      { path: 'M192 160 h112 v200 H192Z', fill: '#c08830' },
      // Foam
      { path: 'M192 148 q28 12 56 0 q28 -12 56 0 v20 q-28 8 -56 0 q-28 -8 -56 0Z', fill: '#f4f0e0', stroke: '#d8d0c0', strokeWidth: 2 },
      // Band
      { path: 'M180 260 h136', stroke: '#888', strokeWidth: 6 },
    ],
  },

  // ── New Stamps: Magical ───────────────────────────────────────────────────
  {
    id: 'magic-circle',
    name: 'Magic Circle',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Outer glow
      { path: 'M256 64 a192 192 0 1 1 -1 0Z', fill: 'rgba(100,60,200,0.06)' },
      // Outer ring
      { path: 'M256 80 a176 176 0 1 1 -1 0Z', fill: 'none', stroke: '#6a3aca', strokeWidth: 6 },
      // Inner ring
      { path: 'M256 128 a128 128 0 1 1 -1 0Z', fill: 'none', stroke: '#6a3aca', strokeWidth: 4 },
      // Pentagram
      { path: 'M256 128 l74 228 l-194 -140 h240 l-194 140Z', fill: 'none', stroke: '#8a4ae0', strokeWidth: 5 },
      // Runes on outer ring
      { path: 'M256 84 v16 M412 256 h-16 M256 432 v-16 M100 256 h16', stroke: '#8a4ae0', strokeWidth: 4 },
      { path: 'M366 134 l-12 12 M366 378 l-12 -12 M146 134 l12 12 M146 378 l12 -12', stroke: '#8a4ae0', strokeWidth: 4 },
    ],
  },
  {
    id: 'crystal',
    name: 'Crystal',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Glow
      { path: 'M256 100 a120 160 0 1 1 -1 0Z', fill: 'rgba(100,180,240,0.08)' },
      // Main crystal
      { path: 'M224 380 l-24 -160 l56 -140 l56 140 l-24 160Z', fill: '#4a9ae0', stroke: '#2a6aaa', strokeWidth: 6 },
      // Highlight facet
      { path: 'M256 80 l-56 140 l56 20Z', fill: '#6abaff' },
      // Side crystal left
      { path: 'M180 380 l-16 -100 l32 -80 l20 80Z', fill: '#5aaaee', stroke: '#3a8acc', strokeWidth: 4 },
      // Side crystal right
      { path: 'M332 380 l16 -100 l-32 -80 l-20 80Z', fill: '#5aaaee', stroke: '#3a8acc', strokeWidth: 4 },
      // Internal facets
      { path: 'M256 80 v300 M200 220 l56 20 l56 -20', stroke: 'rgba(255,255,255,0.15)', strokeWidth: 3 },
    ],
  },
  {
    id: 'potion',
    name: 'Potion',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Bottle body
      { path: 'M200 240 q-24 40 -24 88 q0 60 80 80 q80 -20 80 -80 q0 -48 -24 -88Z', fill: '#2a8a4a', stroke: '#1a5a2a', strokeWidth: 8 },
      // Neck
      { path: 'M232 140 h48 v100 h-48Z', fill: '#e8e0d0', stroke: '#aaa090', strokeWidth: 6 },
      // Cork
      { path: 'M228 112 h56 v32 h-56Z', fill: '#a08040', stroke: '#705020', strokeWidth: 4 },
      // Liquid
      { path: 'M208 268 q48 -12 96 0 q-8 48 -24 68 q-12 20 -24 24 q-12 -4 -24 -24 q-16 -20 -24 -68Z', fill: '#30c060' },
      // Bubbles
      { path: 'M244 300 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0', fill: 'rgba(200,255,200,0.5)' },
      { path: 'M264 280 a4 4 0 1 1 8 0 a4 4 0 1 1 -8 0', fill: 'rgba(200,255,200,0.4)' },
      // Label
      { path: 'M228 316 h56 v32 h-56Z', fill: '#f4efe4', stroke: '#c8c0b0', strokeWidth: 2 },
    ],
  },
  {
    id: 'scroll',
    name: 'Scroll',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M140 140 h240 v240 H140Z', fill: 'rgba(0,0,0,0.06)' },
      // Paper body
      { path: 'M160 148 h200 v224 H160Z', fill: '#f4efe4', stroke: '#c8b890', strokeWidth: 4 },
      // Top roll
      { path: 'M148 148 q4 -20 20 -20 h176 q16 0 20 20Z', fill: '#e8dcc8', stroke: '#b8a888', strokeWidth: 6 },
      // Bottom roll
      { path: 'M148 372 q4 20 20 20 h176 q16 0 20 -20Z', fill: '#e8dcc8', stroke: '#b8a888', strokeWidth: 6 },
      // Text lines
      { path: 'M184 188 h144 M184 216 h132 M184 244 h144 M184 272 h120 M184 300 h144 M184 328 h108', stroke: '#8a7a60', strokeWidth: 3 },
      // Wax seal
      { path: 'M316 352 a16 16 0 1 1 -1 0Z', fill: '#8a2020', stroke: '#5a1010', strokeWidth: 3 },
    ],
  },
  {
    id: 'spiderweb',
    name: 'Spider Web',
    category: 'nature',
    viewBox: '0 0 512 512',
    paths: [
      // Radial threads
      { path: 'M256 256 l-160 -160 M256 256 l0 -200 M256 256 l160 -160 M256 256 l200 0 M256 256 l160 160 M256 256 l0 200 M256 256 l-160 160 M256 256 l-200 0', stroke: '#aaa', strokeWidth: 2 },
      // Spiral rings
      { path: 'M216 136 q40 -20 80 0 q20 40 0 80 q-40 20 -80 0 q-20 -40 0 -80Z', fill: 'none', stroke: '#bbb', strokeWidth: 2 },
      { path: 'M176 96 q80 -40 160 0 q40 80 0 160 q-80 40 -160 0 q-40 -80 0 -160Z', fill: 'none', stroke: '#bbb', strokeWidth: 2 },
      { path: 'M136 56 q120 -60 240 0 q60 120 0 240 q-120 60 -240 0 q-60 -120 0 -240Z', fill: 'none', stroke: '#ccc', strokeWidth: 1.5 },
      // Spider
      { path: 'M252 252 a8 8 0 1 1 8 0 a8 8 0 1 1 -8 0Z', fill: '#333' },
    ],
  },
  {
    id: 'crate',
    name: 'Crate',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M136 140 h248 v248 H136Z', fill: 'rgba(0,0,0,0.08)' },
      // Crate body
      { path: 'M128 128 h256 v256 H128Z', fill: '#8b6914', stroke: '#4a3010', strokeWidth: 10 },
      // Planks
      { path: 'M128 213h256 M128 298h256', stroke: '#6a4a10', strokeWidth: 4 },
      // Cross braces
      { path: 'M144 144 l224 224 M368 144 l-224 224', stroke: '#5a3a08', strokeWidth: 8 },
      // Corner irons
      { path: 'M128 128h32v32 M384 128h-32v32 M128 384h32v-32 M384 384h-32v-32', stroke: '#888', strokeWidth: 8 },
      // Nails
      { path: 'M148 148 a3 3 0 1 1 6 0 a3 3 0 1 1 -6 0', fill: '#aaa' },
      { path: 'M358 148 a3 3 0 1 1 6 0 a3 3 0 1 1 -6 0', fill: '#aaa' },
      { path: 'M148 358 a3 3 0 1 1 6 0 a3 3 0 1 1 -6 0', fill: '#aaa' },
      { path: 'M358 358 a3 3 0 1 1 6 0 a3 3 0 1 1 -6 0', fill: '#aaa' },
    ],
  },
  {
    id: 'anvil',
    name: 'Anvil',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M120 280 h280 v100 H120Z', fill: 'rgba(0,0,0,0.08)' },
      // Base
      { path: 'M160 340 h192 v48 q0 8 -8 8 H168 q-8 0 -8 -8Z', fill: '#555', stroke: '#333', strokeWidth: 6 },
      // Waist
      { path: 'M192 280 h128 v60 H192Z', fill: '#666', stroke: '#444', strokeWidth: 4 },
      // Face
      { path: 'M120 220 h272 v60 H120Z', fill: '#777', stroke: '#444', strokeWidth: 8 },
      // Horn
      { path: 'M120 220 q-40 8 -56 28 q4 4 8 4 h48Z', fill: '#888', stroke: '#555', strokeWidth: 4 },
      // Heel
      { path: 'M392 220 q20 4 32 20 q-2 4 -8 8 h-24Z', fill: '#888', stroke: '#555', strokeWidth: 4 },
      // Face highlight
      { path: 'M136 228 h240', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 4 },
    ],
  },
  {
    id: 'signpost',
    name: 'Signpost',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Post
      { path: 'M244 128 h24 v312 h-24Z', fill: '#6a4a14', stroke: '#3a2a08', strokeWidth: 6 },
      // Sign right
      { path: 'M268 148 h140 l24 28 l-24 28 H268Z', fill: '#7a5a14', stroke: '#4a3010', strokeWidth: 5 },
      // Sign left
      { path: 'M244 220 h-140 l-24 28 l24 28 h140Z', fill: '#8b6914', stroke: '#5a3a10', strokeWidth: 5 },
      // Text hints
      { path: 'M288 172 h88 M288 188 h76', stroke: '#4a3010', strokeWidth: 3 },
      { path: 'M136 244 h80 M136 260 h68', stroke: '#4a3010', strokeWidth: 3 },
      // Post cap
      { path: 'M236 128 h40 v-16 q-20 -16 -40 0Z', fill: '#5a3a10', stroke: '#3a2a08', strokeWidth: 4 },
    ],
  },
  {
    id: 'bones',
    name: 'Bones',
    category: 'dungeon-dressing',
    viewBox: '0 0 512 512',
    paths: [
      // Bone 1 (diagonal)
      { path: 'M160 320 l160 -160', stroke: '#e0d8c8', strokeWidth: 14 },
      { path: 'M148 332 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0', fill: '#e8e0d0', stroke: '#c8c0b0', strokeWidth: 3 },
      { path: 'M308 148 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0', fill: '#e8e0d0', stroke: '#c8c0b0', strokeWidth: 3 },
      // Bone 2 (crossing)
      { path: 'M320 320 l-160 -160', stroke: '#d8d0c0', strokeWidth: 14 },
      { path: 'M308 332 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0', fill: '#e0d8c8', stroke: '#c0b8a8', strokeWidth: 3 },
      { path: 'M148 172 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0', fill: '#e0d8c8', stroke: '#c0b8a8', strokeWidth: 3 },
      // Center shadow
      { path: 'M244 244 a16 16 0 1 1 24 0', fill: 'rgba(0,0,0,0.08)' },
    ],
  },
  {
    id: 'tombstone',
    name: 'Tombstone',
    category: 'structures',
    viewBox: '0 0 512 512',
    paths: [
      // Shadow
      { path: 'M172 392 h176 v24 H172Z', fill: 'rgba(0,0,0,0.1)' },
      // Stone body
      { path: 'M168 392 h176 v-240 q-88 -60 -176 0Z', fill: '#8a8478', stroke: '#5a5448', strokeWidth: 8 },
      // Inner face
      { path: 'M192 380 h128 v-208 q-64 -44 -128 0Z', fill: '#9a9488' },
      // Cross
      { path: 'M244 200 h24 v80 h-24Z M228 232 h56 v24 h-56Z', fill: '#b8b0a0', stroke: '#7a7468', strokeWidth: 3 },
      // RIP text
      { path: 'M216 320 h80', stroke: '#7a7468', strokeWidth: 4 },
      { path: 'M224 340 h64', stroke: '#7a7468', strokeWidth: 3 },
      // Ground
      { path: 'M140 392 h232', stroke: '#5a7a3a', strokeWidth: 6 },
      // Grass tufts
      { path: 'M160 392 q4 -12 8 0 M200 392 q4 -10 8 0 M340 392 q4 -12 8 0', stroke: '#4a6a2a', strokeWidth: 3 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Per-Theme Stamps (Phase 6.4.5)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Dungeon ────────────────────────────────────────────────────────────────
  {
    id: 'dungeon-iron-maiden',
    name: 'Iron Maiden',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M192 96h128v320c0 17.7-14.3 32-32 32h-64c-17.7 0-32-14.3-32-32V96zm0 0c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32m-112 48h96m-96 64h96m-96 64h96m-48-176v16m0 40v16m0 40v16',
  },
  {
    id: 'dungeon-portcullis',
    name: 'Portcullis',
    category: 'structures',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M112 96h288v320H112V96zm48 0v320m48-320v320m48-320v320m48-320v320m48-320v320M112 160h288M112 224h288M112 288h288M112 352h288',
  },
  {
    id: 'dungeon-brazier',
    name: 'Brazier',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M176 288h160v48H176v-48zm16-32h128l16 32H176l16-32zm48-128c0 0 32 48 48 64s-16 64-48 64-64-48-48-64 48-64 48-64zm-48 208v96m128-96v96m-64 0h-64m128 0h-64',
  },
  {
    id: 'dungeon-weapon-rack',
    name: 'Weapon Rack',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M144 128h224v256H144V128zm48 0v256m128-256v256M144 208h224M144 288h224m-176-80v-16l16-16m48 16v-16l16-16m48 16v-16l16-16m-128 160v16l16 16m48-16v16l16 16m48-16v16l16 16',
  },
  {
    id: 'dungeon-chains',
    name: 'Chains',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M208 96v64a32 32 0 0 0 32 32 32 32 0 0 0 32-32V96m-64 128v64a32 32 0 0 0 32 32 32 32 0 0 0 32-32V224m-64 128v64a32 32 0 0 0 32 32 32 32 0 0 0 32-32V352m-128-256v64a32 32 0 0 0 32 32m96-96v64a32 32 0 0 1-32 32',
  },
  {
    id: 'dungeon-torch-sconce',
    name: 'Torch Sconce',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M240 224h32v160h-32V224zm16-96c0 0 40 40 40 72s-17.9 48-40 48-40-16-40-48 40-72 40-72zm-48 256h96v16H208v-16zm32-288a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm32 0a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  },
  {
    id: 'dungeon-pit',
    name: 'Pit',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 32c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z',
  },
  {
    id: 'dungeon-cobweb',
    name: 'Cobweb',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M96 96l160 160M96 96c0 80 32 128 80 160M96 96c80 0 128 32 160 80m-160 80c16 16 40 24 64 24m-64-24l160 0m-96-80c0 16 8 40 24 64m-24-64l0 160',
  },
  {
    id: 'dungeon-gargoyle',
    name: 'Gargoyle',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c-44.2 0-80 35.8-80 80v32h160v-32c0-44.2-35.8-80-80-80zm-48 48a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm96 0a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm-96 64v96l-32 48h48v-32l32 32 32-32v32h48l-32-48v-96m-64 96h128',
  },
  {
    id: 'dungeon-manacles',
    name: 'Manacles',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M176 192a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm64 0a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm-64 0h48m16 0h48m-80 48v128m-48-128v128m-16 0h16m48 0h16m-80 0v32m48-32v32',
  },
  {
    id: 'dungeon-bone-pile',
    name: 'Bone Pile',
    category: 'dungeon-dressing',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M160 320h192v32H160v-32zm16-32l160 0m-144-32h128m-96-48l16 48m96-48l-16 48m-128-48l64 48m64-48l-64 48m-32 112a16 16 0 1 1 32 0 16 16 0 0 1-32 0zm96 0a16 16 0 1 1 32 0 16 16 0 0 1-32 0z',
  },
  {
    id: 'dungeon-mossy-stone',
    name: 'Mossy Stone',
    category: 'nature',
    themeId: 'dungeon',
    viewBox: '0 0 512 512',
    svgPath: 'M160 224h192v96H160v-96zm16 16h48v32h-48v-32zm64 0h48v32h-48v-32zm64 0h48v32h-48v-32zm-128 48h48v32h-48v-32zm64 0h48v32h-48v-32zm-48-96c-8 0-16 8-16 16m48-16c-4-12-12-16-24-16m96 16c8 0 16 8 16 16',
  },

  // ── Castle ─────────────────────────────────────────────────────────────────
  {
    id: 'castle-banner',
    name: 'Banner',
    category: 'dungeon-dressing',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M208 80h96v16H208V80zm0 16v256l48-48 48 48V96m-96-16h-16v32h16m96-32h16v32h-16',
  },
  {
    id: 'castle-chandelier',
    name: 'Chandelier',
    category: 'furniture',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M256 80v96m0 0a128 32 0 0 1 128 32 128 32 0 0 1-128 32 128 32 0 0 1-128-32 128 32 0 0 1 128-32zm-96 32v48m64-48v48m64-48v48m64-48v48m-192 0l-8 24m48-24l-8 24m64-24l-8 24m64-24l-8 24m64-24l-8 24',
  },
  {
    id: 'castle-tapestry',
    name: 'Tapestry',
    category: 'dungeon-dressing',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160v288l-32-32-16 32-32-32-16 32-32-32-32 32V96zm16 32h128v48H192V128zm0 80h128v48H192V208zm48 80h32v48h-32v-48z',
  },
  {
    id: 'castle-armor-stand',
    name: 'Armor Stand',
    category: 'dungeon-dressing',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm0 64v192m-64-160h128m-112 160h96v16H192v-16zm16 16v48m64-48v48m-32-240v-16',
  },
  {
    id: 'castle-candelabra',
    name: 'Candelabra',
    category: 'furniture',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M240 192h32v192H240V192zm-64-64v48l64 16m64-64v48l-64 16m-64-64l-8-24m128 24l8-24m-72-32a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-64 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm128 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-96 288h64v16H208v-16z',
  },
  {
    id: 'castle-stained-glass',
    name: 'Stained Glass',
    category: 'structures',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M176 144h160v240c0 17.7-35.8 32-80 32s-80-14.3-80-32V144zm0 0c0-44.2 35.8-80 80-80s80 35.8 80 80m-160 80h160m-80-80v240m-48-160l96 80m-96 0l96-80',
  },
  {
    id: 'castle-coat-of-arms',
    name: 'Coat of Arms',
    category: 'dungeon-dressing',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96l96 48v128c0 53-43 96-96 128-53-32-96-75-96-128V144l96-48zm0 0v272m-80-192h160m-80 0v112m-48-56h96',
  },
  {
    id: 'castle-drawbridge',
    name: 'Drawbridge',
    category: 'structures',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M128 160h256v192H128V160zm0 0l32-64m224 64l-32-64m-224 256l32 64m224-64l-32 64M128 256h256m-224-64v128m192-128v128m-96-128v128',
  },
  {
    id: 'castle-fountain',
    name: 'Fountain',
    category: 'structures',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c70.7 0 128 43 128 96s-57.3 96-128 96-128-43-128-96 57.3-96 128-96zm0-64v64m-32-48c0 0 16 24 32 24s32-24 32-24m-32 88a32 32 0 1 1 0 64 32 32 0 0 1 0-64z',
  },
  {
    id: 'castle-arrow-slit',
    name: 'Arrow Slit',
    category: 'structures',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M224 96h64v320h-64V96zm16 16h32v288h-32V112zm8 48v192m16-192v192m-16 0h16m-16-192h16m-24-48h32m-32 288h32',
  },
  {
    id: 'castle-herald-trumpet',
    name: 'Herald Trumpet',
    category: 'dungeon-dressing',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M128 240h192l64-48v128l-64-48H128V240zm0 0v32m192-48v64m64-80v96m-288-16h32m192-32l48 16m-48 16l48 16',
  },
  {
    id: 'castle-battlement',
    name: 'Battlement',
    category: 'structures',
    themeId: 'castle',
    viewBox: '0 0 512 512',
    svgPath: 'M112 320h288v64H112v-64zm0-48h48v48h-48v-48zm80 0h48v48h-48v-48zm80 0h48v48h-48v-48zm80 0h48v48h-48v-48zm-272-48h288v48H112v-48z',
  },

  // ── Wilderness ─────────────────────────────────────────────────────────────
  {
    id: 'wilderness-tent',
    name: 'Tent',
    category: 'structures',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M128 384l128-256 128 256H128zm128-256v256m-96 0l96-128 96 128',
  },
  {
    id: 'wilderness-animal-tracks',
    name: 'Animal Tracks',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M176 160a12 12 0 1 1 24 0 12 12 0 0 1-24 0zm40-16a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-48-16a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm72-8a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-24 128a12 12 0 1 1 24 0 12 12 0 0 1-24 0zm40-16a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-48-16a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm72-8a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-24 128a12 12 0 1 1 24 0 12 12 0 0 1-24 0zm40-16a8 8 0 1 1 16 0 8 8 0 0 1-16 0z',
  },
  {
    id: 'wilderness-fallen-tree',
    name: 'Fallen Tree',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M96 288c0-17.7 14.3-32 32-32h256c17.7 0 32 14.3 32 32v0c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32zm32 0h256m-288 32c-8 16-8 32 0 48m304-80c8 16 8 32 0 48m-224-80l-16-48m48 16l-8-48m128 80l16 48m-48-16l8 48',
  },
  {
    id: 'wilderness-berry-bush',
    name: 'Berry Bush',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M256 192c53 0 96 35.8 96 80s-43 80-96 80-96-35.8-96-80 43-80 96-80zm-48 48a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm32 24a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm32-16a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-80 16a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm96 24a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-48 16a8 8 0 1 1 16 0 8 8 0 0 1-16 0z',
  },
  {
    id: 'wilderness-antler',
    name: 'Antler',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M256 384V224m0 0l-64-96m64 96l64-96m-64 0l-32-96m32 96l32-96m-96 96l-32-32m128 32l32-32m-96 256a24 24 0 1 1 0 48 24 24 0 0 1 0-48z',
  },
  {
    id: 'wilderness-stream',
    name: 'Stream',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M128 128c64 0 64 64 128 64s64-64 128-64m-256 128c64 0 64 64 128 64s64-64 128-64m-256 128c64 0 64 64 128 64s64-64 128-64',
  },
  {
    id: 'wilderness-beehive',
    name: 'Beehive',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c53 0 96 43 96 96v64c0 53-43 96-96 96s-96-43-96-96v-64c0-53 43-96 96-96zm-80 80h160m-160 48h160m-160 48h160m-32-176l32-48m-64 48l-32-48m48 0l16-48',
  },
  {
    id: 'wilderness-totem',
    name: 'Totem Pole',
    category: 'structures',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M224 80h64v352H224V80zm0 48h64m-64 64h64m-64 64h64m-64 64h64m-64 64h64m-32-288a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm-16 80h32v16h-32v-16zm0 64l16 16 16-16m-16 48l-16 16h32l-16-16zm-16 112h64v16H208v-16z',
  },
  {
    id: 'wilderness-fishing-spot',
    name: 'Fishing Spot',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96v224m0 0c0 32-48 48-48 80m48-80c0 32 48 48 48 80m-80-304l32-32 32 32m-80 192c-32 0-64 16-96 0m64 48c-32 0-64 16-96 0m192-48c32 0 64 16 96 0m-64 48c32 0 64 16 96 0',
  },
  {
    id: 'wilderness-wolf-den',
    name: 'Wolf Den',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M176 352c0-53 35.8-96 80-96s80 43 80 96H176zm80-96v-48m-32 0l-16-32 48 16 48-16-16 32m-32 0v48m-80 96h160v16H176v-16zm48-128a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm32 0a4 4 0 1 1 8 0 4 4 0 0 1-8 0z',
  },
  {
    id: 'wilderness-bird-nest',
    name: 'Bird Nest',
    category: 'nature',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M256 224c53 0 96 28.7 96 64v16c0 35.3-43 64-96 64s-96-28.7-96-64v-16c0-35.3 43-64 96-64zm-32 48a12 12 0 1 1 24 0 12 12 0 0 1-24 0zm32 0a12 12 0 1 1 24 0 12 12 0 0 1-24 0zm32 0a12 12 0 1 1 24 0 12 12 0 0 1-24 0z',
  },
  {
    id: 'wilderness-standing-stone',
    name: 'Standing Stone',
    category: 'structures',
    themeId: 'wilderness',
    viewBox: '0 0 512 512',
    svgPath: 'M224 160h64v224H224V160zm0 0c0-17.7 14.3-32 32-32s32 14.3 32 32m-80 224h128v16H192v-16zm32-176h32v16H224v-16zm0 48h32v16H224v-16zm0 48h32v16H224v-16z',
  },

  // ── Starship ───────────────────────────────────────────────────────────────
  {
    id: 'starship-console',
    name: 'Console',
    category: 'furniture',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M144 192h224v128H144V192zm16 16h192v64H160V208zm0 80h48v32H160v-32zm64 0h48v32H224v-32zm64 0h48v32H288v-32zm-128-64h32v16H160v-16zm48 0h32v16H208v-16zm48 0h32v16H256v-16z',
  },
  {
    id: 'starship-cryo-pod',
    name: 'Cryo Pod',
    category: 'dungeon-dressing',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M192 112h128v288c0 17.7-28.7 32-64 32s-64-14.3-64-32V112zm0 0c0-17.7 28.7-32 64-32s64 14.3 64 32m-112 48h96m-96 64h96m-96 64h96m-48-176v224',
  },
  {
    id: 'starship-airlock',
    name: 'Airlock',
    category: 'structures',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M176 128h160v256H176V128zm16 16h128v224H192V144zm48 80h32v64h-32V224zm-32-64h96v32H208V160zm0 160h96v32H208v-32zm-16-96a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm128 0a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  },
  {
    id: 'starship-reactor',
    name: 'Reactor',
    category: 'structures',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 48c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm0-128v48m0 208v48m-128-176h48m208 0h48',
  },
  {
    id: 'starship-terminal',
    name: 'Terminal',
    category: 'furniture',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M160 160h192v160H160V160zm16 16h160v96H176V176zm0 112h48v32H176v-32zm-16 48h192v16H160v-16zm64-144l32 24-32 24m48-8h32',
  },
  {
    id: 'starship-escape-pod',
    name: 'Escape Pod',
    category: 'structures',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M256 112c44.2 0 80 35.8 80 80v128c0 44.2-35.8 80-80 80s-80-35.8-80-80V192c0-44.2 35.8-80 80-80zm-48 96h96v64h-96v-64zm32 96h32v48h-32v-48zm-16-160a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm32 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0z',
  },
  {
    id: 'starship-cargo-crate',
    name: 'Cargo Crate',
    category: 'dungeon-dressing',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M144 160h224v192H144V160zm112-64l112 64H144l112-64zm-112 256l112 64 112-64M256 96v320m-112-160h224',
  },
  {
    id: 'starship-antenna',
    name: 'Antenna',
    category: 'structures',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M256 192v192m-48-192h96v32h-96v-32zm-32 192h160v16H176v-16zm80-256v64m-64 0c0-35.3 28.7-64 64-64s64 28.7 64 64m-128 0h128m-80-80a16 16 0 1 1 32 0 16 16 0 0 1-32 0z',
  },
  {
    id: 'starship-holotable',
    name: 'Holo-Table',
    category: 'furniture',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M176 256h160v32H176v-32zm48 32v96h16v-96m48 0v96h16v-96m-112 96h128v16H192v-16zm16-192a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm48 48v96',
  },
  {
    id: 'starship-blast-door',
    name: 'Blast Door',
    category: 'structures',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M160 128h192v256H160V128zm16 16h160v224H176V144zm80 0v224m-80-112h160m-136-80l-16-16m152 16l16-16m-152 192l-16 16m152-16l16 16',
  },
  {
    id: 'starship-med-bay',
    name: 'Med Bay',
    category: 'furniture',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M176 192h160v128H176V192zm16 16h128v96H192V208zm24-80h16v48h48v16h-48v48h-16v-48h-48v-16h48V128zm64 160h32v16h-32v-16zm-64 0h32v16h-32v-16zm-16 32h128v16H200v-16z',
  },
  {
    id: 'starship-viewport',
    name: 'Viewport',
    category: 'structures',
    themeId: 'starship',
    viewBox: '0 0 512 512',
    svgPath: 'M160 192h192v128H160V192zm16 16h160v96H176V208zm0 0c0-26.5 35.8-48 80-48s80 21.5 80 48m-160 96c0 26.5 35.8 48 80 48s80-21.5 80-48m-120-64h16m24 0h16m24 0h16',
  },

  // ── Alien ──────────────────────────────────────────────────────────────────
  {
    id: 'alien-egg-cluster',
    name: 'Egg Cluster',
    category: 'dungeon-dressing',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M208 224c0-35.3 21.5-64 48-64s48 28.7 48 64-21.5 64-48 64-48-28.7-48-64zm-64 48c0-26.5 16.1-48 36-48s36 21.5 36 48-16.1 48-36 48-36-21.5-36-48zm160 0c0-26.5 16.1-48 36-48s36 21.5 36 48-16.1 48-36 48-36-21.5-36-48zm-96 80c0-17.7 10.7-32 24-32s24 14.3 24 32-10.7 32-24 32-24-14.3-24-32z',
  },
  {
    id: 'alien-tentacle',
    name: 'Tentacle',
    category: 'nature',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96c0 0-48 64-48 128s24 96 0 128-48 64-48 64m96-320c0 0 48 64 48 128s-24 96 0 128 48 64 48 64m-64-288c0 0-16 96-16 160s8 96 16 128',
  },
  {
    id: 'alien-crystal',
    name: 'Crystal',
    category: 'nature',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 64l64 192-64 192-64-192L256 64zm-96 128l48 64-48 64-32-64 32-64zm192 0l-48 64 48 64 32-64-32-64zm-96-64v256',
  },
  {
    id: 'alien-spore',
    name: 'Spore Pod',
    category: 'nature',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 176c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0-48v48m0 160v48m-80-176l32 32m96-32l-32 32m-96 64l32-32m96 32l-32-32m-16-64a24 24 0 1 1 0 48 24 24 0 0 1 0-48z',
  },
  {
    id: 'alien-bio-pod',
    name: 'Bio Pod',
    category: 'dungeon-dressing',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M208 128h96v256c0 26.5-21.5 48-48 48s-48-21.5-48-48V128zm0 0c0-26.5 21.5-48 48-48s48 21.5 48 48m-80 64h64m-64 64h64m-64 64h64m-32-192v224',
  },
  {
    id: 'alien-slime-pool',
    name: 'Slime Pool',
    category: 'nature',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M192 224c0-35.3 28.7-64 64-64s64 28.7 64 64v64c0 35.3-28.7 64-64 64s-64-28.7-64-64v-64zm-48 32c0 0 16 48 48 48m128-48c0 0-16 48-48 48m-32-128c16-16 32-48 16-64m16 64c-16-16-32-48-16-64',
  },
  {
    id: 'alien-hive-node',
    name: 'Hive Node',
    category: 'structures',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160l80 48v96l-80 48-80-48v-96l80-48zm0 0v-64m80 112h64m-80 48v64m-80-112h-64m48-80l-32-32m144 32l32-32m-144 176l-32 32m144-32l32 32',
  },
  {
    id: 'alien-membrane-wall',
    name: 'Membrane',
    category: 'structures',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M160 128c0 0 32 48 96 48s96-48 96-48v256c0 0-32-48-96-48s-96 48-96 48V128zm0 128h192m-144-64c16 16 48 32 48 64m48-64c-16 16-48 32-48 64',
  },
  {
    id: 'alien-fungal-growth',
    name: 'Fungal Growth',
    category: 'nature',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 384v-128m-48 128v-96m48 96v0m48 0v-96m-48-32c-35.3 0-64-21.5-64-48s28.7-48 64-48 64 21.5 64 48-28.7 48-64 48zm-48 0c-26.5 0-48-16.1-48-36s21.5-36 48-36m96 72c26.5 0 48-16.1 48-36s-21.5-36-48-36',
  },
  {
    id: 'alien-cocoon',
    name: 'Cocoon',
    category: 'dungeon-dressing',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96c53 0 96 71.6 96 160s-43 160-96 160-96-71.6-96-160 43-160 96-160zm0 48c35.3 0 64 50 64 112s-28.7 112-64 112-64-50-64-112 28.7-112 64-112zm-48 80h96m-96 64h96m-48-96v128',
  },
  {
    id: 'alien-acid-vent',
    name: 'Acid Vent',
    category: 'dungeon-dressing',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 192c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm0-128c0 0-16 32-16 64m32-64c0 0 16 32 16 64m-32 0c0 0 0 32 0 32m-48 128v48m96-48v48',
  },
  {
    id: 'alien-bioluminescent',
    name: 'Bio-Light',
    category: 'nature',
    themeId: 'alien',
    viewBox: '0 0 512 512',
    svgPath: 'M256 192a64 64 0 1 1 0 128 64 64 0 0 1 0-128zm0-32v-32m0 224v32m-96-128h-32m224 0h32m-160-80l-24-24m128 0l24-24m-128 160l-24 24m128 0l24 24m-96-112a16 16 0 1 1 0 32 16 16 0 0 1 0-32z',
  },

  // ── Cyberpunk ──────────────────────────────────────────────────────────────
  {
    id: 'cyberpunk-neon-sign',
    name: 'Neon Sign',
    category: 'structures',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M144 160h224v128H144V160zm16 16h192v96H160V176zm-16-48h16v48m208-48h16v48m-176 128v48m96-48v48m-128-176h32m32 0h32m32 0h32',
  },
  {
    id: 'cyberpunk-dumpster',
    name: 'Dumpster',
    category: 'dungeon-dressing',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M144 208h224v160H144V208zm0-48l32 48m192-48l-32 48M144 208h224m-224 80h224m-192 80v32m160-32v32m-96-160v80m-32-80v80m64-80v80',
  },
  {
    id: 'cyberpunk-hologram',
    name: 'Hologram',
    category: 'dungeon-dressing',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M192 352h128v16H192v-16zm16-160a48 48 0 1 1 96 0 48 48 0 0 1-96 0zm48 48v112m-64-192l16-48m96 48l-16-48m-32 240l-48 32m96-32l48 32m-80-176v32m-16-16h32',
  },
  {
    id: 'cyberpunk-drone',
    name: 'Drone',
    category: 'dungeon-dressing',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M224 224h64v64h-64v-64zm-64-32a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm192 0a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm-192 128a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm192 0a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm-128-128l-32-32m128 32l32-32m-128 128l-32 32m128-32l32 32',
  },
  {
    id: 'cyberpunk-server-rack',
    name: 'Server Rack',
    category: 'structures',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160v320H176V96zm16 16h128v64H192V112zm0 80h128v64H192V192zm0 80h128v64H192V272zm0 80h128v64H192v-64zm16-224h16v16h-16v-16zm0 80h16v16h-16v-16zm0 80h16v16h-16v-16zm0 80h16v16h-16v-16zm80-240h16v16h-16v-16zm0 80h16v16h-16v-16zm0 80h16v16h-16v-16zm0 80h16v16h-16v-16z',
  },
  {
    id: 'cyberpunk-vending-machine',
    name: 'Vending Machine',
    category: 'structures',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160v320H176V96zm16 16h128v128H192V112zm0 160h128v48H192v-48zm0 64h128v48H192v-48zm16-192h96v96H208V144zm16 16h64v64h-64V160zm48 128h32v16h-32v-16zm0 64h32v16h-32v-16z',
  },
  {
    id: 'cyberpunk-cyber-arm',
    name: 'Cyber Arm',
    category: 'dungeon-dressing',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M192 160h32v192h-32V160zm32 64h48v32h-48v-32zm48 32h48v32h-48v-32zm48 32h48v32h-48v-32zm-96-128h16v32h-16V160zm0 192h16v32h-16v-32zm80-32a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm32 32a8 8 0 1 1 16 0 8 8 0 0 1-16 0z',
  },
  {
    id: 'cyberpunk-data-port',
    name: 'Data Port',
    category: 'structures',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M224 192h64v128h-64V192zm16 16h32v32h-32V208zm0 48h32v32h-32v-32zm0 48h32v16h-32v-16zm-64-64h48m128-48h-48m-80-64v48m0 192v48m-48-224l-32-32m160 32l32-32m-160 192l-32 32m160-32l32 32',
  },
  {
    id: 'cyberpunk-hover-bike',
    name: 'Hover Bike',
    category: 'dungeon-dressing',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M160 256h192l32-48H128l32 48zm0 0c-26.5 0-48 14.3-48 32s21.5 32 48 32m192-64c26.5 0 48 14.3 48 32s-21.5 32-48 32m-128-32h64v16H224v-16zm-32-80h128l16-32H176l16 32',
  },
  {
    id: 'cyberpunk-security-cam',
    name: 'Security Camera',
    category: 'structures',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M192 224h96v64H192v-64zm96 16l48-32v96l-48-32m-96-16v-48l48-32m-48 144v48l48 32m48-192a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm-16 240a16 16 0 1 1 32 0 16 16 0 0 1-32 0z',
  },
  {
    id: 'cyberpunk-electric-fence',
    name: 'Electric Fence',
    category: 'structures',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M160 128v256m48-256v256m48-256v256m48-256v256m48-256v256M160 192h192M160 256h192M160 320h192m-160-160l-8-16 16 8-8-16m112 24l8-16-16 8 8-16m-56 24l-8-16 16 8-8-16',
  },
  {
    id: 'cyberpunk-junk-pile',
    name: 'Junk Pile',
    category: 'dungeon-dressing',
    themeId: 'cyberpunk',
    viewBox: '0 0 512 512',
    svgPath: 'M160 352h192v32H160v-32zm16-48h160l16 48H160l16-48zm32-48h96l16 48H192l16-48zm16-48h64v48H224v-48zm-32-32h128l-16 32H208l-16-32zm48-48h32v48h-32v-48z',
  },

  // ── Steampunk ──────────────────────────────────────────────────────────────
  {
    id: 'steampunk-gear',
    name: 'Gear',
    category: 'dungeon-dressing',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M256 176c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm0-112v48m0 208v48m-80-272l24 42m112-42l-24 42m-192 70l42 24m270-24l-42 24m-270 64l42-24m270 24l-42-24m-192 70l24-42m112 42l-24-42',
  },
  {
    id: 'steampunk-pipe',
    name: 'Pipe',
    category: 'structures',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M128 240h128v32H128v-32zm128-48h32v128h-32V192zm32 16h96v32h-96V208zm-32 80h32m-160-48h16m0 32h-16m192-48h16m0 32h-16m-128-80h32v16h-32v-16zm0 128h32v16h-32v-16z',
  },
  {
    id: 'steampunk-gauge',
    name: 'Pressure Gauge',
    category: 'dungeon-dressing',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 48c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 32l32 48m-80-32h16m96 0h16m-80-48v16m0 96v16',
  },
  {
    id: 'steampunk-boiler',
    name: 'Boiler',
    category: 'structures',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M192 128h128v256c0 17.7-28.7 32-64 32s-64-14.3-64-32V128zm0 0c0-17.7 28.7-32 64-32s64 14.3 64 32m-112 64h96m-96 64h96m-96 64h96m-48-224v32m-32 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm64 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0z',
  },
  {
    id: 'steampunk-clockwork',
    name: 'Clockwork',
    category: 'dungeon-dressing',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 0v96h64m-64-96v-32m0 256v32m-96-160h-32m256 0h32m-64 0a32 32 0 1 1-64 0 32 32 0 0 1 64 0z',
  },
  {
    id: 'steampunk-valve-wheel',
    name: 'Valve Wheel',
    category: 'dungeon-dressing',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M256 176c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 48a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm0-48v48m0 64v48m-56-136l24 42m64-42l-24 42m-88 22l42 24m88-24l-42 24',
  },
  {
    id: 'steampunk-piston',
    name: 'Piston',
    category: 'structures',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M208 128h96v64H208v-64zm-16 64h128v32H192v-32zm16 32h96v128H208V224zm-16 128h128v32H192v-32zm16 32h96v32H208v-32zm16-160h64v16H224v-16zm0 48h64v16H224v-16zm0 48h64v16H224v-16z',
  },
  {
    id: 'steampunk-telegraph',
    name: 'Telegraph',
    category: 'furniture',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M192 240h128v64H192v-64zm16 16h96v32H208v-32zm-16-80h128v48H192v-48zm32 144v64m64-64v64m-64 0h64v16H224v-16zm0-208h64v32H224v-32zm16-32h32v32h-32v-32z',
  },
  {
    id: 'steampunk-airship-anchor',
    name: 'Airship Anchor',
    category: 'structures',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm0 64v192m-64-64c0 35.3 28.7 64 64 64s64-28.7 64-64m-128 0h-32m192 0h32m-128-160v-32m-24 0h48',
  },
  {
    id: 'steampunk-cog-table',
    name: 'Cog Table',
    category: 'furniture',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M176 224h160v64H176v-64zm32 64v96m96-96v96m-128 0h160v16H176v-16zm48-96l-16-32m48 32l16-32m-48 0v-32m-48 128h160m-80-64a24 24 0 1 1 0 48 24 24 0 0 1 0-48z',
  },
  {
    id: 'steampunk-monocle',
    name: 'Monocle',
    category: 'dungeon-dressing',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M256 176c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm80 48h48c0 0 16 0 16 16m-64-64l32-48',
  },
  {
    id: 'steampunk-automaton',
    name: 'Automaton',
    category: 'dungeon-dressing',
    themeId: 'steampunk',
    viewBox: '0 0 512 512',
    svgPath: 'M224 112h64v48h-64v-48zm-16 48h96v128H208V160zm-16 128h128v48H192v-48zm32 48v80m64-80v80m-96 0h128v16H192v-16zm32-224a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm32 0a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm-32 80h32v32h-32v-32z',
  },

  // ── Old West ───────────────────────────────────────────────────────────────
  {
    id: 'oldwest-cactus',
    name: 'Cactus',
    category: 'nature',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M240 128h32v256H240V128zm-64 64h64v32h-64v64h-32v-64c0-17.7 14.3-32 32-32zm128 32h-64v-32h64c17.7 0 32 14.3 32 32v64h-32v-64z',
  },
  {
    id: 'oldwest-wagon-wheel',
    name: 'Wagon Wheel',
    category: 'dungeon-dressing',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 80a48 48 0 1 1 0 96 48 48 0 0 1 0-96zm0-80v80m0 96v80m-128-128h80m96 0h80m-226-90l56 56m128-56l-56 56m-128 78l56-56m128 56l-56-56',
  },
  {
    id: 'oldwest-trough',
    name: 'Water Trough',
    category: 'structures',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M128 224h256v96H128V224zm16 16h224v64H144V240zm-16-48h48v48m208-48h48v48m-288 96v48m256-48v48m-224-96c32 8 64 16 96 0s64-8 96 0',
  },
  {
    id: 'oldwest-hitching-post',
    name: 'Hitching Post',
    category: 'structures',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M240 128h32v256H240V128zm-80 64h192v32H160V192zm80-64h32v32H240V128zm-96 256h224v16H144v-16zm16-32v32m192-32v32',
  },
  {
    id: 'oldwest-saloon-door',
    name: 'Saloon Door',
    category: 'structures',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M160 128h192v256H160V128zm0 0h96v256m0-256h96v256M160 192h96m0 0h96M160 256h96m0 0h96M160 320h96m0 0h96m-192-224a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm80 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0z',
  },
  {
    id: 'oldwest-horseshoe',
    name: 'Horseshoe',
    category: 'dungeon-dressing',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M176 192c0-44.2 35.8-80 80-80s80 35.8 80 80v128h-48V192c0-17.7-14.3-32-32-32s-32 14.3-32 32v128h-48V192zm-16 128a16 16 0 1 1 32 0 16 16 0 0 1-32 0zm160 0a16 16 0 1 1 32 0 16 16 0 0 1-32 0z',
  },
  {
    id: 'oldwest-wanted-poster',
    name: 'Wanted Poster',
    category: 'dungeon-dressing',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160v320H176V96zm16 16h128v48H192V112zm0 64h128v176H192V176zm32 16h64v16H224v-16zm0 32h64v16H224v-16zm-32 64a32 32 0 1 1 64 0 32 32 0 0 1-64 0z',
  },
  {
    id: 'oldwest-dynamite',
    name: 'Dynamite',
    category: 'dungeon-dressing',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M208 192h32v192H208V192zm32 0h32v192h-32V192zm32 0h32v192h-32V192zm-32-48v48m0-80c0 0 16-16 16-32m-16 32c0 0-16-16-16-32m16 32a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-64 128h128M176 384h160v16H176v-16z',
  },
  {
    id: 'oldwest-mine-cart',
    name: 'Mine Cart',
    category: 'dungeon-dressing',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M160 224h192l32 96H128l32-96zm-16 96h224v16H144v-16zm32 16a24 24 0 1 1 0 48 24 24 0 0 1 0-48zm160 0a24 24 0 1 1 0 48 24 24 0 0 1 0-48zm-96-128l-32-48h96l-32 48h-32z',
  },
  {
    id: 'oldwest-windmill',
    name: 'Windmill',
    category: 'structures',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M256 192a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm0-96v96m0 64v128m-64 0h128v16H192v-16zm64-192l64 96h-64m-64 96l-64-96h64m64 0l64 96h-64m-64-96l-64-96h64',
  },
  {
    id: 'oldwest-sheriff-star',
    name: 'Sheriff Star',
    category: 'markers',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96l32 80 80-32-32 80 80 32-80 32 32 80-80-32-32 80-32-80-80 32 32-80-80-32 80-32-32-80 80 32 32-80zm0 112a48 48 0 1 1 0 96 48 48 0 0 1 0-96z',
  },
  {
    id: 'oldwest-tumble-weed',
    name: 'Tumbleweed',
    category: 'nature',
    themeId: 'oldwest',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm-64 48l128 96m0-96L192 304m64-144v192m-96-96h192',
  },

  // ── Pirate ─────────────────────────────────────────────────────────────────
  {
    id: 'pirate-anchor',
    name: 'Anchor',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm0 64v192m-80-48c0 26.5 35.8 48 80 48s80-21.5 80-48m-160 0h-32m192 0h32m-112-192v-32m-24 0h48',
  },
  {
    id: 'pirate-cannon',
    name: 'Cannon',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M160 240h160c17.7 0 32 14.3 32 32v0c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32v0c0-17.7 14.3-32 32-32zm192-16l32-32m-32 80l32 32m-224-16a40 40 0 1 1 0 80 40 40 0 0 1 0-80zm0 0a40 40 0 1 1 0-80 40 40 0 0 1 0 80z',
  },
  {
    id: 'pirate-treasure-map',
    name: 'Treasure Map',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M160 128h192v256H160V128zm16 16h160v224H176V144zm32 32c0 0 32 48 64 48s64-32 64-32m-128 80c0 0 32 32 64 16s48-48 64-32m-96 48l-16 16 32 32m64-64l16 16m-16-16l16-16',
  },
  {
    id: 'pirate-rum-barrel',
    name: 'Rum Barrel',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M192 128h128c26.5 0 48 35.8 48 80v96c0 44.2-21.5 80-48 80H192c-26.5 0-48-35.8-48-80v-96c0-44.2 21.5-80 48-80zm-16 128h176m-176 48h176m-88-176v256m-32-96h64v32h-64v-32z',
  },
  {
    id: 'pirate-ship-wheel',
    name: 'Ship Wheel',
    category: 'structures',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 48a48 48 0 1 1 0 96 48 48 0 0 1 0-96zm0-48v48m0 96v48m-96-96h48m96 0h48m-172-68l34 34m128-34l-34 34m-128 68l34-34m128 34l-34-34',
  },
  {
    id: 'pirate-jolly-roger',
    name: 'Jolly Roger',
    category: 'markers',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M176 96h160v224l-80 64-80-64V96zm80 32a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm-32 96h64v16h-64v-16zm-24 48l24-16 32 32 32-32 24 16m-128 144l96-48 96 48m-192-16l96-48 96 48',
  },
  {
    id: 'pirate-parrot-perch',
    name: 'Parrot Perch',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M240 192h32v192H240V192zm-48 192h128v16H192v-16zm48-192c0-44.2 14.3-80 32-80m-16 16l-16-32 32 16m16 16c0 0-8 16-24 16s-16-16-16-16m-8 0a4 4 0 1 1 8 0 4 4 0 0 1-8 0z',
  },
  {
    id: 'pirate-rope-coil',
    name: 'Rope Coil',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm0 16c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48z',
  },
  {
    id: 'pirate-plank',
    name: 'Plank',
    category: 'structures',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M96 240h224v32H96V240zm224 0h96l16 16-16 16h-96m-224-32v-16h32v16m0 32v16H96v-16m192-32v-16h32v16m0 32v16h-32v-16m-96-16h16',
  },
  {
    id: 'pirate-treasure-chest',
    name: 'Pirate Chest',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M144 224h224v128H144V224zm0-32c0-17.7 50.1-32 112-32s112 14.3 112 32H144zm80 128h64v-48h-64v48zm16-80v16m32-16v16m-112-16h32m128 0h32m-192 96h224v16H144v-16z',
  },
  {
    id: 'pirate-crow-nest',
    name: "Crow's Nest",
    category: 'structures',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M240 128h32v256H240V128zm-64 192h160v32H176v-32zm0 0v-16c0-8.8 28.7-16 64-16h32c35.3 0 64 7.2 64 16v16m-112-256l48-32 48 32',
  },
  {
    id: 'pirate-cutlass',
    name: 'Cutlass',
    category: 'dungeon-dressing',
    themeId: 'pirate',
    viewBox: '0 0 512 512',
    svgPath: 'M176 128c0 0 48 16 80 80s48 128 48 128l16-16c0 0-16-80-48-128s-80-80-80-80l-16 16zm128 208l32 32-16 16-32-32m-96-192a48 48 0 0 1-32 48m80 144l16 48m-16-48l-16 48',
  },

  // ── Desert ─────────────────────────────────────────────────────────────────
  {
    id: 'desert-oasis-palm',
    name: 'Oasis Palm',
    category: 'nature',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M240 224h32v192H240V224zm16-96c0 0-64 16-80 48s0 48 16 48 48-32 64-48m0-48c0 0 64 16 80 48s0 48-16 48-48-32-64-48m-16 288h64v16H224v-16z',
  },
  {
    id: 'desert-sand-dune',
    name: 'Sand Dune',
    category: 'nature',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M96 352c0 0 64-128 160-128s160 64 160 64m-320 64c0 0 48-96 128-96s96 48 96 48m-224 48c0 0 32-64 96-64s80 32 80 32',
  },
  {
    id: 'desert-scarab',
    name: 'Scarab',
    category: 'dungeon-dressing',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c44.2 0 80 35.8 80 80v48c0 44.2-35.8 80-80 80s-80-35.8-80-80v-48c0-44.2 35.8-80 80-80zm0 0v160m-48-128h96m-96 48h96m-96 48h96m-80-176l-32-32m112 32l32-32m-112 208l-32 32m112-32l32 32',
  },
  {
    id: 'desert-obelisk',
    name: 'Obelisk',
    category: 'structures',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M224 128h64v272H224V128zm32-64l32 64H224l32-64zm-48 336h112v16H208v-16zm16-272h80v16H224v-16zm16 48h48v16H240v-16zm0 48h48v16H240v-16zm0 48h48v16H240v-16z',
  },
  {
    id: 'desert-tent',
    name: 'Desert Tent',
    category: 'structures',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M128 384l128-224 128 224H128zm128-224v224m-96 0l96-112 96 112m-160-80l64-32m96 32l-64-32',
  },
  {
    id: 'desert-sand-pit',
    name: 'Sand Pit',
    category: 'dungeon-dressing',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c70.7 0 128 43 128 96s-57.3 96-128 96-128-43-128-96 57.3-96 128-96zm0 32c53 0 96 28.7 96 64s-43 64-96 64-96-28.7-96-64 43-64 96-64zm0 16c35.3 0 64 21.5 64 48s-28.7 48-64 48-64-21.5-64-48 28.7-48 64-48z',
  },
  {
    id: 'desert-sphinx',
    name: 'Sphinx',
    category: 'structures',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M176 320h160v48H176v-48zm32-128h96v128H208V192zm48-64l-48 64h96l-48-64zm-32 96h64v16H224v-16zm0 32h64v16H224v-16zm-48 64h160v16H176v-16zm-32 48h224v16H144v-16z',
  },
  {
    id: 'desert-sun-dial',
    name: 'Sun Dial',
    category: 'dungeon-dressing',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M256 176c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 0v80h-48m48-128v48m0 160v48m-80-208l-32-32m192 32l32-32m-192 176l-32 32m192-32l32 32m-160-96h-48m208 0h48',
  },
  {
    id: 'desert-amphora',
    name: 'Amphora',
    category: 'dungeon-dressing',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M224 176h64c26.5 0 48 35.8 48 80v48c0 26.5-21.5 48-48 48h-64c-26.5 0-48-21.5-48-48v-48c0-44.2 21.5-80 48-80zm0 0c0-17.7 14.3-32 32-32s32 14.3 32 32m-80 48c-24 0-32-16-32-32m128 32c24 0 32-16 32-32m-80 128h-16v16h16v-16z',
  },
  {
    id: 'desert-sand-worm',
    name: 'Sand Worm',
    category: 'nature',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M160 320c0-88.4 43-160 96-160s96 71.6 96 160m-192 0h192m-160-96c16-32 32-64 64-64s48 32 64 64m-96 0c0 0-32 32-32 64m128-64c0 0 32 32 32 64',
  },
  {
    id: 'desert-mirage',
    name: 'Mirage',
    category: 'nature',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M128 288c32-16 48-48 80-48s48 32 96 32 64-32 80-32v32c-16 0-48 32-80 32s-64-32-96-32-48 32-80 48v-32zm0 64c32-16 48-48 80-48s48 32 96 32 64-32 80-32v32c-16 0-48 32-80 32s-64-32-96-32-48 32-80 48v-32z',
  },
  {
    id: 'desert-camel',
    name: 'Camel',
    category: 'nature',
    themeId: 'desert',
    viewBox: '0 0 512 512',
    svgPath: 'M192 224h128v64H192v-64zm-16 64h160v16H176v-16zm16-64c0-26.5 14.3-48 32-64m96 64c0-26.5-14.3-48-32-64m-64-16c0 0 16 16 32 16s32-16 32-16m-96 144v48h16v-48m32 0v48h16v-48m48 0v48h16v-48m32 0v48h16v-48',
  },

  // ── Ancient ────────────────────────────────────────────────────────────────
  {
    id: 'ancient-hieroglyph',
    name: 'Hieroglyph',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M192 112h128v288H192V112zm16 16h96v48h-96V128zm0 64h96v48h-96V192zm0 64h96v48h-96V256zm0 64h96v48h-96V320zm16-176h16v16h-16v-16zm32 0h16v16h-16v-16zm-16 64l32 16-32 16m16 48l-32 16 32 16',
  },
  {
    id: 'ancient-broken-column',
    name: 'Broken Column',
    category: 'structures',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M208 192h96v192H208V192zm-16-32h128v32H192V160zm-16 224h160v32H176v-32zm32-192h96m-96 48h96m-96 48h96m-64-80l32 16-16 32 16 32-32 16',
  },
  {
    id: 'ancient-urn',
    name: 'Urn',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M224 192h64c26.5 0 48 28.7 48 64v32c0 35.3-21.5 64-48 64h-64c-26.5 0-48-28.7-48-64v-32c0-35.3 21.5-64 48-64zm0 0v-48h64v48m-80 64c-16-8-32-8-32 0m128-8c16-8 32-8 32 0m-80 96h16v16h-16v-16z',
  },
  {
    id: 'ancient-mosaic',
    name: 'Mosaic',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M160 160h192v192H160V160zm48 0v192m48-192v192m48-192v192m-144 0h192m-192-48h192m-192-48h192m-192-48h192m-144-48l48 48m48-48l48 48m-144 48l48 48m48-48l48 48',
  },
  {
    id: 'ancient-slab',
    name: 'Stone Slab',
    category: 'structures',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M160 192h192v128H160V192zm16 16h160v96H176V208zm0 0l160 96m0-96L176 304m64-112v128m-64-64h160',
  },
  {
    id: 'ancient-scroll',
    name: 'Scroll',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M192 128h128v256H192V128zm-16 0c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32m-160 256c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32m-128-224h96m-96 32h96m-96 32h96m-96 32h64m-64 32h80',
  },
  {
    id: 'ancient-statue',
    name: 'Statue',
    category: 'structures',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M232 128h48v48h-48v-48zm-16 48h80v128H216V176zm-16 128h112v32H200v-32zm-16 32h144v16H184v-16zm40-128h32v48h-32V208zm-8-80a24 24 0 1 1 48 0 24 24 0 0 1-48 0z',
  },
  {
    id: 'ancient-carved-face',
    name: 'Carved Face',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c53 0 96 43 96 96v48c0 53-43 96-96 96s-96-43-96-96v-48c0-53 43-96 96-96zm-32 80a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm64 0a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm-48 64h32c0 17.7-7.2 32-16 32s-16-14.3-16-32z',
  },
  {
    id: 'ancient-offering-bowl',
    name: 'Offering Bowl',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M176 256h160c0 44.2-35.8 80-80 80s-80-35.8-80-80zm0 0v-16h160v16m-128-48c0 0 16-32 48-32s48 32 48 32m-48-64v32m-24-16h48',
  },
  {
    id: 'ancient-sun-disc',
    name: 'Sun Disc',
    category: 'markers',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M256 176c44.2 0 80 35.8 80 80s-35.8 80-80 80-80-35.8-80-80 35.8-80 80-80zm0 32c26.5 0 48 21.5 48 48s-21.5 48-48 48-48-21.5-48-48 21.5-48 48-48zm0-112v48m0 208v48m-128-176h48m208 0h48m-68-92l-34 34m-128 116l-34 34m196 0l-34-34m-128-116l-34-34',
  },
  {
    id: 'ancient-vine-ruin',
    name: 'Vine Ruin',
    category: 'nature',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M192 160h32v224H192V160zm96 0h32v224h-32V160zm-96 32h128m-128 64h128m-128 64h128m-80-208c-16-16-32-16-48 0m128 0c16-16 32-16 48 0m-128 224c-16 16-32 16-48 0m128 0c16 16 32 16 48 0',
  },
  {
    id: 'ancient-labyrinth',
    name: 'Labyrinth',
    category: 'dungeon-dressing',
    themeId: 'ancient',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 32c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm0 32c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32z',
  },

  // ── Modern City ────────────────────────────────────────────────────────────
  {
    id: 'moderncity-trash-can',
    name: 'Trash Can',
    category: 'dungeon-dressing',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M192 160h128v224c0 17.7-28.7 32-64 32s-64-14.3-64-32V160zm-16-32h160v32H176V128zm32-32h96v32H208V96zm16 128h16v96h-16v-96zm48 0h16v96h-16v-96z',
  },
  {
    id: 'moderncity-bench',
    name: 'Park Bench',
    category: 'furniture',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M144 240h224v32H144v-32zm0 32v80m224-80v80M144 240v-48h224v48m-208-48v-32m192 32v-32',
  },
  {
    id: 'moderncity-lamppost',
    name: 'Lamppost',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M240 192h32v192H240V192zm-16 192h64v16H224v-16zm16-192c0 0-32-16-32-48s14.3-48 32-48m32 96c0 0 32-16 32-48s-14.3-48-32-48m-16 0v-48m-16 32a16 16 0 1 1 32 0 16 16 0 0 1-32 0z',
  },
  {
    id: 'moderncity-fire-hydrant',
    name: 'Fire Hydrant',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M224 192h64v160H224V192zm-16 48h96v16H208v-16zm0 64h96v16H208v-16zm16-144h64v48H224v-48zm16-32h32v32h-32V128zm-48 96h-16v32h16v-32zm128 0h16v32h-16v-32zm-64 160h-16v16h16v-16zm32 0h-16v16h16v-16z',
  },
  {
    id: 'moderncity-mailbox',
    name: 'Mailbox',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M208 176h96v144H208V176zm0-32c0-26.5 21.5-48 48-48s48 21.5 48 48v32H208V144zm-16 176h128v16H192v-16zm32 16v64m64-64v64m-48-192h32v16h-32v-16zm0 48h32v16h-32v-16z',
  },
  {
    id: 'moderncity-traffic-cone',
    name: 'Traffic Cone',
    category: 'markers',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96l80 288H176L256 96zm0 48l-48 176h96L256 144zm-96 240h192v16H160v-16zm48-144h96v16H208v-16zm16-48h64v16H224v-16z',
  },
  {
    id: 'moderncity-parking-meter',
    name: 'Parking Meter',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M240 224h32v160H240V224zm-16 160h64v16H224v-16zm16-224a32 32 0 1 1 64 0 32 32 0 0 1-64 0zm32 0v-32m-16 16h32m-16 48v-16',
  },
  {
    id: 'moderncity-bus-stop',
    name: 'Bus Stop',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M208 96h96v304H208V96zm16 16h64v48H224V112zm0 64h64v48H224V176zm0 64h64v80H224v-80zm16-112h32v16H240v-16zm0 64h32v16H240v-16zm-32 192h96v16H208v-16z',
  },
  {
    id: 'moderncity-sewer-grate',
    name: 'Sewer Grate',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M176 192h160v128H176V192zm16 16h128v96H192V208zm48 0v96m32-96v96m-80 0h128m-128-32h128m-128-32h128',
  },
  {
    id: 'moderncity-dumpster',
    name: 'Dumpster',
    category: 'dungeon-dressing',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M144 208h224v144H144V208zm0-48l16 48m208-48l-16 48M144 288h224m-192 64v32m160-32v32m-128-128h16m32 0h16m32 0h16',
  },
  {
    id: 'moderncity-manhole',
    name: 'Manhole',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm0-32v192m-96-96h192',
  },
  {
    id: 'moderncity-atm',
    name: 'ATM',
    category: 'structures',
    themeId: 'moderncity',
    viewBox: '0 0 512 512',
    svgPath: 'M192 112h128v288H192V112zm16 16h96v96H208V128zm0 112h96v32H208v-32zm16-96h64v16H224v-16zm0 32h64v16H224v-16zm0 32h64v16H224v-16zm8 80h24v24h-24v-24zm32 0h24v24h-24v-24zm-32 32h24v24h-24v-24zm32 0h24v24h-24v-24z',
  },

  // ── Post-Apocalypse ────────────────────────────────────────────────────────
  {
    id: 'postapocalypse-radiation-sign',
    name: 'Radiation Sign',
    category: 'markers',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c70.7 0 128 57.3 128 128s-57.3 128-128 128-128-57.3-128-128 57.3-128 128-128zm0 80a48 48 0 1 1 0 96 48 48 0 0 1 0-96zm0-80v80m-69 40L128 208m197 168l-69-40m0 0h-48m24-128l-69 40m117 0l69 40',
  },
  {
    id: 'postapocalypse-wrecked-car',
    name: 'Wrecked Car',
    category: 'dungeon-dressing',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M144 256h224v64H144v-64zm32-64h160l32 64H144l32-64zm-16 128a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm160 0a24 24 0 1 1 48 0 24 24 0 0 1-48 0zm-176-64h32m192 0h-32m-80-64l16-32m-32 32l-16-32',
  },
  {
    id: 'postapocalypse-barbed-wire',
    name: 'Barbed Wire',
    category: 'structures',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M96 240h320v32H96V240zm0 0c32-16 48-32 80-16s48 32 80 16 48-32 80-16 48 32 80 16m-320 32c32 16 48 32 80 16s48-32 80-16 48 32 80 16 48-32 80-16m-288-48l-8-16 16 8m48 8l-8-16 16 8m48 8l-8-16 16 8m48 8l-8-16 16 8',
  },
  {
    id: 'postapocalypse-gas-mask',
    name: 'Gas Mask',
    category: 'dungeon-dressing',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M256 128c53 0 96 43 96 96v32c0 53-43 96-96 96s-96-43-96-96v-32c0-53 43-96 96-96zm-40 80a24 24 0 1 1 0 48 24 24 0 0 1 0-48zm80 0a24 24 0 1 1 0 48 24 24 0 0 1 0-48zm-40 64v32c0 0-16 16-32 16m32-48v32c0 0 16 16 32 16',
  },
  {
    id: 'postapocalypse-bunker-hatch',
    name: 'Bunker Hatch',
    category: 'structures',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M256 160c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96zm0 32c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zm-24 40h48v48h-48v-48zm8 8h32v32h-32v-32z',
  },
  {
    id: 'postapocalypse-rusted-barrel',
    name: 'Toxic Barrel',
    category: 'dungeon-dressing',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M192 128h128c26.5 0 48 35.8 48 80v96c0 44.2-21.5 80-48 80H192c-26.5 0-48-35.8-48-80v-96c0-44.2 21.5-80 48-80zm-16 128h176m-176 48h176m-88-128v176m-16-96l32-16 32 16m-32-16v-32',
  },
  {
    id: 'postapocalypse-campfire-ruins',
    name: 'Camp Ruins',
    category: 'structures',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M256 192c0 0 48 48 48 96s-21.5 64-48 64-48-16-48-64 48-96 48-96zm-80 160h160v16H176v-16zm16-208h128l16 48H176l16-48zm-16 48h160v32H176v-32zm48-80h64v32H224v-32z',
  },
  {
    id: 'postapocalypse-scrap-pile',
    name: 'Scrap Pile',
    category: 'dungeon-dressing',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M160 336h192v32H160v-32zm16-48h160l16 48H160l16-48zm32-48h96l16 48H192l16-48zm-32 48l-16-32h32m128 32l16-32h-32m-48-48v-48l-16-16m32 64v-48l16-16',
  },
  {
    id: 'postapocalypse-warning-sign',
    name: 'Warning Sign',
    category: 'markers',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M256 96l144 288H112L256 96zm0 64l96 192H160L256 160zm-8 48v96h16V208h-16zm0 112v24h16v-24h-16z',
  },
  {
    id: 'postapocalypse-chain-fence',
    name: 'Chain Fence',
    category: 'structures',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M128 160h256v192H128V160zm48 0v192m48-192v192m48-192v192m48-192v192M128 224h256M128 288h256m-224-96l32 32-32 32m48-32l32 32-32 32m48-32l32 32-32 32m48-32l32 32-32 32',
  },
  {
    id: 'postapocalypse-generator',
    name: 'Generator',
    category: 'structures',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M176 176h160v160H176V176zm16 16h128v128H192V192zm48-48h32v48h-32v-48zm0 208h32v48h-32v-48zm-48-128a16 16 0 1 1 32 0 16 16 0 0 1-32 0zm80 0a16 16 0 1 1 32 0 16 16 0 0 1-32 0zm-64 48h80v48h-80v-48z',
  },
  {
    id: 'postapocalypse-hazmat-suit',
    name: 'Hazmat Suit',
    category: 'dungeon-dressing',
    themeId: 'postapocalypse',
    viewBox: '0 0 512 512',
    svgPath: 'M256 112a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm-32 64h64v96h-64V176zm-32 32h128v16H192v-16zm32 64h64v80h-64v-80zm-16 80h96v16H208v-16zm0 0v32m96-32v32m-64-224a48 48 0 1 1 0-16',
  },

];

/** All stamp categories with display labels. */
export const STAMP_CATEGORY_LABELS: Record<string, string> = {
  'all': 'All',
  'theme': '🎨 Theme',
  'furniture': 'Furniture',
  'dungeon-dressing': 'Dungeon',
  'nature': 'Nature',
  'structures': 'Structures',
  'markers': 'Markers',
  'custom': 'Custom',
};

/** Lookup a stamp definition by id. Returns undefined if not found. */
export function getStampDef(stampId: string, customStamps: readonly StampDef[] = []): StampDef | undefined {
  return customStamps.find(s => s.id === stampId) ?? BUILT_IN_STAMPS.find(s => s.id === stampId);
}
