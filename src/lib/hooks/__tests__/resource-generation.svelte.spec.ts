import { cleanup, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourceGenerationTestWrapper from './fixtures/ResourceGenerationTestWrapper.svelte';

const STATE_UNCONFIGURED = 1;
const STATE_CONFIGURING = 2;
const STATE_READY = 3;
const STATE_REMOVING = 4;
const STATE_UNHEALTHY = 5;

const { machineStatus } = vi.hoisted(() => ({
  machineStatus: { data: undefined as unknown },
}));

vi.mock('../polled-machine-status.svelte', () => ({
  usePolledMachineStatus: () => machineStatus,
}));

interface StatusOptions {
  name: string;
  subtype?: string;
  state?: number;
  revision?: string;
  seconds?: bigint;
  nanos?: number;
}

const status = ({
  name,
  subtype = 'world_state_store',
  state = STATE_READY,
  revision = 'rev-1',
  seconds = 100n,
  nanos = 0,
}: StatusOptions) => ({
  name: { name, subtype },
  state,
  revision,
  lastUpdated: { seconds, nanos },
});

const generationOf = (resourceName: string) => {
  const { getByTestId } = render(ResourceGenerationTestWrapper, {
    props: { resourceName },
  });
  return {
    generation: getByTestId('generation').textContent,
    canQuery: getByTestId('can-query').textContent,
  };
};

beforeEach(() => {
  machineStatus.data = undefined;
});

afterEach(() => {
  cleanup();
});

describe('useResourceGeneration', () => {
  it('holds its generation when a reconfigure leaves the resource in place', () => {
    machineStatus.data = { resources: [status({ name: 'store-1' })] };
    const before = generationOf('store-1').generation;
    cleanup();

    // The server advances `revision` on every resource a config touches,
    // including the ones it does not rebuild.
    machineStatus.data = {
      resources: [status({ name: 'store-1', revision: 'rev-2' })],
    };

    expect(generationOf('store-1').generation).toBe(before);
  });

  it('moves its generation when the resource instance is replaced', () => {
    machineStatus.data = { resources: [status({ name: 'store-1' })] };
    const before = generationOf('store-1').generation;
    cleanup();

    // A rebuild transitions the node, which is what moves `lastUpdated`.
    machineStatus.data = {
      resources: [status({ name: 'store-1', seconds: 200n })],
    };

    expect(generationOf('store-1').generation).not.toBe(before);
  });

  it('moves its generation on a sub-second rebuild', () => {
    machineStatus.data = { resources: [status({ name: 'store-1' })] };
    const before = generationOf('store-1').generation;
    cleanup();

    machineStatus.data = {
      resources: [status({ name: 'store-1', nanos: 500 })],
    };

    expect(generationOf('store-1').generation).not.toBe(before);
  });

  it('ignores resources addressed by another name', () => {
    machineStatus.data = { resources: [status({ name: 'store-1' })] };
    const before = generationOf('store-1').generation;
    cleanup();

    machineStatus.data = {
      resources: [
        status({ name: 'store-1' }),
        status({ name: 'store-2', seconds: 900n }),
      ],
    };

    expect(generationOf('store-1').generation).toBe(before);
  });

  it('folds every subtype sharing the addressed name', () => {
    machineStatus.data = {
      resources: [
        status({ name: 'store-1', subtype: 'world_state_store' }),
        status({ name: 'store-1', subtype: 'camera' }),
      ],
    };
    const before = generationOf('store-1').generation;
    cleanup();

    // Only the camera rebuilt, and the caller holds only the name, so the
    // generation still has to move.
    machineStatus.data = {
      resources: [
        status({ name: 'store-1', subtype: 'world_state_store' }),
        status({ name: 'store-1', subtype: 'camera', seconds: 200n }),
      ],
    };

    expect(generationOf('store-1').generation).not.toBe(before);
  });

  it('folds in a stable order regardless of how the server orders resources', () => {
    machineStatus.data = {
      resources: [
        status({ name: 'store-1', subtype: 'world_state_store' }),
        status({ name: 'store-1', subtype: 'camera' }),
      ],
    };
    const before = generationOf('store-1').generation;
    cleanup();

    machineStatus.data = {
      resources: [
        status({ name: 'store-1', subtype: 'camera' }),
        status({ name: 'store-1', subtype: 'world_state_store' }),
      ],
    };

    expect(generationOf('store-1').generation).toBe(before);
  });

  it('holds queries while the resource is being rebuilt', () => {
    machineStatus.data = {
      resources: [status({ name: 'store-1', state: STATE_CONFIGURING })],
    };

    expect(generationOf('store-1').canQuery).toBe('false');
  });

  it('holds queries while the resource has never been configured', () => {
    machineStatus.data = {
      resources: [status({ name: 'store-1', state: STATE_UNCONFIGURED })],
    };

    expect(generationOf('store-1').canQuery).toBe('false');
  });

  it('holds queries while the resource is being removed', () => {
    machineStatus.data = {
      resources: [status({ name: 'store-1', state: STATE_REMOVING })],
    };

    expect(generationOf('store-1').canQuery).toBe('false');
  });

  it('allows queries when the resource is unhealthy', () => {
    // A resource can stay unhealthy indefinitely, and the server answers with a
    // real error. Holding the query would report loading forever instead.
    machineStatus.data = {
      resources: [status({ name: 'store-1', state: STATE_UNHEALTHY })],
    };

    expect(generationOf('store-1').canQuery).toBe('true');
  });

  it('holds queries when any subtype sharing the name is mid-transition', () => {
    machineStatus.data = {
      resources: [
        status({ name: 'store-1', subtype: 'world_state_store' }),
        status({
          name: 'store-1',
          subtype: 'camera',
          state: STATE_CONFIGURING,
        }),
      ],
    };

    expect(generationOf('store-1').canQuery).toBe('false');
  });

  it('allows queries with an empty generation before any status arrives', () => {
    // Absence of information must not gate the first fetch, which would
    // otherwise wait a getMachineStatus round trip.
    const { generation, canQuery } = generationOf('store-1');

    expect(generation).toBe('');
    expect(canQuery).toBe('true');
  });

  it('allows queries with an empty generation for an unknown resource', () => {
    machineStatus.data = { resources: [status({ name: 'store-2' })] };
    const { generation, canQuery } = generationOf('store-1');

    expect(generation).toBe('');
    expect(canQuery).toBe('true');
  });
});
