import { createMutation, type MutationOptions } from '@tanstack/svelte-query';
import type { RobotClient } from '@viamrobotics/sdk';

import type { ArgumentsType, ResolvedReturnType } from './queries';
import { createQueryLogger } from '$lib/logger';
import type { PartID } from '$lib/part';

export const createRobotMutation = <T extends RobotClient, K extends keyof T>(
  client: { current: T | undefined; partID: PartID },
  method: K
) => {
  type MutArgs = ArgumentsType<T[K]>;
  type MutReturn = ResolvedReturnType<T[K]>;

  const methodName = $derived(String(method));
  // Addressed, not read off `current`: a disconnect nulls the client, and a key
  // derived from it would no longer match this mutation's own state.
  const partID = $derived(client.partID);

  const mutationOptions = $derived({
    mutationKey: [
      'viam-svelte-sdk',
      'partID',
      partID,
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

      const logger = createQueryLogger('robot', methodName);
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
  } satisfies MutationOptions<MutReturn, Error, MutArgs>);

  return createMutation(() => mutationOptions);
};
