import { useQueryClient } from '@tanstack/svelte-query';

/**
 * Polls a query at an interval while waiting for
 * a round trip to conclude before restarting the interval
 * countdown.
 *
 * The result is that if a viam server becomes unresponsive,
 * requests will not begin to stack, exacerbating issues.
 */
export function usePolling(
  queryKey: () => unknown[],
  interval: () => number | false
) {
  const queryClient = useQueryClient();
  let timeoutId: ReturnType<typeof setTimeout>;

  $effect(() => {
    const key = queryKey();
    const currentInterval = interval();

    if (!currentInterval) {
      return;
    }

    const poll = async () => {
      await queryClient.refetchQueries(
        { queryKey: key },
        { throwOnError: true }
      );
      timeoutId = setTimeout(poll, currentInterval);
    };

    timeoutId = setTimeout(poll, currentInterval);

    return () => clearTimeout(timeoutId);
  });
}
