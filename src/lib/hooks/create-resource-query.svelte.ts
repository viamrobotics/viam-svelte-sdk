import {
  createQuery,
  queryOptions as createQueryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';
import { toStore, fromStore } from 'svelte/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export type ResolvedReturnType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<infer R>
  ? R
  : never;

export interface ResourceQueryOptions {
  // enabled defaults to true if unspecified
  enabled?: boolean;
  refetchInterval: number | false;
  refetchIntervalInBackground?: boolean;
}

export const createResourceQuery: {
  // Overload when args and options are provided separately
  <T extends Resource, K extends keyof T>(
    client: { current: T | undefined },
    method: K,
    args: () => ArgumentsType<T[K]>,
    options?: () => ResourceQueryOptions
  ): { current: QueryObserverResult<ResolvedReturnType<T[K]>> };

  // Overload when only three parameters are provided, treating the third param as options
  <T extends Resource, K extends keyof T>(
    client: { current: T | undefined },
    method: K,
    options?: () => ResourceQueryOptions
  ): { current: QueryObserverResult<ResolvedReturnType<T[K]>> };
} = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  third?: (() => ArgumentsType<T[K]>) | (() => ResourceQueryOptions),
  fourth?: () => ResourceQueryOptions
): { current: QueryObserverResult<ResolvedReturnType<T[K]>> } => {
  // Determine if the third parameter is args or options
  const args = fourth ? (third as () => ArgumentsType<T[K]>) : undefined;
  const options = fourth
    ? fourth
    : (third as () => ResourceQueryOptions | undefined);

  const opts = $derived(options?.());
  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'partID',
        (client.current as T & { partID: string })?.partID,
        'resource',
        client.current?.name,
        String(method),
        args?.(),
      ],
      enabled: client.current !== undefined && opts?.enabled !== false,
      retry: false,
      queryFn: async () => {
        const clientFunc = client.current?.[method];

        if (typeof clientFunc !== 'function') {
          throw new TypeError(
            `${String(method)} is not a method on the resource client.`
          );
        }

        return clientFunc?.apply(client.current, args?.()) as Promise<
          ResolvedReturnType<T[K]>
        >;
      },
      ...opts,
    })
  );

  return fromStore(createQuery(toStore(() => queryOptions)));
};
