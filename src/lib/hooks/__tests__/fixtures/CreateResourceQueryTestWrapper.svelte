<script lang="ts">
import type { ArmClient } from '@viamrobotics/sdk';

import { createResourceQuery } from '../../create-resource-query.svelte';

interface Props {
  /** Stands in for the resource client, which a disconnect sets to undefined. */
  current: ArmClient | undefined;
  partID: string;
  resourceName: string;
}

let { current, partID, resourceName }: Props = $props();

const client = {
  get current() {
    return current;
  },
  get partID() {
    return partID;
  },
  get name() {
    return resourceName;
  },
};

const query = createResourceQuery(client, 'getEndPosition');
</script>

<div data-testid="query-key">{JSON.stringify(query.queryKey)}</div>
