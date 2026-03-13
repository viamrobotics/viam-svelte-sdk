// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  interface Window {
    VIAM?: {
      GRPC_TRACE_LOGGING?: boolean;
      setSDKLogLevel?: (
        level: import('$lib/logger').SDKLogLevelType | false
      ) => void;
      getSDKLogs?: () => import('$lib/logger').LogEntry[];
      clearSDKLogs?: () => void;
    };
  }
}

export {};
