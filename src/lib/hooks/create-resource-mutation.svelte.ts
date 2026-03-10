import { createMutation, type MutationOptions, type QueryOptions, useQueryClient } from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';

import type {
  ArgumentsType,
  ResolvedReturnType,
} from './create-resource-query.svelte';
import { useQueryLogger } from '$lib/query-logger';

export const createResourceMutation = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  queryKey?: (string | QueryOptions | ArgumentsType<T[K]> | undefined)[]
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const debug = useQueryLogger();
  const queryClient = useQueryClient();
  const name = $derived(client.current?.name);
  const methodName = $derived(String(method));

  const mutationOptions = $derived({
    mutationKey: [
      'viam-svelte-sdk',
      'partID',
      (client.current as T & { partID: string })?.partID,
      'resource',
      name,
      methodName,
    ],
    mutationFn: async (request) => {
      const clientFunc = client.current?.[method];

      if (typeof clientFunc !== 'function') {
        throw new TypeError(
          `${String(method)} is not a method on the resource client.`
        );
      }

      const logger = debug.createLogger();
      logger('REQ', name, methodName, request);

      try {
        const response = (await clientFunc.apply(
          client.current,
          request
        )) as Promise<MutReturn>;

        logger('RES', name, methodName, response);
        return response;
      } catch (error) {
        logger('ERR', name, methodName, error);
        throw error;
      }
    },
    onMutate: async (request) => {
      if (!queryKey) {
        return;
      }

      
      await queryClient.cancelQueries({ queryKey });
      const previousData = await queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, request);

      return { previousData };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_error: unknown, _request: unknown, context: any) => {
      if (context?.previousData && queryKey) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      if (!queryKey) {
        return;
      }

      queryClient.invalidateQueries({ queryKey });
    }
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return createMutation(() => mutationOptions);
};
