import {
  type Client,
  type DialConf,
  MachineConnectionEvent,
  RobotClient,
} from '@viamrobotics/sdk';
import { getContext, onMount, setContext } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import type { PartID } from '../part';
import { comparePartIds, isJsonEqual } from '../compare';
import { logger } from '$lib/logger';

const RECONNECT_DELAY_MS = 500;

const clientKey = Symbol('clients-context');
const connectionKey = Symbol('connection-status-context');
const dialKey = Symbol('dial-configs-context');

interface ClientContext {
  current: Record<PartID, Client | undefined>;
  errors: Record<PartID, Error | undefined>;
}

interface ConnectionStatusContext {
  current: Record<PartID, MachineConnectionEvent>;
}

interface DialConfigsContext {
  current: Record<PartID, DialConf>;
}

export const provideRobotClientsContext = (
  dialConfigs: () => Record<PartID, DialConf>
) => {
  const queryClient = useQueryClient();
  const clients = $state<Record<PartID, Client | undefined>>({});
  const errors = $state<Record<PartID, Error | undefined>>({});
  const connectionStatus = $state<Record<PartID, MachineConnectionEvent>>({});

  let lastConfigs: Record<PartID, DialConf | undefined> = {};
  const reconnectTimeouts = new Map<PartID, ReturnType<typeof setTimeout>>();
  const dialing = new Set<PartID>();

  const clearReconnect = (partID: PartID) => {
    clearTimeout(reconnectTimeouts.get(partID));
    reconnectTimeouts.delete(partID);
  };

  const disconnect = async (partID: PartID) => {
    clearReconnect(partID);
    dialing.delete(partID);
    const client = clients[partID];

    if (!client) {
      return;
    }

    logger.withMetadata({ partID }).info('disconnecting');
    connectionStatus[partID] = MachineConnectionEvent.DISCONNECTING;

    await Promise.all([
      client?.disconnect(),
      queryClient.cancelQueries({
        queryKey: ['viam-svelte-sdk', 'partID', partID],
      }),
    ]);

    client.listeners['connectionstatechange']?.clear();
    clients[partID] = undefined;
    connectionStatus[partID] = MachineConnectionEvent.DISCONNECTED;
    logger.withMetadata({ partID }).info('disconnected');
  };

  const connect = async (partID: PartID, config: DialConf) => {
    connectionStatus[partID] ??= MachineConnectionEvent.DISCONNECTED;
    const isReconnect = clients[partID] !== undefined;

    const client = new RobotClient();
    (client as RobotClient & { partID: string }).partID = partID;

    try {
      await disconnect(partID);

      config.reconnectMaxAttempts ??= 1e9;
      config.reconnectMaxWait ??= 1000;

      clients[partID] = client;

      client.on('connectionstatechange', async (event) => {
        const newStatus = (event as { eventType: MachineConnectionEvent })
          .eventType;
        logger
          .withMetadata({ partID, status: newStatus })
          .info('connection state changed');

        connectionStatus[partID] = newStatus;

        if (newStatus === MachineConnectionEvent.CONNECTED) {
          errors[partID] = undefined;
          clearReconnect(partID);

          if (isReconnect) {
            await queryClient.invalidateQueries({
              queryKey: ['viam-svelte-sdk', 'partID', partID],
            });
          }
        }

        if (newStatus === MachineConnectionEvent.DISCONNECTED) {
          // Skip retry if dial() is in progress — the TS SDK handles its own retries.
          // Retry continues as long as the dialConfig is present.
          if (!dialing.has(partID)) {
            const currentConfig = dialConfigs()[partID];
            if (currentConfig && !reconnectTimeouts.has(partID)) {
              const timeout = setTimeout(
                () => connect(partID, currentConfig),
                RECONNECT_DELAY_MS
              );
              reconnectTimeouts.set(partID, timeout);
            }
          }

          await queryClient.cancelQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });

          await queryClient.resetQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });
        }
      });

      dialing.add(partID);
      try {
        await client.dial(config);
      } finally {
        dialing.delete(partID);
      }

      if (clients[partID] !== client) {
        return;
      }

      errors[partID] = undefined;
      connectionStatus[partID] = MachineConnectionEvent.CONNECTED;
    } catch (error) {
      if (clients[partID] !== client) {
        return;
      }

      errors[partID] = error as Error;
      connectionStatus[partID] = MachineConnectionEvent.DISCONNECTED;
      logger
        .withMetadata({ partID })
        .withError(error)
        .error('connection failed');

      const currentConfig = dialConfigs()[partID];
      if (currentConfig) {
        clearReconnect(partID);
        const timeout = setTimeout(() => connect(partID, currentConfig), RECONNECT_DELAY_MS);
        reconnectTimeouts.set(partID, timeout);
      }
    }
  };

  $effect(() => {
    const configs = dialConfigs();

    const { added, removed, unchanged } = comparePartIds(
      Object.keys(configs),
      Object.keys(lastConfigs)
    );

    for (const partID of removed) {
      disconnect(partID);
    }

    for (const partID of added) {
      const config = configs[partID];
      if (config) {
        connect(partID, config);
      }
    }

    for (const partID of unchanged) {
      const config = configs[partID];
      const lastConfig = lastConfigs[partID];

      if (config && lastConfig && !isJsonEqual(lastConfig, config)) {
        logger
          .withMetadata({ partID })
          .info('dial config changed, reconnecting');
        connect(partID, config);
      }
    }

    lastConfigs = $state.snapshot(configs);
  });

  onMount(() => {
    return () => {
      for (const partID of reconnectTimeouts.keys()) {
        clearReconnect(partID);
      }
      for (const partID of Object.keys(dialConfigs())) {
        clients[partID]?.disconnect();
      }
    };
  });

  setContext<ClientContext>(clientKey, {
    get current() {
      return clients;
    },
    get errors() {
      return errors;
    },
  });

  setContext<ConnectionStatusContext>(connectionKey, {
    get current() {
      return connectionStatus;
    },
  });

  setContext<DialConfigsContext>(dialKey, {
    get current() {
      return dialConfigs();
    },
  });
};

export const useRobotClients = (): ClientContext => {
  return getContext<ClientContext>(clientKey);
};

export const useDialConfigs = (): DialConfigsContext => {
  return getContext<DialConfigsContext>(dialKey);
};

export const useConnectionStatuses = () => {
  return getContext<ConnectionStatusContext>(connectionKey);
};

export const useConnectionStatus = (partID: () => PartID) => {
  const context = getContext<ConnectionStatusContext>(connectionKey);
  const status = $derived(context.current[partID()]);
  return {
    get current() {
      return status;
    },
  };
};

export const useRobotClient = (partID: () => PartID) => {
  const context = getContext<ClientContext>(clientKey);
  const client = $derived(context.current[partID()]);
  return {
    get current() {
      return client;
    },
  };
};
