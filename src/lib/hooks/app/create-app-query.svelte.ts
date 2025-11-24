import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { AppClient } from '@viamrobotics/sdk';
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
  const enabled = $derived(
    appClient !== undefined && _options?.enabled !== false
  );

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-app-sdk',
        'appClient',
        methodName,
        ...(_args ? [_args] : []),
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

        const logger = debug.createLogger();
        logger('REQ', 'appClient', methodName, _args);

        try {
          const response = (await clientFunc.apply(
            appClient,
            _args
          )) as Promise<ResolvedReturnType<T[K]>>;

          logger('RES', 'appClient', methodName, response);
          return response;
        } catch (error) {
          logger('ERR', 'appClient', methodName, error);
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
