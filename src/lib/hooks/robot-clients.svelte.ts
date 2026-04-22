import {
  type Client,
  type DialConf,
  MachineConnectionEvent,
  RobotClient,
} from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import type { PartID } from '../part';
import { logger } from '$lib/logger';
import { untrack } from 'svelte';

const robotConnectionsKey = Symbol('robot-connections-context');
const clientKey = Symbol('clients-context');
const connectionKey = Symbol('connection-status-context');
const dialKey = Symbol('dial-configs-context');


/**
 * @deprecated This context is deprecated and may be removed in a future release.
 */
interface ClientContext {
  current: Record<PartID, Client | undefined>;
  errors: Record<PartID, Error | undefined>;
}

/**
 * @deprecated This context is deprecated and may be removed in a future release.
 */
interface ConnectionStatusContext {
  current: Record<PartID, MachineConnectionEvent>;
}

/**
 * @deprecated This context is deprecated and may be removed in a future release.
 */
interface DialConfigsContext {
  current: Record<PartID, DialConf>;
}

type RobotConnection = {
  client: Client | undefined;
  connectionStatus: MachineConnectionEvent;
  dialConfig: DialConf;
};

interface RobotConnectionsContext {
  current: Record<PartID, RobotConnection | undefined>;
  errors: Record<PartID, Error | undefined>;
  connect: (partID: PartID, config: DialConf) => Promise<void>;
  disconnect: (partID: PartID) => Promise<void>;
}

interface RobotConnectionContext {
  current: RobotClient | undefined;
  error: Error | undefined;
  connectionStatus: MachineConnectionEvent;
  disconnect: () => Promise<void>;
  connect: (config: DialConf) => Promise<void>;
}

/**
 * @deprecated `dialConfigs` is deprecated and may be removed in a future release. Users can now explicilty connect and disconnect from robots using the `useRobotClient` and `useRobotClients` hooks.
 */
export const provideRobotClientsContext = (
  dialConfigs?: () => Record<PartID, DialConf>
) => {
  const queryClient = useQueryClient();
  const robotClients = $state<Record<PartID, RobotConnection | undefined>>({});
  const errors = $state<Record<PartID, Error | undefined>>({});

  const disconnect = async (partID: PartID) => {
    if (!robotClients[partID]) {
      return;
    }

    logger.withMetadata({ partID }).info('disconnecting');
    robotClients[partID].connectionStatus =
      MachineConnectionEvent.DISCONNECTING;

    await Promise.all([
      robotClients[partID].client?.disconnect(),
      queryClient.cancelQueries({
        queryKey: ['viam-svelte-sdk', 'partID', partID],
      }),
    ]);

    robotClients[partID].client?.listeners['connectionstatechange']?.clear();

    robotClients[partID].client = undefined;
    robotClients[partID].connectionStatus = MachineConnectionEvent.DISCONNECTED;
    logger.withMetadata({ partID }).info('disconnected');
  };

  const connect = async (partID: PartID, config: DialConf) => {
    try {
      await disconnect(partID);
      const client = new RobotClient();
      (client as RobotClient & { partID: string }).partID = partID;

      logger.withMetadata({ partID }).info('connecting');
      const robotClient: RobotConnection = {
        client,
        connectionStatus: MachineConnectionEvent.CONNECTING,
        dialConfig: config,
      };
      robotClients[partID] = robotClient;

      client.on('connectionstatechange', async (event) => {
        if (!robotClients[partID]) {
          return;
        }
        const newStatus = (event as { eventType: MachineConnectionEvent })
          .eventType;
        robotClients[partID].connectionStatus = newStatus;

        logger
          .withMetadata({ partID, status: newStatus })
          .info('connection state changed');

        if (
          robotClients[partID].connectionStatus ===
          MachineConnectionEvent.DISCONNECTED
        ) {
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

      robotClients[partID].connectionStatus = MachineConnectionEvent.CONNECTED;
      logger.withMetadata({ partID }).info('connected');
    } catch (error) {
      logger
        .withMetadata({ partID })
        .withError(error)
        .error('connection failed');
      errors[partID] = error as Error;

      if (!robotClients[partID]) {
        return;
      }
      robotClients[partID].connectionStatus =
        MachineConnectionEvent.DISCONNECTED;
    }
  };

  $effect(() => {
    const configs = dialConfigs?.();
    if (!configs) {
      return;
    }

    untrack(() => {
      for (const [partID, config] of Object.entries(configs)) {
        connect(partID, config);
      }
    });

    return () => {
      for (const partID of Object.keys(configs)) {
        disconnect(partID);
      }
    };
  });

  setContext<ClientContext>(clientKey, {
    get current() {
      return Object.fromEntries(Object.entries(robotClients)
        .map(([partID, robotConnection]) => [partID, robotConnection?.client]));
    },
    get errors() {
      return Object.fromEntries(Object.entries(robotClients)
        .map(([partID]) => [partID, errors[partID]]));
    },
  });
  setContext<ConnectionStatusContext>(connectionKey, {
    get current() {
      return Object.fromEntries(Object.entries(robotClients)
        .map(([partID, robotConnection]) => [partID, robotConnection?.connectionStatus ?? MachineConnectionEvent.DISCONNECTED]));
    },
  });
  setContext<DialConfigsContext>(dialKey, {
    get current() {
      return dialConfigs?.() ?? {};
    },
  });
  setContext<RobotConnectionsContext>(robotConnectionsKey, {
    get current() {
      return robotClients;
    },
    get errors() {
      return errors;
    },
    connect,
    disconnect,
  });
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

export const useRobotConnection = (partID: () => PartID): RobotConnectionContext => {
  const context = getContext<RobotConnectionsContext>(robotConnectionsKey);
  const client = $derived(context.current[partID()]?.client);
  const error = $derived(context.errors[partID()]);
  return {
    get current() {
      return client;
    },
    get error() {
      return error;
    },
    get connectionStatus() {
      return (
        context.current[partID()]?.connectionStatus ??
        MachineConnectionEvent.DISCONNECTED
      );
    },
    disconnect: () => context.disconnect(partID()),
    connect: (config: DialConf) => context.connect(partID(), config),
  };
};
