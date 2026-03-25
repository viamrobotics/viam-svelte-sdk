<script lang="ts">
import { ViamAppProvider } from '$lib';
import type { Credentials } from '@viamrobotics/sdk';
import AppClient from './app-client.svelte';

const credentials: Credentials = {
  type: 'access-token',
  payload: '',
};
</script>

<ViamAppProvider
  {credentials}
  serviceHost="https://app.viam.com"
>
  <AppClient />
</ViamAppProvider>
