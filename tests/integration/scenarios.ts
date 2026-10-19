import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import type { Fixture } from "./fixture"

interface Scenario {
    name: string
    stress?: boolean
    run(fixture: Fixture): Promise<void>
}

// Each scenario receives its own copy of the sample solution.
export const scenarios: Scenario[] = [
    {
        name: "leaves C# files untouched with the default empty mappings",
        run: async (f) => {
            await f.configure({ fileMappings: {} })
            await f.create("Project2/Unmapped.cs")
            await f.expectItems("Project2", [], ["Unmapped.cs"])
        }
    },
    {
        name: "adds a newly created C# file to its closest project",
        run: async (f) => {
            await f.create("Project2/New.cs")
            await f.expectItems("Project2", ["New.cs"])
            await f.expectItems("Project1", [], ["New.cs"])
        }
    },
    {
        name: "renames an existing include",
        run: async (f) => {
            await f.rename("Project2/Class1.cs", "Project2/Renamed.cs")
            await f.expectItems("Project2", ["Renamed.cs"], ["Class1.cs"])
        }
    },
    {
        name: "moves a file between projects",
        run: async (f) => {
            await f.rename("Project2/Class1.cs", "Project1/Moved.cs")
            await f.expectItems("Project1", ["Moved.cs"])
            await f.expectItems("Project2", [], ["Class1.cs"])
        }
    },
    {
        name: "removes an include when deleting a file through VS Code",
        run: async (f) => {
            await f.remove("Project2/Class1.cs")
            await f.expectItems("Project2", [], ["Class1.cs"])
        }
    },
    {
        name: "tracks newly created files in nested folders",
        run: async (f) => {
            await f.create("Project2/Models/Nested/User.cs")
            await f.expectItems("Project2", ["Models\\Nested\\User.cs"])
        }
    },
    {
        name: "chooses a nested project instead of its parent project",
        run: async (f) => {
            await f.create("Project2/SubProject/Nested.cs")
            await f.expectItems("Project2/SubProject", ["Nested.cs"])
            await f.expectItems("Project2", [], ["SubProject\\Nested.cs"])
        }
    },
    {
        name: "renames a folder recursively",
        run: async (f) => {
            await f.rename("Project2/Properties", "Project2/RenamedProperties")
            await f.expectItems("Project2", ["RenamedProperties\\AssemblyInfo.cs"], ["Properties\\AssemblyInfo.cs"])
        }
    },
    {
        name: "deletes a folder recursively",
        run: async (f) => {
            await f.remove("Project2/Properties", true)
            await f.expectItems("Project2", [], ["Properties\\AssemblyInfo.cs"])
        }
    },
    {
        name: "copies a file using VS Code Explorer commands",
        run: async (f) => {
            await f.copy("Project2/Class1.cs", "Project2/Copied")
            await f.expectItems("Project2", ["Class1.cs", "Copied\\Class1.cs"])
        }
    },
    {
        name: "copies a folder recursively using VS Code Explorer commands",
        run: async (f) => {
            await f.copy("Project2/Properties", "Project2/Copied")
            await f.expectItems("Project2", ["Properties\\AssemblyInfo.cs", "Copied\\Properties\\AssemblyInfo.cs"])
        }
    },
    {
        name: "uses a custom item type for XAML files",
        run: async (f) => {
            await f.create("Project2/View.xaml")
            await f.expectItems("Project2", [{ path: "View.xaml", tag: "Page" }])
        }
    },
    {
        name: "accepts a mapping without a leading dot",
        run: async (f) => {
            await f.create("Project2/settings.json")
            await f.expectItems("Project2", [{ path: "settings.json", tag: "Content" }])
        }
    },
    {
        name: "matches uppercase file extensions",
        run: async (f) => {
            await f.create("Project2/Upper.CS")
            await f.expectItems("Project2", ["Upper.CS"])
        }
    },
    {
        name: "ignores extensions without a mapping",
        run: async (f) => {
            await f.create("Project2/Notes.txt")
            await f.expectItems("Project2", [], ["Notes.txt"])
        }
    },
    {
        name: "removes the old include when renaming to an unmapped extension",
        run: async (f) => {
            await f.rename("Project2/Class1.cs", "Project2/Class1.txt")
            await f.expectItems("Project2", [], ["Class1.cs", "Class1.txt"])
        }
    },
    {
        name: "adds an include when renaming from an unmapped extension",
        run: async (f) => {
            await fs.writeFile(f.uri("Project2/Notes.txt").fsPath, "// test")
            await f.rename("Project2/Notes.txt", "Project2/Notes.cs")
            await f.expectItems("Project2", ["Notes.cs"], ["Notes.txt"])
        }
    },
    {
        name: "ignores files created directly on disk",
        run: async (f) => {
            await fs.writeFile(f.uri("Project2/External.cs").fsPath, "// test")
            await f.expectItems("Project2", [], ["External.cs"])
        }
    },
    {
        name: "removes includes after external deletion as used by source control",
        run: async (f) => {
            await fs.unlink(f.uri("Project2/Class1.cs").fsPath)
            await f.expectItems("Project2", [], ["Class1.cs"])
        }
    },
    {
        name: "serializes simultaneous external deletions without losing updates",
        run: async (f) => {
            const names = ["One.cs", "Two.cs", "Three.cs"]
            for (const name of names) {
                await f.create(`Project2/${name}`)
                await f.expectItems("Project2", [name])
            }
            await Promise.all(names.map((name) => fs.unlink(f.uri(`Project2/${name}`).fsPath)))
            await f.expectItems("Project2", ["Class1.cs"], names)
        }
    },
    {
        name: "blocks files by filename glob",
        run: async (f) => {
            await f.configure({ blocklist: ["*.test.cs"] })
            await f.create("Project2/Skipped.test.cs")
            await f.expectItems("Project2", [], ["Skipped.test.cs"])
        }
    },
    {
        name: "blocks files by recursive folder glob",
        run: async (f) => {
            await f.configure({ blocklist: ["**/obj/**"] })
            await f.create("Project2/obj/Skipped.cs")
            await f.expectItems("Project2", [], ["obj\\Skipped.cs"])
        }
    },
    {
        name: "removes an include when renaming into the blocklist",
        run: async (f) => {
            await f.configure({ blocklist: ["*.test.cs"] })
            await f.rename("Project2/Class1.cs", "Project2/Class1.test.cs")
            await f.expectItems("Project2", [], ["Class1.cs", "Class1.test.cs"])
        }
    },
    {
        name: "adds an include when renaming out of the blocklist",
        run: async (f) => {
            await f.configure({ blocklist: ["*.test.cs"] })
            await fs.writeFile(f.uri("Project2/Skipped.test.cs").fsPath, "// test")
            await f.rename("Project2/Skipped.test.cs", "Project2/Allowed.cs")
            await f.expectItems("Project2", ["Allowed.cs"], ["Skipped.test.cs"])
        }
    },
    {
        name: "ignores files outside any project",
        run: async (f) => {
            await f.create("Outside.cs")
            await f.expectItems("Project1", [], ["Outside.cs", "..\\Outside.cs"])
            await f.expectItems("Project2", [], ["Outside.cs", "..\\Outside.cs"])
        }
    },
    {
        name: "keeps all includes when several create events arrive together",
        run: async (f) => {
            const names = ["ConcurrentOne.cs", "ConcurrentTwo.cs", "ConcurrentThree.cs"]
            await Promise.all(names.map((name) => f.create(`Project2/${name}`)))
            await f.expectItems("Project2", ["Class1.cs", ...names])
        }
    },
    {
        name: "keeps an include when a deleted file is immediately recreated externally",
        run: async (f) => {
            const uri = f.uri("Project2/Class1.cs")
            const original = await fs.readFile(uri.fsPath)
            await fs.unlink(uri.fsPath)
            await fs.writeFile(uri.fsPath, original)
            await f.expectItems("Project2", ["Class1.cs"], [], 1000)
        }
    },
    {
        name: "keeps an include after an immediate rename round trip",
        run: async (f) => {
            await f.rename("Project2/Class1.cs", "Project2/Temporary.cs")
            await f.rename("Project2/Temporary.cs", "Project2/Class1.cs")
            await f.expectItems("Project2", ["Class1.cs"], ["Temporary.cs"], 1000)
        }
    },
    {
        name: "blocks files using the documented relative folder glob obj/** (regression)",
        run: async (f) => {
            await f.configure({ blocklist: ["obj/**"] })
            await f.create("Project2/obj/Skipped.cs")
            await f.expectItems("Project2", [], ["obj\\Skipped.cs"])
        }
    },
    {
        name: "preserves includes during rapid rename round trips (stress regression)",
        stress: true,
        run: async (f) => {
            for (let i = 0; i < 10; i++) {
                const name = `Rapid${i}.cs`
                await f.create(`Project2/${name}`)
                await f.waitForItem("Project2", name)
                await f.rename(`Project2/${name}`, `Project2/Temporary${i}.cs`)
                await f.waitForItem("Project2", `Temporary${i}.cs`)
                await f.rename(`Project2/Temporary${i}.cs`, `Project2/${name}`)
                await f.expectItems("Project2", [name], [`Temporary${i}.cs`])
                assert.ok((await fs.stat(f.uri(`Project2/${name}`).fsPath)).isFile())
            }
        }
    }
]
