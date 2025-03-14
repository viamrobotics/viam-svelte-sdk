# viam-svelte-sdk

`pnpm i @viamrobotics/svelte-sdk @viamrobotics/sdk @tanstack/svelte-query`

## Getting started

The Viam Svelte SDK provides a reactive layer over `@viamrobotics/sdk`.

To get started, Include the ViamProvider component as a child of the Tanstack QueryClientProvider. Any child component will have access to the SDK hooks.

A map of `PartID`s to `DialConf`s must also be provided to connect to your machine(s).

```svelte
<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { ViamProvider } from '@viamrobotics/svelte-sdk';
  import type { DialConf } from '@viamrobotics/sdk';

  let { children } = $props();

  const queryClient = new QueryClient();

  const dialConfigs = {
    'my-part-id': {
      host: 'my-host',
      credentials: {
        type: 'api-key',
        authEntity: 'my-api-key-id',
        payload: 'my-api-key-value',
      },
      signalingAddress: 'https://app.viam.dev:443',
      disableSessions: true,
    },
  };
</script>

<QueryClientProvider client={queryClient}>
  <ViamProvider {dialConfigs}>
    {@render children()}
  </ViamProvider>
</QueryClientProvider>
```

### useRobotClient / useConnectionStatus

In any child component, you can access the `RobotClient` and `MachineConnectionStatus` of any connected machine with the `useRobotClient` and `useConnectionStatus` hooks.

```svelte
<script lang="ts">
  import { useConnectionStatus, useRobotClient } from '@viamrobotics/svelte-sdk';

  interface Props {
    partID: string;
  }

  let { partID }: Props = $props();

  const status = useConnectionStatus(() => partID);
  const client = useRobotClient(() => partID);

  $inspect(status.current);
  $inspect(client.current);
</script>
```

### useResourceNames

Wraps `client.resourceNames()` in a reactive query.

```svelte
<script lang="ts">
  import { useResourceNames } from '@viamrobotics/svelte-sdk';

  interface Props {
    partID: string;
  }

  let { partID }: Props = $props();

  const resources = useResourceNames(() => partID);
  const arms = useResourceNames(
    () => partID,
    () => 'arm'
  );

  $inspect(resources.current);
  $inspect(resources.error);
  $inspect(resources.fetching);
</script>
```

## Developing

First install dependencies with `pnpm install`, then start a development server:

```bash
pnpm dev

# or start the server and open the app in a new browser tab
pnpm dev -- --open
```

## Building

To build the library:

```bash
pnpm package
```
