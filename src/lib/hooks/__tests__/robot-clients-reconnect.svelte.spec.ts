/**
 * Tests for reconnecting dead WebRTC clients.
 *
 * When a machine restarts, the TS SDK's RobotClient stops reconnecting because
 * the signaling server returns gRPC NotFound for offline machines, which the SDK
 * classifies as non-retryable. The client ends up permanently DISCONNECTED.
 *
 * The svelte-sdk's $effect only fires when dialConfigs() changes structurally.
 * Since the config hasn't changed (same host, same token), isJsonEqual passes
 * and no reconnect happens. The fix adds a per-part retry timer that fires
 * when a client enters DISCONNECTED state.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
import {
  type DialConf,
  MachineConnectionEvent,
  RobotClient,
} from '@viamrobotics/sdk';

import Wrapper from './fixtures/RobotClientsTestWrapper.svelte';

type ConnectionHandler = (event: {
  eventType: MachineConnectionEvent;
}) => void;

let connectionHandlers: ConnectionHandler[];
const mockDial = vi.fn<(config: DialConf) => Promise<void>>();
const mockDisconnect = vi.fn<() => Promise<void>>();

vi.mock('@viamrobotics/sdk', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@viamrobotics/sdk')>();

  return {
    ...actual,
    RobotClient: vi.fn(),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  connectionHandlers = [];
  mockDial.mockReset().mockResolvedValue(undefined);
  mockDisconnect.mockReset().mockResolvedValue(undefined);

  vi.mocked(RobotClient).mockImplementation(
    () =>
      ({
        dial: mockDial,
        disconnect: mockDisconnect,
        on: vi.fn(
          (event: string, handler: (...args: unknown[]) => void) => {
            if (event === 'connectionstatechange') {
              connectionHandlers.push(handler as ConnectionHandler);
            }
          }
        ),
        listeners: {
          connectionstatechange: new Set(),
        },
        partID: '',
      }) as unknown as RobotClient
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const createDialConfig = (): DialConf => ({
  host: 'abc.viam.cloud',
  signalingAddress: 'https://app.viam.com:443',
  credentials: {
    type: 'access-token',
    payload: 'test-token',
  },
});

describe('robot-clients reconnect on DISCONNECTED', () => {
  it('retries connection when client goes DISCONNECTED and dialConfig is still present', async () => {
    // Step 1: Render with initial config → connect() → dial() called once
    render(Wrapper, {
      props: { dialConfigs: { abc: createDialConfig() } },
    });

    await vi.advanceTimersByTimeAsync(0);

    await waitFor(() => {
      expect(mockDial).toHaveBeenCalledTimes(1);
    });

    // Step 2: Simulate the SDK giving up on reconnection (e.g. NotFound from signaling)
    expect(connectionHandlers).toHaveLength(1);
    connectionHandlers[0]!({
      eventType: MachineConnectionEvent.DISCONNECTED,
    });

    // Step 3: Advance past the reconnect interval — timer should fire connect()
    await vi.advanceTimersByTimeAsync(2500);

    await waitFor(() => {
      expect(mockDial).toHaveBeenCalledTimes(2);
    });
  });

  it('cancels reconnect timer when SDK recovers on its own (CONNECTED)', async () => {
    render(Wrapper, {
      props: { dialConfigs: { abc: createDialConfig() } },
    });

    await vi.advanceTimersByTimeAsync(0);

    await waitFor(() => {
      expect(mockDial).toHaveBeenCalledTimes(1);
    });

    // SDK emits DISCONNECTED → timer starts
    connectionHandlers[0]!({
      eventType: MachineConnectionEvent.DISCONNECTED,
    });

    // SDK recovers on its own before the timer fires
    connectionHandlers[0]!({
      eventType: MachineConnectionEvent.CONNECTED,
    });

    // Advance well past the reconnect interval
    await vi.advanceTimersByTimeAsync(5000);

    // dial() should NOT have been called again — SDK recovered, timer was cleared
    expect(mockDial).toHaveBeenCalledTimes(1);
  });

  it('clears all reconnect timers on unmount', async () => {
    const { unmount } = render(Wrapper, {
      props: { dialConfigs: { abc: createDialConfig() } },
    });

    await vi.advanceTimersByTimeAsync(0);

    await waitFor(() => {
      expect(mockDial).toHaveBeenCalledTimes(1);
    });

    // SDK emits DISCONNECTED → timer starts
    connectionHandlers[0]!({
      eventType: MachineConnectionEvent.DISCONNECTED,
    });

    // Unmount cleans everything up
    unmount();

    // Advance past several reconnect intervals
    await vi.advanceTimersByTimeAsync(10_000);

    // No additional dial attempts after unmount
    expect(mockDial).toHaveBeenCalledTimes(1);
  });

});
