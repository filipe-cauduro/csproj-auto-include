# Changelog

## 1.0.6

- Add the extension icon to the VSIX and Marketplace listing.
- Use a 256x256 PNG within the Marketplace icon size limits and validate its dimensions before packaging.
- Add the icon and the published Marketplace installation link to the README.
- Document how to publish updates to the existing Marketplace extension.

## 1.0.5

- Prepare the first public GitHub release with an installable VSIX and installation instructions.
- Document required file mappings, project compatibility, and troubleshooting.
- Add automated tests, packaging, and GitHub Releases for new versions on `main`.
- Make packaging work on Windows, macOS, and Linux with repository and license checks enabled.
- Bundle runtime dependencies to prevent missing or incompatible transitive packages in the VSIX, and run release integration tests against the extracted package.
- Require VS Code 1.90 or newer to provide a supported Node.js runtime for dependencies, and align the VS Code API types with that minimum.
- Add Marketplace search keywords and support links.

## 1.0.4

- Declare Node.js and VS Code types explicitly for extension compilation.
- Use a named Node.js path import in blocklist matching.
- Update the generation attribution in the README.

## 1.0.3

- Include runtime dependencies in the VSIX so the installed extension can activate.
- Match blocklist patterns relative to the closest project and workspace folder, while retaining absolute path matching.
- Serialize file operations and ignore stale deletion notifications for paths that exist again.
- Add regression coverage for blocklists, overlapping file operations, and package contents.
