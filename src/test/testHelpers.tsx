/**
 * Shared test helpers for component smoke tests.
 * Provides minimal mock context values and a wrapper component
 * that sets up all required context providers.
 */
import React from 'react';
import { ToolContext, type ToolContextValue } from '../contexts/ToolContext';
import { MapContext, type MapContextValue } from '../contexts/MapContext';
import { ViewContext, type ViewContextValue } from '../contexts/ViewContext';
import { ActionContext, type ActionContextValue } from '../contexts/ActionContext';
import { createDefaultMap, createDefaultProject } from '../hooks/mapStateUtils';

const noop = () => {};
const noopReturn = () => null;

export function createMockToolContext(overrides: Partial<ToolContextValue> = {}): ToolContextValue {
  return {
    activeTool: 'paint',
    setActiveTool: noop,
    activeTile: 'floor',
    setActiveTile: noop,
    markerShape: 'circle',
    markerColor: '#ff0000',
    markerSize: 1,
    setMarkerShape: noop,
    setMarkerColor: noop,
    setMarkerSize: noop,
    measureShape: 'ruler',
    measureFeetPerCell: 5,
    setMeasureShape: noop,
    setMeasureFeetPerCell: noop,
    lightPreset: 'torch',
    lightRadius: 6,
    lightColor: '#ffcc00',
    setLightPreset: noop,
    setLightRadius: noop,
    setLightColor: noop,
    drawColor: '#ff0000',
    drawWidth: 3,
    setDrawColor: noop,
    setDrawWidth: noop,
    gmDrawColor: '#00ff00',
    gmDrawWidth: 3,
    setGmDrawColor: noop,
    setGmDrawWidth: noop,
    selectedStampId: null,
    setSelectedStampId: noop,
    selectedPlacedStampId: null,
    setSelectedPlacedStampId: noop,
    wallColor: '#ffffff',
    wallThickness: 3,
    setWallColor: noop,
    setWallThickness: noop,
    pathColor: '#888888',
    pathWidth: 2,
    setPathColor: noop,
    setPathWidth: noop,
    ...overrides,
  };
}

export function createMockMapContext(overrides: Partial<MapContextValue> = {}): MapContextValue {
  const map = createDefaultMap();
  const project = createDefaultProject();
  return {
    map,
    project,
    activeLevelIndex: 0,
    themeId: 'dungeon',
    customThemes: [],
    customStamps: [],
    ...overrides,
  };
}

export function createMockViewContext(overrides: Partial<ViewContextValue> = {}): ViewContextValue {
  return {
    viewMode: 'gm',
    printMode: false,
    uiScale: 1,
    gmShowFog: false,
    ...overrides,
  };
}

export function createMockActionContext(overrides: Partial<ActionContextValue> = {}): ActionContextValue {
  return {
    setTile: noop,
    setTiles: noop,
    fillTiles: noop,
    setMapName: noop,
    resizeMap: noop,
    clearMap: noop,
    newMap: noop,
    loadProjectData: noop,
    generateMap: noop,
    applyGeneratedRegion: noop,
    addNote: noop,
    updateNote: noop,
    deleteNote: noop,
    setTileSize: noop,
    setTheme: noop,
    saveCustomTheme: noop,
    deleteCustomTheme: noop,
    undo: noop,
    redo: noop,
    canUndo: false,
    canRedo: false,
    setFogCells: noop,
    fillAllFog: noop,
    setFogEnabled: noop,
    setDynamicFogEnabled: noop,
    setExplored: noop,
    resetExplored: noop,
    addToken: noopReturn as unknown as ActionContextValue['addToken'],
    moveToken: noop,
    removeToken: noop,
    updateToken: noop,
    reorderInitiative: noop,
    clearInitiative: noop,
    addAnnotation: noop,
    removeAnnotation: noop,
    clearAnnotations: noop,
    copySelection: noop,
    cutSelection: noop,
    pasteClipboard: noop,
    addMarker: noopReturn as unknown as ActionContextValue['addMarker'],
    removeMarker: noop,
    clearMarkers: noop,
    setBackgroundImage: noop,
    clearBackgroundImage: noop,
    updateBackgroundImage: noop,
    addLightSource: noopReturn as unknown as ActionContextValue['addLightSource'],
    removeLightSource: noop,
    clearLightSources: noop,
    addStamp: noopReturn as unknown as ActionContextValue['addStamp'],
    moveStamp: noop,
    removeStamp: noop,
    clearStamps: noop,
    updateStamp: noop,
    bringStampToFront: noop,
    sendStampToBack: noop,
    saveCustomStamp: noop,
    deleteCustomStamp: noop,
    saveSceneTemplate: noop,
    deleteSceneTemplate: noop,
    renameSceneTemplate: noop,
    applySceneTemplate: noop,
    switchLevel: noop,
    addLevel: noop,
    renameLevel: noop,
    deleteLevel: noop,
    duplicateLevel: noop,
    reorderLevels: noop,
    addStairLink: noop,
    removeStairLink: noop,
    // Wall segments
    addWallSegment: noop,
    removeWallSegment: noop,
    clearWallSegments: noop,
    // Path segments
    addPathSegment: noop,
    removePathSegment: noop,
    clearPathSegments: noop,
    ...overrides,
  } as ActionContextValue;
}

interface TestWrapperProps {
  children: React.ReactNode;
  toolCtx?: Partial<ToolContextValue>;
  mapCtx?: Partial<MapContextValue>;
  viewCtx?: Partial<ViewContextValue>;
  actionCtx?: Partial<ActionContextValue>;
}

/**
 * Wraps children in all four context providers with sensible defaults.
 * Use for component smoke tests that require context.
 */
export function TestProviders({ children, toolCtx, mapCtx, viewCtx, actionCtx }: TestWrapperProps) {
  return (
    <ToolContext.Provider value={createMockToolContext(toolCtx)}>
      <MapContext.Provider value={createMockMapContext(mapCtx)}>
        <ViewContext.Provider value={createMockViewContext(viewCtx)}>
          <ActionContext.Provider value={createMockActionContext(actionCtx)}>
            {children}
          </ActionContext.Provider>
        </ViewContext.Provider>
      </MapContext.Provider>
    </ToolContext.Provider>
  );
}
