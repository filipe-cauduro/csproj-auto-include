# Auto Import to CSProj

This extension automatically updates your `.csproj` files when you create or delete files.

## Features

- **Auto-import new files**: Whenever you create a new file (e.g. `.cs`), it is automatically added to the closest `.csproj` file as `<Compile Include="path\to\file.cs" />`.
- **Auto-remove deleted files**: When a tracked file is deleted, it will automatically remove its entry from the `.csproj` file.
- **Dynamic formatting**: Follows your existing indentation and keeps your project file clean.

## Settings

You can customize what tag each file extension receives in the `auto-import-to-csproj.fileMappings` setting.
