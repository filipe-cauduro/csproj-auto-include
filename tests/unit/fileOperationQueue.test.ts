import * as assert from "node:assert/strict"
import { FileOperationQueue } from "../../src/fileOperationQueue"

function gate(): { promise: Promise<void>; release: () => void } {
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
        release = resolve
    })
    return { promise, release }
}

describe("File operation queue", () => {
    it("preserves project updates when another event arrives before a save finishes", async () => {
        const errors: unknown[] = []
        const queue = new FileOperationQueue((error) => errors.push(error))
        const started = gate()
        const saved = gate()
        let includes: string[] = []

        const first = queue.run(async () => {
            const original = [...includes]
            started.release()
            await saved.promise
            includes = [...original, "Created.cs"]
        })
        await started.promise
        const second = queue.run(async () => {
            includes = [...includes, "Renamed.cs"]
        })
        saved.release()
        await Promise.all([first, second])

        assert.deepEqual(includes, ["Created.cs", "Renamed.cs"])
        assert.deepEqual(errors, [])
    })

    it("reports a failed operation and continues processing later events", async () => {
        const errors: unknown[] = []
        const queue = new FileOperationQueue((error) => errors.push(error))
        const failure = new Error("Project save failed")
        let nextOperationRan = false

        const first = queue.run(async () => {
            throw failure
        })
        const second = queue.run(async () => {
            nextOperationRan = true
        })
        await Promise.all([first, second])

        assert.deepEqual(errors, [failure])
        assert.equal(nextOperationRan, true)
    })
})
