import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { DataClient } from '@viamrobotics/sdk';
import { toStore, fromStore } from 'svelte/store';
import { usePolling } from '../use-polling.svelte';
import { useQueryLogger } from '../../query-logger';
import { useViamClient } from './use-app-client.svelte';
import type { ArgumentsType, ResolvedReturnType } from './types';

interface QueryOptions {
  // enabled defaults to true if unspecified
  enabled?: boolean;
  refetchInterval: number | false;
  refetchIntervalInBackground?: boolean;
}

export const createDataQuery = <T extends DataClient, K extends keyof T>(
  method: K,
  ...additional:
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
    | [options?: (() => QueryOptions) | QueryOptions]
): { current: QueryObserverResult<ResolvedReturnType<T[K]>> } => {
  const viamClient = useViamClient();
  const dataClient = $derived(viamClient.current?.dataClient as T);
  const debug = useQueryLogger();

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

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-app-sdk',
        'dataClient',
        methodName,
        ...(_args ? [_args] : []),
      ],
      enabled: dataClient !== undefined && _options?.enabled !== false,
      queryFn: async () => {
        if (!dataClient) {
          throw new Error('dataClient is undefined');
        }

        const clientFunc = dataClient[method];

        if (typeof clientFunc !== 'function') {
          throw new TypeError(
            `${String(method)} is not a method on the resource client.`
          );
        }

        const logger = debug.createLogger();
        logger('REQ', 'dataClient', methodName, _args);

        try {
          const response = (await clientFunc.apply(
            dataClient,
            _args
          )) as Promise<ResolvedReturnType<T[K]>>;

          logger('RES', 'dataClient', methodName, response);
          return response;
        } catch (error) {
          logger('ERR', 'dataClient', methodName, error);
          throw error;
        }
      },
      ..._options,
      refetchInterval: false,
    })
  );

  usePolling(
    () => queryOptions.queryKey,
    () => _options?.refetchInterval ?? false
  );

  return fromStore(createQuery(toStore(() => queryOptions)));
};
