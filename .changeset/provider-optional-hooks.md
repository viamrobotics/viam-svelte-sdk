---
'@viamrobotics/svelte-sdk': minor
---

Make hooks inert without a ViamProvider/ViamAppProvider ancestor instead of throwing (queries stay idle, though calling mutate still rejects), add an enabled option to useResourceNames, and export a useHasViamProvider probe for the machine contexts
