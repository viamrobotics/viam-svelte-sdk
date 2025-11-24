import {
  experimental_streamedQuery as streamedQuery,
  createQuery,
  type QueryObserverResult,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';
import { useQueryLogger } from '../query-logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export type StreamItemType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => AsyncGenerator<infer R, any, any>
  ? R
  : never;

interface QueryOptions {
  // enabled defaults to true if unspecified
  enabled?: boolean;
  // refetchMode defaults to 'reset' if unspecified
  refetchMode?: 'append' | 'reset' | 'replace';
}

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

    const logger = debug.createLogger();
    logger('REQ', name, methodName, _args);

    try {
      const response = clientFunc?.apply(
        client.current,
        _args
      ) as AsyncGenerator<StreamItemType<T[K]>>;
      console.log('response', typeof response);

      logger('RES', name, methodName, response);
      return response;
    } catch (error) {
      logger('ERR', name, methodName, error);
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
