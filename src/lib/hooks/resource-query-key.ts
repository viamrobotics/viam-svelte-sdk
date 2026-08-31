import type { PartID } from '../part';

/**
 * Prefix shared by every query and stream against one resource.
 *
 * A rebuild invalidates by this prefix, so it has to stay in step with the keys
 * `createResourceQuery` and `createResourceStream` build from it.
 */
export const resourceQueryKeyPrefix = (
  partID: PartID,
  name: string | undefined
) => ['viam-svelte-sdk', 'partID', partID, 'resource', name];
