import { describe, expect, it } from 'vitest';

import { configuredResources } from '../configured-resources';
import type { ResourceStatus } from '../machine-status.svelte';

const STATE_READY = 3;
const STATE_UNHEALTHY = 5;

interface StatusOptions {
  name: string;
  namespace?: string;
  type?: string;
  subtype?: string;
  state?: number;
  error?: string;
}

const status = ({
  name,
  namespace = 'rdk',
  type = 'component',
  subtype = 'camera',
  state = STATE_READY,
  error = '',
}: StatusOptions) =>
  ({
    name: { namespace, type, subtype, name },
    state,
    error,
  }) as unknown as ResourceStatus;

const names = (resources: ResourceStatus[]) =>
  resources.map((resource) => resource.name?.name);

describe('configuredResources', () => {
  it('keeps a configured resource', () => {
    expect(names(configuredResources([status({ name: 'camera-1' })]))).toEqual([
      'camera-1',
    ]);
  });

  it('keeps an unhealthy resource', () => {
    // The whole point: `resourceNames` drops these, which is what makes its
    // membership track health.
    const resources = [
      status({ name: 'camera-1', state: STATE_UNHEALTHY, error: 'boom' }),
    ];

    expect(names(configuredResources(resources))).toEqual(['camera-1']);
  });

  it("drops viam-server's own internal services", () => {
    const resources = [
      status({ name: 'camera-1' }),
      status({ name: 'web', namespace: 'rdk-internal', type: 'service' }),
      status({ name: 'cloud', namespace: 'rdk-internal', type: 'service' }),
    ];

    expect(names(configuredResources(resources))).toEqual(['camera-1']);
  });

  it('drops entries standing for a whole remote machine', () => {
    const resources = [
      status({ name: 'camera-1' }),
      status({ name: 'my-remote', type: 'remote', subtype: '' }),
    ];

    expect(names(configuredResources(resources))).toEqual(['camera-1']);
  });

  it("keeps a remote's own resources", () => {
    // Those arrive as ordinary resources under a prefixed name.
    const resources = [status({ name: 'my-remote:camera-1' })];

    expect(names(configuredResources(resources))).toEqual([
      'my-remote:camera-1',
    ]);
  });

  it('drops a status carrying no resource name', () => {
    const resources = [
      status({ name: 'camera-1' }),
      { state: STATE_READY } as unknown as ResourceStatus,
    ];

    expect(names(configuredResources(resources))).toEqual(['camera-1']);
  });

  it('restricts to one subtype when asked', () => {
    const resources = [
      status({ name: 'camera-1' }),
      status({ name: 'vision-1', subtype: 'vision', type: 'service' }),
    ];

    expect(names(configuredResources(resources, 'vision'))).toEqual([
      'vision-1',
    ]);
  });
});
