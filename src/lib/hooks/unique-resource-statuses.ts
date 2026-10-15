import type { ResourceStatus } from './machine-status.svelte';
import { INTERNAL_NAMESPACE } from './configured-resources';

/** The resource types rdk holds to machine-wide name uniqueness. */
const UNIQUELY_NAMED_TYPES = new Set(['component', 'service']);

const uniqueName = (status: ResourceStatus): string | undefined =>
  status.name !== undefined && UNIQUELY_NAMED_TYPES.has(status.name.type)
    ? status.name.name
    : undefined;

/**
 * The part the status was asked of. The machine stamps its own cloud metadata
 * on every local node, and its internal services are never remote, so one of
 * those says which part is local. Undefined when the machine is not
 * cloud-managed, since it then reports no part ID at all.
 */
const localMachinePartID = (resources: ResourceStatus[]): string | undefined =>
  resources.find(({ name }) => name?.namespace === INTERNAL_NAMESPACE)
    ?.cloudMetadata?.machinePartId || undefined;

/**
 * Reduces a machine status to one entry per resource name.
 *
 * rdk holds component and service names unique across the whole machine,
 * regardless of API. A local resource wins its name, and a remote resource
 * sharing it is hidden from `resourceNames`, but the status still reports
 * every node in the resource graph, so the hidden one shows up as a duplicate.
 * Only one of them can ever be addressed, so this keeps the local one and
 * drops the rest. When no entry can be told to be local, the first reported
 * stays, so there is always exactly one.
 *
 * Entries of any other type, such as the node standing for a whole remote
 * machine, pass through untouched. Server order is preserved.
 *
 * @param resources Everything a machine status reports.
 * @returns The same entries, less any that share a name with an earlier or
 *   local one.
 */
export const uniqueResourceStatuses = (
  resources: ResourceStatus[]
): ResourceStatus[] => {
  const partID = localMachinePartID(resources);

  const isLocal = (status: ResourceStatus) =>
    partID !== undefined && status.cloudMetadata?.machinePartId === partID;

  const chosen = new Map<string, ResourceStatus>();

  for (const status of resources) {
    const name = uniqueName(status);

    if (name === undefined) {
      continue;
    }

    const holder = chosen.get(name);

    if (holder === undefined || (isLocal(status) && !isLocal(holder))) {
      chosen.set(name, status);
    }
  }

  return resources.filter((status) => {
    const name = uniqueName(status);
    return name === undefined || chosen.get(name) === status;
  });
};
