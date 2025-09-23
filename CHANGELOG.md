# @viamrobotics/svelte-sdk

## 0.7.0

### Minor Changes

- 7e38d05: Export usePolling hook
- cd4b20f: Add enable queries hook

## 0.6.2

### Patch Changes

- 79604ac: Export streamQueryKey factory to help with query management
- eb67d3d: Fix create-resource-stream params

## 0.6.1

### Patch Changes

- 92cfb39: Fix tanstack stream query options
- 5c0c4b4: Use new `robotClient.dial` method for connection

## 0.6.0

### Minor Changes

- e4a8e83: Add createResourceStream hook

## 0.5.0

### Minor Changes

- de190dc: Add app client hooks

## 0.4.7

### Patch Changes

- c0ecc42: Add configurable query logging.
- ea611c1: Only fetch resourceNames if machine status is 'Running'

## 0.4.6

### Patch Changes

- 57fef62: Refetch resourceNames if list is empty and connection established

## 0.4.5

### Patch Changes

- f96b59c: Remove throwOnError from usePolling

## 0.4.4

### Patch Changes

- b08f0ae: Throw errors on polling refetch

## 0.4.3

### Patch Changes

- ad0acfb: Cancel and reset queries on part disconnect

## 0.4.2

### Patch Changes

- 8f5af82: Replace structuredClone call with state.snapshot
- 2eaea47: Ensure consistent streamClient and resourceName in stream related effects

## 0.4.1

### Patch Changes

- e5aaa88: Fix reactivity updates for useResourceNames

## 0.4.0

### Minor Changes

- e7e2093: Only poll once request round trips have finished

### Patch Changes

- 5fb0fe4: Memoize useResourceNames results

## 0.3.3

### Patch Changes

- 47e988a: Clone previous configs for diffing

## 0.3.2

### Patch Changes

- 8d93517: Do not mutate configs passed to viam provider

## 0.3.1

### Patch Changes

- f435207: Improve query keys

## 0.3.0

### Minor Changes

- f8074e0: Set retry defaults

## 0.2.1

### Patch Changes

- 6a77b17: Fix disconnect issue

## 0.2.0

### Minor Changes

- 59452ac: Add CameraImage and CameraStream components

## 0.1.4

### Patch Changes

- 39a3855: Enable machine status and resource names queries only when robot client is defined

## 0.1.3

### Patch Changes

- 3172a77: Add useMachineStatus hook

## 0.1.2

### Patch Changes

- d0ea498: Remove lodash dependency

## 0.1.1

### Patch Changes

- 2fb26fc: Add createStreamClient hook

## 0.1.0

### Minor Changes

- a2ad53b: Initial release
