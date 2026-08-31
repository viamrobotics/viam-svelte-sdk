import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreateResourceQueryTestWrapper from './fixtures/CreateResourceQueryTestWrapper.svelte';

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
  createQuery: (options: unknown) => ({ data: undefined, options }),
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

  it('keys on the resource instance behind the name', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
        generation: 'arm:100.0',
      },
    });

    expect(JSON.parse(getByTestId('query-key').textContent ?? '')).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-1',
      'resource',
      'arm-1',
      'getEndPosition',
      'generation',
      'arm:100.0',
    ]);
  });

  it('moves its key when the resource is rebuilt under the same name', async () => {
    const { getByTestId, rerender } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
        generation: 'arm:100.0',
      },
    });

    const beforeRebuild = getByTestId('query-key').textContent;

    await rerender({
      current: fakeResourceClient as never,
      partID: 'part-1',
      resourceName: 'arm-1',
      generation: 'arm:200.0',
    });

    // Serving the pre-rebuild cache here is the whole defect this guards.
    expect(getByTestId('query-key').textContent).not.toBe(beforeRebuild);
  });

  it('holds the generation last so an existing prefix match still matches', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
        generation: 'arm:100.0',
      },
    });

    const key = JSON.parse(getByTestId('query-key').textContent ?? '');

    expect(key.slice(0, 6)).toEqual([
      'viam-svelte-sdk',
      'partID',
      'part-1',
      'resource',
      'arm-1',
      'getEndPosition',
    ]);
  });

  it('holds the query while the resource is mid-transition', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
        generation: 'arm:100.0',
        canQuery: false,
      },
    });

    expect(getByTestId('enabled').textContent).toBe('false');
  });

  it('enables the query once the resource settles', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
        generation: 'arm:100.0',
        canQuery: true,
      },
    });

    expect(getByTestId('enabled').textContent).toBe('true');
  });

  it('enables the query for a context that omits the gate', () => {
    const { getByTestId } = render(CreateResourceQueryTestWrapper, {
      props: {
        current: fakeResourceClient as never,
        partID: 'part-1',
        resourceName: 'arm-1',
      },
    });

    expect(getByTestId('enabled').textContent).toBe('true');
  });
});
