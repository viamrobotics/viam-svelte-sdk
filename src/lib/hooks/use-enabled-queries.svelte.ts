import { getContext, setContext } from 'svelte';

const key = Symbol('enabled-queries-context');

export const provideEnabledQueriesContext = () => {
  let machineStatus = $state(true);
  let resourceNames = $state(true);
  let resourceQueries = $state(true);
  let robotQueries = $state(true);
  let streams = $state(true);

  const enableResourceQueries = () => (resourceQueries = true);
  const disableResourceQueries = () => (resourceQueries = false);

  const enableMachineStatus = () => (machineStatus = true);
  const disableMachineStatus = () => (machineStatus = false);

  const enableResourceNames = () => (resourceNames = true);
  const disableResourceNames = () => (resourceNames = false);

  const enableRobotQueries = () => (robotQueries = true);
  const disableRobotQueries = () => (robotQueries = false);

  const enableStreams = () => (streams = true);
  const disableStreams = () => (streams = false);

  return setContext(key, {
    get resourceQueries() {
      return resourceQueries;
    },
    get machineStatus() {
      return machineStatus;
    },
    get resourceNames() {
      return resourceNames;
    },
    get robotQueries() {
      return robotQueries;
    },
    get streams() {
      return streams;
    },

    enableResourceQueries,
    disableResourceQueries,
    enableMachineStatus,
    disableMachineStatus,
    enableResourceNames,
    disableResourceNames,
    enableRobotQueries,
    disableRobotQueries,
    enableStreams,
    disableStreams,
  });
};

export const useEnabledQueries = () => {
  const context =
    getContext<ReturnType<typeof provideEnabledQueriesContext>>(key);
  if (!context) {
    throw new Error('EnabledQueriesContext not found');
  }
  return context;
};
