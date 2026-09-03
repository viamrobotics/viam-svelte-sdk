import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import { MachineConnectionEvent, type Resource } from '@viamrobotics/sdk';
import { usePolling } from './use-polling.svelte';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import { useConnectionStatus } from './robot-clients.svelte';
import type { ResourceClientContext } from './create-resource-client.svelte';
import { resourceQueryKeyPrefix } from './resource-query-key';
import type {
  ArgumentsType,
  ResolvedReturnType,
  QueryOptions,
} from './queries';

export const createResourceQuery = <T extends Resource, K extends keyof T>(
  client: ResourceClientContext<T>,
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
  const name = $derived(client.name);
  const methodName = $derived(String(method));
  const partID = $derived(client.partID);
  const connectionStatus = useConnectionStatus(() => partID);
  const enabled = $derived(
    connectionStatus.current === MachineConnectionEvent.CONNECTED &&
      client.current !== undefined &&
      _options?.enabled !== false &&
      enabledQueries.resourceQueries
  );

  const queryKey = $derived([
    ...resourceQueryKeyPrefix(partID, name),
    methodName,
    ...(_args ? [_args] : []),
  ]);

  const queryOptions = $derived(
    createQueryOptions({
      queryKey,
      enabled,
      retry: false,
      // A resource is reached over its machine's dialed connection, which the
      // browser's online state says nothing about. A machine on a local network
      // or its own access point is reachable while the browser reports offline,
      // and the default `online` mode would pause every call. Reachability is
      // already tracked by the connection status this query is enabled on.
      networkMode: 'always',
      // Pinned, because Tanstack derives this from `networkMode` and 'always'
      // would otherwise turn it off.
      refetchOnReconnect: true,
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
    () => enabled && (_options?.refetchInterval ?? false),
    () => _options?.refetchIntervalInBackground
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
