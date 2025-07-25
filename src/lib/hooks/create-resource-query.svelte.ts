import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';
import { toStore, fromStore } from 'svelte/store';
import { usePolling } from './use-polling.svelte';

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

export const createResourceQuery = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  ...additional:
    | [
        args?: (() => ArgumentsType<T[K]>) | ArgumentsType<T[K]>,
        options?: (() => QueryOptions) | QueryOptions,
      ]
    | [options?: (() => QueryOptions) | QueryOptions]
): { current: QueryObserverResult<ResolvedReturnType<T[K]>> } => {
  let [args, options] = additional;

  if (options === undefined && args !== undefined) {
    options = args as QueryOptions;
    args = undefined;
  }

  const _options = $derived(
    typeof options === 'function' ? options() : options
  );
  const _args = $derived(typeof args === 'function' ? args() : args);

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-sdk',
        'partID',
        (client.current as T & { partID: string })?.partID,
        'resource',
        client.current?.name,
        String(method),
        ...(_args ? [_args] : []),
      ],
      enabled: client.current !== undefined && _options?.enabled !== false,
      retry: false,
      queryFn: async () => {
        const clientFunc = client.current?.[method];

        if (typeof clientFunc !== 'function') {
          throw new TypeError(
            `${String(method)} is not a method on the resource client.`
          );
        }

        return clientFunc?.apply(client.current, _args) as Promise<
          ResolvedReturnType<T[K]>
        >;
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
