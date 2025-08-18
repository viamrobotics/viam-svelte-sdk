let debugQueries = false;
let verbose = false;

export const enableQueryLogging = () => {
  debugQueries = true;
  return 'query logging enabled';
};

export const disableQueryLogging = () => {
  debugQueries = false;
  return 'query logging disabled';
};

export const enableVerboseQueryLogging = () => {
  verbose = true;
  return 'verbose query logging enabled';
};

export const disableVerboseQueryLogging = () => {
  verbose = false;
  return 'verbose query logging disabled';
};

type LogType = 'REQ' | 'RES' | 'ERR';

let _index = -1;
const getIndex = () => {
  _index++;
  return _index;
};

export const useQueryLogger = () => {
  const logQuery = (
    index: number,
    type: LogType,
    name: string | undefined,
    methodName: string,
    data?: unknown
  ) => {
    if (!debugQueries) {
      return;
    }

    let log = `${index}\t${new Date().toISOString()}\t${type} \t${name ?? 'unknown'}\t${methodName}`;
    if (data !== undefined && verbose) {
      log += `\n\t${JSON.stringify(data, null, 2)}`;
    }

    queueMicrotask(console.dir.bind(console, log));
  };

  const createLogger = () => {
    const index = getIndex();
    return (
      type: LogType,
      name: string | undefined,
      methodName: string,
      data?: unknown
    ) => logQuery(index, type, name, methodName, data);
  };

  return {
    createLogger,
  };
};

window.enableQueryLogging = enableQueryLogging;
window.disableQueryLogging = disableQueryLogging;
window.enableVerboseQueryLogging = enableVerboseQueryLogging;
window.disableVerboseQueryLogging = disableVerboseQueryLogging;
