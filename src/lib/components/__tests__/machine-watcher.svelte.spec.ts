import { cleanup, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { robotApi } from '@viamrobotics/sdk';

import MachineWatcher from '../machine-watcher.svelte';
import { machineStatusStub } from './fixtures/machine-status-stub.svelte';

const STATE_CONFIGURING = 2;
const STATE_READY = 3;
const STATE_UNHEALTHY = 5;

const { invalidateQueries, refreshSharedStream, publish, withdraw } =
  vi.hoisted(() => ({
    invalidateQueries: vi.fn(),
    refreshSharedStream: vi.fn(),
    publish: vi.fn(),
    withdraw: vi.fn(),
  }));

vi.mock('@tanstack/svelte-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock('$lib/hooks/machine-status.svelte', () => ({
  useMachineStatus: () => ({ query: machineStatusStub }),
}));

vi.mock('$lib/hooks/create-stream-client.svelte', () => ({
  refreshSharedStream,
}));

vi.mock('$lib/hooks/resource-generation.svelte', () => ({
  useResourceGenerationsPublisher: () => ({ publish, withdraw }),
}));

const status = (
  name: string,
  seconds: bigint,
  state = STATE_READY
): robotApi.ResourceStatus =>
  ({
    name: { name, subtype: 'camera' },
    state,
    revision: 'rev-1',
    lastUpdated: { seconds, nanos: 0 },
  }) as unknown as robotApi.ResourceStatus;

const resourceKey = (name: string) => [
  'viam-svelte-sdk',
  'partID',
  'part-1',
  'resource',
  name,
];

const mount = () => render(MachineWatcher, { props: { partID: 'part-1' } });

const poll = async (resources: robotApi.ResourceStatus[]) => {
  machineStatusStub.poll(resources);
  await tick();
};

/** A disconnect resets the status query, so the watcher sees no data at all. */
const loseStatus = async () => {
  machineStatusStub.reset();
  await tick();
};

const keyOf = (call: unknown[]) =>
  (call[0] as { queryKey: unknown[] }).queryKey;

const resourceInvalidations = () =>
  invalidateQueries.mock.calls.filter((call) => keyOf(call)[3] === 'resource');

const resourceNamesInvalidations = () =>
  invalidateQueries.mock.calls.filter(
    (call) => keyOf(call)[4] === 'resourceNames'
  );

beforeEach(() => {
  machineStatusStub.reset();
});

afterEach(() => {
  cleanup();
});

describe('MachineWatcher', () => {
  it('publishes the generations it derives from a poll', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    expect(publish).toHaveBeenCalledWith(
      'part-1',
      expect.objectContaining({
        'camera-1': expect.objectContaining({ canQuery: true }),
      })
    );
  });

  it('does not invalidate on the first poll it sees', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    // The first observation is a baseline, not a rebuild.
    expect(resourceInvalidations()).toHaveLength(0);
  });

  it('does not invalidate while the generation holds', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 100n)]);

    expect(resourceInvalidations()).toHaveLength(0);
  });

  it('invalidates the resource prefix when the instance is replaced', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n)]);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: resourceKey('camera-1'),
    });
  });

  it('re-acquires the track for the rebuilt resource', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n)]);

    // A track lives outside the query cache, so invalidation cannot reach it.
    expect(refreshSharedStream).toHaveBeenCalledWith(
      'part-1',
      'camera-1',
      expect.any(String)
    );
  });

  it('leaves resources the rebuild did not touch alone', async () => {
    mount();
    await poll([status('camera-1', 100n), status('camera-2', 100n)]);
    await poll([status('camera-1', 200n), status('camera-2', 100n)]);

    expect(resourceInvalidations()).toHaveLength(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: resourceKey('camera-1'),
    });
  });

  it('waits for a rebuilding resource to settle before invalidating', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n, STATE_CONFIGURING)]);

    // The timestamp moves on the way into CONFIGURING, before the resource can
    // answer a request.
    expect(resourceInvalidations()).toHaveLength(0);

    await poll([status('camera-1', 300n)]);

    expect(resourceInvalidations()).toHaveLength(1);
  });

  it('invalidates an unhealthy resource so its error surfaces', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await poll([status('camera-1', 200n, STATE_UNHEALTHY)]);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: resourceKey('camera-1'),
    });
  });

  it('invalidates a rebuild that happened while the part was disconnected', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    // A disconnect resets queries under the part prefix, which includes the
    // machine status, so the watcher sees no data at all for a while.
    await loseStatus();
    expect(resourceInvalidations()).toHaveLength(0);

    await poll([status('camera-1', 200n)]);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: resourceKey('camera-1'),
    });
  });

  it('does not invalidate when a part reconnects unchanged', async () => {
    mount();
    await poll([status('camera-1', 100n)]);
    await loseStatus();
    await poll([status('camera-1', 100n)]);

    expect(resourceInvalidations()).toHaveLength(0);
  });

  it('refetches resourceNames when a resource registers late', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    const before = resourceNamesInvalidations().length;

    // A remote coming online or a module finishing registers after the machine
    // reports running, which is all `resourceNames` waits for.
    await poll([status('camera-1', 100n), status('camera-2', 100n)]);

    expect(resourceNamesInvalidations().length).toBeGreaterThan(before);
  });

  it('refetches resourceNames when a resource disappears', async () => {
    mount();
    await poll([status('camera-1', 100n), status('camera-2', 100n)]);

    const before = resourceNamesInvalidations().length;

    await poll([status('camera-1', 100n)]);

    expect(resourceNamesInvalidations().length).toBeGreaterThan(before);
  });

  it('refetches resourceNames on the first status it sees', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    // `resourceNames` may have already fetched an emptier list than this one,
    // and there is no way to tell from here, so the baseline refetches too.
    expect(resourceNamesInvalidations()).toHaveLength(1);
  });

  it('does not refetch resourceNames while the resource set holds', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    const before = resourceNamesInvalidations().length;

    // A rebuild moves the timestamp without changing which resources exist.
    await poll([status('camera-1', 200n)]);
    await poll([status('camera-1', 200n)]);

    expect(resourceNamesInvalidations()).toHaveLength(before);
  });

  it('does not refetch resourceNames while the status is unavailable', async () => {
    mount();
    await poll([status('camera-1', 100n)]);

    const before = resourceNamesInvalidations().length;

    await loseStatus();

    expect(resourceNamesInvalidations()).toHaveLength(before);
  });

  it('withdraws its part on unmount', async () => {
    const { unmount } = mount();
    await poll([status('camera-1', 100n)]);

    unmount();
    await tick();

    expect(withdraw).toHaveBeenCalledWith('part-1');
  });
});
