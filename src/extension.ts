import * as vscode from "vscode"
import * as path from "path"
import { csprojPaths } from "./workspaceState"
import { handleNewFile, handleDeletedFile, handleRenamedFile } from "./handlers"

export async function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("csproj-auto-include")
    if (config.get<boolean>("showNotifications")) {
        vscode.window.showInformationMessage("CSProj Auto Include is active!");
    }
    // Initial load
    const uris = await vscode.workspace.findFiles("**/*.csproj")
    for (const uri of uris) {
        csprojPaths.add(uri.fsPath)
    }

    // Watcher for csproj files
    const csprojWatcher = vscode.workspace.createFileSystemWatcher("**/*.csproj")
    csprojWatcher.onDidCreate((uri) => csprojPaths.add(uri.fsPath))
    csprojWatcher.onDidDelete((uri) => csprojPaths.delete(uri.fsPath))

    // Recursive directory walker
    async function walkDirectory(uri: vscode.Uri, callback: (fileUri: vscode.Uri) => Promise<void>) {
        try {
            const stat = await vscode.workspace.fs.stat(uri)
            if (stat.type === vscode.FileType.Directory) {
                const children = await vscode.workspace.fs.readDirectory(uri)
                for (const [name, type] of children) {
                    await walkDirectory(vscode.Uri.joinPath(uri, name), callback)
                }
            } else {
                await callback(uri)
            }
        } catch (e) {
            // ignore
        }
    }

    // Listen to new file creation
    const fileCreateListener = vscode.workspace.onDidCreateFiles(async (event) => {
        const config = vscode.workspace.getConfiguration("csproj-auto-include")
        const fileMappings = config.get<Record<string, string>>("fileMappings", {})

        for (const file of event.files) {
            await walkDirectory(file, async (fileUri) => {
                const ext = path.extname(fileUri.fsPath).toLowerCase()
                const extWithoutDot = ext.startsWith(".") ? ext.substring(1) : ext
                const tag = fileMappings[ext] || fileMappings[extWithoutDot]

                if (tag) {
                    await handleNewFile(fileUri.fsPath, tag)
                }
            })
        }
    })

    // Listen to file deletions
    const fileDeleteListener = vscode.workspace.onDidDeleteFiles(async (event) => {
        for (const file of event.files) {
            await handleDeletedFile(file.fsPath)
        }
    })

    // Listen to file renames
    const fileRenameListener = vscode.workspace.onDidRenameFiles(async (event) => {
        const config = vscode.workspace.getConfiguration("csproj-auto-include")
        const fileMappings = config.get<Record<string, string>>("fileMappings", {})

        for (const file of event.files) {
            let isDirectory = false
            try {
                const stat = await vscode.workspace.fs.stat(file.newUri)
                isDirectory = stat.type === vscode.FileType.Directory
            } catch (e) {
                // If stat fails (e.g., file locked during rename), assume it's a file
                isDirectory = false
            }

            try {
                if (isDirectory) {
                    await walkDirectory(file.newUri, async (childNewUri) => {
                        const relativePath = path.relative(file.newUri.fsPath, childNewUri.fsPath)
                        const childOldUri = vscode.Uri.file(path.join(file.oldUri.fsPath, relativePath))

                        const ext = path.extname(childNewUri.fsPath).toLowerCase()
                        const extWithoutDot = ext.startsWith(".") ? ext.substring(1) : ext
                        const tag = fileMappings[ext] || fileMappings[extWithoutDot]

                        await handleRenamedFile(childOldUri.fsPath, childNewUri.fsPath, tag)
                    })
                } else {
                    const ext = path.extname(file.newUri.fsPath).toLowerCase()
                    const extWithoutDot = ext.startsWith(".") ? ext.substring(1) : ext
                    const tag = fileMappings[ext] || fileMappings[extWithoutDot]

                    await handleRenamedFile(file.oldUri.fsPath, file.newUri.fsPath, tag)
                }
            } catch (e) {
                // ignore errors during processing
            }
        }
    })

    context.subscriptions.push(csprojWatcher, fileCreateListener, fileDeleteListener, fileRenameListener)
}

export function deactivate() {}
