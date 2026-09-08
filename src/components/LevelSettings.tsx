import { useMapContext } from '../contexts/MapContext';
import { useActionContext } from '../contexts/ActionContext';

export default function LevelSettings() {
  const { project, activeLevelIndex } = useMapContext();
  const actions = useActionContext();
  return <div className="level-settings">
    <p>Levels are floors within this project, not separate projects.</p>
    <button type="button" onClick={() => actions.addLevel()}>Add level</button>
    {project.levels.map((level, index) => <fieldset key={index}>
      <legend>Level {index + 1}{index === activeLevelIndex ? ' (current)' : ''}</legend>
      <label>Name<input value={level.meta.name} onChange={event => actions.renameLevel(index, event.target.value)} /></label>
      <button type="button" onClick={() => actions.switchLevel(index)}>Open {level.meta.name}</button>
      <button type="button" onClick={() => actions.duplicateLevel(index)}>Duplicate level {index + 1}</button>
      <button type="button" disabled={index === 0} onClick={() => actions.reorderLevels(index, index - 1)}>Move up</button>
      <button type="button" disabled={index === project.levels.length - 1} onClick={() => actions.reorderLevels(index, index + 1)}>Move down</button>
      <button type="button" disabled={project.levels.length < 2} onClick={() => {
        if (window.confirm(`Delete level "${level.meta.name}"? A project recovery checkpoint will be retained.`)) actions.deleteLevel(index);
      }}>Delete level {index + 1}</button>
    </fieldset>)}
  </div>;
}
