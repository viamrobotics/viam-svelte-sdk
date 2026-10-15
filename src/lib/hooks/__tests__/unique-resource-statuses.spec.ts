import { describe, expect, it } from 'vitest';

import type { ResourceStatus } from '../machine-status.svelte';
import { uniqueResourceStatuses } from '../unique-resource-statuses';

const STATE_READY = 3;

const LOCAL_PART = 'part-local';
const REMOTE_PART = 'part-remote';

interface StatusOptions {
  name: string;
  namespace?: string;
  type?: string;
  subtype?: string;
  partID?: string | undefined;
  error?: string;
}

const status = ({
  name,
  namespace = 'rdk',
  type = 'component',
  subtype = 'sensor',
  partID,
  error = '',
}: StatusOptions) =>
  ({
    name: { namespace, type, subtype, name },
    state: STATE_READY,
    error,
    cloudMetadata: partID === undefined ? undefined : { machinePartId: partID },
  }) as unknown as ResourceStatus;

/** What viam-server always reports for itself, stamped with the local part. */
const internal = (partID?: string) =>
  status({
    name: 'web',
    namespace: 'rdk-internal',
    type: 'service',
    subtype: 'web',
    partID,
  });

describe('uniqueResourceStatuses', () => {
  it('keeps resources with distinct names', () => {
    const resources = [
      internal(LOCAL_PART),
      status({ name: 'sensor-1', partID: LOCAL_PART }),
      status({ name: 'sensor-2', partID: REMOTE_PART }),
    ];

    expect(uniqueResourceStatuses(resources)).toEqual(resources);
  });

  it('keeps the local resource when a remote shares its name', () => {
    const local = status({ name: 'maintenance-sensor', partID: LOCAL_PART });
    const remote = status({ name: 'maintenance-sensor', partID: REMOTE_PART });

    // The remote comes first, so order alone would pick the wrong one.
    expect(
      uniqueResourceStatuses([internal(LOCAL_PART), remote, local])
    ).toEqual([internal(LOCAL_PART), local]);
  });

  it('keeps the local resource when the remote carries no cloud metadata', () => {
    // What the machine reports when it cannot fetch the remote's metadata.
    const local = status({ name: 'maintenance-sensor', partID: LOCAL_PART });
    const remote = status({ name: 'maintenance-sensor' });

    expect(
      uniqueResourceStatuses([internal(LOCAL_PART), remote, local])
    ).toEqual([internal(LOCAL_PART), local]);
  });

  it('holds a name unique across APIs, as rdk does', () => {
    const local = status({
      name: 'eyes',
      subtype: 'camera',
      partID: LOCAL_PART,
    });
    const remote = status({
      name: 'eyes',
      subtype: 'sensor',
      partID: REMOTE_PART,
    });

    expect(
      uniqueResourceStatuses([internal(LOCAL_PART), remote, local])
    ).toEqual([internal(LOCAL_PART), local]);
  });

  it('keeps the first entry when no claimant is local', () => {
    // rdk hides both when two remotes collide. One still beats a resource that
    // vanishes without a trace, and only one can keep the key unique.
    const first = status({ name: 'shared', partID: REMOTE_PART });
    const second = status({ name: 'shared', partID: 'part-other-remote' });

    expect(
      uniqueResourceStatuses([internal(LOCAL_PART), first, second])
    ).toEqual([internal(LOCAL_PART), first]);
  });

  it('keeps the first entry when the machine is not cloud-managed', () => {
    const first = status({ name: 'shared' });
    const second = status({ name: 'shared' });

    expect(uniqueResourceStatuses([internal(), first, second])).toEqual([
      internal(),
      first,
    ]);
  });

  it('keeps the first entry when nothing says which part is local', () => {
    const first = status({ name: 'shared', partID: REMOTE_PART });
    const second = status({ name: 'shared', partID: LOCAL_PART });

    expect(uniqueResourceStatuses([first, second])).toEqual([first]);
  });

  it('leaves the local resource in its reported position', () => {
    const local = status({ name: 'maintenance-sensor', partID: LOCAL_PART });
    const remote = status({ name: 'maintenance-sensor', partID: REMOTE_PART });
    const other = status({ name: 'sensor-2', partID: LOCAL_PART });

    expect(
      uniqueResourceStatuses([internal(LOCAL_PART), remote, other, local])
    ).toEqual([internal(LOCAL_PART), other, local]);
  });

  it('lets a remote machine node share a name with a resource', () => {
    // A remote's node is named for the remote, not for a resource, and rdk
    // does not count it toward name uniqueness.
    const machine = status({
      name: 'pi',
      type: 'remote',
      subtype: '',
      partID: LOCAL_PART,
    });
    const resource = status({ name: 'pi', partID: LOCAL_PART });

    expect(
      uniqueResourceStatuses([internal(LOCAL_PART), machine, resource])
    ).toEqual([internal(LOCAL_PART), machine, resource]);
  });

  it('passes through a status carrying no resource name', () => {
    const nameless = { state: STATE_READY } as unknown as ResourceStatus;

    expect(uniqueResourceStatuses([nameless, nameless])).toEqual([
      nameless,
      nameless,
    ]);
  });

  it('returns an empty list for an empty status', () => {
    expect(uniqueResourceStatuses([])).toEqual([]);
  });
});
