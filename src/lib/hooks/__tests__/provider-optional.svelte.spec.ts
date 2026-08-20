import { render, cleanup } from '@testing-library/svelte';
import { describe, it, expect, afterEach } from 'vitest';
import { MachineConnectionEvent, type DialConf } from '@viamrobotics/sdk';
import type { ComponentProps } from 'svelte';
import ProviderOptionalTestWrapper from './fixtures/ProviderOptionalTestWrapper.svelte';

type Hooks = Parameters<
  ComponentProps<typeof ProviderOptionalTestWrapper>['onhooks']
>[0];

const renderWithoutProviders = (): Hooks => {
  let hooks: Hooks | undefined;
  render(ProviderOptionalTestWrapper, {
    props: {
      onhooks: (next) => {
        hooks = next;
      },
    },
  });

  if (!hooks) {
    throw new Error('fixture did not report its hooks');
  }

  return hooks;
};

describe('hooks without providers', () => {
  afterEach(() => {
    cleanup();
  });

  it('mounts without a ViamProvider or ViamAppProvider', () => {
    const hooks = renderWithoutProviders();

    expect(hooks.hasProvider).toBe(false);
    expect(hooks.robotClient.current).toBeUndefined();
    expect(hooks.connectionStatus.current).toBeUndefined();
    expect(hooks.robotConnection.current).toBeUndefined();
    expect(hooks.robotConnection.connectionStatus).toBe(
      MachineConnectionEvent.DISCONNECTED
    );
  });

  it('creates queries that stay idle', () => {
    const hooks = renderWithoutProviders();

    expect(hooks.robotQuery.fetchStatus).toBe('idle');
    expect(hooks.robotQuery.data).toBeUndefined();
    // An explicit `enabled: true` must not bypass the connection guard.
    expect(hooks.robotQueryForceEnabled.fetchStatus).toBe('idle');
    expect(hooks.robotQueryForceEnabled.isError).toBe(false);
    expect(hooks.resourceNames.current).toEqual([]);
    expect(hooks.appQuery.fetchStatus).toBe('idle');
    expect(hooks.appQuery.data).toBeUndefined();
  });

  it('resolves connect and disconnect as no-ops', async () => {
    const hooks = renderWithoutProviders();

    await expect(
      hooks.robotConnection.connect({ host: 'test' } as DialConf)
    ).resolves.toBeUndefined();
    await expect(hooks.robotConnection.disconnect()).resolves.toBeUndefined();

    expect(hooks.robotConnection.connectionStatus).toBe(
      MachineConnectionEvent.DISCONNECTED
    );
  });
});
