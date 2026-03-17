import {
  LogLayer,
  BlankTransport,
  LogLevel,
  type LogLevelType,
} from 'loglayer';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

interface QueryLogger {
  request: (args: unknown) => void;
  response: (response: unknown) => void;
  error: (error: unknown) => void;
}

const LOG_LEVEL_ORDER: readonly LogLevelType[] = [
  LogLevel.trace,
  LogLevel.debug,
  LogLevel.info,
  LogLevel.warn,
  LogLevel.error,
  LogLevel.fatal,
];

const MAX_LOG_ENTRIES = 10_000;

const CONSOLE_METHOD_MAP: Record<
  LogLevelType,
  'debug' | 'info' | 'warn' | 'error'
> = {
  [LogLevel.trace]: 'debug',
  [LogLevel.debug]: 'debug',
  [LogLevel.info]: 'info',
  [LogLevel.warn]: 'warn',
  [LogLevel.error]: 'error',
  [LogLevel.fatal]: 'error',
};

const STORAGE_KEY = 'viam-sdk-log-level';

export const getPersistedLogLevel = (): LogLevelType | false | null => {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'false') return false;
  if (stored === null) return null;
  if (LOG_LEVEL_ORDER.includes(stored as LogLevelType)) {
    return stored as LogLevelType;
  }
  return null;
};

const persistedLevel = getPersistedLogLevel();

const logBuffer: LogEntry[] = [];

let consoleEnabled = !!persistedLevel;
let consoleLevel: LogLevelType = persistedLevel
  ? persistedLevel
  : LogLevel.info;

globalThis.VIAM = {
  ...globalThis.VIAM,
  GRPC_TRACE_LOGGING: consoleLevel === LogLevel.trace && consoleEnabled,
};

let _queryIndex = -1;
const nextQueryId = (): number => {
  _queryIndex += 1;
  return _queryIndex;
};

const isAtOrAboveLevel = (
  msgLevel: string,
  minLevel: LogLevelType
): boolean => {
  const msgIdx = LOG_LEVEL_ORDER.indexOf(msgLevel as LogLevelType);
  const minIdx = LOG_LEVEL_ORDER.indexOf(minLevel);
  return msgIdx !== -1 && minIdx !== -1 && msgIdx >= minIdx;
};

const consoleTransport = new BlankTransport({
  shipToLogger: ({ logLevel, messages, data, hasData }) => {
    if (!consoleEnabled || !isAtOrAboveLevel(logLevel, consoleLevel)) {
      return messages;
    }

    const method = CONSOLE_METHOD_MAP[logLevel] ?? 'info';

    if (hasData && data) {
      console[method].bind(console, ...messages, data);
    } else {
      console[method].bind(console, ...messages);
    }

    return messages;
  },
});

const cacheTransport = new BlankTransport({
  shipToLogger: ({ logLevel, messages, data, hasData }) => {
    if (logBuffer.length >= MAX_LOG_ENTRIES) {
      logBuffer.shift();
    }

    logBuffer.push({
      timestamp: new Date().toISOString(),
      level: logLevel,
      message: messages.join(' '),
      ...(hasData && data ? { data } : {}),
    });

    return messages;
  },
});

export const logger = new LogLayer({
  transport: [consoleTransport, cacheTransport],
  prefix: '[viam-svelte-sdk]',
  errorSerializer: (err: Error) => ({
    message: err.message,
    name: err.name,
    stack: err.stack,
  }),
});

export const createQueryLogger = (
  resource: string,
  method: string
): QueryLogger => {
  const queryId = nextQueryId();
  return {
    request: (args: unknown) => {
      logger.withMetadata({ queryId, resource, method, args }).debug('request');
    },
    response: (response: unknown) => {
      logger
        .withMetadata({ queryId, resource, method, response })
        .debug('response');
    },
    error: (error: unknown) => {
      logger
        .withError(error as Error)
        .withMetadata({ queryId, resource, method })
        .error('error');
    },
  };
};

const syncGrpcTraceLogging = (level: LogLevelType | false): void => {
  globalThis.VIAM = {
    ...globalThis.VIAM,
    GRPC_TRACE_LOGGING: level === LogLevel.trace,
  };
};

export const setSDKLogLevel = (level: LogLevelType | false): void => {
  if (level === false) {
    consoleEnabled = false;
  } else {
    consoleEnabled = true;
    consoleLevel = level;
  }

  syncGrpcTraceLogging(level);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(level));
  }
};

const getSDKLogs = (): LogEntry[] => [...logBuffer];
const clearSDKLogs = (): void => {
  logBuffer.length = 0;
};

globalThis.VIAM = {
  ...globalThis.VIAM,
  setSDKLogLevel,
  getSDKLogs,
  clearSDKLogs,
};

export { LogLevel as SDKLogLevel, type LogLevelType as SDKLogLevelType };
