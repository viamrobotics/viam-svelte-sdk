import {
  createMutation,
  type MutationOptions,
  type QueryKey,
  useQueryClient,
} from '@tanstack/svelte-query';
import type { Resource } from '@viamrobotics/sdk';

import type {
  ArgumentsType,
  ResolvedReturnType,
} from './create-resource-query.svelte';
import { createQueryLogger } from '$lib/logger';

export const createResourceMutation = <T extends Resource, K extends keyof T>(
  client: { current: T | undefined },
  method: K,
  queryKey?: () => QueryKey
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const queryClient = useQueryClient();
  const name = $derived(client.current?.name);
  const methodName = $derived(String(method));
  const key = $derived(queryKey?.());
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

      const logger = createQueryLogger(name ?? 'unknown', methodName);
      logger.request(request);

      try {
        const response = (await clientFunc.apply(
          client.current,
          request
        )) as Promise<MutReturn>;

        logger.response(response);
        return response;
      } catch (error) {
        logger.error(error);
        throw error;
      }
    },
    onMutate: async (request) => {
      if (!key) {
        return;
      }

      await queryClient.cancelQueries({ queryKey: key });
      const previousData = await queryClient.getQueryData(key);

      queryClient.setQueryData(key, request[0]);

      return { previousData };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_error: Error, _request: unknown, context: any) => {
      if (context?.previousData && key) {
        queryClient.setQueryData(key, context.previousData);
      }
    },
    onSettled: () => {
      if (!key) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: key });
    },
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return createMutation(() => mutationOptions);
};
