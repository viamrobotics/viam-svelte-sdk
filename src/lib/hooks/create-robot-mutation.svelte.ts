import { createMutation, type MutationOptions } from '@tanstack/svelte-query';
import type { RobotClient } from '@viamrobotics/sdk';

import type {
  ArgumentsType,
  ResolvedReturnType,
} from './create-resource-query.svelte';
import { fromStore, toStore } from 'svelte/store';
import { useQueryLogger } from '$lib/query-logger';

export const createRobotMutation = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined },
  method: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const debug = useQueryLogger();

  const methodName = $derived(String(method));

  const mutationOptions = $derived({
    mutationKey: [
      'viam-svelte-sdk',
      'partID',
      (client.current as T & { partID: string })?.partID,
      'robotClient',
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
      logger('REQ', 'robot', methodName, request);

      try {
        const response = (await clientFunc.apply(
          client.current,
          request
        )) as Promise<MutReturn>;

        logger('RES', 'robot', methodName, response);
        return response;
      } catch (error) {
        logger('ERR', 'robot', methodName, error);
        throw error;
      }
    },
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return fromStore(createMutation(toStore(() => mutationOptions)));
};
