import * as assert from "node:assert/strict"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { isBuiltin } from "node:module"
import * as vm from "node:vm"
import { listFiles, PackageManager } from "@vscode/vsce"
import manifest = require("../package.json")
import { extensionRoot } from "./environment"

describe("Extension package contents", () => {
    let files: Set<string>
    const root = extensionRoot

    before(async () => {
        files = new Set(
            (await listFiles({ cwd: root, packageManager: PackageManager.None })).map((file) =>
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

    it("excludes development dependencies from the package", () => {
        const excluded = [...files].filter((file) =>
            /^node_modules\/(mocha|typescript|@vscode\/test-electron)\//.test(file)
        )
        assert.deepEqual(excluded, [])
    })

    it("loads the bundled extension without external runtime dependencies", async () => {
        const exports: Record<string, unknown> = {}
        const module = { exports }
        const bundle = await fs.readFile(path.join(root, manifest.main), "utf8")
        vm.runInNewContext(bundle, {
            exports,
            module,
            require: (id: string) => {
                if (id === "vscode") return {}
                assert.ok(isBuiltin(id), `Unbundled runtime dependency: ${id}`)
                return require(id)
            }
        })
        assert.equal(typeof module.exports.activate, "function")
        assert.equal(typeof module.exports.deactivate, "function")
    })
})
