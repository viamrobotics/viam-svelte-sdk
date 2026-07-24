import { untrack } from 'svelte';
import {
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

// Shared cache of active stream subscriptions per (robot client, camera name).
// Multiple UI components subscribing to the same camera share the underlying
// MediaStream instead of each opening a fresh WebRTC subscription — which
// previously hit the server's "stream already active" error and hung the
// second subscriber indefinitely.
type SharedStreamEntry = {
  streamClient: StreamClient;
  robotClient: unknown; // used to detect reconnect and invalidate the entry
  mediaStream: MediaStream | null;
  error: Error | undefined;
  refCount: number;
  listeners: Set<() => void>;
};

const sharedStreams = new Map<string, SharedStreamEntry>();

const STREAM_RETRY_ATTEMPTS = 3;
const STREAM_RETRY_BASE_DELAY_MS = 250;

const notifyListeners = (entry: SharedStreamEntry) => {
  for (const listener of entry.listeners) {
    listener();
  }
};

const fetchStreamWithBoundedRetry = async (
  streamClient: StreamClient,
  name: string
): Promise<MediaStream> => {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < STREAM_RETRY_ATTEMPTS; attempt++) {
    try {
      return await streamClient.getStream(name);
    } catch (err) {
      lastError = err as Error;
      // Only retry timeouts; other errors are unlikely to succeed on retry.
      if (!/Did not receive a stream/.test(lastError.message)) {
        throw lastError;
      }
      if (attempt < STREAM_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, STREAM_RETRY_BASE_DELAY_MS * 2 ** attempt)
        );
      }
    }
  }
  throw lastError ?? new Error('Failed to acquire stream');
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
    const currentName = name;
    const currentPartID = partID();
    const currentRobotClient = client.current;
    const currentConnected =
      connectionStatus.current === MachineConnectionEvent.CONNECTED;

    if (!currentConnected || !currentRobotClient) {
      return;
    }

    const key = `${currentPartID}:${currentName}`;
    let entry = sharedStreams.get(key);

    // If the underlying robot client changed (e.g. reconnect), the cached
    // subscription is stale — invalidate and recreate.
    if (entry && entry.robotClient !== currentRobotClient) {
      sharedStreams.delete(key);
      entry = undefined;
    }

    if (!entry) {
      const sc = new StreamClient(currentRobotClient);
      const newEntry: SharedStreamEntry = {
        streamClient: sc,
        robotClient: currentRobotClient,
        mediaStream: null,
        error: undefined,
        refCount: 0,
        listeners: new Set(),
      };
      sharedStreams.set(key, newEntry);
      entry = newEntry;

      void fetchStreamWithBoundedRetry(sc, currentName).then(
        (stream) => {
          // Guard against races: entry may have been invalidated meanwhile.
          if (sharedStreams.get(key) === newEntry) {
            newEntry.mediaStream = stream;
            notifyListeners(newEntry);
          }
        },
        (err) => {
          if (sharedStreams.get(key) === newEntry) {
            newEntry.error = err as Error;
            notifyListeners(newEntry);
          }
        }
      );
    }

    entry.refCount += 1;

    const listener = () => {
      mediaStream = entry!.mediaStream;
      error = entry!.error;
    };
    // Publish current state immediately for late subscribers.
    listener();
    entry.listeners.add(listener);

    return () => {
      entry!.listeners.delete(listener);
      entry!.refCount -= 1;
      if (entry!.refCount === 0 && sharedStreams.get(key) === entry) {
        sharedStreams.delete(key);
        // Server-side remove so a later remount can re-add cleanly.
        void entry!.streamClient.remove(currentName).catch(() => {});
      }
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
