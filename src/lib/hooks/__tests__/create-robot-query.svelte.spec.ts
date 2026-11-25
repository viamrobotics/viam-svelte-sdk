import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreateRobotQueryTestWrapper from './fixtures/CreateRobotQueryTestWrapper.svelte';

const { options } = vi.hoisted(() => ({
  /** Reads the options Tanstack would see now. The wrapper does not otherwise expose them. */
  options: {
    current: undefined as (() => Record<string, unknown>) | undefined,
  },
}));

vi.mock('@viamrobotics/sdk', () => ({
  MachineConnectionEvent: { CONNECTED: 'connected' },
}));

vi.mock('../robot-clients.svelte', () => ({
  useConnectionStatus: () => ({ current: 'connected' }),
}));

vi.mock('../use-enabled-queries.svelte', () => ({
  useEnabledQueries: () => ({ robotQueries: true }),
}));

vi.mock('../use-polling.svelte', () => ({
  usePolling: vi.fn(),
}));

vi.mock('@tanstack/svelte-query', () => ({
  createQuery: (getOptions: () => Record<string, unknown>) => {
    options.current = getOptions;
    return { data: undefined };
  },
  queryOptions: (built: unknown) => built,
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

describe('createRobotQuery', () => {
  it('fetches with the arguments of the key it was built for, after the arguments change', async () => {
    const getPose = vi.fn();
    const { rerender } = render(CreateRobotQueryTestWrapper, {
      props: { current: { getPose } as never, args: ['table', 'world', []] },
    });
    const tableQueryFn = options.current?.().queryFn as () => Promise<unknown>;

    await rerender({
      current: { getPose } as never,
      args: ['ceiling', 'world', []],
    });
    await tableQueryFn();

    expect(
      getPose,
      'Tanstack can still run this queryFn for the table key, so it must not fetch the ceiling'
    ).toHaveBeenCalledWith('table', 'world', []);
  });
});
