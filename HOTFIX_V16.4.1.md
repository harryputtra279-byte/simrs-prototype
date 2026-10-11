# Hotfix V16.4.1 — Blank Login / Asset Cache

Baseline: V16.4.0.

Changes:
1. `index.html` cache-busting query strings now use `v16.4.1` consistently.
2. Service Worker cache version and precached versioned assets now use `v16.4.1`.
3. Service Worker no longer returns `index.html` as a fallback response for a failed JavaScript/CSS fetch; this avoids serving HTML as code and causing parse failures.
4. Runtime `PROTOTYPE_VERSION` and static contract checks are aligned to `v16.4.1`.

This addresses a confirmed version/cache inconsistency. If the page remains blank after deploying/testing this package, inspect browser Console for the first runtime error and check stale localStorage/session data; no claim is made that this alone proves every cause of the reported blank screen.
