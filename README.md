<h1 align="center">
	<br>
	CSProj Auto Include — VS Code Extension
	<br>
	<br>
</h1>

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)
[![GitHub release](https://img.shields.io/github/v/release/filipe-cauduro/csproj-auto-include)](https://github.com/filipe-cauduro/csproj-auto-include/releases/latest)

CSProj Auto Include is a Visual Studio Code (VS Code) extension that automatically maintains explicit file entries in C# MSBuild `.csproj` files. It updates the `<ItemGroup>` entries when you create, copy, move, rename, or delete files in the VS Code Explorer.

It is designed for projects that require explicit file includes, such as legacy .NET Framework projects. Configure the file extensions you want to track in `csproj-auto-include.fileMappings` to get started.

## Requirements

- **Visual Studio Code 1.90 or newer** on Windows, macOS, or Linux. This package is a VS Code extension; the Visual Studio IDE uses a different extension format.
- A workspace containing a `.csproj` that uses explicit file includes. SDK-style projects normally include files automatically and usually do not need this extension.
- File mappings configured as shown below. The default mapping is empty.

Node.js, Yarn, and this repository's source code are only needed for development. Users can install the packaged extension directly.

## Installation

### Download from GitHub Releases

1. Open the [latest release](https://github.com/filipe-cauduro/csproj-auto-include/releases/latest).
2. Under **Assets**, download `csproj-auto-include-<version>.vsix`. The source code ZIP and TAR archives are for development.
3. In VS Code, open **Extensions** (`Ctrl+Shift+X` on Windows/Linux or `Cmd+Shift+X` on macOS).
4. Open the **...** menu in the Extensions view, select **Install from VSIX...**, and choose the downloaded file.
5. Reload VS Code if prompted, then complete the first-time setup below.

You can also install the downloaded package from a terminal:

```sh
code --install-extension ./csproj-auto-include-1.0.5.vsix
```

To update a manually installed copy, download the newer VSIX from Releases and repeat these steps.

### VS Code Marketplace

The first Marketplace publication is pending. Until the listing is available, install the VSIX from GitHub Releases using the steps above.

## First-time setup

1. Open the folder containing your C# project or solution in VS Code.
2. Run **Preferences: Open Workspace Settings (JSON)** from the Command Palette.
3. Add these settings, merging them with any existing workspace settings:

```json
{
    "csproj-auto-include.fileMappings": {
        ".cs": "Compile"
    },
    "csproj-auto-include.blocklist": ["**/obj/**", "**/bin/**"]
}
```

4. Create a C# file through the **VS Code Explorer** inside your project folder. Its nearest `.csproj` should receive a `<Compile Include="..." />` entry.

There is no command to run: the extension activates automatically. It reacts to subsequent file operations; it does not import all existing files on installation. Creation, copying, moving, and renaming must happen through VS Code Explorer. Deletions are also tracked on disk.

## Highlights

- Triggers instantly on create, delete, rename, copy, or move
- Works on single files or entire folders recursively
- Smartly parses your `.csproj` to match existing indentation
- Automatically locates the closest `.csproj` in complex multi-project workspaces
- Configurable file mappings (e.g. `.cs` to `Compile`, `.xaml` to `Page`)
- Appends to existing `<ItemGroup>` tags or creates new ones cleanly

## Usage

The extension tracks file creation, copying, moving, and renaming through the VS Code Explorer. It also watches deletions on disk, so removing files through source control or the terminal removes their project entries.

If you create, copy, move, or rename a file (or an entire folder), the extension immediately traverses up the directory tree to find the nearest `.csproj` file and updates its contents. If you delete a file, it is instantly removed from the project file to prevent build errors.

*Note: The extension only tracks files with extensions explicitly configured in your settings.*

## Configuration

You can fully customize how the extension behaves using your VS Code `settings.json`.

### `csproj-auto-include.fileMappings`

Dictates which files the extension tracks and what XML tag they should receive. 

```json
{
    "csproj-auto-include.fileMappings": {
        ".cs": "Compile",
        ".xaml": "Page",
        ".json": "Content",
        ".sql": "EmbeddedResource"
    }
}
```

### `csproj-auto-include.blocklist`

Ignore files using glob patterns. Patterns match paths relative to the closest `.csproj` and the workspace folder, as well as absolute paths. Use forward slashes in patterns on all operating systems.

```json
{
    "csproj-auto-include.blocklist": ["obj/**", "bin/**", "*.test.cs"]
}
```

For example, `obj/**` ignores the `obj` directory beside the closest `.csproj`; `**/obj/**` also ignores `obj` directories nested further below it. Filename patterns such as `*.test.cs` match at any depth.

### `csproj-auto-include.showNotifications`

Determines whether to show a popup notification whenever a `.csproj` file is successfully updated.

- `false` (default) - Runs silently in the background.
- `true` - Shows visual confirmations.

## Testing (Local Development)

Use Node.js 22 LTS and Yarn Classic 1.22 to install dependencies and run the automated suites:

All test sources and runners are written in TypeScript and checked in strict mode. The commands compile them to `.vscode-test/compiled`, which is ignored by Git and excluded from the extension package.

```sh
yarn install --frozen-lockfile
yarn test
yarn test:integration
yarn test:package
yarn test:stress
```

- `yarn test` compiles the extension and runs the XML editor unit tests without opening VS Code.
- `yarn test:integration` tests real VS Code file operations, file mappings, project selection, and the blocklist. It uses the [official VS Code test runner](https://code.visualstudio.com/api/working-with-extensions/testing-extension) and downloads a separate copy of VS Code on its first run.
- `yarn test:package` checks the VSIX file list, exclusion of test files, and that the bundled entry point loads without external runtime packages.
- `yarn test:stress` checks rapid rename round trips for lost project entries. This is separate because reproducing the filesystem event race depends on timing.

Integration and stress tests use temporary copies of the sample solution and isolated VS Code profiles. Successful runs clean up their temporary files; failed runs print the retained workspace path, which includes `results.json` and VS Code logs. They require a desktop session; on a headless Linux machine, use `xvfb-run -a yarn test:integration` (or `test:stress`).

Set `VSCODE_TEST_VERSION` to test a specific VS Code version, or set `VSCODE_EXECUTABLE_PATH` to an existing VS Code executable to avoid downloading one. For example, on Linux:

```sh
VSCODE_EXECUTABLE_PATH=/usr/share/code/code yarn test:integration
```

The suites include regression checks for project-relative blocklists, bundled runtime dependencies, simultaneous file operations, and rapid renames. These commands return a nonzero exit code when a regression is detected; failures are not skipped or marked as expected successes.

To run the integration suite against an extracted VSIX, set `CSPROJ_TEST_EXTENSION_PATH` to its `extension` directory. Fixtures and test code still come from this repository.

For manual testing:

1. Open this extension's source code in VS Code.
2. Press **F5** to start the Extension Development Host.
3. The host automatically opens `tests/csharp-project-sample`.
4. Set `csproj-auto-include.fileMappings` to `{ ".cs": "Compile" }` in the host's workspace settings. Enable `csproj-auto-include.showNotifications` if you want activation notifications.
5. Create, rename, or copy files and folders inside `Project2` and watch `Project2.csproj` update in real-time.

If you are contributing and made more tests, commit them as well, I would really appreciate it!

**This code was generated using Codex and GPT 6.1 Sol.**

## Troubleshooting

- **Nothing happens:** check that the extension is enabled, your workspace contains a `.csproj`, and `fileMappings` contains the file's extension. Empty mappings track no file types.
- **A new file is not added:** create it through VS Code Explorer, check your blocklist, and make sure the file is inside the intended project folder.
- **An existing file is missing from the project:** existing files are not imported automatically; the extension responds to file operations after activation.
- **The wrong project is updated:** the extension selects the nearest `.csproj` by walking up from the file. Avoid placing multiple project files in the same directory when project selection would be ambiguous.
- **Installation fails:** check your VS Code version and make sure you downloaded a `.vsix` asset rather than a source archive.

For help or bug reports, [open an issue](https://github.com/filipe-cauduro/csproj-auto-include/issues) with your VS Code version, extension version, settings, and a minimal example of the affected project entries.

## Packaging and publishing (maintainers)

Run the checks and generate the installable package:

```sh
yarn test
yarn test:integration
yarn test:package
yarn test:stress
yarn package
```

The package is written to `dist/csproj-auto-include-<version>.vsix`. esbuild bundles runtime dependencies into `build/extension.js`; development dependencies, test sources, and downloaded VS Code instances are excluded.

### GitHub Releases

The [Release workflow](https://github.com/filipe-cauduro/csproj-auto-include/actions/workflows/release.yml) runs when `package.json` or the release workflow changes on `main`. It can also be started from **Actions > Release > Run workflow** on `main`.

For a new release, update `package.json` and add a matching section to `CHANGELOG.md`, then push the changes to `main`. The workflow installs dependencies from `yarn.lock`, runs unit and package checks, builds the VSIX, runs integration and stress tests against the extracted package, and publishes a `v<version>` GitHub release with the package attached. An already published version is skipped. The release uses the exact commit that passed the checks.

### Visual Studio Marketplace

1. Sign in to [Marketplace publisher management](https://marketplace.visualstudio.com/manage) with your Microsoft account and create or select the publisher whose ID matches `publisher` in `package.json` (`filipe-cauduro`).
2. Choose **New extension > Visual Studio Code** and upload the tested `dist/csproj-auto-include-1.0.5.vsix`, or download the same asset from the GitHub release. Complete the Marketplace validation and publication flow.
3. After publication, verify the [extension listing](https://marketplace.visualstudio.com/items?itemName=filipe-cauduro.csproj-auto-include), replace the pending notice above with the Marketplace installation link, and include this command:

```sh
code --install-extension filipe-cauduro.csproj-auto-include
```

For later updates, upload the newer tested VSIX through the publisher dashboard. Alternatively, authenticate locally with `yarn vsce login filipe-cauduro` and publish the same package with `yarn vsce publish --packagePath dist/csproj-auto-include-<version>.vsix`. Keep publishing tokens out of Git. See the [official publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) for authentication requirements.

## License

This project is licensed under the [MIT License](LICENSE).

You are free to use, modify, and distribute this software, even commercially, completely free of charge. The only requirement is that you must include the original copyright and permission notice in any copies or substantial portions of the software.

If you are using this code in your own project, please give credit by including the following snippet in your documentation or README:

```markdown
**CSProj Auto Include**  
Original code by Filipe. Licensed under the MIT License.  
[https://github.com/filipe-cauduro/csproj-auto-include]
```
