import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  enableQueryLogging,
  disableQueryLogging,
  enableVerboseQueryLogging,
  disableVerboseQueryLogging,
  useQueryLogger,
} from '$lib/query-logger';

describe('Query Logger', () => {
  let consoleDir: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock console.dir to capture log output
    consoleDir = vi.spyOn(console, 'dir').mockImplementation(() => {});

    // Start with logging disabled
    disableQueryLogging();
    disableVerboseQueryLogging();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enableQueryLogging()', () => {
    it('should enable query logging and return confirmation message', () => {
      const result = enableQueryLogging();

      expect(result).toBe(
        'query logging enabled, format: \n\tindex timestamp type name method'
      );
    });
  });

  describe('disableQueryLogging()', () => {
    it('should disable query logging and return confirmation message', () => {
      const result = disableQueryLogging();

      expect(result).toBe('query logging disabled');
    });
  });

  describe('enableVerboseQueryLogging()', () => {
    it('should enable verbose query logging and return confirmation message', () => {
      const result = enableVerboseQueryLogging();

      expect(result).toBe(
        'verbose query logging enabled, format: \n\tindex timestamp type name method\n\t\tdata'
      );
    });
  });

  describe('disableVerboseQueryLogging()', () => {
    it('should disable verbose query logging and return confirmation message', () => {
      const result = disableVerboseQueryLogging();

      expect(result).toBe('verbose query logging disabled');
    });
  });

  describe('useQueryLogger()', () => {
    it('should create a logger function', () => {
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      expect(logger).toBeTypeOf('function');
    });

    it('should not log when query logging is disabled', async () => {
      disableQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      logger('REQ', 'test-resource', 'testMethod');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).not.toHaveBeenCalled();
    });

    it('should log when query logging is enabled', async () => {
      enableQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      logger('REQ', 'test-resource', 'testMethod');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalled();
    });

    it('should format log with index, timestamp, type, name, and method', async () => {
      enableQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      logger('REQ', 'test-resource', 'testMethod');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\d+\t\d{4}-\d{2}-\d{2}T.*\tREQ \ttest-resource\ttestMethod$/
        )
      );
    });

    it('should handle undefined resource name', async () => {
      enableQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      logger('REQ', undefined, 'testMethod');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalledWith(
        expect.stringMatching(/unknown\ttestMethod$/)
      );
    });

    it('should log different request types correctly', async () => {
      enableQueryLogging();
      const { createLogger } = useQueryLogger();

      const reqLogger = createLogger();
      const resLogger = createLogger();
      const errLogger = createLogger();

      reqLogger('REQ', 'resource', 'method');
      resLogger('RES', 'resource', 'method');
      errLogger('ERR', 'resource', 'method');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalledWith(expect.stringMatching(/REQ/));
      expect(consoleDir).toHaveBeenCalledWith(expect.stringMatching(/RES/));
      expect(consoleDir).toHaveBeenCalledWith(expect.stringMatching(/ERR/));
    });

    it('should not include data in log when verbose logging is disabled', async () => {
      enableQueryLogging();
      disableVerboseQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      const data = { key: 'value', nested: { deep: 'object' } };
      logger('REQ', 'resource', 'method', data);

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalledWith(expect.not.stringMatching(/key/));
    });

    it('should include data in log when verbose logging is enabled', async () => {
      enableQueryLogging();
      enableVerboseQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      const data = { key: 'value', nested: { deep: 'object' } };
      logger('REQ', 'resource', 'method', data);

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalledWith(expect.stringMatching(/key/));
    });

    it('should format verbose data as JSON', async () => {
      enableQueryLogging();
      enableVerboseQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      const data = { key: 'value', number: 42 };
      logger('REQ', 'resource', 'method', data);

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      const loggedMessage = consoleDir.mock.calls[0]?.[0];
      expect(typeof loggedMessage).toBe('string');
      expect(loggedMessage as string).toContain('"key"');
      expect(loggedMessage as string).toContain('"value"');
      expect(loggedMessage as string).toContain('"number"');
      expect(loggedMessage as string).toContain('42');
    });

    it('should handle various data types in verbose mode', async () => {
      enableQueryLogging();
      enableVerboseQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      const testCases = [
        { data: 'string', description: 'string' },
        { data: 42, description: 'number' },
        { data: true, description: 'boolean' },
        { data: null, description: 'null' },
        { data: [1, 2, 3], description: 'array' },
        { data: { nested: { value: 'deep' } }, description: 'nested object' },
      ];

      for (const { data } of testCases) {
        logger('REQ', 'resource', 'method', data);
      }

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleDir).toHaveBeenCalledTimes(testCases.length);
    });

    it('should assign unique indices to different loggers', async () => {
      enableQueryLogging();
      const { createLogger } = useQueryLogger();

      const logger1 = createLogger();
      const logger2 = createLogger();
      const logger3 = createLogger();

      logger1('REQ', 'resource', 'method1');
      logger2('REQ', 'resource', 'method2');
      logger3('REQ', 'resource', 'method3');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      const calls = consoleDir.mock.calls;
      const indices = calls.map((call) => {
        const message = call[0];
        if (typeof message === 'string') {
          return parseInt(message.split('\t')[0] ?? '0', 10);
        }
        return 0;
      });

      // Indices should be different
      expect(new Set(indices).size).toBe(3);
    });

    it('should use the same index for the same logger instance', async () => {
      enableQueryLogging();
      const { createLogger } = useQueryLogger();
      const logger = createLogger();

      logger('REQ', 'resource', 'method');
      logger('RES', 'resource', 'method');

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      const calls = consoleDir.mock.calls;
      const indices = calls.map((call) => {
        const message = call[0];
        if (typeof message === 'string') {
          return parseInt(message.split('\t')[0] ?? '0', 10);
        }
        return 0;
      });

      // Both logs should have the same index
      expect(indices[0]).toBe(indices[1]);
    });
  });
});
