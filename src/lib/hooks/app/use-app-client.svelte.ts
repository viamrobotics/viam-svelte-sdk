import {
  createViamClient,
  type Credentials,
  type ViamClient,
} from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';

const key = Symbol('viam-app-context');

interface Context {
  current: ViamClient | undefined;
  connectionError: Error | undefined;
}

export interface ViamAppClientOptions {
  serviceHost: string;
  credentials: Credentials;
}

export const provideViamClient = (
  viamClientOptions: () => ViamAppClientOptions | undefined
) => {
  let client = $state.raw<ViamClient>();
  let connectionError = $state.raw<Error>();

  const connect = async (args: ViamAppClientOptions) => {
    try {
      client = await createViamClient(args);
    } catch (error) {
      console.error(error);
      connectionError = error as Error;
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

export const useViamClient = (): {
  current: ViamClient | undefined;
} => {
  return getContext<Context>(key);
};
