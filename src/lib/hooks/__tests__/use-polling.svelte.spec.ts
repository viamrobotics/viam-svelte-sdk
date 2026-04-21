import { render, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UsePollingTestWrapper from './fixtures/UsePollingTestWrapper.svelte';

const mockRefetchQueries = vi.fn();

vi.mock('@tanstack/svelte-query', () => ({
  useQueryClient: () => ({
    refetchQueries: mockRefetchQueries,
  }),
}));

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRefetchQueries.mockReset();
    mockRefetchQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not poll when interval is false', async () => {
    // Arrange
    render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: false },
    });

    // Act
    await vi.advanceTimersByTimeAsync(5000);

    // Assert
    expect(mockRefetchQueries).not.toHaveBeenCalled();
  });

  it('polls at the specified interval', async () => {
    // Arrange
    render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    //Act
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);
    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ['test'] });

    // Act
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
  });

  it('waits for refetch to complete before scheduling next poll (no stacking)', async () => {
    // Arrange
    let resolveRefetch: () => void;
    mockRefetchQueries.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        })
    );

    render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act
    await vi.advanceTimersByTimeAsync(3000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act
    resolveRefetch!();
    await vi.advanceTimersByTimeAsync(0); // flush promises
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
  });

  it('cleans up timeout on unmount', async () => {
    // Arrange
    const { unmount } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act
    unmount();
    await vi.advanceTimersByTimeAsync(2000);

    // Assert
    expect(mockRefetchQueries).not.toHaveBeenCalled();
  });

  it('aborts in-flight request cycle when unmounted mid-request', async () => {
    // Arrange
    let resolveRefetch: () => void;
    mockRefetchQueries.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        })
    );

    // Act
    const { unmount } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act
    unmount();
    resolveRefetch!();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);
  });

  it('continues polling after interval changes', async () => {
    // Arrange
    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act - poll at original interval
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act - change interval
    await rerender({ queryKey: ['test'], interval: 2000 });
    mockRefetchQueries.mockClear();

    // Assert - old interval (1s) should NOT trigger a poll
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(0);

    // Assert - new interval (2s) should trigger a poll
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Assert - continues at new interval
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
  });

  it('stops polling when interval changes to false', async () => {
    // Arrange
    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act - confirm initial polling works
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act - disable polling
    await rerender({ queryKey: ['test'], interval: false });
    mockRefetchQueries.mockClear();

    // Assert - no more polling
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockRefetchQueries).not.toHaveBeenCalled();
  });

  it('resumes polling after re-enabling from false', async () => {
    // Arrange
    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act - disable
    await rerender({ queryKey: ['test'], interval: false });
    mockRefetchQueries.mockClear();
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockRefetchQueries).not.toHaveBeenCalled();

    // Act - re-enable
    await rerender({ queryKey: ['test'], interval: 1000 });

    // Assert - polling resumes
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
  });

  it('uses new queryKey after queryKey changes', async () => {
    // Arrange
    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['key-1'], interval: 1000 },
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ['key-1'] });

    // Act - change queryKey
    await rerender({ queryKey: ['key-2'], interval: 1000 });
    mockRefetchQueries.mockClear();

    await vi.advanceTimersByTimeAsync(1000);

    // Assert - polls with new key
    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ['key-2'] });
  });

  it('handles multiple rapid interval changes', async () => {
    // Arrange
    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act - rapid changes before any poll fires
    await rerender({ queryKey: ['test'], interval: 2000 });
    await rerender({ queryKey: ['test'], interval: 500 });
    await rerender({ queryKey: ['test'], interval: 3000 });
    mockRefetchQueries.mockClear();

    // Assert - only the final interval (3s) should take effect
    await vi.advanceTimersByTimeAsync(500);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(2500);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Assert - continues at final interval
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
  });

  it('continues polling when deps change while a fetch is in-flight', async () => {
    // Arrange
    let resolveRefetch: (() => void) | undefined;
    mockRefetchQueries.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefetch = resolve;
        })
    );

    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act - fire first poll, leave it pending
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act - rerender while fetch is in-flight
    await rerender({ queryKey: ['test'], interval: 500 });

    // Act - resolve the stale in-flight fetch (from R1)
    resolveRefetch!();
    await vi.advanceTimersByTimeAsync(0);

    // Switch to resolved mock so the next poll doesn't hang
    mockRefetchQueries.mockReset();
    mockRefetchQueries.mockResolvedValue(undefined);

    // Assert - polling from R2 continues at the new interval
    await vi.advanceTimersByTimeAsync(500);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);
  });

  it('does not leak pollers across repeated mid-fetch dep changes', async () => {
    // Arrange - every refetch hangs until manually resolved
    const resolvers: Array<() => void> = [];
    mockRefetchQueries.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const { rerender } = render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Fire poll, leave pending, rerender — repeat
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      await rerender({ queryKey: ['test'], interval: 1000 });
    }

    // Resolve every hung fetch; stale polls must not schedule new work
    for (const resolve of resolvers) resolve();
    await vi.advanceTimersByTimeAsync(0);

    const callsBefore = mockRefetchQueries.mock.calls.length;

    // Advance far enough that leaked pollers would fire many times
    await vi.advanceTimersByTimeAsync(1000);

    // Only one live poller should fire
    expect(mockRefetchQueries.mock.calls.length - callsBefore).toBe(1);
  });

  it('handles slow requests without stacking when request takes longer than interval', async () => {
    // Arrange
    const requestResolvers: Array<() => void> = [];
    mockRefetchQueries.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          requestResolvers.push(resolve);
        })
    );

    render(UsePollingTestWrapper, {
      props: { queryKey: ['test'], interval: 1000 },
    });

    // Act - trigger first poll
    await vi.advanceTimersByTimeAsync(1000);

    // Assert - first request started
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act - simulate slow request: advance 10 intervals while request is pending
    await vi.advanceTimersByTimeAsync(10_000);

    // Assert - still only 1 request (no stacking)
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);
    expect(requestResolvers).toHaveLength(1);

    // Act - slow request finally completes
    requestResolvers[0]!();
    await vi.advanceTimersByTimeAsync(0);

    // Assert - still 1 request, waiting for next interval
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);

    // Act - next interval passes
    await vi.advanceTimersByTimeAsync(1000);

    // Assert - second request started
    expect(mockRefetchQueries).toHaveBeenCalledTimes(2);

    // Act - complete second request quickly
    requestResolvers[1]!();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);

    // Assert - third request started (normal polling resumed)
    expect(mockRefetchQueries).toHaveBeenCalledTimes(3);
  });
});
