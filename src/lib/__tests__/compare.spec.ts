import { comparePartIds, isJsonEqual } from '$lib/compare';
import { describe, it, expect } from 'vitest';

describe('comparePartIds()', () => {
  it.each([
    {
      description: 'arrays differ',
      current: ['id2', 'id3', 'id4'],
      last: ['id1', 'id2', 'id3'],
      added: ['id4'],
      removed: ['id1'],
      unchanged: ['id2', 'id3'],
    },
    {
      description: 'empty current array',
      current: [],
      last: ['id1', 'id2'],
      added: [],
      removed: ['id1', 'id2'],
      unchanged: [],
    },
    {
      description: 'empty last array',
      current: ['id1', 'id2'],
      last: [],
      added: ['id1', 'id2'],
      removed: [],
      unchanged: [],
    },
    {
      description: 'both arrays empty',
      current: [],
      last: [],
      added: [],
      removed: [],
      unchanged: [],
    },
    {
      description: 'single element arrays with same value',
      current: ['id1'],
      last: ['id1'],
      added: [],
      removed: [],
      unchanged: ['id1'],
    },
    {
      description: 'duplicate IDs using Set logic',
      current: ['id2', 'id2', 'id3'],
      last: ['id1', 'id1', 'id2'],
      added: ['id3'],
      removed: ['id1', 'id1'],
      unchanged: ['id2', 'id2'],
    },
    {
      description: 'identical arrays',
      current: ['id1', 'id2', 'id3'],
      last: ['id1', 'id2', 'id3'],
      added: [],
      removed: [],
      unchanged: ['id1', 'id2', 'id3'],
    },
  ])(
    'should handle $description',
    ({ current, last, added, removed, unchanged }) => {
      const result = comparePartIds(current, last);

      expect(result.added).toEqual(added);
      expect(result.removed).toEqual(removed);
      expect(result.unchanged).toEqual(unchanged);
    }
  );
});

describe('isJsonEqual()', () => {
  it.each([
    {
      description: 'equal objects with multiple types',
      json1: { key1: true, key2: 'value2', key3: 3, key4: { nested1: true } },
      json2: { key1: true, key2: 'value2', key3: 3, key4: { nested1: true } },
    },
    {
      description: 'empty objects',
      json1: {},
      json2: {},
    },
    {
      description: 'both values are null',
      json1: { key: null },
      json2: { key: null },
    },
    {
      description: 'deeply nested equal objects',
      json1: { level1: { level2: { level3: { value: 'deep' } } } },
      json2: { level1: { level2: { level3: { value: 'deep' } } } },
    },
    {
      description: 'arrays as values with same elements',
      json1: { arr: [1, 2, 3] },
      json2: { arr: [1, 2, 3] },
    },
    {
      description: 'mixed types',
      json1: { str: 'string', num: 42, bool: true, obj: { nested: 'value' } },
      json2: { str: 'string', num: 42, bool: true, obj: { nested: 'value' } },
    },
    {
      description: 'object to array with same indices (arrays are objects)',
      json1: { key: { 0: 'a', 1: 'b' } },
      json2: { key: ['a', 'b'] },
    },
  ])('should return true for $description', ({ json1, json2 }) => {
    expect(isJsonEqual(json1, json2)).toBe(true);
  });

  it.each([
    {
      description: 'objects with different values',
      json1: { key1: true, key2: 'value2', key3: 3, key4: { nested1: true } },
      json2: { key1: true, key2: 'value2', key3: 3, key4: { nested1: false } },
    },
    {
      description: 'objects with different keys',
      json1: { key1: true, key2: 'value2', key3: 3, key4: { nested1: true } },
      json2: { key1: true, key2: 'value2', key3: 3 },
    },
    {
      description: 'one null value',
      json1: { key: null },
      json2: { key: 'value' },
    },
    {
      description: 'undefined vs defined value',
      json1: { key: undefined },
      json2: { key: 'value' },
    },
    {
      description: 'deeply nested objects with different values',
      json1: { level1: { level2: { level3: { value: 'deep' } } } },
      json2: { level1: { level2: { level3: { value: 'different' } } } },
    },
    {
      description: 'arrays with different values',
      json1: { arr: [1, 2, 3] },
      json2: { arr: [1, 2, 4] },
    },
    {
      description: 'arrays with different lengths',
      json1: { arr: [1, 2, 3] },
      json2: { arr: [1, 2] },
    },
    {
      description: 'number vs string',
      json1: { key: 42 },
      json2: { key: '42' },
    },
  ])('should return false for $description', ({ json1, json2 }) => {
    expect(isJsonEqual(json1, json2)).toBe(false);
  });
});
