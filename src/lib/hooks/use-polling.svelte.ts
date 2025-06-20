import { useQueryClient } from '@tanstack/svelte-query';

export function usePolling(
  queryKeys: () => unknown[][],
  interval: () => number | false
) {
  const queryClient = useQueryClient();
  let timeoutId: ReturnType<typeof setTimeout>;

  $effect(() => {
    const keys = queryKeys();
    const currentInterval = interval();

    if (!currentInterval) {
      return;
    }

    const poll = async () => {
      Promise.allSettled(
        keys.map((queryKey) => queryClient.refetchQueries({ queryKey }))
      );

      timeoutId = setTimeout(poll, currentInterval);
    };

    timeoutId = setTimeout(poll, currentInterval);

    return () => clearTimeout(timeoutId);
  });
}
