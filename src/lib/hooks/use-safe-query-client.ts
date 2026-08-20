import { QueryClient, useQueryClient } from '@tanstack/svelte-query';

let fallbackQueryClient: QueryClient | undefined;

/**
 * `useQueryClient`, tolerating a missing `QueryClientProvider`: hooks mounted
 * without a `ViamProvider`/`ViamAppProvider` ancestor bind to a shared inert
 * QueryClient instead of throwing.
 *
 * Must be called during component init.
 */
export const useSafeQueryClient = (): QueryClient => {
  try {
    return useQueryClient();
  } catch {
    fallbackQueryClient ??= new QueryClient();
    return fallbackQueryClient;
  }
};
