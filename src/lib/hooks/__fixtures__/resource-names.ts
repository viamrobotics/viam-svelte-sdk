import type { ResourceName } from '@viamrobotics/sdk';

export const createResourceName = (
  name: string,
  type: string,
  subtype: string
): ResourceName => ({
  namespace: 'rdk',
  name,
  type,
  subtype,
});

export const cameraResourceName = createResourceName(
  'cam',
  'component',
  'camera'
);

export const motorResourceName = createResourceName(
  'motor',
  'component',
  'motor'
);

export const visionResourceName = createResourceName(
  'vision',
  'service',
  'vision'
);
