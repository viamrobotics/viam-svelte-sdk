# Viam Context

Verify against the authoritative source before commenting on or changing code that touches Viam APIs or SDK types. Guessing at a method name, a field, or an RPC contract is the failure mode here. Cap lookups at 2 or 3 per session.

`WebFetch` https://docs.viam.com for what a resource type (arm, camera, sensor, and so on) is supposed to do: RPC semantics, method signatures, expected behavior.

## Sources

| Source                                                  | Best for                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `viamrobotics/api`                                      | Canonical `.proto` definitions. Prefer over `rdk` for RPC contracts. |
| `viamrobotics/viam-typescript-sdk`, https://ts.viam.dev | TypeScript types, client patterns, exported API surface.             |

Fetch a file or search code with `gh api`:

```bash
gh api repos/viamrobotics/<repo>/contents/<path> --jq '.content' | base64 -d
gh api "search/code?q=<term>+repo:viamrobotics/<repo>" --jq '.items[] | "\(.path): \(.text_matches[0].fragment // "")"'
```

## When to look something up

- Code uses an SDK type or method and the usage looks wrong. Verify the exported API in the source repo.
- A change adds or modifies a widget for a resource type. Check the resource's `.proto` for field names and RPC signatures.
- A name or field looks inconsistent with Viam conventions. Check the proto definition.
- A review comment needs to state what a resource method does. Fetch the docs rather than guessing.
