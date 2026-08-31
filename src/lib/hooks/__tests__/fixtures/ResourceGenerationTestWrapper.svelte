<script lang="ts">
import { untrack } from 'svelte';
import {
  provideResourceGenerations,
  useResourceGeneration,
  useResourceGenerationsPublisher,
  type ResourceGeneration,
} from '../../resource-generation.svelte';

interface Props {
  /** One poll's worth of generations. Each render publishes it afresh. */
  poll: Record<string, ResourceGeneration>;
  onReact: (generation: string) => void;
}

let { poll, onReact }: Props = $props();

provideResourceGenerations();

const publisher = useResourceGenerationsPublisher();
const generation = useResourceGeneration(
  () => 'part-1',
  () => 'store-1'
);

$effect(() => {
  publisher?.publish('part-1', poll);
});

// Captured at init so the effect depends on the generation alone, not on a
// prop read that a rerender would invalidate on its own.
const react = untrack(() => onReact);

// Counts how often a consumer reacts, not what it reads.
$effect(() => {
  react(generation.current);
});
</script>

<div data-testid="generation">{generation.current}</div>
