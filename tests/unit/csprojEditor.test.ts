import * as assert from "node:assert/strict"
import { addTagToCsproj, removeTagFromCsproj, removeTagsByPrefix } from "../../src/csprojEditor"

const project = (items: string[], newline = "\n"): string =>
    ["<Project>", "  <ItemGroup>", ...items.map((item) => `    ${item}`), "  </ItemGroup>", "</Project>", ""].join(
        newline
    )

describe("Adding project items", () => {
    it("adds a file to the existing group without changing other entries", () => {
        const original = project(['<Compile Include="Program.cs" />', '<Reference Include="System" />'])
        assert.equal(
            addTagToCsproj(original, "Compile", "Models\\User.cs"),
            project([
                '<Compile Include="Program.cs" />',
                '<Compile Include="Models\\User.cs" />',
                '<Reference Include="System" />'
            ])
        )
    })

    it("does not duplicate an existing include", () => {
        const original = project(['<Compile Include="Program.cs" />'])
        assert.equal(addTagToCsproj(original, "Compile", "Program.cs"), original)
    })

    it("preserves tab indentation", () => {
        const original = '<Project>\n\t<ItemGroup>\n\t\t<Compile Include="Old.cs" />\n\t</ItemGroup>\n</Project>\n'
        const updated = addTagToCsproj(original, "Compile", "New.cs")
        assert.ok(updated.includes('\n\t\t<Compile Include="New.cs" />\n'))
    })

    it("preserves CRLF when inserting into an existing group", () => {
        const original = project(['<Compile Include="Old.cs" />'], "\r\n")
        assert.equal(
            addTagToCsproj(original, "Compile", "New.cs"),
            project(['<Compile Include="Old.cs" />', '<Compile Include="New.cs" />'], "\r\n")
        )
    })

    it("inserts after a complete item with child metadata", () => {
        const original = project([
            '<Compile Include="Designer.cs">',
            "  <DependentUpon>Form.cs</DependentUpon>",
            "</Compile>"
        ])
        assert.equal(
            addTagToCsproj(original, "Compile", "New.cs"),
            project([
                '<Compile Include="Designer.cs">',
                "  <DependentUpon>Form.cs</DependentUpon>",
                "</Compile>",
                '<Compile Include="New.cs" />'
            ])
        )
    })

    it("creates a separate group for a new item type", () => {
        const original = project(['<Compile Include="Program.cs" />'])
        const updated = addTagToCsproj(original, "Page", "View.xaml")
        assert.equal((updated.match(/<ItemGroup>/g) || []).length, 2)
        assert.ok(updated.includes('  <ItemGroup>\n    <Page Include="View.xaml" />\n  </ItemGroup>'))
        assert.ok(updated.includes('<Compile Include="Program.cs" />'))
    })

    it("creates the first item group before the closing project tag", () => {
        assert.equal(
            addTagToCsproj("<Project>\n</Project>\n", "Content", "settings.json"),
            '<Project>\n  <ItemGroup>\n    <Content Include="settings.json" />\n  </ItemGroup>\n</Project>\n'
        )
    })

    it("uses the matching group instead of an unrelated group", () => {
        const original =
            '<Project>\n  <ItemGroup>\n    <Compile Include="Old.cs" />\n  </ItemGroup>\n' +
            '  <ItemGroup>\n    <Reference Include="System" />\n  </ItemGroup>\n</Project>\n'
        const updated = addTagToCsproj(original, "Compile", "New.cs")
        assert.ok(updated.indexOf('Include="New.cs"') < updated.indexOf("</ItemGroup>"))
        assert.ok(updated.includes('<Reference Include="System" />'))
    })

    it("leaves input without a closing project tag unchanged", () => {
        assert.equal(addTagToCsproj("<invalid />", "Compile", "New.cs"), "<invalid />")
    })
})

describe("Removing project items", () => {
    it("removes only the exact include", () => {
        const original = project(['<Compile Include="User.cs" />', '<Compile Include="SuperUser.cs" />'])
        assert.equal(removeTagFromCsproj(original, "User.cs"), project(['<Compile Include="SuperUser.cs" />']))
    })

    it("removes the whole item including child metadata", () => {
        const original = project([
            '<Compile Include="Designer.cs">',
            "  <DependentUpon>Form.cs</DependentUpon>",
            "</Compile>",
            '<Compile Include="Form.cs" />'
        ])
        assert.equal(removeTagFromCsproj(original, "Designer.cs"), project(['<Compile Include="Form.cs" />']))
    })

    it("removes an empty group after deleting its final item", () => {
        assert.equal(
            removeTagFromCsproj(project(['<Compile Include="Only.cs" />']), "Only.cs"),
            "<Project>\n</Project>\n"
        )
    })

    it("removes every occurrence across groups", () => {
        const original =
            '<Project>\n  <ItemGroup>\n    <Compile Include="Duplicate.cs" />\n  </ItemGroup>\n' +
            '  <ItemGroup>\n    <Content Include="Duplicate.cs" />\n  </ItemGroup>\n</Project>\n'
        assert.equal(removeTagFromCsproj(original, "Duplicate.cs"), "<Project>\n</Project>\n")
    })

    it("preserves CRLF around remaining entries", () => {
        const original = project(['<Compile Include="Old.cs" />', '<Compile Include="Keep.cs" />'], "\r\n")
        assert.equal(removeTagFromCsproj(original, "Old.cs"), project(['<Compile Include="Keep.cs" />'], "\r\n"))
    })

    it("leaves an unknown include unchanged", () => {
        const original = project(['<Compile Include="Keep.cs" />'])
        assert.equal(removeTagFromCsproj(original, "Missing.cs"), original)
    })

    it("removes a folder recursively without removing similarly named siblings", () => {
        const original = project([
            '<Compile Include="Models\\User.cs" />',
            '<Compile Include="Models\\Nested\\Order.cs" />',
            '<Content Include="Models\\schema.json" />',
            '<Compile Include="ModelsExtra\\Keep.cs" />'
        ])
        assert.equal(removeTagsByPrefix(original, "Models\\"), project(['<Compile Include="ModelsExtra\\Keep.cs" />']))
    })
})
