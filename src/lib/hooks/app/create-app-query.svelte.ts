import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { AppClient } from '@viamrobotics/sdk';
import { usePolling } from '../use-polling.svelte';
import { createQueryLogger } from '$lib/logger';
import { useViamClient } from './use-app-client.svelte';
import type {
  ArgumentsType,
  ResolvedReturnType,
  QueryOptions,
} from '../queries';

export const createAppQuery = <T extends AppClient, K extends keyof T>(
  method: K,
  ...additional:
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
    | [options?: (() => QueryOptions) | QueryOptions]
): QueryObserverResult<ResolvedReturnType<T[K]>> => {
  const viamClient = useViamClient();
  const appClient = $derived(viamClient.current?.appClient as T);

  let [args, options] = additional;

  if (options === undefined && args !== undefined) {
    options = args as QueryOptions;
    args = undefined;
  }

  const _options = $derived(
    typeof options === 'function' ? options() : options
  );
  const _args = $derived(typeof args === 'function' ? args() : args);
  const methodName = $derived(String(method));
  const enabled = $derived(
    appClient !== undefined && _options?.enabled !== false
  );

  const queryOptions = $derived.by(() => {
    // Read once, so the fetch uses the same arguments as the key. Tanstack keeps one query per
    // key and runs whichever `queryFn` last configured it, so a `queryFn` reading the live args
    // would answer this key with another key's arguments after they change.
    const queryArgs = _args;

    return createQueryOptions({
      queryKey: [
        'viam-svelte-app-sdk',
        'appClient',
        methodName,
        ...(queryArgs ? [queryArgs] : []),
      ],
      enabled,
      queryFn: async () => {
        if (!appClient) {
          throw new Error('appClient is undefined');
        }

        const clientFunc = appClient[method];

        if (typeof clientFunc !== 'function') {
          throw new TypeError(
            `${String(method)} is not a method on the resource client.`
          );
        }

        const logger = createQueryLogger('appClient', methodName);
        logger.request(queryArgs);

        try {
          const response = (await clientFunc.apply(
            appClient,
            queryArgs
          )) as Promise<ResolvedReturnType<T[K]>>;

          logger.response(response);
          return response;
        } catch (error) {
          logger.error(error);
          throw error;
        }
      },
      ..._options,
      refetchInterval: false,
    });
  });

  usePolling(
    () => queryOptions.queryKey,
    () => enabled && (_options?.refetchInterval ?? false),
    () => _options?.refetchIntervalInBackground
  );

  return createQuery(() => queryOptions);
};
