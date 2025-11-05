import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';

import { MachineConnectionEvent, type RobotClient } from '@viamrobotics/sdk';
import { toStore, fromStore } from 'svelte/store';
import { usePolling } from './use-polling.svelte';
import { useQueryLogger } from '$lib/query-logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import { useConnectionStatus } from './robot-clients.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export type ResolvedReturnType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<infer R>
  ? R
  : never;

interface QueryOptions {
  // enabled defaults to true if unspecified
  enabled?: boolean;
  refetchInterval: number | false;
  refetchIntervalInBackground?: boolean;
}

export const createRobotQuery = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  ...additional:
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
    | [options?: (() => QueryOptions) | QueryOptions]
): { current: QueryObserverResult<ResolvedReturnType<T[K]>> } => {
  const connectionStatus = useConnectionStatus();
  const debug = useQueryLogger();
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

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-sdk',
        'partID',
        (client.current as T & { partID: string })?.partID,
        'robotClient',
        methodName,
        ...(_args ? [_args] : []),
      ],
      enabled,
      retry: false,
      queryFn: async () => {
        const clientFunc = client.current?.[method];

        if (typeof clientFunc !== 'function') {
          throw new TypeError(
            `${String(method)} is not a method on the resource client.`
          );
        }

        const logger = debug.createLogger();
        logger('REQ', 'robot', methodName, _args);

        try {
          const response = (await clientFunc?.apply(
            client.current,
            _args
          )) as Promise<ResolvedReturnType<T[K]>>;

          logger('RES', 'robot', methodName, response);
          return response;
        } catch (error) {
          logger('ERR', 'robot', methodName, error);
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

  return fromStore(createQuery(toStore(() => queryOptions)));
};
