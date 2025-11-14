import type { PlainMessage, ResourceName, robotApi } from '@viamrobotics/sdk';
import type { ResourceStatus } from '../machine-status.svelte';
import {
  cameraResourceName,
  motorResourceName,
  visionResourceName,
} from './resource-names';

export const createResourceStatus = (
  name: ResourceName,
  state = 1,
  revision = '',
  error = '',
  cloudMetadata?: PlainMessage<robotApi.GetCloudMetadataResponse>
): ResourceStatus => {
  const status: ResourceStatus = {
    name,
    state,
    revision,
    error,
  };

  if (cloudMetadata !== undefined) {
    status.cloudMetadata = cloudMetadata;
  }

  return status;
};

export const undefinedResourceStatus = {
  state: 1,
  revision: '',
  error: '',
} as const;

export const cameraResourceStatus = createResourceStatus(cameraResourceName);
export const motorResourceStatus = createResourceStatus(motorResourceName);
export const visionResourceStatus = createResourceStatus(visionResourceName);
