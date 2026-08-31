---
'@viamrobotics/svelte-sdk': minor
---

Key queries, streams, and mutations on the addressed part and resource instead
of on the live client, so a disconnect no longer re-keys them onto empty cache
entries and blanks their data.
