import * as assert from "node:assert/strict"
import * as path from "node:path"
import { createRequire } from "node:module"
import { listFiles, PackageManager } from "@vscode/vsce"
import manifest = require("../package.json")
import { extensionRoot } from "./environment"

describe("Extension package contents", () => {
    let files: Set<string>
    const root = extensionRoot

    before(async () => {
        files = new Set(
            (await listFiles({ cwd: root, packageManager: PackageManager.Yarn })).map((file) =>
                file.replace(/\\/g, "/")
            )
        )
    })

    it("includes the compiled extension entry point", () => {
        assert.ok(files.has(manifest.main.replace(/^\.\//, "")), "The extension entry point is missing from the VSIX")
    })

    it("excludes test fixtures, test runners, and downloaded VS Code instances", () => {
        const excluded = [...files].filter((file) => /^(tests|\.vscode-test|\.agents)\//.test(file))
        assert.deepEqual(excluded, [])
    })

    for (const dependency of Object.keys(manifest.dependencies || {})) {
        it(`includes the runtime entry point of ${dependency}`, () => {
            const fromExtension = createRequire(path.join(root, manifest.main))
            const entry = path.relative(root, fromExtension.resolve(dependency)).split(path.sep).join("/")
            assert.ok(files.has(entry), `Runtime dependency ${dependency} is missing from the VSIX: ${entry}`)
        })
    }
})
