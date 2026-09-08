import { describe, expect, it } from 'vitest';
import { libraryMetadata } from '../projectRepository';

describe('library metadata migration defaults', () => {
  it('treats existing UX-01 records as active without rewriting them', () => {
    const raw = { localProjectId: 'original', storageRevision: 'revision', project: {} };
    expect(libraryMetadata(raw)).toEqual({ status: 'active', tags: [], lastOpenedAt: '' });
    expect(raw).not.toHaveProperty('library');
  });
  it.each(['active', 'archived', 'trash'])('reads %s with local tags and recency', status => {
    const library = { status, tags: ['Campaign'], lastOpenedAt: '2026-09-08T00:00:00Z' };
    expect(libraryMetadata({ library })).toEqual(library);
  });
  it.each([null, {}, { status: 'active', tags: [1], lastOpenedAt: '' }, { status: 'deleted', tags: [], lastOpenedAt: '' }])('surfaces invalid metadata instead of resurrecting it', library => {
    expect(() => libraryMetadata({ library })).toThrow('Invalid library metadata');
  });
});
