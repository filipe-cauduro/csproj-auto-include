<h1 align="center">
	<br>
	CSProj Auto Include — VS Code Extension
	<br>
	<br>
</h1>

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)

CSProj Auto Include is a Visual Studio Code (VS Code) extension that automatically maintains explicit file entries in C# MSBuild `.csproj` files. It updates the `<ItemGroup>` entries when you create, copy, move, rename, or delete files in the VS Code Explorer.

It is designed for projects that require explicit file includes, such as legacy .NET Framework projects. Configure the file extensions you want to track in `csproj-auto-include.fileMappings` to get started.

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

Use Node.js 20 or newer and Yarn to install dependencies and run the automated suites:

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
- `yarn test:package` checks the VSIX file list, including the compiled entry point, runtime dependencies, and exclusion of test files.
- `yarn test:stress` checks rapid rename round trips for lost project entries. This is separate because reproducing the filesystem event race depends on timing.

Integration and stress tests use temporary copies of the sample solution and isolated VS Code profiles. Successful runs clean up their temporary files; failed runs print the retained workspace path, which includes `results.json` and VS Code logs. They require a desktop session; on a headless Linux machine, use `xvfb-run -a yarn test:integration` (or `test:stress`).

Set `VSCODE_TEST_VERSION` to test a specific VS Code version, or set `VSCODE_EXECUTABLE_PATH` to an existing VS Code executable to avoid downloading one. For example, on Linux:

```sh
VSCODE_EXECUTABLE_PATH=/usr/share/code/code yarn test:integration
```

The suites include regression checks for project-relative blocklists, runtime dependencies in the VSIX, simultaneous file operations, and rapid renames. These commands return a nonzero exit code when a regression is detected; failures are not skipped or marked as expected successes.

To run the integration suite against an extracted VSIX, set `CSPROJ_TEST_EXTENSION_PATH` to its `extension` directory. Fixtures and test code still come from this repository.

For manual testing:

1. Open this extension's source code in VS Code.
2. Press **F5** to start the Extension Development Host.
3. The host automatically opens `tests/csharp-project-sample`.
4. Set `csproj-auto-include.fileMappings` to `{ ".cs": "Compile" }` in the host's workspace settings. Enable `csproj-auto-include.showNotifications` if you want activation notifications.
5. Create, rename, or copy files and folders inside `Project2` and watch `Project2.csproj` update in real-time.

If you are contributing and made more tests, commit them as well, I would really appreciate it!

**This code was generated using Antigravity and Gemini 3.1 Pro.**

## Packaging and Publishing

Run the checks and generate the installable package:

```sh
yarn test
yarn test:integration
yarn test:package
yarn test:stress
yarn package
```

The package is written to `dist/csproj-auto-include-<version>.vsix`. Runtime dependencies are included; development dependencies, test sources, and downloaded VS Code instances are excluded.

Upload the VSIX through the [Visual Studio Marketplace publisher management page](https://marketplace.visualstudio.com/manage/publishers/) under the `filipe-cauduro` publisher. For subsequent releases, increase `version` in `package.json` before generating the package. See the [official publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) for account setup and publishing options.

## License

This project is licensed under the [MIT License](LICENSE).

You are free to use, modify, and distribute this software, even commercially, completely free of charge. The only requirement is that you must include the original copyright and permission notice in any copies or substantial portions of the software.

If you are using this code in your own project, please give credit by including the following snippet in your documentation or README:

```markdown
**CSProj Auto Include**  
Original code by Filipe. Licensed under the MIT License.  
[https://github.com/filipe-cauduro/csproj-auto-include]
```
