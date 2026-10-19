import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { runTests } from "@vscode/test-electron"
import { scenarios } from "./integration/scenarios"
import { extensionRoot } from "./environment"
import type { IntegrationResults } from "./integration"

async function main(): Promise<void> {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "csproj-auto-include-tests-"))
    const workspace = path.join(temporaryRoot, "workspace")
    const resultsPath = path.join(temporaryRoot, "results.json")
    const stress = process.argv.includes("--stress")
    const selected = scenarios.filter((scenario) => Boolean(scenario.stress) === stress)
    let passed = false

    try {
        await fs.mkdir(path.join(workspace, ".vscode"), { recursive: true })
        await fs.writeFile(
            path.join(workspace, ".vscode", "settings.json"),
            JSON.stringify({
                "csproj-auto-include.fileMappings": {},
                "csproj-auto-include.showNotifications": false,
                "files.enableTrash": false,
                "telemetry.telemetryLevel": "off"
            })
        )
        for (const [index, scenario] of scenarios.entries()) {
            if (Boolean(scenario.stress) !== stress) continue
            const fixture = path.join(workspace, `case-${index}`)
            await fs.cp(path.join(extensionRoot, "tests", "csharp-project-sample"), fixture, { recursive: true })
            const nested = path.join(fixture, "Project2", "SubProject")
            await fs.mkdir(nested)
            await fs.writeFile(path.join(nested, "SubProject.csproj"), "<Project>\n</Project>\n")
        }

        console.log(`Running ${selected.length} integration scenarios in ${temporaryRoot}`)
        await runTests({
            vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH,
            version: process.env.VSCODE_TEST_VERSION || "stable",
            extensionDevelopmentPath: extensionRoot,
            extensionTestsPath: path.join(__dirname, "integration", "index.js"),
            extensionTestsEnv: {
                ELECTRON_RUN_AS_NODE: undefined,
                CSPROJ_TEST_WORKSPACE: workspace,
                CSPROJ_TEST_RESULTS: resultsPath,
                CSPROJ_TEST_STRESS: stress ? "1" : ""
            },
            launchArgs: [
                workspace,
                "--disable-extensions",
                "--skip-add-to-recently-opened",
                `--user-data-dir=${path.join(temporaryRoot, "user-data")}`,
                `--extensions-dir=${path.join(temporaryRoot, "extensions")}`
            ]
        })
        // A launcher exiting successfully is insufficient: the suite must have run.
        const results = JSON.parse(await fs.readFile(resultsPath, "utf8")) as IntegrationResults
        assert.equal(results.stats.tests, selected.length, "Not all integration scenarios ran")
        assert.equal(results.stats.failures, 0)
        passed = true
    } finally {
        if (passed) await fs.rm(temporaryRoot, { recursive: true, force: true })
        else console.error(`Test workspace, results, and VS Code logs retained at: ${temporaryRoot}`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
