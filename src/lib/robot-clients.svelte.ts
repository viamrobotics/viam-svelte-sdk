import {
  type Client,
  createRobotClient,
  type DialConf,
  MachineConnectionEvent,
} from '@viamrobotics/sdk';
import isEqual from 'lodash/isEqual';
import { getContext, setContext } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import type { PartID } from './part';
import { comparePartIds } from './compare';

const key = Symbol('clients-context');
const dialKey = Symbol('dial-configs-context');

type ClientCallback = (partID: PartID, client: Client) => void;

interface Context {
  current: Record<PartID, Client | undefined>;
  connectionStatus: Record<PartID, MachineConnectionEvent>;
  on: (name: 'add' | 'remove', callback: ClientCallback) => void;
  off: (name: 'add' | 'remove', callback: ClientCallback) => void;
}

interface DialConfigsContext {
  current: Record<PartID, DialConf>;
}

export const provideRobotClientsContext = (dialConfigs: () => Record<PartID, DialConf>) => {
  const queryClient = useQueryClient();
  const clients = $state<Record<PartID, Client | undefined>>({});
  const connectionStatus = $state<Record<PartID, MachineConnectionEvent>>({});
  const addCallbacks = new Set<ClientCallback>();
  const removeCallbacks = new Set<ClientCallback>();

  let lastConfigs: Record<PartID, DialConf | undefined> = {};

  const onConnectionStateChange = (partID: PartID, event: unknown) => {
    connectionStatus[partID] = (event as { eventType: MachineConnectionEvent }).eventType;
  };

  $effect.pre(() => {
    const configs = dialConfigs();

    const disconnect = async (partID: PartID, config?: DialConf) => {
      // If currently making the initial connection, abort it.
      if (config?.reconnectAbortSignal !== undefined) {
        config.reconnectAbortSignal.abort = true;
      }

      const client = clients[partID];

      if (!client) {
        return;
      }

      connectionStatus[partID] = MachineConnectionEvent.DISCONNECTING;

      // client.off('connectionstatechange', onConnectionStateChange);
      await Promise.all([
        client?.disconnect(),
        queryClient.cancelQueries({ queryKey: ['part', partID] }),
      ]);

      removeCallbacks.forEach((callback) => callback(partID, client));

      clients[partID] = undefined;
      connectionStatus[partID] = MachineConnectionEvent.DISCONNECTED;
    };

    const connect = async (partID: PartID, config: DialConf) => {
      connectionStatus[partID] ??= MachineConnectionEvent.DISCONNECTED;

      try {
        await disconnect(partID, config);

        connectionStatus[partID] = MachineConnectionEvent.CONNECTING;

        // Reset the abort signal if it exists
        if (config.reconnectAbortSignal !== undefined) {
          config.reconnectAbortSignal = {
            abort: false,
          };
        }

        const client = await createRobotClient(config);
        client.on('connectionstatechange', (event) => onConnectionStateChange(partID, event));

        clients[partID] = client;
        addCallbacks.forEach((callback) => callback(partID, client));
        connectionStatus[partID] = MachineConnectionEvent.CONNECTED;
      } catch (error) {
        console.error(error);
        connectionStatus[partID] = MachineConnectionEvent.DISCONNECTED;
      }
    };

    const { added, removed, unchanged } = comparePartIds(
      Object.keys(configs),
      Object.keys(lastConfigs)
    );

    for (const partID of added) {
      connect(partID, configs[partID]);
    }

    for (const partID of removed) {
      disconnect(partID, lastConfigs[partID]);
    }

    for (const partID of unchanged) {
      if (!isEqual(lastConfigs[partID], configs[partID])) {
        connect(partID, configs[partID]);
      }
    }

    lastConfigs = configs;

    return () => {
      for (const partID of Object.keys(configs)) {
        clients[partID]?.disconnect();
      }
    };
  });

  setContext<Context>(key, {
    get current() {
      return clients;
    },
    get connectionStatus() {
      return connectionStatus;
    },
    on(name, callback) {
      if (name === 'add') {
        addCallbacks.add(callback);
      } else if (name === 'remove') {
        removeCallbacks.add(callback);
      }
    },
    off(name, callback) {
      if (name === 'add') {
        addCallbacks.delete(callback);
      } else if (name === 'remove') {
        removeCallbacks.delete(callback);
      }
    },
  });

  setContext<DialConfigsContext>(dialKey, {
    get current() {
      return dialConfigs();
    },
  });
};

export const useRobotClients = () => {
  return getContext<Context>(key);
};

export const useDialConfigs = () => {
  return getContext<Context>(dialKey);
};

export const useConnectionStatus = (partID: () => PartID) => {
  const context = getContext<Context>(key);
  const status = $derived(context.connectionStatus[partID()]);
  return {
    get current() {
      return status;
    },
  };
};

export const useRobotClient = (partID: () => PartID) => {
  const context = getContext<Context>(key);
  const client = $derived(context.current[partID()]);
  return {
    get current() {
      return client;
    },
  };
};
