import { untrack } from 'svelte';
import {
  type Client,
  MachineConnectionEvent,
  StreamClient,
  type streamApi,
} from '@viamrobotics/sdk';
import { useConnectionStatus, useRobotClient } from './robot-clients.svelte';
import {
  createMutation,
  createQuery,
  queryOptions as createQueryOptions,
} from '@tanstack/svelte-query';
import { createQueryLogger } from '$lib/logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';

type StreamSubscriber = (
  mediaStream: MediaStream | null,
  error: Error | undefined
) => void;

interface SharedStreamEntry {
  refCount: number;
  robotClient: Client;
  streamClient: StreamClient;
  mediaStream: MediaStream | null;
  error: Error | undefined;
  listeners: Set<StreamSubscriber>;
  fetchPromise: Promise<void> | null;
}

const sharedStreams = new Map<string, SharedStreamEntry>();

const acquireSharedStream = (
  partID: string,
  resourceName: string,
  robotClient: Client,
  subscriber: StreamSubscriber
): (() => void) => {
  const key = `${partID}:${resourceName}`;
  let entry = sharedStreams.get(key);

  // Reconnect: previous connection is dead, drop the entry without remove().
  if (entry && entry.robotClient !== robotClient) {
    sharedStreams.delete(key);
    entry = undefined;
  }

  if (!entry) {
    entry = {
      refCount: 0,
      robotClient,
      streamClient: new StreamClient(robotClient),
      mediaStream: null,
      error: undefined,
      listeners: new Set(),
      fetchPromise: null,
    };
    sharedStreams.set(key, entry);
  }

  const activeEntry = entry;
  activeEntry.refCount++;
  activeEntry.listeners.add(subscriber);

  if (activeEntry.mediaStream || activeEntry.error) {
    subscriber(activeEntry.mediaStream, activeEntry.error);
  } else if (!activeEntry.fetchPromise) {
    activeEntry.fetchPromise = (async () => {
      try {
        const stream = await activeEntry.streamClient.getStream(resourceName);
        activeEntry.mediaStream = stream ?? null;
        activeEntry.error = undefined;
      } catch (nextError) {
        activeEntry.mediaStream = null;
        activeEntry.error = nextError as Error;
      }
      for (const listener of activeEntry.listeners) {
        listener(activeEntry.mediaStream, activeEntry.error);
      }
    })();
  }

  return () => {
    activeEntry.listeners.delete(subscriber);
    activeEntry.refCount--;
    if (activeEntry.refCount === 0) {
      if (sharedStreams.get(key) === activeEntry) {
        sharedStreams.delete(key);
      }
      void activeEntry.streamClient.remove(resourceName).catch(() => {});
    }
  };
};

export const createStreamClient = (
  partID: () => string,
  resourceName: () => string
) => {
  const name = $derived(resourceName());
  const enabledQueries = useEnabledQueries();

  let mediaStream = $state.raw<MediaStream | null>(null);
  let error = $state.raw<Error>();

  const client = useRobotClient(partID);
  const connectionStatus = useConnectionStatus(partID);
  const streamClient = $derived(
    connectionStatus.current === MachineConnectionEvent.CONNECTED &&
      client.current
      ? new StreamClient(client.current)
      : undefined
  );

  $effect(() => {
    const currentClient = client.current;
    const currentName = name;
    const currentPartID = partID();

    if (
      connectionStatus.current !== MachineConnectionEvent.CONNECTED ||
      !currentClient
    ) {
      return;
    }

    return acquireSharedStream(
      currentPartID,
      currentName,
      currentClient,
      (nextStream, nextError) => {
        mediaStream = nextStream;
        error = nextError;
      }
    );
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
