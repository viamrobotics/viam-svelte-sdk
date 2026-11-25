import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';

import { MachineConnectionEvent, type RobotClient } from '@viamrobotics/sdk';
import { usePolling } from './use-polling.svelte';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import { useConnectionStatus } from './robot-clients.svelte';
import type {
  ArgumentsType,
  ResolvedReturnType,
  QueryOptions,
} from './queries';
import type { PartID } from '$lib/part';
import { robotQueryKey } from './robot-query-key';

export const createRobotQuery = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined; partID: PartID },
  method: K,
  ...additional:
    | [options?: (() => QueryOptions) | QueryOptions | undefined]
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
): QueryObserverResult<ResolvedReturnType<T[K]>> => {
  const partID = $derived(client.partID);
  const connectionStatus = useConnectionStatus(() => partID);
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
  const methodName = $derived(String(method));
  const enabled = $derived(
    connectionStatus.current === MachineConnectionEvent.CONNECTED &&
      client.current !== undefined &&
      _options?.enabled !== false &&
      enabledQueries.robotQueries
  );

  const queryOptions = $derived.by(() => {
    // Read once, so the fetch uses the same arguments as the key. Tanstack keeps one query per
    // key and runs whichever `queryFn` last configured it, so a `queryFn` reading the live args
    // would answer this key with another key's arguments after they change.
    const queryArgs = _args;

    return createQueryOptions({
      queryKey: [
        ...robotQueryKey(partID, methodName),
        ...(queryArgs ? [queryArgs] : []),
      ],
      enabled,
      retry: false,
      // A robot is reached over its own dialed connection, which the browser's
      // online state says nothing about. A machine on a local network or its own
      // access point is reachable while the browser reports offline, and the
      // default `online` mode would pause every call. Reachability is already
      // tracked by the connection status this query is enabled on.
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

        const logger = createQueryLogger('robot', methodName);
        logger.request(queryArgs);

        try {
          const response = (await clientFunc?.apply(
            client.current,
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
