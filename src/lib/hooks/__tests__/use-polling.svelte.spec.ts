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
