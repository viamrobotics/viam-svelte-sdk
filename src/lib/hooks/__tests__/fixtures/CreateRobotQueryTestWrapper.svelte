<script lang="ts">
import type { RobotClient } from '@viamrobotics/sdk';

import { createRobotQuery } from '../../create-robot-query.svelte';

interface Props {
  /** Stands in for the robot client. */
  current: RobotClient;
  /** The `getPose` arguments, which a caller may change while the query lives. */
  args: Parameters<RobotClient['getPose']>;
}

let { current, args }: Props = $props();

const client = {
  get current() {
    return current;
  },
  partID: 'part-1',
};

// The options are what tell `createRobotQuery` the function before them is the arguments.
createRobotQuery(client, 'getPose', () => args, {});
</script>
