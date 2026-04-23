import { useQueryClient } from '@tanstack/svelte-query';

/**
 * Polls a query at an interval while waiting for
 * a round trip to conclude before restarting the interval
 * countdown.
 *
 * The result is that if a viam server becomes unresponsive,
 * requests will not begin to stack, exacerbating issues.
 *
 * Uses AbortController to ensure no overlapping requests occur
 * during effect re-runs when dependencies change.
 */
export function usePolling(
  queryKey: () => unknown[],
  interval: () => number | false
) {
  const queryClient = useQueryClient();

  $effect(() => {
    const abortController = new AbortController();
    const key = queryKey();
    const currentInterval = interval();
    if (!currentInterval) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (abortController.signal.aborted) return;
      await queryClient.refetchQueries({ queryKey: key });
      if (abortController.signal.aborted) return;
      timeoutId = setTimeout(poll, currentInterval);
    };

    timeoutId = setTimeout(poll, currentInterval);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  });
}
