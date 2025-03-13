import { createQuery, type QueryObserverResult } from '@tanstack/svelte-query';
import type { ResourceName } from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { fromStore } from 'svelte/store';
import { useRobotClients } from '$lib/robot-clients.svelte';
import type { PartID } from '../part';

const key = Symbol('resources-context');

type Query = QueryObserverResult<ResourceName[], Error>;

interface QueryContext {
	current: ResourceName[];
	error: Error | undefined;
	fetching: boolean;
	refetch: () => Promise<Query> | Promise<void>;
}

interface Context {
	current: Record<PartID, { current: Query } | undefined>;
}

export const provideResourceNamesContext = () => {
	const clients = useRobotClients();
	const queries = $state<Record<PartID, { current: Query }>>({});

	$effect.pre(() => {
		for (const [partID, client] of Object.entries(clients.current)) {
			const query = fromStore(
				createQuery({
					queryKey: [partID, 'resources'],
					queryFn: async () => {
						return (await client?.resourceNames()) ?? [];
					}
				})
			);

			queries[partID] = query;
		}
	});

	setContext<Context>(key, {
		get current() {
			return queries;
		}
	});
};

export const useResourceNames = (partID: () => PartID, subtype?: () => string): QueryContext => {
	const context = getContext<Context>(key);
	const query = $derived(context.current[partID()]);
	const data = $derived(query?.current.data ?? []);
	const filtered = $derived(subtype ? data.filter((value) => value.subtype === subtype()) : data);
	const error = $derived(query?.current.error ?? undefined);
	const fetching = $derived(query?.current.isFetching ?? true);

	return {
		get current() {
			return filtered;
		},
		get error() {
			return error;
		},
		get fetching() {
			return fetching;
		},
		refetch() {
			return query?.current.refetch() ?? Promise.resolve();
		}
	};
};
