import { createMutation, type MutationOptions } from '@tanstack/svelte-query';
import type { DataClient } from '@viamrobotics/sdk';

import type { ArgumentsType, ResolvedReturnType } from './types';
import { fromStore, toStore } from 'svelte/store';
import { useQueryLogger } from '$lib/query-logger';
import { useViamClient } from './use-app-client.svelte';

export const createDataMutation = <T extends DataClient, K extends keyof T>(
  method: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const viamClient = useViamClient();
  const dataClient = $derived(viamClient.current?.dataClient as T);
  const debug = useQueryLogger();

  const methodName = $derived(String(method));

  const mutationOptions = $derived({
    mutationKey: ['viam-svelte-app-sdk', 'dataClient', methodName],
    mutationFn: async (request) => {
      const clientFunc = dataClient?.[method];

      if (typeof clientFunc !== 'function') {
        throw new TypeError(
          `${String(method)} is not a method on the resource client.`
        );
      }

      const logger = debug.createLogger();
      logger('REQ', 'dataClient', methodName, request);

      try {
        const response = (await clientFunc.apply(
          dataClient,
          request
        )) as Promise<MutReturn>;

        logger('RES', 'dataClient', methodName, response);
        return response;
      } catch (error) {
        logger('ERR', 'dataClient', methodName, error);
        throw error;
      }
    },
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return fromStore(createMutation(toStore(() => mutationOptions)));
};
