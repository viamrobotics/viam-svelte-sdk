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
  const reconnectTimers = new Map<PartID, ReturnType<typeof setInterval>>();
  const connectingParts = new Set<PartID>();

  const disconnect = async (partID: PartID) => {
    clearInterval(reconnectTimers.get(partID));
    reconnectTimers.delete(partID);

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

    if (connectingParts.has(partID)) {
      logger.withMetadata({ partID }).info('connect already in progress, skipping');
      return;
    }
    connectingParts.add(partID);
    connectionStatus[partID] = MachineConnectionEvent.CONNECTING;
    logger.withMetadata({ partID }).info('connecting');

    try {
      await disconnect(partID);

      config.reconnectMaxAttempts ??= 1e9;
      config.reconnectMaxWait ??= 1000;

      const client = new RobotClient();
      (client as RobotClient & { partID: string }).partID = partID;

      clients[partID] = client;

      client.on('connectionstatechange', async (event) => {
        const newStatus = (event as { eventType: MachineConnectionEvent })
          .eventType;
        connectionStatus[partID] = newStatus;

        logger
          .withMetadata({ partID, status: newStatus })
          .info('connection state changed');

        if (connectionStatus[partID] === MachineConnectionEvent.CONNECTED) {
          if (reconnectTimers.has(partID)) {
            logger.withMetadata({ partID }).info('reconnect timer cleared, client recovered');
          }
          clearInterval(reconnectTimers.get(partID));
          reconnectTimers.delete(partID);
        }

        if (connectionStatus[partID] === MachineConnectionEvent.DISCONNECTED) {
          if (!reconnectTimers.has(partID) && !connectingParts.has(partID)) {
            logger.withMetadata({ partID }).info('starting reconnect timer');
            const timer = setInterval(() => {
              const currentConfig = dialConfigs()[partID];
              if (!currentConfig) {
                logger.withMetadata({ partID }).info('reconnect timer stopped, part removed from config');
                clearInterval(timer);
                reconnectTimers.delete(partID);
                return;
              }
              logger.withMetadata({ partID }).info('reconnect timer fired, retrying');
              connect(partID, currentConfig);
            }, 2000);
            reconnectTimers.set(partID, timer);
          }

          await queryClient.cancelQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });

          await queryClient.resetQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });
        }
      });

      await client.dial(config);
      errors[partID] = undefined;

      clearInterval(reconnectTimers.get(partID));
      reconnectTimers.delete(partID);

      connectionStatus[partID] = MachineConnectionEvent.CONNECTED;
      logger.withMetadata({ partID }).info('connected');
    } catch (error) {
      errors[partID] = error as Error;
      connectionStatus[partID] = MachineConnectionEvent.DISCONNECTED;
      logger
        .withMetadata({ partID })
        .withError(error)
        .error('connection failed');
    } finally {
      connectingParts.delete(partID);
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
      for (const partID of Object.keys(dialConfigs())) {
        clients[partID]?.disconnect();
      }
      for (const [, timer] of reconnectTimers) {
        clearInterval(timer);
      }
      reconnectTimers.clear();
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
