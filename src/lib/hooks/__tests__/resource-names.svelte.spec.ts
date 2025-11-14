import { describe, it, expect } from 'vitest';
import type { ResourceName } from '@viamrobotics/sdk';
import {
  areResourceNamesEqual,
  sortResourceNames,
} from '../resource-names.svelte';
import { createResourceName } from '../__fixtures__/resource-names';

describe('areResourceNamesEqual()', () => {
  it('should return true for identical arrays', () => {
    const a = [createResourceName('cam', 'component', 'camera')];
    const b = [createResourceName('cam', 'component', 'camera')];

    expect(areResourceNamesEqual(a, b)).toBe(true);
  });

  it('should return false for arrays with different lengths', () => {
    const a = [createResourceName('cam', 'component', 'camera')];
    const b = [
      createResourceName('cam', 'component', 'camera'),
      createResourceName('motor', 'component', 'motor'),
    ];

    expect(areResourceNamesEqual(a, b)).toBe(false);
  });

  it('should return false for arrays with different resource names', () => {
    const a = [createResourceName('cam', 'component', 'camera')];
    const b = [createResourceName('motor', 'component', 'motor')];

    expect(areResourceNamesEqual(a, b)).toBe(false);
  });

  it('should return false when resources are in different order', () => {
    const a = [
      createResourceName('cam', 'component', 'camera'),
      createResourceName('motor', 'component', 'motor'),
    ];
    const b = [
      createResourceName('motor', 'component', 'motor'),
      createResourceName('cam', 'component', 'camera'),
    ];

    expect(areResourceNamesEqual(a, b)).toBe(false);
  });

  it('should return true for empty arrays', () => {
    expect(areResourceNamesEqual([], [])).toBe(true);
  });

  it('should return false when comparing empty with non-empty array', () => {
    const a: ResourceName[] = [];
    const b = [createResourceName('cam', 'component', 'camera')];

    expect(areResourceNamesEqual(a, b)).toBe(false);
  });

  it('should detect differences in resource properties', () => {
    const a = [createResourceName('cam', 'component', 'camera')];
    const b = [createResourceName('cam', 'component', 'different-camera')];

    expect(areResourceNamesEqual(a, b)).toBe(false);
  });
});

describe('sortResourceNames()', () => {
  it('should sort local resources before remote resources', () => {
    const resources = [
      createResourceName('remote:cam', 'component', 'camera'),
      createResourceName('cam', 'component', 'camera'),
    ];

    sortResourceNames(resources);

    expect(resources[0]?.name).toBe('cam');
    expect(resources[1]?.name).toBe('remote:cam');
  });

  it('should sort components before services', () => {
    const resources = [
      createResourceName('vision', 'service', 'vision'),
      createResourceName('motor', 'component', 'motor'),
    ];

    sortResourceNames(resources);

    expect(resources[0]?.type).toBe('component');
    expect(resources[1]?.type).toBe('service');
  });

  it('should sort alphabetically within the same type', () => {
    const resources = [
      createResourceName('motor2', 'component', 'motor'),
      createResourceName('camera1', 'component', 'camera'),
      createResourceName('motor1', 'component', 'motor'),
    ];

    sortResourceNames(resources);

    expect(resources[0]?.name).toBe('camera1');
    expect(resources[1]?.name).toBe('motor1');
    expect(resources[2]?.name).toBe('motor2');
  });

  it('should handle complex sorting: local components, local services, remote components, remote services', () => {
    const resources = [
      createResourceName('remote:service1', 'service', 'vision'),
      createResourceName('local-motor', 'component', 'motor'),
      createResourceName('remote:cam', 'component', 'camera'),
      createResourceName('local-service', 'service', 'slam'),
    ];

    sortResourceNames(resources);

    // Local components first
    expect(resources[0]?.name).toBe('local-motor');
    expect(resources[0]?.type).toBe('component');

    // Local services second
    expect(resources[1]?.name).toBe('local-service');
    expect(resources[1]?.type).toBe('service');

    // Remote components third
    expect(resources[2]?.name).toBe('remote:cam');
    expect(resources[2]?.type).toBe('component');

    // Remote services last
    expect(resources[3]?.name).toBe('remote:service1');
    expect(resources[3]?.type).toBe('service');
  });

  it('should mutate the array in place', () => {
    const resources = [
      createResourceName('b', 'component', 'camera'),
      createResourceName('a', 'component', 'camera'),
    ];
    const original = resources;

    sortResourceNames(resources);

    expect(resources).toBe(original);
    expect(resources[0]?.name).toBe('a');
    expect(resources[1]?.name).toBe('b');
  });

  it('should handle empty array', () => {
    const resources: ResourceName[] = [];

    sortResourceNames(resources);

    expect(resources).toEqual([]);
  });

  it('should handle single item array', () => {
    const resources = [createResourceName('cam', 'component', 'camera')];

    sortResourceNames(resources);

    expect(resources.length).toBe(1);
    expect(resources[0]?.name).toBe('cam');
  });
});
