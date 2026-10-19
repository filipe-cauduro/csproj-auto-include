import * as assert from "node:assert/strict"
import * as path from "node:path"
import { isPathBlocked } from "../../src/blocklist"

describe("Blocklist path matching", () => {
    const workspace = path.resolve("sample-workspace")
    const project = path.join(workspace, "Project2")
    const roots = [project, workspace]

    it("matches folder globs relative to the closest project", () => {
        assert.equal(isPathBlocked(path.join(project, "obj", "Generated.cs"), ["obj/**"], roots), true)
        assert.equal(isPathBlocked(path.join(project, "Objects", "Keep.cs"), ["obj/**"], roots), false)
    })

    it("matches patterns relative to the workspace as well", () => {
        assert.equal(isPathBlocked(path.join(project, "Generated.cs"), ["Project2/**"], roots), true)
    })

    it("keeps absolute path patterns working", () => {
        const filePath = path.join(project, "Generated.cs")
        assert.equal(isPathBlocked(filePath, [filePath.replace(/\\/g, "/")], roots), true)
    })

    it("matches filenames and recursive globs at any depth", () => {
        assert.equal(isPathBlocked(path.join(project, "Models", "User.test.cs"), ["*.test.cs"], roots), true)
        assert.equal(isPathBlocked(path.join(project, "Nested", "obj", "Generated.cs"), ["**/obj/**"], roots), true)
    })

    it("normalizes Windows paths and includes dot directories", () => {
        assert.equal(isPathBlocked("C:\\Project\\.cache\\Generated.cs", ["**/.cache/**"], []), true)
    })

    it("ignores empty patterns and allows unrelated files", () => {
        const filePath = path.join(project, "Models", "User.cs")
        assert.equal(isPathBlocked(filePath, [], roots), false)
        assert.equal(isPathBlocked(filePath, ["", "obj/**", "*.test.cs"], roots), false)
    })
})
