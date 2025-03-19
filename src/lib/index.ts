// Reexport your entry components here
export { default as ViamProvider } from './components/provider.svelte';

export {
  useConnectionStatus,
  useRobotClient,
} from './hooks/robot-clients.svelte';

export { createRobotQuery } from './hooks/create-robot-query.svelte';
export { createResourceClient } from './hooks/create-resource-client.svelte';
export { createResourceQuery } from './hooks/create-resource-query.svelte';

export { useResourceNames } from './hooks/resource-names.svelte';
