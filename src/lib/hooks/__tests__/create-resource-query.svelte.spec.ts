import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreateResourceQueryTestWrapper from './fixtures/CreateResourceQueryTestWrapper.svelte';
import { resourceQueryKeyPrefix } from '../resource-query-key';

const { fakeResourceClient, builtOptions } = vi.hoisted(() => ({
  fakeResourceClient: { name: 'arm-1', partID: 'part-1' },
  /** The options handed to Tanstack, which the wrapper does not otherwise expose. */
  builtOptions: { current: undefined as Record<string, unknown> | undefined },
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
  createQuery: (options: () => Record<string, unknown>) => {
    builtOptions.current = options();
    return { data: undefined };
  },
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

  it('fetches without consulting the browser online state', () => {
    render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
      },
    });

    // A machine on a local network or its own access point is reachable while
    // the browser reports offline, and `online` would pause the call.
    expect(builtOptions.current?.networkMode).toBe('always');
  });

  it('still refetches on reconnect, which `always` would otherwise turn off', () => {
    render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
      },
    });

    expect(builtOptions.current?.refetchOnReconnect).toBe(true);
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
