import { createMutation, type MutationOptions } from '@tanstack/svelte-query';
import type { RobotClient } from '@viamrobotics/sdk';

import type {
  ArgumentsType,
  ResolvedReturnType,
} from './create-resource-query.svelte';
import { fromStore, toStore } from 'svelte/store';
import { debugLogQuery } from '$lib/debug';

export const createRobotMutation = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined },
  method: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const methodName = $derived(String(method));

  let index = 0;

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

      debugLogQuery(index, 'REQ', 'robot', methodName, request);

      try {
        const result = (await clientFunc.apply(
          client.current,
          request
        )) as Promise<MutReturn>;
        debugLogQuery(index++, 'RES', 'robot', methodName, result);

        return result;
      } catch (error) {
        debugLogQuery(index++, 'ERR', 'robot', methodName, error);

        throw error;
      }
    },
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return fromStore(createMutation(toStore(() => mutationOptions)));
};
