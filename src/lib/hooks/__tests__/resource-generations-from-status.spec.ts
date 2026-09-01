import { describe, expect, it } from 'vitest';
import type { robotApi } from '@viamrobotics/sdk';

import { resourceGenerationsFromStatus } from '../resource-generations-from-status';

const STATE_UNCONFIGURED = 1;
const STATE_CONFIGURING = 2;
const STATE_READY = 3;
const STATE_REMOVING = 4;
const STATE_UNHEALTHY = 5;

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
}: StatusOptions) =>
  ({
    name: { name, subtype },
    state,
    revision,
    lastUpdated: { seconds, nanos },
  }) as unknown as robotApi.ResourceStatus;

const generationOf = (resources: robotApi.ResourceStatus[], name: string) =>
  resourceGenerationsFromStatus(resources)[name]?.generation;

const canQueryOf = (resources: robotApi.ResourceStatus[], name: string) =>
  resourceGenerationsFromStatus(resources)[name]?.canQuery;

describe('resourceGenerationsFromStatus', () => {
  it('holds its generation when a reconfigure leaves the resource in place', () => {
    // The server advances `revision` on every resource a config touches,
    // including the ones it does not rebuild.
    expect(
      generationOf([status({ name: 'store-1', revision: 'rev-2' })], 'store-1')
    ).toBe(generationOf([status({ name: 'store-1' })], 'store-1'));
  });

  it('moves its generation when the resource instance is replaced', () => {
    // A rebuild transitions the node, which is what moves `lastUpdated`.
    expect(
      generationOf([status({ name: 'store-1', seconds: 200n })], 'store-1')
    ).not.toBe(generationOf([status({ name: 'store-1' })], 'store-1'));
  });

  it('moves its generation on a sub-second rebuild', () => {
    expect(
      generationOf([status({ name: 'store-1', nanos: 500 })], 'store-1')
    ).not.toBe(generationOf([status({ name: 'store-1' })], 'store-1'));
  });

  it('keeps each resource name separate', () => {
    expect(
      generationOf(
        [
          status({ name: 'store-1' }),
          status({ name: 'store-2', seconds: 900n }),
        ],
        'store-1'
      )
    ).toBe(generationOf([status({ name: 'store-1' })], 'store-1'));
  });

  it('folds every subtype sharing the addressed name', () => {
    // Only the camera rebuilt, and the caller holds only the name, so the
    // generation still has to move.
    expect(
      generationOf(
        [
          status({ name: 'store-1', subtype: 'world_state_store' }),
          status({ name: 'store-1', subtype: 'camera', seconds: 200n }),
        ],
        'store-1'
      )
    ).not.toBe(
      generationOf(
        [
          status({ name: 'store-1', subtype: 'world_state_store' }),
          status({ name: 'store-1', subtype: 'camera' }),
        ],
        'store-1'
      )
    );
  });

  it('folds in a stable order regardless of how the server orders resources', () => {
    expect(
      generationOf(
        [
          status({ name: 'store-1', subtype: 'camera' }),
          status({ name: 'store-1', subtype: 'world_state_store' }),
        ],
        'store-1'
      )
    ).toBe(
      generationOf(
        [
          status({ name: 'store-1', subtype: 'world_state_store' }),
          status({ name: 'store-1', subtype: 'camera' }),
        ],
        'store-1'
      )
    );
  });

  it('reports a ready resource as queryable', () => {
    expect(canQueryOf([status({ name: 'store-1' })], 'store-1')).toBe(true);
  });

  it('reports a resource being rebuilt as not queryable', () => {
    expect(
      canQueryOf(
        [status({ name: 'store-1', state: STATE_CONFIGURING })],
        'store-1'
      )
    ).toBe(false);
  });

  it('reports a never-configured resource as not queryable', () => {
    expect(
      canQueryOf(
        [status({ name: 'store-1', state: STATE_UNCONFIGURED })],
        'store-1'
      )
    ).toBe(false);
  });

  it('reports a resource being removed as not queryable', () => {
    expect(
      canQueryOf(
        [status({ name: 'store-1', state: STATE_REMOVING })],
        'store-1'
      )
    ).toBe(false);
  });

  it('reports an unhealthy resource as queryable', () => {
    // A resource can stay unhealthy indefinitely, and the server answers with a
    // real error. Holding its queries would report loading forever instead.
    expect(
      canQueryOf(
        [status({ name: 'store-1', state: STATE_UNHEALTHY })],
        'store-1'
      )
    ).toBe(true);
  });

  it('reports not queryable when any subtype sharing the name is mid-transition', () => {
    expect(
      canQueryOf(
        [
          status({ name: 'store-1', subtype: 'world_state_store' }),
          status({
            name: 'store-1',
            subtype: 'camera',
            state: STATE_CONFIGURING,
          }),
        ],
        'store-1'
      )
    ).toBe(false);
  });

  it('omits a resource the status does not report', () => {
    expect(
      generationOf([status({ name: 'store-2' })], 'store-1')
    ).toBeUndefined();
  });

  it('skips a status carrying no resource name', () => {
    expect(
      resourceGenerationsFromStatus([
        { state: STATE_READY } as unknown as robotApi.ResourceStatus,
      ])
    ).toEqual({});
  });
});
