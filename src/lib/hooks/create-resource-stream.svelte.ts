import {
  experimental_streamedQuery as streamedQuery,
  createQuery,
  type QueryObserverResult,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';
import { toStore, fromStore } from 'svelte/store';
import { useQueryLogger } from '../query-logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

interface QueryOptions {
  // enabled defaults to true if unspecified
  enabled?: boolean;
  refetchMode?: 'append' | 'reset' | 'replace';
  maxChunks?: number;
}

export type ResolvedReturnType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => infer R
  ? R
  : never;

type QueryResult<T extends Resource, K extends keyof T> = QueryObserverResult<
  ResolvedReturnType<T[K]>[],
  Error
>;

export const createResourceStream = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  ...additional:
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
    | [options?: (() => QueryOptions) | QueryOptions]
): { current: QueryResult<T, K> } => {
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
  const name = $derived(client.current?.name);
  const methodName = $derived(String(method));
  const queryKey = $derived([
    'viam-svelte-sdk',
    'partID',
    (client.current as T & { partID: string })?.partID,
    'resource',
    name,
    methodName,
    ...(_args ? [_args] : []),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-explicit-any
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
      ) as AsyncGenerator<ResolvedReturnType<T[K]>>;
      console.log('response', typeof response);

      logger('RES', name, methodName, response);
      return {
        async *[Symbol.asyncIterator]() {
          yield* response;
        },
      };
    } catch (error) {
      logger('ERR', name, methodName, error);
      throw error;
    }
  }

  const queryOptions = $derived(
    createQueryOptions({
      queryKey,
      enabled: client.current !== undefined && _options?.enabled !== false,
      queryFn: streamedQuery<ResolvedReturnType<T[K]>>({
        queryFn: processStream,
        ..._options,
      }),
    })
  );

  return fromStore(createQuery(toStore(() => queryOptions)));
};
