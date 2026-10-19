import * as fs from "node:fs/promises"
import * as path from "node:path"
import Mocha = require("mocha")
import * as assert from "node:assert/strict"
import { requiredEnvironmentVariable } from "../environment"

export interface IntegrationResults {
    stats: { tests: number; failures: number }
    failures: { name: string; error?: string }[]
}

export async function run(): Promise<void> {
    const mocha = new Mocha({ reporter: "spec" })
    mocha.addFile(path.join(__dirname, "extension.test.js"))
    await new Promise<void>((resolve, reject) => {
        const failures: IntegrationResults["failures"] = []
        const runner = mocha.run(async (count) => {
            try {
                assert.ok(runner.stats, "Mocha did not produce test statistics")
                const results: IntegrationResults = { stats: runner.stats, failures }
                await fs.writeFile(requiredEnvironmentVariable("CSPROJ_TEST_RESULTS"), JSON.stringify(results, null, 2))
                if (count) reject(new Error(`${count} integration test(s) failed`))
                else resolve()
            } catch (error) {
                reject(error)
            }
        })
        runner.on("fail", (test, error) => failures.push({ name: test.fullTitle(), error: error.stack }))
    })
}
