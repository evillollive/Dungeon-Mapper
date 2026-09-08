import { useToolContext } from '../contexts/ToolContext';
import { useActionContext } from '../contexts/ActionContext';
import { LIGHT_SOURCE_PRESETS, type ToolType } from '../types/map';
import TacticalToolsTab from './TacticalToolsTab';

export default function DmViewUtilities({ onSetTool }: { onSetTool: (tool: ToolType) => void }) {
  const tools = useToolContext();
  const actions = useActionContext();
  return <TacticalToolsTab section="dm" activeTool={tools.activeTool} onSetTool={onSetTool}
    fogEnabled={false} gmShowFog={false} onToggleGmShowFog={() => {}}
    markerShape={tools.markerShape} markerColor={tools.markerColor} markerSize={tools.markerSize}
    onSetMarkerShape={tools.setMarkerShape} onSetMarkerColor={tools.setMarkerColor} onSetMarkerSize={tools.setMarkerSize}
    onClearMarkers={actions.clearMarkers}
    measureShape={tools.measureShape} measureFeetPerCell={tools.measureFeetPerCell}
    onSetMeasureShape={tools.setMeasureShape} onSetMeasureFeetPerCell={tools.setMeasureFeetPerCell}
    lightPreset={tools.lightPreset} lightRadius={tools.lightRadius} lightColor={tools.lightColor}
    onSetLightPreset={id => {
      tools.setLightPreset(id);
      const preset = LIGHT_SOURCE_PRESETS.find(preset => preset.id === id);
      if (preset) { tools.setLightRadius(preset.radius); tools.setLightColor(preset.color); }
    }}
    onSetLightRadius={tools.setLightRadius} onSetLightColor={tools.setLightColor} onClearLightSources={actions.clearLightSources} />;
}
