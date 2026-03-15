import { render, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MachineConnectionEvent, type DialConf } from '@viamrobotics/sdk';
import RobotClientsTestWrapper from './fixtures/RobotClientsTestWrapper.svelte';

const mockDial = vi.fn();
const mockDisconnect = vi.fn();

let onConnectionStateChange: (event: {
  eventType: MachineConnectionEvent;
}) => void;

// Use a class so Svelte 5 doesn't proxy instances (it only proxies plain objects).
class MockRobotClient {
  dial = mockDial;
  disconnect = mockDisconnect;
  on = vi.fn((event: string, callback: typeof onConnectionStateChange) => {
    if (event === 'connectionstatechange') {
      onConnectionStateChange = callback;
    }
  });
  listeners = { connectionstatechange: new Set() };
}

vi.mock('@viamrobotics/sdk', async () => {
  const actual = await vi.importActual<typeof import('@viamrobotics/sdk')>(
    '@viamrobotics/sdk'
  );
  return {
    ...actual,
    RobotClient: vi.fn().mockImplementation(() => new MockRobotClient()),
  };
});

const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('@tanstack/svelte-query', () => ({
  useQueryClient: () => ({
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    resetQueries: vi.fn().mockResolvedValue(undefined),
    invalidateQueries: mockInvalidateQueries,
  }),
}));

describe('robot-clients reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockDial.mockReset().mockResolvedValue(undefined);
    mockDisconnect.mockReset().mockResolvedValue(undefined);
    mockInvalidateQueries.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('retries connection after TS SDK disconnects when dialConfigs are unchanged', async () => {
    const configs: Record<string, DialConf> = {
      'part-1': {
        host: 'part-1.example.com',
        signalingAddress: 'https://signaling.example.com',
      },
    };

    render(RobotClientsTestWrapper, {
      props: { dialConfigs: () => configs },
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockDial).toHaveBeenCalledTimes(1);

    // TS SDK fires DISCONNECTED after giving up on non-retryable error
    onConnectionStateChange({
      eventType: MachineConnectionEvent.DISCONNECTED,
    });

    // dialConfigs unchanged — $effect won't fire. Only the fix retries.
    await vi.advanceTimersByTimeAsync(500);

    expect(mockDial).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it('does not schedule retry from event handler while dial() is in progress', async () => {
    // Simulate a retryable error: dial() is slow (TS SDK retrying internally),
    // and during that time it emits intermediate DISCONNECTED events.
    // The event handler should NOT schedule a retry while dial() is running,
    // because the TS SDK is already handling the retry internally.

    let resolveDial: () => void;
    mockDial.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDial = resolve;
        })
    );

    const configs: Record<string, DialConf> = {
      'part-1': {
        host: 'part-1.example.com',
        signalingAddress: 'https://signaling.example.com',
      },
    };

    render(RobotClientsTestWrapper, {
      props: { dialConfigs: () => configs },
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockDial).toHaveBeenCalledTimes(1);

    // TS SDK fires intermediate DISCONNECTED while dial() is still pending
    // (e.g. a retryable "timed out" error during WebRTC negotiation)
    onConnectionStateChange({
      eventType: MachineConnectionEvent.DISCONNECTED,
    });

    // Advance past the RECONNECT_DELAY_MS — should NOT trigger a second connect
    await vi.advanceTimersByTimeAsync(5000);

    // dial() should still only have been called once — no duplicate retry
    expect(mockDial).toHaveBeenCalledTimes(1);

    // Now let dial() complete successfully
    resolveDial!();
    await vi.advanceTimersByTimeAsync(0);

    // Still just the one dial call — no retry was scheduled
    expect(mockDial).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when dialConfig is removed', async () => {
    // Retry continues as long as the dialConfig is present. When the caller
    // removes a part's config, no retry should be scheduled.

    let configs: Record<string, DialConf> = {
      'part-1': {
        host: 'part-1.example.com',
        signalingAddress: 'https://signaling.example.com',
      },
    };

    render(RobotClientsTestWrapper, {
      props: { dialConfigs: () => configs },
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockDial).toHaveBeenCalledTimes(1);

    // Liveness poll marks machine offline → removes dialConfig
    configs = {};

    // TS SDK fires DISCONNECTED — event handler checks dialConfigs()[partID]
    // and finds no config → no retry scheduled
    onConnectionStateChange({
      eventType: MachineConnectionEvent.DISCONNECTED,
    });

    await vi.advanceTimersByTimeAsync(5000);

    // No retry — config was already removed
    expect(mockDial).toHaveBeenCalledTimes(1);
  });

  it('retries after dial() throws', async () => {
    mockDial.mockRejectedValueOnce(new Error('connection failed'));

    const configs: Record<string, DialConf> = {
      'part-1': {
        host: 'part-1.example.com',
        signalingAddress: 'https://signaling.example.com',
      },
    };

    render(RobotClientsTestWrapper, {
      props: { dialConfigs: () => configs },
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(mockDial).toHaveBeenCalledTimes(1);

    // Flush the rejection so the catch block runs
    await vi.advanceTimersByTimeAsync(0);

    // catch block schedules retry after RECONNECT_DELAY_MS
    await vi.advanceTimersByTimeAsync(500);

    expect(mockDial).toHaveBeenCalledTimes(2);
  });
});
