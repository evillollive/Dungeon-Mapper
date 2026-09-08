import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../hooks/mapStateUtils';
import { exportProjectJSON, importProjectJSON } from '../export';
import { encodeProject } from '../projectSchema';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('project JSON import/export', () => {
  it('downloads a versioned envelope with the existing backup filename', async () => {
    const project = createDefaultProject();
    project.name = 'Backup Name';
    let downloaded: Blob | undefined;
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => { downloaded = blob; return 'blob:backup'; }),
      revokeObjectURL: vi.fn(),
    });
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download;
    });
    exportProjectJSON(project);
    expect(filename).toBe('Backup_Name.json');
    expect(downloaded?.type).toBe('application/json');
    expect(JSON.parse(await downloaded!.text())).toEqual(encodeProject(project));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });

  it.each(['envelope', 'project', 'map'])('imports %s using the schema decoder', async format => {
    const project = createDefaultProject();
    const input = format === 'envelope' ? encodeProject(project) : format === 'project' ? project : project.levels[0];
    const result = await importProjectJSON(new File([JSON.stringify(input)], 'backup.json'));
    expect(result.levels).toEqual(project.levels);
    expect(result.activeLevelIndex).toBe(0);
  });

  it('preserves future-version upgrade instructions', async () => {
    const file = new File([JSON.stringify({ schemaVersion: 99, project: {} })], 'future.json');
    await expect(importProjectJSON(file)).rejects.toThrow(/version 99.*Update Dungeon Mapper/);
  });

  it('preserves detailed validation errors rather than reporting invalid JSON', async () => {
    const project = createDefaultProject();
    project.levels[0].tiles[0].pop();
    await expect(importProjectJSON(new File([JSON.stringify(project)], 'invalid.json')))
      .rejects.toThrow('project.levels[0].tiles[0]');
  });

  it('explains JSON syntax errors', async () => {
    await expect(importProjectJSON(new File(['{broken'], 'invalid.json'))).rejects.toThrow('Invalid JSON file');
  });

  it('reports file read failures', async () => {
    class FailedReader {
      onerror: (() => void) | null = null;
      readAsText() { this.onerror?.(); }
    }
    vi.stubGlobal('FileReader', FailedReader);
    await expect(importProjectJSON(new File(['{}'], 'unreadable.json'))).rejects.toThrow('Failed to read file');
  });
});
