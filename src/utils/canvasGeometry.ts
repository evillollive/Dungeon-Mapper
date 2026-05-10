export interface GridPoint {
  x: number;
  y: number;
}

export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): GridPoint[] {
  const points: GridPoint[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;
  while (true) {
    points.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return points;
}

export function rectOutline(x0: number, y0: number, x1: number, y1: number): GridPoint[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const points: GridPoint[] = [];
  for (let x = minX; x <= maxX; x++) {
    points.push({ x, y: minY });
    if (minY !== maxY) points.push({ x, y: maxY });
  }
  for (let y = minY + 1; y < maxY; y++) {
    points.push({ x: minX, y });
    if (minX !== maxX) points.push({ x: maxX, y });
  }
  return points;
}

/** Fill every cell in the inclusive rectangle. */
export function rectCells(x0: number, y0: number, x1: number, y1: number): GridPoint[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const points: GridPoint[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      points.push({ x, y });
    }
  }
  return points;
}

/** Snap a fractional coordinate to the nearest grid intersection. */
export function snapToGridIntersection(fx: number, fy: number): GridPoint {
  return { x: Math.round(fx), y: Math.round(fy) };
}

export function pointNearPolyline(
  px: number,
  py: number,
  points: GridPoint[],
  threshold: number,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x, ay = points[i].y;
    const bx = points[i + 1].x, by = points[i + 1].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      if (Math.hypot(px - ax, py - ay) < threshold) return true;
      continue;
    }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx, cy = ay + t * dy;
    if (Math.hypot(px - cx, py - cy) < threshold) return true;
  }
  return points.length === 1 && Math.hypot(px - points[0].x, py - points[0].y) < threshold;
}
