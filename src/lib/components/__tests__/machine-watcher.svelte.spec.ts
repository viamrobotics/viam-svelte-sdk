import { QueryClient } from '@tanstack/svelte-query';
import { cleanup, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { robotApi } from '@viamrobotics/sdk';

import MachineWatcherHarness from './fixtures/MachineWatcherHarness.svelte';
import { machineStatusStub } from './fixtures/machine-status-stub.svelte';
import { resourceQueryKeyPrefix } from '$lib/hooks/resource-query-key';
import { robotQueryKey } from '$lib/hooks/robot-query-key';

const STATE_UNCONFIGURED = 1;
const STATE_CONFIGURING = 2;
const STATE_READY = 3;
const STATE_REMOVING = 4;
const STATE_UNHEALTHY = 5;

const PART = 'part-1';

// The network boundary, driven poll by poll, and a side effect that reaches the
// module-level stream registry. Everything else runs for real.
const { refreshSharedStream } = vi.hoisted(() => ({
  refreshSharedStream: vi.fn(),
}));

vi.mock('$lib/hooks/machine-status.svelte', () => ({
  useMachineStatus: () => ({ query: machineStatusStub }),
}));

vi.mock('$lib/hooks/create-stream-client.svelte', () => ({
  refreshSharedStream,
}));

const status = (
  name: string,
  seconds: bigint,
  state = STATE_READY,
  error = ''
): robotApi.ResourceStatus =>
  ({
    name: { namespace: 'rdk', type: 'component', subtype: 'camera', name },
    state,
    error,
    revision: 'rev-1',
    lastUpdated: { seconds, nanos: 0 },
  }) as unknown as robotApi.ResourceStatus;

let queryClient: QueryClient;

const resourceQuery = (name: string) => [
  ...resourceQueryKeyPrefix(PART, name),
  'getImage',
];

const resourceNamesQuery = robotQueryKey(PART, 'resourceNames');

const mount = (watch = 'camera-1') =>
  render(MachineWatcherHarness, {
    props: { client: queryClient, partID: PART, watch },
  });

const poll = async (resources: robotApi.ResourceStatus[]) => {
  machineStatusStub.poll(resources);
  await tick();
};

/** A disconnect resets the status query, so the watcher sees no data at all. */
const loseStatus = async () => {
  machineStatusStub.reset();
  await tick();
};

const isStale = (key: unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated === true;

beforeEach(() => {
  machineStatusStub.reset();
  queryClient = new QueryClient();

  // Seed the cache the way a mounted consumer would have.
  queryClient.setQueryData(resourceQuery('camera-1'), 'first-instance');
  queryClient.setQueryData(resourceQuery('camera-2'), 'first-instance');
  queryClient.setQueryData(resourceNamesQuery, ['camera-1']);
});

afterEach(() => {
  cleanup();
});

describe('MachineWatcher', () => {
  it('publishes a generation a consumer can read', async () => {
    const { getByTestId } = mount();
    await poll([status('camera-1', 100n)]);

    expect(getByTestId('generation').textContent).not.toBe('');
    expect(getByTestId('can-query').textContent).toBe('true');
  });

  it('moves the published generation when the instance is replaced', async () => {
    const { getByTestId } = mount();
    await poll([status('camera-1', 100n)]);

    const before = getByTestId('generation').textContent;

    await poll([status('camera-1', 200n)]);

    expect(getByTestId('generation').textContent).not.toBe(before);
  });

  it('reports a rebuilding resource as not queryable', async () => {
    const { getByTestId } = mount();
    await poll([status('camera-1', 200n, STATE_CONFIGURING)]);

    expect(getByTestId('can-query').textContent).toBe('false');
  });

  it('reports an unhealthy resource as queryable', async () => {
    const { getByTestId } = mount();
    await poll([status('camera-1', 200n, STATE_UNHEALTHY)]);

    expect(getByTestId('can-query').textContent).toBe('true');
  });

  it('does not invalidate on the first poll it sees', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    // The first observation is a baseline, not a rebuild.
    expect(isStale(resourceQuery('camera-1'))).toBe(false);
  });

  it('does not invalidate while the generation holds', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 100n)]);

    expect(isStale(resourceQuery('camera-1'))).toBe(false);
  });

  it('invalidates the rebuilt resource, and only that resource', async () => {
    mount();
    await poll([status('camera-1', 100n), status('camera-2', 100n)]);
    await poll([status('camera-1', 200n), status('camera-2', 100n)]);

    expect(isStale(resourceQuery('camera-1'))).toBe(true);
    expect(isStale(resourceQuery('camera-2'))).toBe(false);
  });

  it('keeps the previous response while the refreshed one is in flight', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n)]);

    // Re-keying instead would point the query at an empty entry and blank the
    // caller's data for as long as the rebuild takes.
    expect(queryClient.getQueryData(resourceQuery('camera-1'))).toBe(
      'first-instance'
    );
  });

  it('re-acquires the track for the rebuilt resource', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n)]);

    // A track lives outside the query cache, so invalidation cannot reach it.
    expect(refreshSharedStream).toHaveBeenCalledWith(
      PART,
      'camera-1',
      expect.any(String)
    );
  });

  it('waits for a rebuilding resource to settle before invalidating', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n, STATE_CONFIGURING)]);

    // The timestamp moves on the way into CONFIGURING, before the resource can
    // answer a request.
    expect(isStale(resourceQuery('camera-1'))).toBe(false);

    await poll([status('camera-1', 300n)]);

    expect(isStale(resourceQuery('camera-1'))).toBe(true);
  });

  it('invalidates an unhealthy resource so its error surfaces', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n, STATE_UNHEALTHY)]);

    expect(isStale(resourceQuery('camera-1'))).toBe(true);
  });

  it('invalidates a rebuild that happened while the part was disconnected', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    await loseStatus();
    expect(isStale(resourceQuery('camera-1'))).toBe(false);

    await poll([status('camera-1', 200n)]);

    expect(isStale(resourceQuery('camera-1'))).toBe(true);
  });

  it('does not invalidate when a part reconnects unchanged', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await loseStatus();
    await poll([status('camera-1', 100n)]);

    expect(isStale(resourceQuery('camera-1'))).toBe(false);
  });

  it('refetches resourceNames when a resource finishes configuring', async () => {
    mount();

    // The node is in the machine status from the moment it is created, so only
    // its readiness distinguishes it from one `resourceNames` already lists.
    await poll([status('camera-1', 100n, STATE_UNCONFIGURED)]);
    queryClient.setQueryData(resourceNamesQuery, []);

    await poll([status('camera-1', 100n)]);

    expect(isStale(resourceNamesQuery)).toBe(true);
  });

  it('refetches resourceNames when a resource goes unhealthy', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1']);

    // `ResourceNames` filters on `HasResource`, so an errored resource drops
    // out of the list entirely.
    await poll([status('camera-1', 100n, STATE_UNHEALTHY, 'boom')]);

    expect(isStale(resourceNamesQuery)).toBe(true);
  });

  it('refetches resourceNames when a resource starts being removed', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1']);

    await poll([status('camera-1', 100n, STATE_REMOVING)]);

    expect(isStale(resourceNamesQuery)).toBe(true);
  });

  it('does not refetch resourceNames for a resource merely reconfiguring', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1']);

    // A reconfiguring node keeps its old instance and no error, so it stays in
    // `resourceNames` throughout.
    await poll([status('camera-1', 200n, STATE_CONFIGURING)]);

    expect(isStale(resourceNamesQuery)).toBe(false);
  });

  it('refetches resourceNames when a resource registers late', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1']);

    // A remote coming online or a module finishing registers after the machine
    // reports running, which is all `resourceNames` waits for.
    await poll([status('camera-1', 100n), status('camera-2', 100n)]);

    expect(isStale(resourceNamesQuery)).toBe(true);
  });

  it('refetches resourceNames when a resource disappears', async () => {
    mount();
    await poll([status('camera-1', 100n), status('camera-2', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1', 'camera-2']);

    await poll([status('camera-1', 100n)]);

    expect(isStale(resourceNamesQuery)).toBe(true);
  });

  it('refetches resourceNames on the first status it sees', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    // `resourceNames` may have already fetched an emptier list than this one,
    // and there is no way to tell from here, so the baseline refetches too.
    expect(isStale(resourceNamesQuery)).toBe(true);
  });

  it('does not refetch resourceNames while the resource set holds', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1']);

    // A rebuild moves the timestamp without changing which resources exist.
    await poll([status('camera-1', 200n)]);
    await poll([status('camera-1', 200n)]);

    expect(isStale(resourceNamesQuery)).toBe(false);
  });

  it('does not refetch resourceNames while the status is unavailable', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    queryClient.setQueryData(resourceNamesQuery, ['camera-1']);

    await loseStatus();

    expect(isStale(resourceNamesQuery)).toBe(false);
  });
});
