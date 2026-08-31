import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResourceGenerationTestWrapper from './fixtures/ResourceGenerationTestWrapper.svelte';

const poll = (generation: string, canQuery = true) => ({
  'store-1': { generation, canQuery },
});

afterEach(() => {
  cleanup();
});

describe('provideResourceGenerations', () => {
  it('reports the published generation', async () => {
    const { getByTestId } = render(ResourceGenerationTestWrapper, {
      props: { poll: poll('store:100.0'), onReact: vi.fn() },
    });

    expect(getByTestId('generation').textContent).toBe('store:100.0');
  });

  it('does not wake consumers when a poll republishes the same generations', async () => {
    const onReact = vi.fn();

    const { rerender } = render(ResourceGenerationTestWrapper, {
      props: { poll: poll('store:100.0'), onReact },
    });

    const initialReactions = onReact.mock.calls.length;

    // The status query hands back a fresh object every poll, so an unchanged
    // machine still republishes. A consumer effect reading the generation must
    // not re-run once a second because of it.
    await rerender({ poll: poll('store:100.0'), onReact });
    await rerender({ poll: poll('store:100.0'), onReact });

    expect(onReact.mock.calls.length).toBe(initialReactions);
  });

  it('wakes consumers when the generation moves', async () => {
    const onReact = vi.fn();

    const { rerender, getByTestId } = render(ResourceGenerationTestWrapper, {
      props: { poll: poll('store:100.0'), onReact },
    });

    const initialReactions = onReact.mock.calls.length;

    await rerender({ poll: poll('store:200.0'), onReact });

    expect(onReact.mock.calls.length).toBeGreaterThan(initialReactions);
    expect(getByTestId('generation').textContent).toBe('store:200.0');
  });
});
