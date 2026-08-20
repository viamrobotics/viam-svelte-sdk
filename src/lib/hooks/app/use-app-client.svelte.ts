import {
  createViamClient,
  type Credentials,
  type ViamClient,
} from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { logger } from '$lib/logger';

const key = Symbol('viam-app-context');

interface Context {
  current: ViamClient | undefined;
  connectionError: Error | undefined;
}

interface ViamAppClientOptions {
  serviceHost: string;
  credentials: Credentials;
}

export const provideViamClient = (
  viamClientOptions: () => ViamAppClientOptions | undefined
) => {
  let client = $state.raw<ViamClient>();
  let connectionError = $state.raw<Error>();

  const connect = async (args: ViamAppClientOptions) => {
    logger
      .withMetadata({ serviceHost: args.serviceHost })
      .info('connecting app client');
    try {
      client = await createViamClient(args);
      logger
        .withMetadata({ serviceHost: args.serviceHost })
        .info('app client connected');
    } catch (error) {
      connectionError = error as Error;
      logger
        .withMetadata({ serviceHost: args.serviceHost })
        .withError(error)
        .error('app client connection failed');
    }
  };

  $effect(() => {
    const options = viamClientOptions();

    if (options) {
      connect(options);
    }
  });

  setContext<Context>(key, {
    get current() {
      return client;
    },
    get connectionError() {
      return connectionError;
    },
  });
};

/**
 * Returned when no `ViamAppProvider` ancestor exists, so app hooks can mount
 * without a provider and stay inert.
 */
const inertViamClient: Context = {
  current: undefined,
  connectionError: undefined,
};

export const useViamClient = (): {
  current: ViamClient | undefined;
} => {
  return getContext<Context>(key) ?? inertViamClient;
};
