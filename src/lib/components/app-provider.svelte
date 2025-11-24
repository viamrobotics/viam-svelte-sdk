<script lang="ts">
import type { Snippet } from 'svelte';
import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
import { provideViamClient } from '../hooks/app/use-app-client.svelte';
import type { Credentials } from '@viamrobotics/sdk';

interface Props {
  client?: QueryClient;
  serviceHost: string;
  credentials: Credentials;
  children?: Snippet;
}

let { serviceHost, credentials, children }: Props = $props();

export const client = new QueryClient();

provideViamClient(() => ({ serviceHost, credentials }));
</script>

<QueryClientProvider {client}>
  {@render children?.()}
</QueryClientProvider>
