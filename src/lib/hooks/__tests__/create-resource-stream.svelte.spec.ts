import { describe, it, expect } from 'vitest';
import { streamQueryKey } from '../create-resource-stream.svelte';

describe('streamQueryKey()', () => {
  it('should generate query key with all parameters', () => {
    const result = streamQueryKey('part-123', 'camera', 'getImages', {
      enabled: true,
    });

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-123',
      'resource',
      'camera',
      'getImages',
      { enabled: true },
    ]);
  });

  it('should generate query key without args when undefined', () => {
    const result = streamQueryKey('part-123', 'camera', 'getImages', undefined);

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-123',
      'resource',
      'camera',
      'getImages',
    ]);
  });

  it('should generate query key without args when not provided', () => {
    const result = streamQueryKey('part-123', 'camera', 'getImages');

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-123',
      'resource',
      'camera',
      'getImages',
    ]);
  });

  it('should handle undefined resource name', () => {
    const result = streamQueryKey('part-123', undefined, 'getImages');

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-123',
      'resource',
      undefined,
      'getImages',
    ]);
  });

  it('should include complex args objects', () => {
    const args = {
      enabled: true,
      refetchMode: 'append' as const,
      someParam: { nested: 'value' },
    };

    const result = streamQueryKey('part-456', 'motor', 'getPosition', args);

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-456',
      'resource',
      'motor',
      'getPosition',
      args,
    ]);
  });

  it('should handle empty string as partID', () => {
    const result = streamQueryKey('', 'camera', 'getImages');

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      '',
      'resource',
      'camera',
      'getImages',
    ]);
  });

  it('should handle empty string as resource name', () => {
    const result = streamQueryKey('part-123', '', 'getImages');

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-123',
      'resource',
      '',
      'getImages',
    ]);
  });

  it('should handle primitive values as args', () => {
    const result = streamQueryKey('part-123', 'camera', 'getImages', 42);

    expect(result).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-123',
      'resource',
      'camera',
      'getImages',
      42,
    ]);
  });
});
