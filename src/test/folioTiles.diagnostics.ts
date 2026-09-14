import { folioTheme } from '../themes/folio-v1/theme';
import { drawFolioShapes, folioShapes } from '../themes/folio-v1/art';
import { floorMaterialShapes } from '../themes/folio-v1/materials';

export function diagnoseFolioTileRasterization() {
  const results = [];
  const cases = [
    { size: 8, dpr: 2, x: 0, y: 0, material: 'folio-worn-wood-v1' },
    { size: 32, dpr: 1, x: 4, y: 3, material: 'folio-earth-v1' },
    { size: 32, dpr: 1.25, x: 1, y: 1, material: 'folio-earth-v1' },
    { size: 64, dpr: 1.25, x: 1, y: 1, material: 'folio-earth-v1' },
  ];
  for (const sample of cases) {
    const { size, dpr, x, y, material } = sample;
    const pixels = size * dpr, padding = 2, extent = pixels + 2 * padding;
    const width = 12 * pixels, height = 8 * pixels;
    const reference = document.createElement('canvas');
    reference.width = width;
    reference.height = height;
    const ref = reference.getContext('2d');
    if (!ref) throw new Error('Reference canvas unavailable');
    const context = { getTileBaseType: () => 'floor' as const, getFloorMaterial: () => material };
    ref.setTransform(dpr, 0, 0, dpr, 0, 0);
    folioTheme.drawTile(ref, 'floor', x, y, size, context);
    const expected = ref.getImageData(0, 0, width, height).data;
    for (const backing of ['small', '132', '256', 'full'] as const) {
      for (const readFrequently of [false, true]) {
        for (const origin of ['translated', 'normalized', 'original'] as const) {
          if (origin === 'original' && backing !== 'full') continue;
          const source = document.createElement('canvas');
          source.width = backing === 'full' ? width : backing === 'small' ? extent : Number(backing);
          source.height = backing === 'full' ? height : source.width;
          const sourceContext = source.getContext('2d', { willReadFrequently: readFrequently });
          if (!sourceContext) throw new Error('Source canvas unavailable');
          const atX = origin === 'original' ? x * pixels : padding;
          const atY = origin === 'original' ? y * pixels : padding;
          if (origin === 'normalized') {
            sourceContext.setTransform(dpr, 0, 0, dpr, padding, padding);
            const shapes = floorMaterialShapes(material, x, y, size) ?? folioShapes('floor', x, y, size, context);
            drawFolioShapes(sourceContext, shapes, 0, 0, size);
          } else {
            sourceContext.setTransform(dpr, 0, 0, dpr, atX - x * pixels, atY - y * pixels);
            folioTheme.drawTile(sourceContext, 'floor', x, y, size, context);
          }
          for (const copy of ['whole', 'clipped', 'cropped'] as const) {
            const destination = document.createElement('canvas');
            destination.width = width;
            destination.height = height;
            const ctx = destination.getContext('2d');
            if (!ctx) throw new Error('Destination canvas unavailable');
            const dx = x * pixels - atX, dy = y * pixels - atY;
            if (copy === 'clipped') {
              const clip = new Path2D();
              clip.rect(x * pixels - padding, y * pixels - padding, extent, extent);
              ctx.clip(clip);
            }
            if (copy === 'cropped') {
              const sx = Math.max(0, atX - padding), sy = Math.max(0, atY - padding);
              ctx.drawImage(source, sx, sy, extent, extent, dx + sx, dy + sy, extent, extent);
            } else {
              ctx.drawImage(source, dx, dy);
            }
            const actual = ctx.getImageData(0, 0, width, height).data;
            let max = 0, alphaMax = 0, total = 0;
            for (let i = 0; i < expected.length; i++) {
              const difference = Math.abs(expected[i] - actual[i]);
              max = Math.max(max, difference);
              if (i % 4 === 3) alphaMax = Math.max(alphaMax, difference);
              total += difference;
            }
            results.push({ ...sample, backing, readFrequently, origin, copy, max, alphaMax, mean: total / expected.length });
            destination.width = destination.height = 0;
          }
          source.width = source.height = 0;
        }
      }
    }
    reference.width = reference.height = 0;
  }
  return results;
}
