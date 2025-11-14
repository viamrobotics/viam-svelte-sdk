import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { useEnabledQueries } from '../use-enabled-queries.svelte';
import UseEnabledQueriesConsumer from './use-enabled-queries-consumer.spec.svelte';

describe('useEnabledQueries()', () => {
  // Helper to render and get queries object
  const renderQueries = () => {
    let queries: ReturnType<typeof useEnabledQueries> | undefined;
    render(UseEnabledQueriesConsumer, {
      props: {
        onReady: (q: ReturnType<typeof useEnabledQueries>) => {
          queries = q;
        },
      },
    });
    return queries!;
  };

  describe('context requirement', () => {
    it('should throw error when called outside component context', () => {
      expect(() => {
        useEnabledQueries();
      }).toThrow('lifecycle_outside_component');
    });
  });

  describe('initial state', () => {
    it('should initialize all queries as enabled', () => {
      const queries = renderQueries();

      expect(queries.machineStatus).toBe(true);
      expect(queries.resourceNames).toBe(true);
      expect(queries.resourceQueries).toBe(true);
      expect(queries.robotQueries).toBe(true);
      expect(queries.streams).toBe(true);
    });
  });

  describe('resourceQueries', () => {
    it('should toggle resourceQueries state', () => {
      const queries = renderQueries();

      expect(queries.resourceQueries).toBe(true);

      queries.disableResourceQueries();
      expect(queries.resourceQueries).toBe(false);

      queries.enableResourceQueries();
      expect(queries.resourceQueries).toBe(true);
    });

    it('should be idempotent', () => {
      const queries = renderQueries();

      queries.disableResourceQueries();
      queries.disableResourceQueries();
      expect(queries.resourceQueries).toBe(false);

      queries.enableResourceQueries();
      queries.enableResourceQueries();
      expect(queries.resourceQueries).toBe(true);
    });
  });

  describe('machineStatus', () => {
    it('should toggle machineStatus state', () => {
      const queries = renderQueries();

      expect(queries.machineStatus).toBe(true);

      queries.disableMachineStatus();
      expect(queries.machineStatus).toBe(false);

      queries.enableMachineStatus();
      expect(queries.machineStatus).toBe(true);
    });
  });

  describe('resourceNames', () => {
    it('should toggle resourceNames state', () => {
      const queries = renderQueries();

      expect(queries.resourceNames).toBe(true);

      queries.disableResourceNames();
      expect(queries.resourceNames).toBe(false);

      queries.enableResourceNames();
      expect(queries.resourceNames).toBe(true);
    });
  });

  describe('robotQueries', () => {
    it('should toggle robotQueries state', () => {
      const queries = renderQueries();

      expect(queries.robotQueries).toBe(true);

      queries.disableRobotQueries();
      expect(queries.robotQueries).toBe(false);

      queries.enableRobotQueries();
      expect(queries.robotQueries).toBe(true);
    });
  });

  describe('streams', () => {
    it('should toggle streams state', () => {
      const queries = renderQueries();

      expect(queries.streams).toBe(true);

      queries.disableStreams();
      expect(queries.streams).toBe(false);

      queries.enableStreams();
      expect(queries.streams).toBe(true);
    });
  });

  describe('independent state management', () => {
    it('should manage each query type independently', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesConsumer, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      // Disable some queries
      queries!.disableResourceQueries();
      queries!.disableMachineStatus();

      expect(queries!.resourceQueries).toBe(false);
      expect(queries!.machineStatus).toBe(false);
      expect(queries!.resourceNames).toBe(true);
      expect(queries!.robotQueries).toBe(true);
      expect(queries!.streams).toBe(true);
    });

    it('should allow toggling different query types without affecting others', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesConsumer, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableResourceNames();
      queries!.disableStreams();

      expect(queries!.resourceNames).toBe(false);
      expect(queries!.streams).toBe(false);

      queries!.enableResourceNames();

      expect(queries!.resourceNames).toBe(true);
      expect(queries!.streams).toBe(false);
      expect(queries!.machineStatus).toBe(true);
      expect(queries!.resourceQueries).toBe(true);
      expect(queries!.robotQueries).toBe(true);
    });
  });
});
