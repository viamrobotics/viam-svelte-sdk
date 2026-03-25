import { untrack } from 'svelte';
import { streamApi, StreamClient } from '@viamrobotics/sdk';
import { useRobotClient } from './robot-clients.svelte';
import {
  createMutation,
  createQuery,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';

export const createStreamClient = (
  partID: () => string,
  resourceName: () => string
) => {
  const name = $derived(resourceName());
  const enabledQueries = useEnabledQueries();

  let mediaStream = $state.raw<MediaStream | null>(null);
  let error = $state.raw<Error>();

  const client = useRobotClient(partID);
  const streamClient = $derived(
    client.current ? new StreamClient(client.current) : undefined
  );

  $effect(() => {
    const abortController = new AbortController();
    const currentClient = streamClient;

    const attemptGetStream = async () => {
      try {
        const stream = await currentClient?.getStream(name);

        if (!abortController.signal.aborted) {
          mediaStream = stream ?? null;
          error = undefined;
        }
      } catch (nextError) {
        error = nextError as Error;

        // Retry if a timeout occurs
        attemptGetStream();
      }
    };

    attemptGetStream();

    return () => {
      abortController.abort();
    };
  });

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-sdk',
        'partID',
        partID(),
        'resource',
        name,
        'stream',
        'getOptions',
      ],
      enabled: streamClient !== undefined && enabledQueries.streams,
      retry: false,

      /**
       * Resolution options are fairly static,
       * so we don't refetch often.
       */
      refetchOnWindowFocus: false,
      refetchOnMount: false,

      queryFn: async () => {
        const logger = createQueryLogger(name, 'getOptions');
        logger.request(undefined);

        try {
          const response = await streamClient?.getOptions(name);
          logger.response(response);
          return response;
        } catch (error) {
          logger.error(error);
          throw error;
        }
      },
    })
  );
  const query = createQuery(() => queryOptions);
  const resolutions = $derived(query.data);

  const mutationOptions = $derived({
    mutationKey: [
      'viam-svelte-sdk',
      'partID',
      partID(),
      'resource',
      name,
      'stream',
      'setOptions',
    ],
    mutationFn: async (resolution?: streamApi.Resolution) => {
      if (resolution) {
        const logger = createQueryLogger(name, 'setOptions');
        logger.request(resolution);

        try {
          const response = await streamClient?.setOptions(
            name,
            resolution.width,
            resolution.height
          );
          logger.response(response);
          return response;
        } catch (error) {
          logger.error(error);
          throw error;
        }
      } else {
        const logger = createQueryLogger(name, 'resetOptions');
        logger.request(undefined);

        try {
          const response = await streamClient?.resetOptions(name);
          logger.response(response);
          return response;
        } catch (error) {
          logger.error(error);
          throw error;
        }
      }
    },
  });
  const mutation = createMutation(() => mutationOptions);

  return {
    get current() {
      return streamClient;
    },
    get error() {
      return error;
    },
    get mediaStream() {
      return mediaStream;
    },
    get resolutions() {
      return resolutions;
    },
    setResolution(resolution?: streamApi.Resolution) {
      return untrack(() => mutation.mutate(resolution));
    },
  };
};
