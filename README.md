<h1 align="center">
	<br>
	CSProj Auto Include
	<br>
	<br>
</h1>

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)

CSProj Auto Include automates the tedious process of manually maintaining your `.csproj` files when working in MSBuild C# projects. It automatically updates the `<ItemGroup>` tags in your `.csproj` files whenever you modify files in your VS Code workspace.

## Highlights

- Triggers instantly on create, delete, rename, copy, or move
- Works on single files or entire folders recursively
- Smartly parses your `.csproj` to match existing indentation
- Automatically locates the closest `.csproj` in complex multi-project workspaces
- Configurable file mappings (e.g. `.cs` to `Compile`, `.xaml` to `Page`)
- Appends to existing `<ItemGroup>` tags or creates new ones cleanly

## Usage

The extension works automatically in the background by listening to file operations performed through the VS Code Explorer (and only through it, to prevent unintended changes from the terminal or other tools).

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

### `csproj-auto-include.showNotifications`

Determines whether to show a popup notification whenever a `.csproj` file is successfully updated.

- `false` (default) - Runs silently in the background.
- `true` - Shows visual confirmations.

## Testing (Local Development)

There is a local sample project that can be used in development mode:
1. Open this extension's source code in VS Code.
2. Press **F5** to start the Extension Development Host.
3. The host automatically opens `tests/csharp-project-sample`.
4. Wait for the **"CSProj Auto Include is active!"** popup.
5. Create, rename, or copy files and folders inside `Project2` and watch `Project2.csproj` update in real-time.

If you are contributing and made more tests, commit them as well, I would really appreciate it!

**This code was generated using Antigravity and Gemini 3.1 Pro.**

## License

This project is licensed under the [MIT License](LICENSE).

You are free to use, modify, and distribute this software, even commercially, completely free of charge. The only requirement is that you must include the original copyright and permission notice in any copies or substantial portions of the software.

If you are using this code in your own project, please give credit by including the following snippet in your documentation or README:

```markdown
**CSProj Auto Include**  
Original code by Filipe. Licensed under the MIT License.  
[https://github.com/your-username/csproj-auto-include]
```
