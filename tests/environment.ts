import * as assert from "node:assert/strict"
import * as path from "node:path"

// Tests compile to .vscode-test/compiled/tests; fixtures remain in the repository.
export const extensionRoot = path.resolve(__dirname, "../../..")

export function requiredEnvironmentVariable(name: string): string {
    const value = process.env[name]
    assert.ok(value, `Missing test environment variable: ${name}`)
    return value
}
