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

  const handleTrack = (event: unknown) => {
    const [stream] = (event as { streams: MediaStream[] }).streams;

    if (!stream || stream.id !== name) {
      return;
    }

    error = undefined;
    mediaStream = stream;
  };

  $effect(() => {
    const client = streamClient;
    client?.on('track', handleTrack);
    return () => client?.off('track', handleTrack);
  });

  $effect(() => {
    const client = streamClient;

    try {
      client?.getStream(name);
      error = undefined;
    } catch (nextError) {
      error = nextError as Error;
      client?.remove(name);
      client?.getStream(name);
    }

    return () => client?.remove(name);
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
      refetchOnWindowFocus: false,
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
