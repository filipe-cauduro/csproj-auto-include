# Changelog

## 1.0.3

- Include runtime dependencies in the VSIX so the installed extension can activate.
- Match blocklist patterns relative to the closest project and workspace folder, while retaining absolute path matching.
- Serialize file operations and ignore stale deletion notifications for paths that exist again.
- Add regression coverage for blocklists, overlapping file operations, and package contents.
