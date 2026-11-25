const fs = require("node:fs")
const { version } = require("../package.json")
const changelog = fs.readFileSync("CHANGELOG.md", "utf8")
const sections = changelog.split(/^## /m).slice(1)
const section = sections.find((entry) => entry.split(/\r?\n/, 1)[0].trim() === version)
if (!section) throw new Error(`Missing CHANGELOG.md section for ${version}`)
const changes = section.substring(section.indexOf("\n") + 1).trim()
if (!changes) throw new Error(`Empty changelog for ${version}`)
process.stdout.write(`CSProj Auto Include automatically maintains explicit file includes in C# MSBuild projects when files are created, copied, moved, renamed, or deleted in VS Code.

## Changes

${changes}

## Installation

Requires Visual Studio Code 1.90 or newer on Windows, macOS, or Linux.

1. Download \`csproj-auto-include-${version}.vsix\` from the assets below.
2. In VS Code, open Extensions, select **... > Install from VSIX...**, and choose the downloaded file.
3. Open your project folder and configure workspace settings:

\`\`\`json
{
    "csproj-auto-include.fileMappings": { ".cs": "Compile" },
    "csproj-auto-include.blocklist": ["**/obj/**", "**/bin/**"]
}
\`\`\`

Create a C# file through VS Code Explorer to see its nearest \`.csproj\` update. File mappings are required; existing files are not imported automatically.

[Full setup and configuration](https://github.com/filipe-cauduro/csproj-auto-include/blob/v${version}/README.md)
`)
