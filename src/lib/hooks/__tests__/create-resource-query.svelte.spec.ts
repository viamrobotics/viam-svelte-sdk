import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreateResourceQueryTestWrapper from './fixtures/CreateResourceQueryTestWrapper.svelte';
import { resourceQueryKeyPrefix } from '../resource-query-key';

const { fakeResourceClient } = vi.hoisted(() => ({
  fakeResourceClient: { name: 'arm-1', partID: 'part-1' },
}));

vi.mock('@viamrobotics/sdk', () => ({
  MachineConnectionEvent: { CONNECTED: 'connected' },
}));

vi.mock('../robot-clients.svelte', () => ({
  useConnectionStatus: () => ({ current: 'connected' }),
}));

vi.mock('../use-enabled-queries.svelte', () => ({
  useEnabledQueries: () => ({ resourceQueries: true }),
}));

vi.mock('../use-polling.svelte', () => ({
  usePolling: vi.fn(),
}));

vi.mock('@tanstack/svelte-query', () => ({
  createQuery: () => ({ data: undefined }),
  queryOptions: (options: unknown) => options,
}));

vi.mock('$lib/logger', () => ({
  createQueryLogger: () => ({
    request: vi.fn(),
    response: vi.fn(),
    error: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

describe('createResourceQuery', () => {
  it('keys on the addressed part and resource', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
      },
    });

    expect(JSON.parse(getByTestId('query-key').textContent ?? '')).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-1',
      'resource',
      'arm-1',
      'getEndPosition',
    ]);
  });

  it('keys under the prefix a rebuild invalidates', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
      },
    });

    const key = JSON.parse(getByTestId('query-key').textContent ?? '');
    const prefix = resourceQueryKeyPrefix('part-1', 'arm-1');

    // A prefix that drifts from this key would make rebuild invalidation match
    // nothing, which looks exactly like the bug it fixes.
    expect(key.slice(0, prefix.length)).toEqual(prefix);
  });

  it('holds its key when the client is torn down by a disconnect', async () => {
    const { getByTestId, rerender } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
      },
    });

    const connectedKey = getByTestId('query-key').textContent;

    await rerender({
      current: undefined,
      partID: 'part-1',
      resourceName: 'arm-1',
    });

    // A moved key points at an empty cache entry, so the caller loses the data
    // it is still showing.
    expect(getByTestId('query-key').textContent).toBe(connectedKey);
  });
});
