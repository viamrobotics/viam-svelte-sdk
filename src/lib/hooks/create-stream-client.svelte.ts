import { untrack } from 'svelte';
import { streamApi, StreamClient } from '@viamrobotics/sdk';
import { useRobotClient } from './robot-clients.svelte';
import {
  createMutation,
  createQuery,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import { fromStore, toStore } from 'svelte/store';

export const createStreamClient = (
  partID: () => string,
  resourceName: () => string
) => {
  let mediaStream = $state.raw<MediaStream | null>(null);

  const client = useRobotClient(partID);
  const streamClient = $derived(
    client.current ? new StreamClient(client.current) : undefined
  );

  const handleTrack = (event: unknown) => {
    const [stream] = (event as { streams: MediaStream[] }).streams;

    if (!stream || stream.id !== resourceName()) {
      return;
    }

    mediaStream = stream;
  };

  $effect(() => {
    const client = streamClient;
    client?.on('track', handleTrack);
    return () => client?.off('track', handleTrack);
  });

  $effect(() => {
    const name = resourceName();
    const client = streamClient;
    client?.getStream(name);
    return () => client?.remove(name);
  });

  const queryOptions = $derived(
    createQueryOptions({
      queryKey: [
        'viam-svelte-sdk',
        'partID',
        partID(),
        'resource',
        resourceName(),
        'stream',
        'getOptions',
      ],
      enabled: streamClient !== undefined,
      retry: false,
      refetchOnWindowFocus: false,
      queryFn: async () => {
        return streamClient?.getOptions(resourceName());
      },
    })
  );
  const query = fromStore(createQuery(toStore(() => queryOptions)));
  const resolutions = $derived(query.current.data);

  const mutationOptions = $derived({
    mutationKey: [
      'viam-svelte-sdk',
      'partID',
      partID(),
      'resource',
      resourceName(),
      'stream',
      'setOptions',
    ],
    mutationFn: async (resolution?: streamApi.Resolution) => {
      if (resolution) {
        return streamClient?.setOptions(
          resourceName(),
          resolution.width,
          resolution.height
        );
      }

      return streamClient?.resetOptions(resourceName());
    },
  });
  const mutation = fromStore(createMutation(toStore(() => mutationOptions)));

  return {
    get current() {
      return streamClient;
    },
    get mediaStream() {
      return mediaStream;
    },
    get resolutions() {
      return resolutions;
    },
    setResolution(resolution?: streamApi.Resolution) {
      return untrack(() => mutation.current).mutate(resolution);
    },
  };
};
