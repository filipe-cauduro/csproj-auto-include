import * as vscode from "vscode"
import * as path from "path"
import { csprojPaths } from "./workspaceState"
import { addTagToCsproj, removeTagFromCsproj, removeTagsByPrefix } from "./csprojEditor"

import { isPathBlocked } from "./blocklist"

function findClosestCsproj(filePath: string): string | undefined {
    let directory = path.dirname(filePath)
    while (directory) {
        for (const csproj of csprojPaths) {
            if (path.dirname(csproj) === directory) return csproj
        }
        const parent = path.dirname(directory)
        if (parent === directory) return undefined
        directory = parent
    }
    return undefined
}

function isBlocked(filePath: string): boolean {
    const uri = vscode.Uri.file(filePath)
    const config = vscode.workspace.getConfiguration("csproj-auto-include", uri)
    const blocklist = config.get<string[]>("blocklist", [])
    if (!blocklist?.length) return false
    const closestCsproj = findClosestCsproj(filePath)
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
    const baseDirectories: string[] = []
    if (closestCsproj) baseDirectories.push(path.dirname(closestCsproj))
    if (workspaceFolder) baseDirectories.push(workspaceFolder.uri.fsPath)
    return isPathBlocked(filePath, blocklist, baseDirectories)
}

export async function handleNewFile(filePath: string, tag: string) {
    if (isBlocked(filePath)) return

    // Find closest csproj
    const closestCsproj = findClosestCsproj(filePath)

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
    if (isBlocked(filePath)) return

    // Find closest csproj
    const closestCsproj = findClosestCsproj(filePath)

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
    if (isBlocked(oldFilePath) && isBlocked(newFilePath)) return

    // If only one is blocked, it's either a delete or create
    if (isBlocked(oldFilePath)) {
        // Was blocked, now unblocked (acts like create)
        if (newTag) {
            await handleNewFile(newFilePath, newTag)
        }
        return
    }
    if (isBlocked(newFilePath)) {
        // Was unblocked, now blocked (acts like delete)
        await handleDeletedFile(oldFilePath)
        return
    }

    const oldClosestCsproj = findClosestCsproj(oldFilePath)
    const newClosestCsproj = findClosestCsproj(newFilePath)

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
                    vscode.window.showInformationMessage(`Successfully updated ${path.basename(csprojUri.fsPath)}!`)
                }
            } else {
                const config = vscode.workspace.getConfiguration("csproj-auto-include")
                if (config.get<boolean>("showNotifications")) {
                    vscode.window.showInformationMessage(`No changes needed in ${path.basename(csprojUri.fsPath)}.`)
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
                vscode.window.showWarningMessage(
                    `Could not find a .csproj for ${path.basename(oldFilePath)} or ${path.basename(newFilePath)}`
                )
            }
        }
    }
}
