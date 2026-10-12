# V16.5.7 — Theme submenu access

- Removed the floating theme launcher.
- Theme entry is rendered only on the Master Data route and only when `Session.currentUser.role` is `admin` or `superuser`.
- Theme choices remain local to the browser/device.
- Added Samsung One UI Glass styling for the submenu card and theme dialog.
- README intentionally unchanged.

## Validation
- ZIP integrity validated after packaging.
- JavaScript syntax checked with Node.js where available.
- Manual browser interaction and end-to-end role verification are still required.
