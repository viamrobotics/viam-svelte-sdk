import { createMutation, type MutationOptions } from '@tanstack/svelte-query';
import type { AppClient } from '@viamrobotics/sdk';

import type { ArgumentsType, ResolvedReturnType } from './types';
import { useQueryLogger } from '$lib/query-logger';
import { useViamClient } from './use-app-client.svelte';

export const createAppMutation = <T extends AppClient, K extends keyof T>(
  method: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const viamClient = useViamClient();
  const appClient = $derived(viamClient.current?.appClient as T);
  const debug = useQueryLogger();

  const methodName = $derived(String(method));

  const mutationOptions = $derived({
    mutationKey: ['viam-svelte-app-sdk', 'appClient', methodName],
    mutationFn: async (request) => {
      const clientFunc = appClient?.[method];

      if (typeof clientFunc !== 'function') {
        throw new TypeError(
          `${String(method)} is not a method on the resource client.`
        );
      }

      const logger = debug.createLogger();
      logger('REQ', 'appClient', methodName, request);

      try {
        const response = (await clientFunc.apply(
          appClient,
          request
        )) as Promise<MutReturn>;

        logger('RES', 'appClient', methodName, response);
        return response;
      } catch (error) {
        logger('ERR', 'appClient', methodName, error);
        throw error;
      }
    },
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return createMutation(() => mutationOptions);
};
