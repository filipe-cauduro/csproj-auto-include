import * as vscode from "vscode"
import * as path from "path"
import { csprojPaths } from "./workspaceState"
import { addTagToCsproj, removeTagFromCsproj, removeTagsByPrefix } from "./csprojEditor"

import { minimatch } from "minimatch"

function isBlocked(filePath: string): boolean {
    const config = vscode.workspace.getConfiguration("csproj-auto-include");
    const blocklist = config.get<string[]>("blocklist", []);
    if (!blocklist || blocklist.length === 0) return false;

    // Normalize path to use forward slashes for matching
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of blocklist) {
        if (!pattern) continue;
        
        // Use minimatch with options like dot: true (match dotfiles) and matchBase (optional, but standard globs usually need /**/* for that)
        // minimatch by default matches exactly, but in VS code find all, a pattern like `*.cs` matches anywhere if it's `**/*.cs`
        // We'll let the user provide standard glob patterns.
        if (minimatch(normalizedPath, pattern, { dot: true, matchBase: true })) {
            return true;
        }
    }
    return false;
}

export async function handleNewFile(filePath: string, tag: string) {
    if (isBlocked(filePath)) return;

    // Find closest csproj
    let dir = path.dirname(filePath)
    let closestCsproj: string | undefined

    while (dir && dir !== path.dirname(dir)) {
        // until root
        for (const csproj of csprojPaths) {
            if (path.dirname(csproj) === dir) {
                closestCsproj = csproj
                break
            }
        }
        if (closestCsproj) {
            break
        }
        dir = path.dirname(dir)
    }

    if (!closestCsproj) {
        return // No csproj found for this file
    }

    // Modify the csproj
    try {
        const csprojUri = vscode.Uri.file(closestCsproj)
        const document = await vscode.workspace.openTextDocument(csprojUri)
        const csprojText = document.getText()

        const relativePath = path.relative(path.dirname(closestCsproj), filePath)
        // MSBuild uses backslashes for paths in ItemGroup includes
        const windowsPath = relativePath.split(path.sep).join("\\")

        const newCsprojText = addTagToCsproj(csprojText, tag, windowsPath)

        if (newCsprojText !== csprojText) {
            const edit = new vscode.WorkspaceEdit()
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(csprojText.length))
            edit.replace(csprojUri, fullRange, newCsprojText)
            await vscode.workspace.applyEdit(edit)
            await document.save()
        }
    } catch (err) {
        console.error("Error modifying csproj", err)
    }
}

export async function handleDeletedFile(filePath: string) {
    if (isBlocked(filePath)) return;

    // Find closest csproj
    let dir = path.dirname(filePath)
    let closestCsproj: string | undefined

    while (dir && dir !== path.dirname(dir)) {
        // until root
        for (const csproj of csprojPaths) {
            if (path.dirname(csproj) === dir) {
                closestCsproj = csproj
                break
            }
        }
        if (closestCsproj) {
            break
        }
        dir = path.dirname(dir)
    }

    if (!closestCsproj) {
        return // No csproj found for this file
    }

    // Modify the csproj
    try {
        const csprojUri = vscode.Uri.file(closestCsproj)
        const document = await vscode.workspace.openTextDocument(csprojUri)
        const csprojText = document.getText()

        const relativePath = path.relative(path.dirname(closestCsproj), filePath)
        const windowsPath = relativePath.split(path.sep).join("\\")

        let newCsprojText = removeTagFromCsproj(csprojText, windowsPath)
        newCsprojText = removeTagsByPrefix(newCsprojText, windowsPath + "\\")

        if (newCsprojText !== csprojText) {
            const edit = new vscode.WorkspaceEdit()
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(csprojText.length))
            edit.replace(csprojUri, fullRange, newCsprojText)
            await vscode.workspace.applyEdit(edit)
            await document.save()
        }
    } catch (err) {
        console.error("Error modifying csproj on delete", err)
    }
}

export async function handleRenamedFile(oldFilePath: string, newFilePath: string, newTag: string | undefined) {
    if (isBlocked(oldFilePath) && isBlocked(newFilePath)) return;
    
    // If only one is blocked, it's either a delete or create
    if (isBlocked(oldFilePath)) {
        // Was blocked, now unblocked (acts like create)
        if (newTag) {
            await handleNewFile(newFilePath, newTag);
        }
        return;
    }
    if (isBlocked(newFilePath)) {
        // Was unblocked, now blocked (acts like delete)
        await handleDeletedFile(oldFilePath);
        return;
    }

    let oldDir = path.dirname(oldFilePath)
    let oldClosestCsproj: string | undefined

    while (oldDir && oldDir !== path.dirname(oldDir)) {
        for (const csproj of csprojPaths) {
            if (path.dirname(csproj) === oldDir) {
                oldClosestCsproj = csproj
                break
            }
        }
        if (oldClosestCsproj) break
        oldDir = path.dirname(oldDir)
    }

    let newDir = path.dirname(newFilePath)
    let newClosestCsproj: string | undefined

    while (newDir && newDir !== path.dirname(newDir)) {
        for (const csproj of csprojPaths) {
            if (path.dirname(csproj) === newDir) {
                newClosestCsproj = csproj
                break
            }
        }
        if (newClosestCsproj) break
        newDir = path.dirname(newDir)
    }

    if (oldClosestCsproj && oldClosestCsproj === newClosestCsproj) {
        // Same csproj
        try {
            const csprojUri = vscode.Uri.file(oldClosestCsproj)
            const document = await vscode.workspace.openTextDocument(csprojUri)
            let csprojText = document.getText()

            const oldRelativePath = path.relative(path.dirname(oldClosestCsproj), oldFilePath)
            const oldWindowsPath = oldRelativePath.split(path.sep).join("\\")

            csprojText = removeTagFromCsproj(csprojText, oldWindowsPath)

            if (newTag) {
                const newRelativePath = path.relative(path.dirname(newClosestCsproj), newFilePath)
                const newWindowsPath = newRelativePath.split(path.sep).join("\\")
                csprojText = addTagToCsproj(csprojText, newTag, newWindowsPath)
            }

            if (csprojText !== document.getText()) {
                const edit = new vscode.WorkspaceEdit()
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                )
                edit.replace(csprojUri, fullRange, csprojText)
                await vscode.workspace.applyEdit(edit)
                await document.save()
                const config = vscode.workspace.getConfiguration("csproj-auto-include")
                if (config.get<boolean>("showNotifications")) {
                    vscode.window.showInformationMessage(`Successfully updated ${path.basename(csprojUri.fsPath)}!`);
                }
            } else {
                const config = vscode.workspace.getConfiguration("csproj-auto-include")
                if (config.get<boolean>("showNotifications")) {
                    vscode.window.showInformationMessage(`No changes needed in ${path.basename(csprojUri.fsPath)}.`);
                }
            }
        } catch (err) {
            console.error("Error modifying csproj on rename", err)
        }
    } else {
        // Different csproj, handle as delete then create
        if (oldClosestCsproj) {
            await handleDeletedFile(oldFilePath)
        }
        if (newClosestCsproj && newTag) {
            await handleNewFile(newFilePath, newTag)
        }
        if (!oldClosestCsproj && !newClosestCsproj) {
            const config = vscode.workspace.getConfiguration("csproj-auto-include")
            if (config.get<boolean>("showNotifications")) {
                vscode.window.showWarningMessage(`Could not find a .csproj for ${path.basename(oldFilePath)} or ${path.basename(newFilePath)}`);
            }
        }
    }
}
