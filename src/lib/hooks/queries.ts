// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export type ResolvedReturnType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<infer R>
  ? R
  : never;

export type StreamItemType<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => AsyncGenerator<infer R, any, any>
  ? R
  : never;

export interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
}

export interface StreamQueryOptions {
  enabled?: boolean;
  refetchMode?: 'append' | 'reset' | 'replace';
}
