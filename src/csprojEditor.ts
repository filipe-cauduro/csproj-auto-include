export function addTagToCsproj(csprojText: string, tag: string, includePath: string): string {
    let indentation = "    "
    const includeMatch = csprojText.match(/^([ \t]*)<[a-zA-Z0-9_]+\s+Include=/m)
    if (includeMatch) {
        indentation = includeMatch[1]
    }

    const newElement = `${indentation}<${tag} Include="${includePath}" />\n`

    // Check if already included
    if (csprojText.includes(`Include="${includePath}"`)) {
        return csprojText // Already there
    }

    // Try to find an existing ItemGroup that contains the same tag
    const itemGroupRegex = /<ItemGroup>([\s\S]*?)<\/ItemGroup>/g
    let match
    let lastItemGroupEndIndex = -1
    let targetItemGroupMatch: RegExpExecArray | null = null

    while ((match = itemGroupRegex.exec(csprojText)) !== null) {
        lastItemGroupEndIndex = itemGroupRegex.lastIndex
        const innerContent = match[1]

        // If this ItemGroup contains elements of the same tag type
        if (
            innerContent.includes(`<${tag} `) ||
            innerContent.includes(`<${tag}>`) ||
            innerContent.includes(`<${tag}\r`) ||
            innerContent.includes(`<${tag}\n`)
        ) {
            targetItemGroupMatch = match
        }
    }

    if (targetItemGroupMatch) {
        const innerContent = targetItemGroupMatch[1]

        let lastTagStart = -1
        const tagRegex = new RegExp(`<${tag}[\\s>\\r\\n]`, "g")
        let tm
        while ((tm = tagRegex.exec(innerContent)) !== null) {
            lastTagStart = tm.index
        }

        let insertOffset = innerContent.length
        if (lastTagStart !== -1) {
            const closingTag = `</${tag}>`
            const closingTagIdx = innerContent.indexOf(closingTag, lastTagStart)
            if (closingTagIdx !== -1) {
                insertOffset = closingTagIdx + closingTag.length
            } else {
                const selfClosingIdx = innerContent.indexOf("/>", lastTagStart)
                if (selfClosingIdx !== -1) {
                    insertOffset = selfClosingIdx + "/>".length
                } else {
                    const normalClosingIdx = innerContent.indexOf(">", lastTagStart)
                    if (normalClosingIdx !== -1) {
                        insertOffset = normalClosingIdx + ">".length
                    }
                }
            }
        }

        const insertPos = targetItemGroupMatch.index + "<ItemGroup>".length + insertOffset
        const newline = csprojText.includes("\r\n") ? "\r\n" : "\n"

        return csprojText.slice(0, insertPos) + newline + newElement.replace(/\n$/, "") + csprojText.slice(insertPos)
    }

    // No ItemGroup with this tag found. Create a new ItemGroup.
    let itemGroupIndent = "  "
    const itemGroupMatch = csprojText.match(/^([ \t]*)<ItemGroup>/m)
    if (itemGroupMatch) {
        itemGroupIndent = itemGroupMatch[1]
    } else if (includeMatch) {
        itemGroupIndent = indentation.slice(0, Math.max(0, indentation.length - 2))
    }

    const newItemGroupBlock = `${itemGroupIndent}<ItemGroup>\n${newElement}${itemGroupIndent}</ItemGroup>\n`

    if (lastItemGroupEndIndex !== -1) {
        // Insert after the last ItemGroup
        return (
            csprojText.slice(0, lastItemGroupEndIndex) +
            "\n" +
            newItemGroupBlock +
            csprojText.slice(lastItemGroupEndIndex)
        )
    }

    // No ItemGroup found at all. Insert before </Project>
    const projectEndMatch = csprojText.lastIndexOf("</Project>")
    if (projectEndMatch !== -1) {
        return csprojText.slice(0, projectEndMatch) + newItemGroupBlock + csprojText.slice(projectEndMatch)
    }

    return csprojText // Fallback, no <Project> tag found
}

export function removeTagFromCsproj(text: string, includePath: string): string {
    const includeStr = `Include="${includePath}"`
    let includeIndex = text.indexOf(includeStr)

    while (includeIndex !== -1) {
        const startTagIndex = text.lastIndexOf("<", includeIndex)
        if (startTagIndex === -1) break

        let lineStartIndex = startTagIndex
        while (lineStartIndex > 0 && (text[lineStartIndex - 1] === " " || text[lineStartIndex - 1] === "\t")) {
            lineStartIndex--
        }

        let endTagIndex = text.indexOf(">", includeIndex)
        if (endTagIndex === -1) break

        if (text[endTagIndex - 1] !== "/") {
            const tagMatch = text.substring(startTagIndex, endTagIndex).match(/<([a-zA-Z0-9_]+)/)
            if (tagMatch) {
                const tagName = tagMatch[1]
                const closingTag = `</${tagName}>`
                const closingTagIndex = text.indexOf(closingTag, endTagIndex)
                if (closingTagIndex !== -1) {
                    endTagIndex = closingTagIndex + closingTag.length - 1
                }
            }
        }

        let endRemoveIndex = endTagIndex + 1
        if (text[endRemoveIndex] === "\r") endRemoveIndex++
        if (text[endRemoveIndex] === "\n") endRemoveIndex++

        text = text.substring(0, lineStartIndex) + text.substring(endRemoveIndex)

        // Remove empty item groups
        text = text.replace(/^[ \t]*<ItemGroup>\s*<\/ItemGroup>[ \t]*\r?\n?/gm, "")

        includeIndex = text.indexOf(includeStr)
    }

    return text
}

export function removeTagsByPrefix(text: string, prefixPath: string): string {
    const includeRegex = /<([a-zA-Z0-9_]+)\s+[^>]*Include="([^"]+)"/g
    let match
    const pathsToRemove: string[] = []
    while ((match = includeRegex.exec(text)) !== null) {
        const includeValue = match[2]
        if (includeValue.startsWith(prefixPath)) {
            pathsToRemove.push(includeValue)
        }
    }

    for (const p of pathsToRemove) {
        text = removeTagFromCsproj(text, p)
    }
    return text
}
