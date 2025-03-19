import { createMutation, type MutationOptions } from '@tanstack/svelte-query';
import type { RobotClient } from '@viamrobotics/sdk';

import type {
  ArgumentsType,
  ResolvedReturnType,
} from './create-resource-query.svelte';
import { fromStore, toStore } from 'svelte/store';

export const createRobotMutation = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined },
  method: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const mutationOptions = $derived({
    mutationKey: [
      'RobotClient',
      (client.current as T & { uuid: string })?.uuid,
      String(method),
    ],
    mutationFn: async (request) => {
      const clientFunc = client.current?.[method];

      if (typeof clientFunc !== 'function') {
        throw new TypeError(
          `${String(method)} is not a method on the resource client.`
        );
      }

      return clientFunc.apply(client.current, request) as Promise<MutReturn>;
    },
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return fromStore(createMutation(toStore(() => mutationOptions)));
};
