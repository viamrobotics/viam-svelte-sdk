import { render, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UseResourceNamesTestWrapper from './fixtures/UseResourceNamesTestWrapper.svelte';

const createRobotQueryMock = vi.fn((...args: unknown[]) => {
  void args;
  return {
    data: undefined,
    refetch: vi.fn(),
  };
});

vi.mock('../create-robot-query.svelte', () => ({
  createRobotQuery: (...args: unknown[]) => createRobotQueryMock(...args),
}));

type QueryOptions = { enabled?: boolean; refetchInterval?: number };

const optionsOfCall = (call: readonly unknown[]): QueryOptions => {
  const options = call[2];
  return (typeof options === 'function' ? options() : options) as QueryOptions;
};

describe('useResourceNames options', () => {
  beforeEach(() => {
    createRobotQueryMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('enables both internal queries by default', () => {
    render(UseResourceNamesTestWrapper, { props: {} });

    const [machineStatusCall] = createRobotQueryMock.mock.calls;
    expect(machineStatusCall?.[1]).toBe('getMachineStatus');
    expect(optionsOfCall(machineStatusCall ?? [])).toMatchObject({
      refetchInterval: 1000,
      enabled: true,
    });
  });

  it('disables both internal queries with enabled: false', () => {
    render(UseResourceNamesTestWrapper, { props: { enabled: false } });

    const [machineStatusCall, resourceNamesCall] =
      createRobotQueryMock.mock.calls;
    expect(machineStatusCall?.[1]).toBe('getMachineStatus');
    expect(optionsOfCall(machineStatusCall ?? []).enabled).toBe(false);
    expect(resourceNamesCall?.[1]).toBe('resourceNames');
    expect(optionsOfCall(resourceNamesCall ?? []).enabled).toBe(false);
  });
});
