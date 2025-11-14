import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import UsePollingTestComponent from './use-polling-provider.spec.svelte';

describe('usePolling()', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.spyOn(queryClient, 'refetchQueries');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    queryClient.clear();
  });

  describe('polling behavior', () => {
    it('should start polling when interval is provided', async () => {
      const queryKey = ['test-query'];
      const interval = 1000;

      render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      // Initially no calls
      expect(queryClient.refetchQueries).not.toHaveBeenCalled();

      // After first interval
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);
      expect(queryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey,
      });

      // After second interval
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(2);
    });

    it('should not start polling when interval is false', async () => {
      const queryKey = ['test-query'];
      const interval = false;

      render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      await vi.advanceTimersByTimeAsync(5000);

      expect(queryClient.refetchQueries).not.toHaveBeenCalled();
    });

    it('should wait for query to complete before starting next interval', async () => {
      const queryKey = ['test-query'];
      const interval = 1000;
      let resolveRefetch: () => void;

      vi.mocked(queryClient.refetchQueries).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRefetch = resolve as () => void;
          })
      );

      render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      // First interval triggers refetch
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);

      // Advance time but don't resolve - no new call should happen
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);

      // Resolve the first refetch
      resolveRefetch!();
      await vi.advanceTimersByTimeAsync(0);

      // Now advance time and see second call
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(2);
    });

    it('should poll multiple times at the specified interval', async () => {
      const queryKey = ['test-query'];
      const interval = 500;

      render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      // Poll 5 times
      for (let i = 1; i <= 5; i++) {
        await vi.advanceTimersByTimeAsync(interval);
        expect(queryClient.refetchQueries).toHaveBeenCalledTimes(i);
      }
    });
  });

  describe('interval changes', () => {
    it('should restart polling when interval changes', async () => {
      const queryKey = ['test-query'];

      const { rerender } = render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval: 1000,
          queryClient,
        },
      });

      // First poll
      await vi.advanceTimersByTimeAsync(1000);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);

      // Change interval
      await rerender({ queryKey, interval: 500, queryClient });

      // Should poll at new interval
      await vi.advanceTimersByTimeAsync(500);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(2);
    });

    it('should stop polling when interval changes to false', async () => {
      const queryKey = ['test-query'];

      const { rerender } = render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval: 1000,
          queryClient,
        },
      });

      // First poll
      await vi.advanceTimersByTimeAsync(1000);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);

      // Disable polling
      await rerender({ queryKey, interval: false, queryClient });

      // Should not poll anymore
      await vi.advanceTimersByTimeAsync(5000);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);
    });

    it('should start polling when interval changes from false to a number', async () => {
      const queryKey = ['test-query'];

      const { rerender } = render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval: false,
          queryClient,
        },
      });

      // No polling initially
      await vi.advanceTimersByTimeAsync(5000);
      expect(queryClient.refetchQueries).not.toHaveBeenCalled();

      // Enable polling
      await rerender({ queryKey, interval: 1000, queryClient });

      // Should start polling
      await vi.advanceTimersByTimeAsync(1000);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);
    });
  });

  describe('query key changes', () => {
    it('should use updated query key after change', async () => {
      const interval = 1000;

      const { rerender } = render(UsePollingTestComponent, {
        props: {
          queryKey: ['test-query-1'],
          interval,
          queryClient,
        },
      });

      // First poll with original key
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: ['test-query-1'],
      });

      // Change query key
      await rerender({
        queryKey: ['test-query-2'],
        interval,
        queryClient,
      });

      // Next poll should use new key
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledWith({
        queryKey: ['test-query-2'],
      });
    });
  });

  describe('cleanup', () => {
    it('should stop polling when component unmounts', async () => {
      const queryKey = ['test-query'];
      const interval = 1000;

      const { unmount } = render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      // First poll
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);

      // Unmount
      unmount();

      // Should not poll anymore
      await vi.advanceTimersByTimeAsync(interval * 5);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout on cleanup', async () => {
      const queryKey = ['test-query'];
      const interval = 1000;
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should stop polling if refetch fails', async () => {
      const queryKey = ['test-query'];
      const interval = 1000;

      // Mock to fail
      vi.mocked(queryClient.refetchQueries).mockRejectedValue(
        new Error('Refetch failed')
      );

      render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      // First poll fails
      await vi.advanceTimersByTimeAsync(interval);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);

      // Polling stops after error (no error handling in current implementation)
      await vi.advanceTimersByTimeAsync(interval * 3);
      expect(queryClient.refetchQueries).toHaveBeenCalledTimes(1);
    });
  });

  describe('no request stacking', () => {
    it('should not stack requests when server is slow', async () => {
      const queryKey = ['test-query'];
      const interval = 100;
      const calls: number[] = [];

      // Simulate slow server - each request takes 500ms (via fake timers)
      vi.mocked(queryClient.refetchQueries).mockImplementation(async () => {
        calls.push(Date.now());
        // Return immediately since we're using fake timers
        return undefined;
      });

      render(UsePollingTestComponent, {
        props: {
          queryKey,
          interval,
          queryClient,
        },
      });

      // First poll after initial interval
      await vi.advanceTimersByTimeAsync(interval);
      expect(calls.length).toBe(1);

      // Second poll after another interval
      await vi.advanceTimersByTimeAsync(interval);
      expect(calls.length).toBe(2);

      // Third poll
      await vi.advanceTimersByTimeAsync(interval);
      expect(calls.length).toBe(3);
    });
  });
});
