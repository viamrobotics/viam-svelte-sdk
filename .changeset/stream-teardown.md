---
'@viamrobotics/svelte-sdk': patch
---

Fix CameraStream teardown so it can be remounted. The stream client now calls
`StreamClient.remove()` when its effect is destroyed, and stops its getStream
retry loop once aborted. Previously, unmounting a `CameraStream` left the stream
registered on the peer connection, so a later remount hit "stream already
active", never received a track, and looped on the 5s getStream timeout —
producing a blank video and a flood of AddStream requests.
