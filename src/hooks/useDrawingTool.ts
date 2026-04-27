import { useState } from 'react';
import type { ToolType, TileType } from '../types/map';

/**
 * Holds the user's currently-selected drawing tool and tile type. The
 * keyboard shortcuts that switch tools (P/E/F/N/L/R/S/V/H) are owned by
 * the global registry in `useGlobalShortcuts` so there's a single
 * `keydown` listener for the whole app.
 */
export function useDrawingTool() {
  const [activeTool, setActiveTool] = useState<ToolType>('paint');
  const [activeTile, setActiveTile] = useState<TileType>('floor');

  return {
    activeTool,
    setActiveTool,
    activeTile,
    setActiveTile,
  };
}
