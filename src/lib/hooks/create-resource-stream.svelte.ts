import {
  experimental_streamedQuery as streamedQuery,
  createQuery,
  type QueryObserverResult,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import { MachineConnectionEvent, type Resource } from '@viamrobotics/sdk';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import { useConnectionStatus } from './robot-clients.svelte';
import type {
  ArgumentsType,
  StreamItemType,
  StreamQueryOptions as QueryOptions,
} from './queries';
import type { ResourceClientContext } from './create-resource-client.svelte';
import { resourceQueryKeyPrefix } from './resource-query-key';

type QueryResult<U> = QueryObserverResult<U[], Error>;

export const streamQueryKey = (
  partID: string,
  name: string | undefined,
  methodName: string,
  args?: QueryOptions | unknown
) => [
  ...resourceQueryKeyPrefix(partID, name),
  methodName,
  ...(args ? [args] : []),
];

export const createResourceStream = <T extends Resource, K extends keyof T>(
  client: ResourceClientContext<T>,
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
  const name = $derived(client.name);
  const methodName = $derived(String(method));
  const refetchMode = $derived(_options?.refetchMode ?? 'reset');
  const partID = $derived(client.partID);
  const connectionStatus = useConnectionStatus(() => partID);
  const queryKey = $derived(streamQueryKey(partID, name, methodName, _args));

  function processStream(streamArgs: typeof _args) {
    const clientFunc = client.current?.[method];

    if (typeof clientFunc !== 'function') {
      throw new TypeError(
        `${String(method)} is not a method on the resource client.`
      );
    }

    const logger = createQueryLogger(name ?? 'unknown', methodName);
    logger.request(streamArgs);

    try {
      const response = clientFunc?.apply(
        client.current,
        streamArgs
      ) as AsyncGenerator<StreamItemType<T[K]>>;

      logger.response(response);
      return response;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  const queryOptions = $derived.by(() => {
    // Read once, so the stream opens with the same arguments as the key. Tanstack keeps one query
    // per key and runs whichever `queryFn` last configured it, so a `queryFn` reading the live args
    // would answer this key with another key's arguments after they change.
    const streamArgs = _args;

    return createQueryOptions({
      queryKey,
      enabled:
        connectionStatus.current === MachineConnectionEvent.CONNECTED &&
        client.current !== undefined &&
        _options?.enabled !== false &&
        enabledQueries.resourceQueries,
      queryFn: streamedQuery<StreamItemType<T[K]>>({
        streamFn: () => processStream(streamArgs),
        refetchMode,
      }),
    });
  });

  return createQuery(() => queryOptions);
};
