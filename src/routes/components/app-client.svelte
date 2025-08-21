<script lang="ts">
import { createAppMutation, createAppQuery } from '$lib';

const orgListQuery = createAppQuery('listOrganizations');
const locationListQuery = createAppQuery('listLocations');
const updateLocationMutation = createAppMutation('updateLocation');

const location = $derived(locationListQuery.current.data?.[0]);

$inspect(orgListQuery.current);
const update = async () => {
  const id = location?.id;

  if (id) {
    updateLocationMutation.current.mutate([id, 'edited-location-name']);
  }
};
</script>

{#if locationListQuery.current.isPending}
  Loading...
{:else}
  Location name: {location?.name}
{/if}

<button onclick={() => update()}>Update</button>
