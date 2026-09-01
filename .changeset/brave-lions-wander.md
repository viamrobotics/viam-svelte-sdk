---
'@viamrobotics/svelte-sdk': minor
---

The provider now polls `getMachineStatus` once a second for every part it knows about, taking over the poll `useResourceNames` previously owned.
