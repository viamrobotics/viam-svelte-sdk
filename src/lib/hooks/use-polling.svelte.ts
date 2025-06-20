import { useQueryClient } from '@tanstack/svelte-query';

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
      await queryClient.refetchQueries({ queryKey: key });
      timeoutId = setTimeout(poll, currentInterval);
    };

    timeoutId = setTimeout(poll, currentInterval);

    return () => clearTimeout(timeoutId);
  });
}
