import { describe, it, expect } from 'vitest';
import type { PlainMessage, robotApi } from '@viamrobotics/sdk';
import { sortResourceStatuses } from '../machine-status.svelte';
import {
  cameraResourceStatus,
  createResourceStatus,
  motorResourceStatus,
  undefinedResourceStatus,
  visionResourceStatus,
} from '../__fixtures__/resource-statuses';
import { createResourceName } from '../__fixtures__/resource-names';

type MachineStatus = PlainMessage<robotApi.GetMachineStatusResponse>;

describe('sortResourceStatuses()', () => {
  it('should sort local resources before remote resources', () => {
    const machineStatus: MachineStatus = {
      resources: [
        cameraResourceStatus,
        createResourceStatus(
          createResourceName('remote:cam', 'component', 'camera')
        ),
      ],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    expect(result.resources[0]?.name?.name).toBe('cam');
    expect(result.resources[1]?.name?.name).toBe('remote:cam');
  });

  it('should sort components before services', () => {
    const machineStatus: MachineStatus = {
      resources: [visionResourceStatus, motorResourceStatus],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    expect(result.resources[0]?.name?.type).toBe('component');
    expect(result.resources[1]?.name?.type).toBe('service');
  });

  it('should sort alphabetically within the same type', () => {
    const machineStatus: MachineStatus = {
      resources: [
        createResourceStatus(
          createResourceName('motor2', 'component', 'motor')
        ),
        createResourceStatus(
          createResourceName('camera1', 'component', 'camera')
        ),
        createResourceStatus(
          createResourceName('motor1', 'component', 'motor')
        ),
      ],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    expect(result.resources[0]?.name?.name).toBe('camera1');
    expect(result.resources[1]?.name?.name).toBe('motor1');
    expect(result.resources[2]?.name?.name).toBe('motor2');
  });

  it('should handle undefined names', () => {
    const machineStatus: MachineStatus = {
      resources: [undefinedResourceStatus, cameraResourceStatus],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    expect(result.resources[0]?.name).toBeUndefined();
    expect(result.resources[1]?.name?.name).toBe('cam');
  });

  it('should handle complex sorting: local components, local services, remote components, remote services', () => {
    const machineStatus: MachineStatus = {
      resources: [
        createResourceStatus(
          createResourceName('remote:service1', 'service', 'vision')
        ),
        createResourceStatus(
          createResourceName('local-motor', 'component', 'motor')
        ),
        createResourceStatus(
          createResourceName('remote:cam', 'component', 'camera')
        ),
        createResourceStatus(
          createResourceName('local-service', 'service', 'slam')
        ),
      ],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    // Local components first
    expect(result.resources[0]?.name?.name).toBe('local-motor');
    expect(result.resources[0]?.name?.type).toBe('component');

    // Local services second
    expect(result.resources[1]?.name?.name).toBe('local-service');
    expect(result.resources[1]?.name?.type).toBe('service');

    // Remote components third
    expect(result.resources[2]?.name?.name).toBe('remote:cam');
    expect(result.resources[2]?.name?.type).toBe('component');

    // Remote services last
    expect(result.resources[3]?.name?.name).toBe('remote:service1');
    expect(result.resources[3]?.name?.type).toBe('service');
  });

  it('should sort by subtype when name and type are the same', () => {
    const machineStatus: MachineStatus = {
      resources: [
        createResourceStatus(
          createResourceName('resource1', 'component', 'motor')
        ),
        createResourceStatus(
          createResourceName('resource1', 'component', 'camera')
        ),
      ],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    expect(result.resources[0]?.name?.subtype).toBe('camera');
    expect(result.resources[1]?.name?.subtype).toBe('motor');
  });

  it('should preserve other machine status properties', () => {
    const machineStatus: MachineStatus = {
      resources: [cameraResourceStatus],
      config: { revision: 'abc123' },
      state: 2,
    };

    const result = sortResourceStatuses(machineStatus);

    expect(result.config?.revision).toBe('abc123');
    expect(result.state).toBe(2);
  });

  it('should not mutate the original machine status', () => {
    const original: MachineStatus = {
      resources: [
        createResourceStatus(createResourceName('b', 'component', 'camera')),
        createResourceStatus(createResourceName('a', 'component', 'camera')),
      ],
      config: { revision: '' },
      state: 2,
    };

    const result = sortResourceStatuses(original);

    // Original order should be preserved
    expect(original.resources[0]?.name?.name).toBe('b');
    expect(original.resources[1]?.name?.name).toBe('a');

    // Result should be sorted
    expect(result.resources[0]?.name?.name).toBe('a');
    expect(result.resources[1]?.name?.name).toBe('b');
  });
});
