const fs = require("node:fs")
const path = require("node:path")
const { buildSync } = require("esbuild")

const { icon } = require("../package.json")
const iconData = fs.readFileSync(icon)
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
if (iconData.length < 24 || !iconData.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`Extension icon must be a PNG: ${icon}`)
}
const iconWidth = iconData.readUInt32BE(16)
const iconHeight = iconData.readUInt32BE(20)
if (iconWidth !== iconHeight || iconWidth < 128 || iconWidth > 1024) {
    throw new Error(`Extension icon must be square and between 128 and 1024 pixels; got ${iconWidth}x${iconHeight}`)
}

const result = buildSync({
    entryPoints: ["src/extension.ts"],
    outfile: "build/extension.js",
    bundle: true,
    platform: "node",
    target: "node20",
    external: ["vscode"],
    metafile: true
})

// Preserve the license notices of every package included in the bundle.
const packages = new Map()
for (const input of Object.keys(result.metafile.inputs)) {
    if (!input.includes("node_modules/")) continue
    let directory = path.dirname(path.resolve(input))
    while (directory !== path.dirname(directory)) {
        const manifestPath = path.join(directory, "package.json")
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
            if (manifest.name) {
                packages.set(directory, manifest)
                break
            }
        }
        directory = path.dirname(directory)
    }
}
const notices = []
for (const [directory, manifest] of packages) {
    const license = fs.readdirSync(directory).find((name) => /^licen[sc]e(?:\.(?:md|txt))?$/i.test(name))
    if (!license) throw new Error(`Missing license notice for ${manifest.name}`)
    notices.push(`${manifest.name} ${manifest.version}\n\n${fs.readFileSync(path.join(directory, license), "utf8").trim()}`)
}
fs.writeFileSync("build/ThirdPartyNotices.txt", notices.join("\n\n---\n\n") + "\n")
