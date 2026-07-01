import {
  type Client,
  type DialConf,
  MachineConnectionEvent,
  RobotClient,
} from '@viamrobotics/sdk';
import { getContext, onMount, setContext } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import type { PartID } from '../part';
import { logger } from '$lib/logger';
import { comparePartIds, isJsonEqual } from '../compare';

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

export interface RobotClientsOptions {
  resetQueriesOnDisconnect?: boolean;
}

/**
 * @deprecated `dialConfigs` is deprecated and may be removed in a future release. Users can now explicilty connect and disconnect from robots using the `useRobotClient` and `useRobotClients` hooks.
 */
export const provideRobotClientsContext = (
  dialConfigs?: () => Record<PartID, DialConf>,
  options?: () => RobotClientsOptions | undefined
) => {
  const queryClient = useQueryClient();
  const robotClients = $state<Record<PartID, RobotConnection | undefined>>({});
  const errors = $state<Record<PartID, Error | undefined>>({});
  let lastConfigs: Record<PartID, DialConf | undefined> = {};

  const { resetQueriesOnDisconnect = true } = $derived(options?.() ?? {});

  /**
   * Monotonic per-part "generation" token. Both connect() and disconnect() are
   * async and run interleaved with the SDK's own auto-reconnect, so an older
   * attempt's awaited continuation (a dial resolving, a fire-and-forget reset
   * from a DISCONNECTED event) can otherwise land after a newer attempt has
   * already moved the connection on. Claiming a generation at the start of each
   * attempt and gating every subsequent state mutation on it still being current
   * ensures a superseded attempt — or events from a client being torn down —
   * can never clobber the live connection or its query cache.
   */
  const generations: Record<PartID, number> = {};

  const nextGeneration = (partID: PartID) => {
    const result = (generations[partID] ?? 0) + 1;
    generations[partID] = result;
    return result;
  };

  const isCurrentGeneration = (partID: PartID, generation: number) =>
    generations[partID] === generation;

  const disconnect = async (partID: PartID) => {
    const connection = robotClients[partID];
    if (!connection) {
      return;
    }

    // Supersede any in-flight connect()/disconnect() for this part, and any
    // events from the client we are about to tear down.
    const generation = nextGeneration(partID);

    // Capture the client we are tearing down *before* awaiting. robotClients[partID]
    // can be reassigned to a newer client while we await (a resuming connect()),
    // and disconnecting or clearing the listener off the post-await reference would
    // wipe that newer connection's client instead of ours.
    const client = connection.client;

    logger.withMetadata({ partID }).info('disconnecting');
    connection.connectionStatus = MachineConnectionEvent.DISCONNECTING;

    await Promise.all([
      client?.disconnect(),
      queryClient.cancelQueries({
        queryKey: ['viam-svelte-sdk', 'partID', partID],
      }),
    ]);

    client?.listeners['connectionstatechange']?.clear();

    // A newer connect()/disconnect() may have superseded us while we awaited the
    // teardown — if so, leave its state untouched (do not null its client).
    if (!isCurrentGeneration(partID, generation) || !robotClients[partID]) {
      return;
    }

    robotClients[partID].client = undefined;
    robotClients[partID].connectionStatus = MachineConnectionEvent.DISCONNECTED;
    logger.withMetadata({ partID }).info('disconnected');
  };

  const connect = async (partID: PartID, config: DialConf) => {
    // Claim a generation immediately, before disconnect(), so this attempt
    // supersedes any in-flight connect()/disconnect() right away and the catch
    // below always has a real generation to check — even if disconnect() throws.
    let generation = nextGeneration(partID);
    try {
      await disconnect(partID);

      // disconnect() superseded us with its own generation while tearing the
      // prior connection down; re-claim before we start mutating state so every
      // gate below is keyed to this attempt.
      generation = nextGeneration(partID);

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
        // Ignore events from a client whose connect attempt has been superseded
        // — a stale client must not flip a healthy connection to DISCONNECTED
        // nor wipe its freshly-fetched query data.
        if (!isCurrentGeneration(partID, generation) || !robotClients[partID]) {
          return;
        }

        const newStatus = (event as { eventType: MachineConnectionEvent })
          .eventType;
        robotClients[partID].connectionStatus = newStatus;

        logger
          .withMetadata({ partID, status: newStatus })
          .info('connection state changed');

        if (
          newStatus === MachineConnectionEvent.DISCONNECTED &&
          resetQueriesOnDisconnect
        ) {
          // resetQueries() resets each matched query to its initial state, which
          // synchronously cancels any in-flight fetch (reset -> destroy ->
          // cancel({ silent: true })) — so a separate cancelQueries() is
          // redundant. The wipe also runs synchronously at the call site: there
          // is no await between the generation guard at the top of this listener
          // and this reset, so the attempt cannot be superseded (nor the
          // connection recover) in between, and no post-await re-check is needed.
          // If an await is ever introduced before this reset, restore that check.
          await queryClient.resetQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });
        }
      });

      await client.dial(config);

      // A newer connect()/disconnect() may have superseded this attempt while we
      // awaited the dial — if so, do not mark it connected.
      if (!isCurrentGeneration(partID, generation) || !robotClients[partID]) {
        return;
      }

      errors[partID] = undefined;
      robotClients[partID].connectionStatus = MachineConnectionEvent.CONNECTED;
      logger.withMetadata({ partID }).info('connected');
    } catch (error) {
      logger
        .withMetadata({ partID })
        .withError(error)
        .error('connection failed');

      // A superseded attempt's failure must not record an error or flip a newer
      // connection to DISCONNECTED. If disconnect() threw, our top-of-function
      // generation was already superseded by disconnect()'s own bump, so this
      // returns rather than clobbering whatever connection is now current.
      if (!isCurrentGeneration(partID, generation)) {
        return;
      }
      errors[partID] = error as Error;

      if (!robotClients[partID]) {
        return;
      }
      robotClients[partID].connectionStatus =
        MachineConnectionEvent.DISCONNECTED;
    }
  };

  $effect(() => {
    const configs = dialConfigs?.() ?? {};
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

    lastConfigs = $state.snapshot(configs) as typeof lastConfigs;
  });

  onMount(() => {
    return () => {
      for (const partID of Object.keys(dialConfigs?.() ?? {})) {
        disconnect(partID);
      }
    };
  });

  setContext<ClientContext>(clientKey, {
    get current() {
      return Object.fromEntries(
        Object.entries(robotClients).map(([partID, robotConnection]) => [
          partID,
          robotConnection?.client,
        ])
      );
    },
    get errors() {
      return Object.fromEntries(
        Object.entries(robotClients).map(([partID]) => [partID, errors[partID]])
      );
    },
  });
  setContext<ConnectionStatusContext>(connectionKey, {
    get current() {
      return Object.fromEntries(
        Object.entries(robotClients).map(([partID, robotConnection]) => [
          partID,
          robotConnection?.connectionStatus ??
            MachineConnectionEvent.DISCONNECTED,
        ])
      );
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

export const useRobotConnection = (
  partID: () => PartID
): RobotConnectionContext => {
  const context = getContext<RobotConnectionsContext>(robotConnectionsKey);
  const client = $derived(context.current[partID()]?.client);
  const error = $derived(context.errors[partID()]);
  const connectionStatus = $derived(
    context.current[partID()]?.connectionStatus ??
      MachineConnectionEvent.DISCONNECTED
  );
  return {
    get current() {
      return client;
    },
    get error() {
      return error;
    },
    get connectionStatus() {
      return connectionStatus;
    },
    disconnect: () => context.disconnect(partID()),
    connect: (config: DialConf) => context.connect(partID(), config),
  };
};
