import * as Diff from 'diff'

export type DiffLineType = 'added' | 'removed' | 'unchanged'

export interface DiffLine {
    type: DiffLineType
    content: string
    lineNumberOld: number | null // null kalau baris baru (added)
    lineNumberNew: number | null // null kalau baris dihapus (removed)
}

export interface DiffStats {
    added: number
    removed: number
    unchanged: number
}

export interface DiffResult {
    lines: DiffLine[]
    stats: DiffStats
}

export function computeDiff(oldContent: string, newContent: string): DiffResult {
    const changes = Diff.diffLines(oldContent, newContent)

    const lines: DiffLine[] = []
    let lineNumberOld = 1
    let lineNumberNew = 1
    const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 }

    for (const change of changes) {
        const changeLines = change.value.split('\n')

        // Hapus baris kosong terakhir yang muncul karena split
        if (changeLines[changeLines.length - 1] === '') {
            changeLines.pop()
        }

        for (const lineContent of changeLines) {
            if (change.added) {
                lines.push({
                    type: 'added',
                    content: lineContent,
                    lineNumberOld: null,
                    lineNumberNew: lineNumberNew,
                })
                lineNumberNew++
                stats.added++
            } else if (change.removed) {
                lines.push({
                    type: 'removed',
                    content: lineContent,
                    lineNumberOld: lineNumberOld,
                    lineNumberNew: null,
                })
                lineNumberOld++
                stats.removed++
            } else {
                lines.push({
                    type: 'unchanged',
                    content: lineContent,
                    lineNumberOld: lineNumberOld,
                    lineNumberNew: lineNumberNew,
                })
                lineNumberOld++
                lineNumberNew++
                stats.unchanged++
            }
        }
    }

    return { lines, stats }
}
