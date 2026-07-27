import { render, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateStreamClientTestWrapper from './fixtures/CreateStreamClientTestWrapper.svelte';

const { mockStreamClient, fakeRobotClient } = vi.hoisted(() => ({
  mockStreamClient: {
    getStream: vi.fn(),
    remove: vi.fn(),
    getOptions: vi.fn(),
    setOptions: vi.fn(),
    resetOptions: vi.fn(),
  },
  fakeRobotClient: { fakeClient: true },
}));

vi.mock('@viamrobotics/sdk', () => ({
  StreamClient: vi.fn(function StreamClient() {
    return mockStreamClient;
  }),
  MachineConnectionEvent: { CONNECTED: 'connected' },
}));

vi.mock('../robot-clients.svelte', () => ({
  useRobotClient: () => ({ current: fakeRobotClient }),
  useConnectionStatus: () => ({ current: 'connected' }),
}));

vi.mock('../use-enabled-queries.svelte', () => ({
  useEnabledQueries: () => ({ streams: true }),
}));

vi.mock('@tanstack/svelte-query', () => ({
  createQuery: () => ({ data: undefined }),
  createMutation: () => ({ mutate: vi.fn() }),
  queryOptions: (opts: unknown) => opts,
}));

vi.mock('$lib/logger', () => ({
  createQueryLogger: () => ({
    request: vi.fn(),
    response: vi.fn(),
    error: vi.fn(),
  }),
}));

const flushMicrotasks = async (rounds = 50) => {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
};

describe('createStreamClient', () => {
  beforeEach(() => {
    mockStreamClient.getStream.mockReset();
    mockStreamClient.remove.mockReset();
    mockStreamClient.remove.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('dedupes getStream across subscribers to the same camera', async () => {
    const fakeStream = {} as MediaStream;
    mockStreamClient.getStream.mockResolvedValue(fakeStream);

    render(CreateStreamClientTestWrapper, {
      props: { partID: 'part-1', resourceName: 'camera-1' },
    });
    render(CreateStreamClientTestWrapper, {
      props: { partID: 'part-1', resourceName: 'camera-1' },
    });

    await flushMicrotasks();

    expect(mockStreamClient.getStream).toHaveBeenCalledTimes(1);
  });
});
