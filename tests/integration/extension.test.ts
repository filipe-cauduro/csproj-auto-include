import * as assert from "node:assert/strict"
import * as path from "node:path"
import * as vscode from "vscode"
import { Fixture } from "./fixture"
import { scenarios } from "./scenarios"
import { requiredEnvironmentVariable } from "../environment"

describe("VS Code file operations", function () {
    this.timeout(20000)

    before(async () => {
        const extension = vscode.extensions.getExtension("filipe-cauduro.csproj-auto-include")
        assert.ok(extension, "VS Code did not discover the extension")
        await extension.activate()
        assert.ok(extension.isActive, "The extension did not activate")
    })

    for (const [index, scenario] of scenarios.entries()) {
        if (Boolean(process.env.CSPROJ_TEST_STRESS) !== Boolean(scenario.stress)) continue
        it(scenario.name, async () => {
            const fixture = new Fixture(
                path.join(requiredEnvironmentVariable("CSPROJ_TEST_WORKSPACE"), `case-${index}`)
            )
            await fixture.configure({
                fileMappings: { ".cs": "Compile", ".xaml": "Page", json: "Content" },
                blocklist: []
            })
            await scenario.run(fixture)
        })
    }
})
