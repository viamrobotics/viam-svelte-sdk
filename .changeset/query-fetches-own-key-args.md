---
'@viamrobotics/svelte-sdk': patch
---

Queries and streams fetch with the arguments of their own key, so a query whose arguments change no longer corrupts another query sharing its old key.
