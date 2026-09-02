import type { ResourceStatus } from './machine-status.svelte';

/**
 * viam-server's own plumbing, such as the cloud and web services. rdk excludes
 * this namespace wherever it reports configured resources.
 */
const INTERNAL_NAMESPACE = 'rdk-internal';

/**
 * An entry standing for a whole remote machine rather than a resource on it.
 * The remote's own resources appear separately, under prefixed names.
 */
const REMOTE_TYPE = 'remote';

/**
 * Narrows a machine status to the resources a caller configured, optionally to
 * one subtype. The machine status reports everything the resource graph holds,
 * including entries rdk itself does not count as configured resources.
 *
 * An empty `subtype` means no filter, matching `useResourceNames`, so callers
 * moving between the two get the same list from the same argument.
 */
export const configuredResources = (
  resources: ResourceStatus[],
  subtype?: string
): ResourceStatus[] =>
  resources.filter(
    ({ name }) =>
      name !== undefined &&
      name.namespace !== INTERNAL_NAMESPACE &&
      name.type !== REMOTE_TYPE &&
      (!subtype || name.subtype === subtype)
  );
