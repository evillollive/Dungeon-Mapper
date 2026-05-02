import { createContext, useContext } from 'react';
import type { ToolType, TileType, MarkerShape, MeasureShape, LightSourcePreset } from '../types/map';

export interface ToolContextValue {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType | ((prev: ToolType) => ToolType)) => void;
  activeTile: TileType;
  setActiveTile: (tile: TileType) => void;
  // Marker tool settings
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  setMarkerShape: (s: MarkerShape) => void;
  setMarkerColor: (c: string) => void;
  setMarkerSize: (s: number) => void;
  // Measure tool settings
  measureShape: MeasureShape;
  measureFeetPerCell: number;
  setMeasureShape: (s: MeasureShape) => void;
  setMeasureFeetPerCell: (n: number) => void;
  // Light source tool settings
  lightPreset: LightSourcePreset;
  lightRadius: number;
  lightColor: string;
  setLightPreset: (p: LightSourcePreset) => void;
  setLightRadius: (r: number) => void;
  setLightColor: (c: string) => void;
  // Drawing pen settings (player)
  drawColor: string;
  drawWidth: number;
  setDrawColor: (c: string) => void;
  setDrawWidth: (w: number) => void;
  // Drawing pen settings (GM)
  gmDrawColor: string;
  gmDrawWidth: number;
  setGmDrawColor: (c: string) => void;
  setGmDrawWidth: (w: number) => void;
  // Stamp tool settings
  selectedStampId: string | null;
  setSelectedStampId: (id: string | null) => void;
}

export const ToolContext = createContext<ToolContextValue | null>(null);

export function useToolContext(): ToolContextValue {
  const ctx = useContext(ToolContext);
  if (!ctx) throw new Error('useToolContext must be used within a ToolContext.Provider');
  return ctx;
}
