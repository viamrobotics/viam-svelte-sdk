import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';

import { MachineConnectionEvent, type RobotClient } from '@viamrobotics/sdk';
import { usePolling } from './use-polling.svelte';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import { useRobotClient } from './robot-clients.svelte';
import type {
  ArgumentsType,
  ResolvedReturnType,
  QueryOptions,
} from './queries';

export const createRobotQuery = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  ...additional:
    | [options?: (() => QueryOptions) | QueryOptions | undefined]
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
): QueryObserverResult<ResolvedReturnType<T[K]>> => {
  const partID = $derived((client.current as T & { partID: string })?.partID);
  const robotClient = useRobotClient(() => partID);
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
    robotClient.current?.connectionStatus === MachineConnectionEvent.CONNECTED &&
      client.current !== undefined &&
      _options?.enabled !== false &&
      enabledQueries.robotQueries
  );

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-sdk',
        'partID',
        partID,
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

        const logger = createQueryLogger('robot', methodName);
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

  return createQuery(() => queryOptions);
};
