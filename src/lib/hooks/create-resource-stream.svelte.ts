import {
  experimental_streamedQuery as streamedQuery,
  createQuery,
  type QueryObserverResult,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import type {
  ArgumentsType,
  StreamItemType,
  StreamQueryOptions as QueryOptions,
} from './queries';

type QueryResult<U> = QueryObserverResult<U[], Error>;

export const streamQueryKey = (
  partID: string,
  name: string | undefined,
  methodName: string,
  args?: QueryOptions | unknown
) => [
  'viam-svelte-sdk',
  'partID',
  partID,
  'resource',
  name,
  methodName,
  ...(args ? [args] : []),
];

export const createResourceStream = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  ...additional:
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
    | [options?: (() => QueryOptions) | QueryOptions]
): QueryResult<StreamItemType<T[K]>> => {
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
  const refetchMode = $derived(_options?.refetchMode ?? 'reset');
  const partID = $derived((client.current as T & { partID: string })?.partID);
  const queryKey = $derived(streamQueryKey(partID, name, methodName, _args));

  function processStream() {
    const clientFunc = client.current?.[method];

    if (typeof clientFunc !== 'function') {
      throw new TypeError(
        `${String(method)} is not a method on the resource client.`
      );
    }

    const logger = createQueryLogger(name ?? 'unknown', methodName);
    logger.request(_args);

    try {
      const response = clientFunc?.apply(
        client.current,
        _args
      ) as AsyncGenerator<StreamItemType<T[K]>>;

      logger.response(response);
      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  const queryOptions = $derived(
    createQueryOptions({
      queryKey,
      enabled:
        client.current !== undefined &&
        _options?.enabled !== false &&
        enabledQueries.resourceQueries,
      queryFn: streamedQuery<StreamItemType<T[K]>>({
        streamFn: processStream,
        refetchMode,
      }),
    })
  );

  return createQuery(() => queryOptions);
};
