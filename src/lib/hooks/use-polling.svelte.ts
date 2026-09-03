import { focusManager, useQueryClient } from '@tanstack/svelte-query';

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
 *
 * @param inBackground Whether to keep fetching while the document is hidden.
 *   Defaults to false, matching `refetchIntervalInBackground`. Polling here
 *   replaces Tanstack's own interval, so that option would otherwise never be
 *   read and a hidden tab would keep pulling responses nothing can render.
 */
export function usePolling(
  queryKey: () => unknown[],
  interval: () => number | false,
  inBackground: () => boolean | undefined = () => false
) {
  const queryClient = useQueryClient();

  $effect(() => {
    const abortController = new AbortController();
    const key = queryKey();
    const currentInterval = interval();
    const alwaysPoll = inBackground() === true;
    if (!currentInterval) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (abortController.signal.aborted) return;

      // The timer keeps running while hidden so the next visible tick fetches
      // right away, rather than waiting out a fresh interval on return.
      if (alwaysPoll || focusManager.isFocused()) {
        await queryClient.refetchQueries({ queryKey: key });
        if (abortController.signal.aborted) return;
      }

      timeoutId = setTimeout(poll, currentInterval);
    };

    timeoutId = setTimeout(poll, currentInterval);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  });
}
