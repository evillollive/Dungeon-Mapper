# Development Guide

This page collects setup, validation, and test-structure notes for contributors.

## Prerequisites

- Node.js 20+
- npm 10+

## Development & Testing

If you want to hack on the project, the workflow is refreshingly normal. Spin up Vite for development, run the build when you want the production check, and use the existing test suite when you're touching behavior.

```bash
npm install
npm run dev # development server
npm run build # production build (tsc + vite)
npm run preview # preview the production build
npm run lint # ESLint
npm test # run the full test suite (one-shot, CI-friendly)
npm run test:watch # run tests in watch mode during development
```

The project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and jsdom for unit and component testing. The coverage is broad enough that you can poke at rendering, generation logic, and state behavior without flying blind.

**Test structure:**

| Area | Location | What's tested |
|------|----------|---------------|
| Generator utilities | `src/utils/__tests__/common.test.ts` | `makeTypeGrid`, `outlineWalls`, `bfsDistances`, `collectCells`, `reorderNotesReadingOrder` |
| Seedable RNG | `src/utils/__tests__/random.test.ts` | `makeRng`, `seedFromString`, `parseSeed`, determinism |
| FOV engine | `src/utils/__tests__/fov.test.ts` | `isOpaque`, `computeFOV` edge cases (walls, radius, doors) |
| Stamp catalog | `src/utils/__tests__/stampCatalog.test.ts` | `getStampDef`, built-in stamp integrity, category labels |
| Map state | `src/hooks/__tests__/mapStateUtils.test.ts` | `createDefaultMap`, `createDefaultProject`, `withDefaults`, `nextIdAfter` |
| Components | `src/components/__tests__/dialogs.test.tsx` | Dialog render/close lifecycle (ShortcutsHelp, ExportDialog) |
| Paper texture | `src/utils/__tests__/paperTexture.test.ts` | `generatePaperTexture`, pattern rendering, caching, vignette |
| Edge blending | `src/utils/__tests__/edgeBlend.test.ts` | `drawEdgeBlending`, dither/smooth/stipple styles, intensity |
| Hand-drawn mode | `src/utils/__tests__/handDrawn.test.ts` | `drawHandDrawn`, sketchy/pencil/ink styles, wobble, print mode |
| Lighting & atmosphere | `src/utils/__tests__/lightingAtmosphere.test.ts` | `drawLightingAtmosphere`, AO, stamp shadows, color grading |
| Art style presets | `src/utils/__tests__/artStylePresets.test.ts` | `getPresetSettings`, preset descriptions, layer configurations |
| Room rasterizer | `src/utils/__tests__/roomRasterizer.test.ts` | `rasterizeRoomShapes`, rectangle rooms, door hints, clipping, overlaps |
| Dynamic fog | `src/utils/__tests__/dynamicFog.test.ts` | player FOV union, explored-grid merging |
| Light sources | `src/utils/__tests__/lightSources.test.ts` | light FOV union, wall/radius handling |
| Token visibility | `src/utils/__tests__/tokenVisibility.test.ts` | classic and dynamic fog visibility for multi-cell tokens |
| Canvas geometry | `src/utils/__tests__/canvasGeometry.test.ts` | line, rectangle, snapping, polyline hit-test helpers used by `MapCanvas` |
| Rivers | `src/utils/__tests__/riverRasterizer.test.ts`, `src/hooks/__tests__/mapStateRivers.test.ts`, `src/utils/__tests__/premadeMaps.test.ts` | river rasterization metadata, map state actions, generated/premade river vectors |
| Export/rendering | `src/utils/__tests__/exportRender.test.ts` | player-safe SVG exports, dynamic fog, render-map canvas sizing |
| UI behavior | `src/components/__tests__/uiBehavior.test.tsx` | Generate Hub, Command Palette, Navigation Rail, Selection Inspector, ExportDialog interactions |

Shared mock context providers live in `src/test/testHelpers.tsx` - use `TestProviders` to wrap components that depend on `ToolContext`, `MapContext`, `ViewContext`, or `ActionContext`.
