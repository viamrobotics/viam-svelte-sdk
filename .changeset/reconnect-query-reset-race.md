---
'@viamrobotics/svelte-sdk': patch
---

Fix reconnect race where robot data could be wiped while status still reported CONNECTED, by gating connect/disconnect state mutations and the query reset on a per-part connection generation.
