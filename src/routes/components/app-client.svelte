<script lang="ts">
import { createAppMutation, createAppQuery } from '$lib';

const orgListQuery = createAppQuery('listOrganizations');
const locationListQuery = createAppQuery('listLocations');
const updateLocationMutation = createAppMutation('updateLocation');

const location = $derived(locationListQuery.data?.[0]);

$inspect(orgListQuery);
const update = async () => {
  const id = location?.id;

  if (id) {
    updateLocationMutation.mutate([id, 'edited-location-name']);
  }
};
</script>

{#if locationListQuery.isPending}
  Loading...
{:else}
  Location name: {location?.name}
{/if}

<button onclick={() => update()}>Update</button>
