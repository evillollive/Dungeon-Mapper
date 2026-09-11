import React from 'react';
import type { CustomThemeDefinition, EdgeBlendSettings, HandDrawnSettings, LightingAtmosphereSettings, PaperTextureSettings, ToolType, TileType, MarkerShape, MeasureShape, LightSourcePreset, RiverType } from '../types/map';
import type { BackgroundImage } from '../types/map';
import type { FloorMaterialId } from '../types/map';
import DrawToolsTab from './DrawToolsTab';
import TacticalToolsTab from './TacticalToolsTab';
import AdvancedToolsTab from './AdvancedToolsTab';
import type { EditorPanel } from '../utils/editorActions';
import ActionButton from './ActionButton';
import LevelSettings from './LevelSettings';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

const PANELS = [
  { id: 'build', label: 'Build' }, { id: 'decorate', label: 'Decorate' },
  { id: 'look', label: 'Look' }, { id: 'levels', label: 'Levels' },
  { id: 'tactical', label: 'Fog & sight' }, { id: 'notes', label: 'Notes' },
  { id: 'encounter', label: 'Encounter' }, { id: 'info', label: 'Map info' },
] as const;

/* ------------------------------------------------------------------ */
/*  Props — same as Toolbar (re-export for consumers)                  */
/* ------------------------------------------------------------------ */

interface NavigationRailProps {
  objectControls?: React.ReactNode;
  activePanel: EditorPanel;
  activeTool: ToolType;
  activeTile: TileType;
  activeFloorMaterial?: FloorMaterialId;
  onSetFloorMaterial?: (material: FloorMaterialId | undefined) => void;
  unavailableFloorMaterials?: boolean;
  themeId: string;
  customThemes?: readonly CustomThemeDefinition[];
  onSetTool: (tool: ToolType) => void;
  onSetTile: (tile: TileType) => void;
  onSetTheme: (theme: string, preserveExisting?: boolean) => void;
  preserveOnThemeSwitch: boolean;
  onTogglePreserveOnThemeSwitch: () => void;
  onOpenCustomThemeBuilder: () => void;
  fogEnabled: boolean;
  gmShowFog: boolean;
  onToggleGmShowFog: () => void;
  onOpenGenerateMap: () => void;
  // Shape marker tool settings
  markerShape: MarkerShape;
  markerColor: string;
  markerSize: number;
  onSetMarkerShape: (s: MarkerShape) => void;
  onSetMarkerColor: (c: string) => void;
  onSetMarkerSize: (s: number) => void;
  onClearMarkers: () => void;
  // Background image
  backgroundImage?: BackgroundImage;
  onImportBackgroundImage: (bg: BackgroundImage) => void;
  onUpdateBackgroundImage: (patch: Partial<BackgroundImage>) => void;
  onClearBackgroundImage: () => void;
  // Measure tool settings
  measureShape: MeasureShape;
  measureFeetPerCell: number;
  onSetMeasureShape: (s: MeasureShape) => void;
  onSetMeasureFeetPerCell: (n: number) => void;
  // Light source tool settings
  lightPreset: LightSourcePreset;
  lightRadius: number;
  lightColor: string;
  onSetLightPreset: (p: LightSourcePreset) => void;
  onSetLightRadius: (r: number) => void;
  onSetLightColor: (c: string) => void;
  onClearLightSources: () => void;
  // Stair link tool state
  stairLinkSource: { level: number; x: number; y: number } | null;
  stairLinkCount: number;
  onClearStairLinks: () => void;
  // GM drawing tool state
  gmDrawColor: string;
  gmDrawWidth: number;
  onSetGmDrawColor: (c: string) => void;
  onSetGmDrawWidth: (w: number) => void;
  onClearGmDrawings: () => void;
  // Stamp picker state
  selectedStampId: string | null;
  onSelectStamp: (stampId: string) => void;
  onClearStamps: () => void;
  // Custom stamps
  customStamps?: readonly import('../types/map').StampDef[];
  onSaveCustomStamp?: (stamp: import('../types/map').StampDef) => void;
  onDeleteCustomStamp?: (stampId: string) => void;
  // Wall & Path tools
  wallColor: string;
  wallThickness: number;
  onSetWallColor: (c: string) => void;
  onSetWallThickness: (w: number) => void;
  pathColor: string;
  pathWidth: number;
  onSetPathColor: (c: string) => void;
  onSetPathWidth: (w: number) => void;
  riverColor: string;
  riverWidth: number;
  riverType: RiverType;
  onSetRiverColor: (c: string) => void;
  onSetRiverWidth: (w: number) => void;
  onSetRiverType: (t: RiverType) => void;
  onClearWalls: () => void;
  onClearPaths: () => void;
  onClearRivers: () => void;
  // Paper texture
  paperTexture?: PaperTextureSettings;
  onSetPaperTexture?: (settings: PaperTextureSettings) => void;
  onUpdatePaperTexture?: (patch: Partial<PaperTextureSettings>) => void;
  onClearPaperTexture?: () => void;
  // Edge blending
  edgeBlend?: EdgeBlendSettings;
  onSetEdgeBlend?: (settings: EdgeBlendSettings) => void;
  onUpdateEdgeBlend?: (patch: Partial<EdgeBlendSettings>) => void;
  onClearEdgeBlend?: () => void;
  // Hand-drawn mode
  handDrawn?: HandDrawnSettings;
  onSetHandDrawn?: (settings: HandDrawnSettings) => void;
  onUpdateHandDrawn?: (patch: Partial<HandDrawnSettings>) => void;
  onClearHandDrawn?: () => void;
  // Lighting & atmosphere
  lightingAtmosphere?: LightingAtmosphereSettings;
  onSetLightingAtmosphere?: (settings: LightingAtmosphereSettings) => void;
  onUpdateLightingAtmosphere?: (patch: Partial<LightingAtmosphereSettings>) => void;
  onClearLightingAtmosphere?: () => void;
  // Art style presets
  artStylePreset?: import('../types/map').ArtStylePresetId;
  onApplyArtStylePreset?: (presetId: import('../types/map').ArtStylePresetId) => void;
  // Room shape edge overrides (Phase 10.5)
  roomShapes?: import('../types/map').RoomShape[];
  selectedRoomShapeId?: number | null;
  onUpdateRoomShape?: (id: number, changes: Partial<Omit<import('../types/map').RoomShape, 'id'>>) => void;
  // Scene templates
  onOpenSceneTemplates: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const NavigationRail: React.FC<NavigationRailProps> = (props) => {
  const activeMode = props.activePanel;

  return (
    <div className="nav-rail-container">
      {/* Icon rail — narrow vertical strip */}
      <div className="nav-rail" aria-label="Editor destinations">
        {PANELS.map(item => <ActionButton key={item.id} id={`panel.${item.id}`}
          icon={item.id} pressed={activeMode === item.id}>{item.label}</ActionButton>)}
      </div>

      {/* Contextual sub-panel — swaps based on selected rail mode */}
      <div
        className="nav-rail-panel"
        role="region"
        id={`rail-panel-${activeMode}`}
        aria-label={`${PANELS.find(i => i.id === activeMode)?.label ?? ''} tools`}
      >
        <h2>{PANELS.find(i => i.id === activeMode)?.label}</h2>
        {activeMode === 'levels' && <LevelSettings />}
        {['notes', 'encounter', 'info'].includes(activeMode) && <p>Details are open beside the map. Close the panel to return to the canvas.</p>}
        {activeMode === 'build' && <div className="panel-quick-actions">
          <ActionButton id="file.generate">Generate</ActionButton>
          <ActionButton id="edit.copy">Copy</ActionButton>
          <ActionButton id="edit.cut">Cut</ActionButton>
          <ActionButton id="edit.paste">Paste</ActionButton>
        </div>}
        {['build', 'decorate', 'look'].includes(activeMode) && (
          <DrawToolsTab
            objectControls={props.objectControls}
            section={activeMode === 'build' ? 'build' : activeMode === 'decorate' ? 'decorate' : 'look'}
            activeTool={props.activeTool}
            activeTile={props.activeTile}
            activeFloorMaterial={props.activeFloorMaterial}
            onSetFloorMaterial={props.onSetFloorMaterial}
            unavailableFloorMaterials={props.unavailableFloorMaterials}
            themeId={props.themeId}
            customThemes={props.customThemes ?? []}
            onSetTool={props.onSetTool}
            onSetTile={props.onSetTile}
            onSetTheme={props.onSetTheme}
            preserveOnThemeSwitch={props.preserveOnThemeSwitch}
            onTogglePreserveOnThemeSwitch={props.onTogglePreserveOnThemeSwitch}
            onOpenCustomThemeBuilder={props.onOpenCustomThemeBuilder}
            selectedStampId={props.selectedStampId}
            onSelectStamp={props.onSelectStamp}
            onClearStamps={props.onClearStamps}
            customStamps={props.customStamps}
            onSaveCustomStamp={props.onSaveCustomStamp}
            onDeleteCustomStamp={props.onDeleteCustomStamp}
            wallColor={props.wallColor}
            wallThickness={props.wallThickness}
            onSetWallColor={props.onSetWallColor}
            onSetWallThickness={props.onSetWallThickness}
            pathColor={props.pathColor}
            pathWidth={props.pathWidth}
            onSetPathColor={props.onSetPathColor}
            onSetPathWidth={props.onSetPathWidth}
            riverColor={props.riverColor}
            riverWidth={props.riverWidth}
            riverType={props.riverType}
            onSetRiverColor={props.onSetRiverColor}
            onSetRiverWidth={props.onSetRiverWidth}
            onSetRiverType={props.onSetRiverType}
            onClearWalls={props.onClearWalls}
            onClearPaths={props.onClearPaths}
            onClearRivers={props.onClearRivers}
            paperTexture={props.paperTexture}
            onSetPaperTexture={props.onSetPaperTexture}
            onUpdatePaperTexture={props.onUpdatePaperTexture}
            onClearPaperTexture={props.onClearPaperTexture}
            edgeBlend={props.edgeBlend}
            onSetEdgeBlend={props.onSetEdgeBlend}
            onUpdateEdgeBlend={props.onUpdateEdgeBlend}
            onClearEdgeBlend={props.onClearEdgeBlend}
            handDrawn={props.handDrawn}
            onSetHandDrawn={props.onSetHandDrawn}
            onUpdateHandDrawn={props.onUpdateHandDrawn}
            onClearHandDrawn={props.onClearHandDrawn}
            lightingAtmosphere={props.lightingAtmosphere}
            onSetLightingAtmosphere={props.onSetLightingAtmosphere}
            onUpdateLightingAtmosphere={props.onUpdateLightingAtmosphere}
            onClearLightingAtmosphere={props.onClearLightingAtmosphere}
            artStylePreset={props.artStylePreset}
            onApplyArtStylePreset={props.onApplyArtStylePreset}
            roomShapes={props.roomShapes}
            selectedRoomShapeId={props.selectedRoomShapeId}
            onUpdateRoomShape={props.onUpdateRoomShape}
          />
        )}
        {(activeMode === 'tactical' || activeMode === 'decorate') && (
          <TacticalToolsTab
            section={activeMode === 'decorate' ? 'decorate' : 'tactical'}
            activeTool={props.activeTool}
            onSetTool={props.onSetTool}
            fogEnabled={props.fogEnabled}
            gmShowFog={props.gmShowFog}
            onToggleGmShowFog={props.onToggleGmShowFog}
            markerShape={props.markerShape}
            markerColor={props.markerColor}
            markerSize={props.markerSize}
            onSetMarkerShape={props.onSetMarkerShape}
            onSetMarkerColor={props.onSetMarkerColor}
            onSetMarkerSize={props.onSetMarkerSize}
            onClearMarkers={props.onClearMarkers}
            measureShape={props.measureShape}
            measureFeetPerCell={props.measureFeetPerCell}
            onSetMeasureShape={props.onSetMeasureShape}
            onSetMeasureFeetPerCell={props.onSetMeasureFeetPerCell}
            lightPreset={props.lightPreset}
            lightRadius={props.lightRadius}
            lightColor={props.lightColor}
            onSetLightPreset={props.onSetLightPreset}
            onSetLightRadius={props.onSetLightRadius}
            onSetLightColor={props.onSetLightColor}
            onClearLightSources={props.onClearLightSources}
          />
        )}
        {['look', 'levels', 'decorate'].includes(activeMode) && (
          <AdvancedToolsTab
            section={activeMode === 'look' ? 'look' : activeMode === 'levels' ? 'levels' : 'decorate'}
            activeTool={props.activeTool}
            onSetTool={props.onSetTool}
            backgroundImage={props.backgroundImage}
            onImportBackgroundImage={props.onImportBackgroundImage}
            onUpdateBackgroundImage={props.onUpdateBackgroundImage}
            onClearBackgroundImage={props.onClearBackgroundImage}
            stairLinkSource={props.stairLinkSource}
            stairLinkCount={props.stairLinkCount}
            onClearStairLinks={props.onClearStairLinks}
            gmDrawColor={props.gmDrawColor}
            gmDrawWidth={props.gmDrawWidth}
            onSetGmDrawColor={props.onSetGmDrawColor}
            onSetGmDrawWidth={props.onSetGmDrawWidth}
            onClearGmDrawings={props.onClearGmDrawings}
            onOpenSceneTemplates={props.onOpenSceneTemplates}
          />
        )}
      </div>
    </div>
  );
};

export default NavigationRail;
