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
  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout>;
  let active = true;

  $effect(() => {
    const key = queryKey();
    const currentInterval = interval();
    if (!currentInterval) return;

    active = true;

    const poll = async () => {
      if (!active) return;
      if (abortController.signal.aborted) {
        active = false;
        clearTimeout(timeoutId);
        return;
      }

      await queryClient.refetchQueries({ queryKey: key });
      timeoutId = setTimeout(poll, currentInterval);
    };

    timeoutId = setTimeout(poll, currentInterval);

    return () => {
      clearTimeout(timeoutId);
      active = false;
      abortController.abort();
    };
  });
}
