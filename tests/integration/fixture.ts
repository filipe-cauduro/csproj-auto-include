import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as vscode from "vscode"

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

type ProjectItem = string | { path: string; tag?: string }

interface ConfigurationValues {
    fileMappings?: Record<string, string>
    blocklist?: string[]
}

export class Fixture {
    constructor(private readonly directory: string) {}

    uri(relativePath: string): vscode.Uri {
        return vscode.Uri.file(path.join(this.directory, relativePath))
    }

    async configure(values: ConfigurationValues): Promise<void> {
        const config = vscode.workspace.getConfiguration("csproj-auto-include")
        for (const [key, value] of Object.entries(values)) {
            await config.update(key, value, vscode.ConfigurationTarget.Workspace)
        }
    }

    async create(relativePath: string): Promise<void> {
        const edit = new vscode.WorkspaceEdit()
        edit.createFile(this.uri(relativePath), { contents: Buffer.from("// automated test\n") })
        assert.equal(await vscode.workspace.applyEdit(edit), true, `Could not create ${relativePath}`)
    }

    async rename(from: string, to: string): Promise<void> {
        const edit = new vscode.WorkspaceEdit()
        edit.renameFile(this.uri(from), this.uri(to))
        assert.equal(await vscode.workspace.applyEdit(edit), true, `Could not rename ${from} to ${to}`)
    }

    async remove(relativePath: string, recursive = false): Promise<void> {
        const edit = new vscode.WorkspaceEdit()
        edit.deleteFile(this.uri(relativePath), { recursive })
        assert.equal(await vscode.workspace.applyEdit(edit), true, `Could not delete ${relativePath}`)
    }

    async copy(source: string, targetDirectory: string): Promise<void> {
        await vscode.workspace.fs.createDirectory(this.uri(targetDirectory))
        await vscode.commands.executeCommand("workbench.view.explorer")
        await vscode.commands.executeCommand("revealInExplorer", this.uri(source))
        await vscode.commands.executeCommand("filesExplorer.copy")
        await vscode.commands.executeCommand("revealInExplorer", this.uri(targetDirectory))
        await vscode.commands.executeCommand("filesExplorer.paste")
        // Prove the Explorer actually copied the resource before checking the project.
        await fs.stat(this.uri(`${targetDirectory}/${path.basename(source)}`).fsPath)
    }

    async projectText(project: string): Promise<string> {
        return fs.readFile(this.uri(`${project}/${path.basename(project)}.csproj`).fsPath, "utf8")
    }

    async waitForItem(project: string, item: string): Promise<void> {
        await this.expectItems(project, [item], [], 0)
    }

    async expectItems(
        project: string,
        present: ProjectItem[] = [],
        absent: string[] = [],
        stableFor = 500
    ): Promise<void> {
        const deadline = Date.now() + 5000
        let matchingSince: number | undefined
        let actual = ""
        while (Date.now() < deadline) {
            actual = await this.projectText(project)
            const matches =
                present.every((item) => {
                    const { tag = "Compile", path: include } = typeof item === "string" ? { path: item } : item
                    return actual.includes(`<${tag} Include="${include}"`)
                }) && absent.every((item) => !actual.includes(`Include="${item}"`))
            if (matches) {
                matchingSince ??= Date.now()
                if (Date.now() - matchingSince >= stableFor) return
            } else {
                matchingSince = undefined
            }
            await pause(50)
        }
        assert.fail(
            `${project} did not keep the expected entries for ${stableFor}ms.\n` +
                `Expected: ${JSON.stringify(present)}\nExcluded: ${JSON.stringify(absent)}\nActual:\n${actual}`
        )
    }
}
