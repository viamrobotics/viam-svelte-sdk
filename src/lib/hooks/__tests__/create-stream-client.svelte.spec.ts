import { render, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateStreamClientTestWrapper from './fixtures/CreateStreamClientTestWrapper.svelte';
import { refreshSharedStream } from '../create-stream-client.svelte';

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

  it('re-acquires the track when the camera is rebuilt', async () => {
    const before = { id: 'before' } as unknown as MediaStream;
    const after = { id: 'after' } as unknown as MediaStream;
    mockStreamClient.getStream.mockResolvedValueOnce(before);

    const { getByTestId } = render(CreateStreamClientTestWrapper, {
      props: { partID: 'part-1', resourceName: 'camera-2' },
    });

    await flushMicrotasks();
    expect(getByTestId('stream-wrapper').textContent).toContain('has-stream');

    mockStreamClient.getStream.mockResolvedValueOnce(after);
    await refreshSharedStream('part-1', 'camera-2', 'camera:200.0');
    await flushMicrotasks();

    // The rebuilt resource does not know it owes anyone a stream, so the old
    // track goes silent with no error to reconnect from.
    expect(mockStreamClient.remove).toHaveBeenCalledWith('camera-2');
    expect(mockStreamClient.getStream).toHaveBeenCalledTimes(2);
  });

  it('re-acquires once for every subscriber to the rebuilt camera', async () => {
    mockStreamClient.getStream.mockResolvedValue({} as MediaStream);

    render(CreateStreamClientTestWrapper, {
      props: { partID: 'part-1', resourceName: 'camera-3' },
    });
    render(CreateStreamClientTestWrapper, {
      props: { partID: 'part-1', resourceName: 'camera-3' },
    });

    await flushMicrotasks();
    expect(mockStreamClient.getStream).toHaveBeenCalledTimes(1);

    await refreshSharedStream('part-1', 'camera-3', 'camera:200.0');
    await refreshSharedStream('part-1', 'camera-3', 'camera:200.0');
    await flushMicrotasks();

    expect(mockStreamClient.getStream).toHaveBeenCalledTimes(2);
  });

  it('ignores a refresh for a camera nothing is watching', async () => {
    await refreshSharedStream('part-1', 'camera-absent', 'camera:200.0');

    expect(mockStreamClient.getStream).not.toHaveBeenCalled();
    expect(mockStreamClient.remove).not.toHaveBeenCalled();
  });
});
