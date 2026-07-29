const path2DCache = new Map<string, Path2D>();
const viewBoxSizeCache = new Map<string, { width: number; height: number }>();

export function getCachedPath2D(pathData: string): Path2D {
  const cached = path2DCache.get(pathData);
  if (cached) return cached;
  const path = new Path2D(pathData);
  path2DCache.set(pathData, path);
  return path;
}

export function getViewBoxSize(viewBox: string): { width: number; height: number } {
  const cached = viewBoxSizeCache.get(viewBox);
  if (cached) return cached;
  const values = viewBox.split(/\s+/).map(Number);
  const size = {
    width: values[2] || 512,
    height: values[3] || 512,
  };
  viewBoxSizeCache.set(viewBox, size);
  return size;
}
