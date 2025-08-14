let enabled = false;

export const enableDebug = () => {
  enabled = true;
};

export const disableDebug = () => {
  enabled = false;
};

const debugLog = (...args: Parameters<typeof console.log>) => {
  if (enabled) {
    queueMicrotask(console.log.bind(console, ...args));
  }
};

export const debugLogQuery = (
  index: number,
  type: 'REQ' | 'RES' | 'ERR',
  name: string | undefined,
  methodName: string,
  output: unknown
) => {
  debugLog(
    `${index}\t${new Date().toISOString()}\t${type} \t${name ?? 'unknown'}\t${methodName}\n\t${JSON.stringify(output, null, 2)}`
  );
};

window.enableDebug = enableDebug;
window.disableDebug = disableDebug;
