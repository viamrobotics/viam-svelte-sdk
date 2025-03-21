import { comparePartIds } from '$lib/compare';
import { describe, it, expect } from 'vitest';

describe('comparePartIds()', () => {
  it('returns added, removed, and unchanged partIDs', () => {
    const last = ['id1', 'id2', 'id3'];
    const current = ['id2', 'id3', 'id4'];

    const { added, removed, unchanged } = comparePartIds(current, last);

    expect(added).toEqual(['id4']);
    expect(removed).toEqual(['id1']);
    expect(unchanged).toEqual(['id2', 'id3']);
  });
});
