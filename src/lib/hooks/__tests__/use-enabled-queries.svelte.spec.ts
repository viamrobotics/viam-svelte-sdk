import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { useEnabledQueries } from '../use-enabled-queries.svelte';
import UseEnabledQueriesTestComponent from './use-enabled-queries-test-component.spec.svelte';

describe('useEnabledQueries()', () => {
  describe('context requirement', () => {
    it('should throw error when context is not provided', () => {
      // Calling useEnabledQueries outside of a component throws a Svelte lifecycle error
      expect(() => {
        useEnabledQueries();
      }).toThrow('lifecycle_outside_component');
    });
  });

  describe('initial state', () => {
    it('should initialize all queries as enabled', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      expect(queries).toBeDefined();
      expect(queries!.machineStatus).toBe(true);
      expect(queries!.resourceNames).toBe(true);
      expect(queries!.resourceQueries).toBe(true);
      expect(queries!.robotQueries).toBe(true);
      expect(queries!.streams).toBe(true);
    });
  });

  describe('resourceQueries', () => {
    it('should enable resource queries when enableResourceQueries is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableResourceQueries();
      expect(queries!.resourceQueries).toBe(false);

      queries!.enableResourceQueries();
      expect(queries!.resourceQueries).toBe(true);
    });

    it('should disable resource queries when disableResourceQueries is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      expect(queries!.resourceQueries).toBe(true);

      queries!.disableResourceQueries();
      expect(queries!.resourceQueries).toBe(false);
    });

    it('should maintain state across multiple calls', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableResourceQueries();
      queries!.disableResourceQueries();
      expect(queries!.resourceQueries).toBe(false);

      queries!.enableResourceQueries();
      queries!.enableResourceQueries();
      expect(queries!.resourceQueries).toBe(true);
    });
  });

  describe('machineStatus', () => {
    it('should enable machine status when enableMachineStatus is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableMachineStatus();
      expect(queries!.machineStatus).toBe(false);

      queries!.enableMachineStatus();
      expect(queries!.machineStatus).toBe(true);
    });

    it('should disable machine status when disableMachineStatus is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      expect(queries!.machineStatus).toBe(true);

      queries!.disableMachineStatus();
      expect(queries!.machineStatus).toBe(false);
    });
  });

  describe('resourceNames', () => {
    it('should enable resource names when enableResourceNames is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableResourceNames();
      expect(queries!.resourceNames).toBe(false);

      queries!.enableResourceNames();
      expect(queries!.resourceNames).toBe(true);
    });

    it('should disable resource names when disableResourceNames is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      expect(queries!.resourceNames).toBe(true);

      queries!.disableResourceNames();
      expect(queries!.resourceNames).toBe(false);
    });
  });

  describe('robotQueries', () => {
    it('should enable robot queries when enableRobotQueries is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableRobotQueries();
      expect(queries!.robotQueries).toBe(false);

      queries!.enableRobotQueries();
      expect(queries!.robotQueries).toBe(true);
    });

    it('should disable robot queries when disableRobotQueries is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      expect(queries!.robotQueries).toBe(true);

      queries!.disableRobotQueries();
      expect(queries!.robotQueries).toBe(false);
    });
  });

  describe('streams', () => {
    it('should enable streams when enableStreams is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      queries!.disableStreams();
      expect(queries!.streams).toBe(false);

      queries!.enableStreams();
      expect(queries!.streams).toBe(true);
    });

    it('should disable streams when disableStreams is called', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
        props: {
          onReady: (q: ReturnType<typeof useEnabledQueries>) => {
            queries = q;
          },
        },
      });

      expect(queries!.streams).toBe(true);

      queries!.disableStreams();
      expect(queries!.streams).toBe(false);
    });
  });

  describe('independent state management', () => {
    it('should manage each query type independently', () => {
      let queries: ReturnType<typeof useEnabledQueries> | undefined;

      render(UseEnabledQueriesTestComponent, {
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

      render(UseEnabledQueriesTestComponent, {
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
