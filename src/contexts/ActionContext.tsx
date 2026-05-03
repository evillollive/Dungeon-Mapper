import { createContext, useContext } from 'react';
import type { BackgroundImage, CustomThemeDefinition, StampDef, StairLink, TileType, TokenKind, MarkerShape, AnnotationStroke, StampPlacementOptions } from '../types/map';

export interface ActionContextValue {
  // Tile operations
  setTile: (x: number, y: number, type: TileType) => void;
  setTiles: (updates: { x: number; y: number; type: TileType }[]) => void;
  fillTiles: (x: number, y: number, fillType: TileType) => void;
  // Map management
  setMapName: (name: string) => void;
  resizeMap: (w: number, h: number) => void;
  clearMap: () => void;
  newMap: () => void;
  loadProjectData: (project: import('../types/map').DungeonProject) => void;
  generateMap: (tiles: import('../types/map').Tile[][], width: number, height: number, notes?: import('../types/map').MapNote[], name?: string) => void;
  applyGeneratedRegion: (genTiles: import('../types/map').Tile[][], ox: number, oy: number, genNotes?: import('../types/map').MapNote[]) => void;
  // Notes
  addNote: (x: number, y: number) => void;
  updateNote: (id: number, label: string, description: string) => void;
  deleteNote: (id: number) => void;
  // Theme
  setTileSize: (size: number) => void;
  setTheme: (theme: string, preserveExisting?: boolean) => void;
  saveCustomTheme: (theme: CustomThemeDefinition) => void;
  deleteCustomTheme: (themeId: string) => void;
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Fog
  setFogCells: (cells: { x: number; y: number }[], hidden: boolean) => void;
  fillAllFog: (hidden: boolean) => void;
  setFogEnabled: (enabled: boolean) => void;
  setDynamicFogEnabled: (enabled: boolean) => void;
  setExplored: (explored: boolean[][]) => void;
  resetExplored: () => void;
  // Tokens
  addToken: (kind: TokenKind, x: number, y: number, label?: string, size?: number) => number | null;
  moveToken: (id: number, x: number, y: number) => void;
  removeToken: (id: number) => void;
  updateToken: (id: number, patch: Partial<Omit<import('../types/map').Token, 'id'>>) => void;
  reorderInitiative: (fromIndex: number, toIndex: number) => void;
  clearInitiative: () => void;
  // Annotations
  addAnnotation: (stroke: Omit<AnnotationStroke, 'id'>) => void;
  removeAnnotation: (id: number) => void;
  clearAnnotations: (kind?: 'player' | 'gm') => void;
  // Clipboard
  copySelection: (sel: { x: number; y: number; w: number; h: number }) => void;
  cutSelection: (sel: { x: number; y: number; w: number; h: number }) => void;
  pasteClipboard: (ox: number, oy: number) => void;
  // Markers
  addMarker: (shape: MarkerShape, x: number, y: number, color: string, size: number) => number | null;
  removeMarker: (id: number) => void;
  clearMarkers: () => void;
  // Background
  setBackgroundImage: (bg: BackgroundImage) => void;
  clearBackgroundImage: () => void;
  updateBackgroundImage: (patch: Partial<BackgroundImage>) => void;
  // Light sources
  addLightSource: (x: number, y: number, radius: number, color: string, label: string) => number | null;
  removeLightSource: (id: number) => void;
  clearLightSources: () => void;
  // Stamps
  addStamp: (stampId: string, x: number, y: number, options?: StampPlacementOptions) => number | null;
  moveStamp: (id: number, x: number, y: number) => void;
  removeStamp: (id: number) => void;
  clearStamps: () => void;
  updateStamp: (id: number, patch: Partial<Omit<import('../types/map').PlacedStamp, 'id' | 'stampId'>>) => void;
  bringStampToFront: (id: number) => void;
  sendStampToBack: (id: number) => void;
  // Custom stamps
  saveCustomStamp: (stamp: StampDef) => void;
  deleteCustomStamp: (stampId: string) => void;
  // Scene templates
  saveSceneTemplate: (name: string, sel: { x: number; y: number; w: number; h: number }) => void;
  deleteSceneTemplate: (templateId: string) => void;
  renameSceneTemplate: (templateId: string, newName: string) => void;
  applySceneTemplate: (templateId: string, ox: number, oy: number) => void;
  // Level management
  switchLevel: (idx: number) => void;
  addLevel: (name?: string) => void;
  renameLevel: (idx: number, name: string) => void;
  deleteLevel: (idx: number) => void;
  duplicateLevel: (idx: number) => void;
  reorderLevels: (from: number, to: number) => void;
  // Stair links
  addStairLink: (link: StairLink) => void;
  removeStairLink: (fromLevel: number, fromX: number, fromY: number) => void;
}

export const ActionContext = createContext<ActionContextValue | null>(null);

export function useActionContext(): ActionContextValue {
  const ctx = useContext(ActionContext);
  if (!ctx) throw new Error('useActionContext must be used within an ActionContext.Provider');
  return ctx;
}
