import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';
import { usePolling } from './use-polling.svelte';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import type {
  ArgumentsType,
  ResolvedReturnType,
  QueryOptions,
} from './queries';

export const createResourceQuery = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  ...additional:
    | [options?: (() => QueryOptions) | QueryOptions]
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
): QueryObserverResult<ResolvedReturnType<T[K]>> & {
  queryKey: typeof queryKey;
} => {
  const enabledQueries = useEnabledQueries();

  let [args, options] = additional;

  if (options === undefined && args !== undefined) {
    options = args as QueryOptions;
    args = undefined;
  }

  const _options = $derived(
    typeof options === 'function' ? options() : options
  );
  const _args = $derived(typeof args === 'function' ? args() : args);
  const name = $derived(client.current?.name);
  const methodName = $derived(String(method));
  const enabled = $derived(
    client.current !== undefined &&
      _options?.enabled !== false &&
      enabledQueries.resourceQueries
  );

  const queryKey = $derived([
    'viam-svelte-sdk',
    'partID',
    (client.current as T & { partID: string })?.partID,
    'resource',
    name,
    methodName,
    ...(_args ? [_args] : []),
  ]);

  const queryOptions = $derived(
    createQueryOptions({
      queryKey,
      enabled,
      retry: false,
      queryFn: async () => {
        const clientFunc = client.current?.[method];

        if (typeof clientFunc !== 'function') {
          throw new TypeError(
            `${String(method)} is not a method on the resource client.`
          );
        }

        const logger = createQueryLogger(name ?? 'unknown', methodName);
        logger.request(_args);

        try {
          const response = (await clientFunc?.apply(
            client.current,
            _args
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
    })
  );

  usePolling(
    () => queryOptions.queryKey,
    () => enabled && (_options?.refetchInterval ?? false)
  );

  const query = createQuery(() => queryOptions) as QueryObserverResult<
    ResolvedReturnType<T[K]>
  > & { queryKey: typeof queryKey };
  Object.defineProperty(query, 'queryKey', {
    get: () => queryKey,
    set: () => {
      // do nothing
    },
    enumerable: true,
    configurable: true,
  });
  return query;
};
