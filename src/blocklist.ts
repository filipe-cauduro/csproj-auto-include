import * as path from "path"
import { minimatch } from "minimatch"

export function isPathBlocked(
    filePath: string,
    patterns: readonly string[],
    baseDirectories: readonly string[]
): boolean {
    const candidates = [filePath, ...baseDirectories.map((directory) => path.relative(directory, filePath))].map(
        (candidate) => candidate.replace(/\\/g, "/")
    )

    return patterns.some(
        (pattern) =>
            Boolean(pattern) &&
            candidates.some((candidate) => minimatch(candidate, pattern, { dot: true, matchBase: true }))
    )
}
