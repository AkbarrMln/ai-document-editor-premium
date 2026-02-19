export function executeFunctionCall(
    functionName: string,
    args: any,
    currentContent: string
): { success: boolean; newContent?: string; error?: string } {
    try {
        const lines = currentContent.split('\n')

        switch (functionName) {
            case 'update_doc_by_line': {
                const { start_line, end_line, new_content } = args

                if (start_line < 1 || end_line > lines.length || start_line > end_line) {
                    return {
                        success: false,
                        error: `Invalid line range: ${start_line}-${end_line}. Document has ${lines.length} lines.`
                    }
                }

                const newLines = [
                    ...lines.slice(0, start_line - 1),
                    new_content,
                    ...lines.slice(end_line)
                ]

                return { success: true, newContent: newLines.join('\n') }
            }

            case 'update_doc_by_replace': {
                const { old_string, new_string, occurrence } = args

                if (!currentContent.includes(old_string)) {
                    return { success: false, error: `Text "${old_string}" not found in document` }
                }

                let newContent = currentContent
                if (occurrence === 'first') {
                    newContent = currentContent.replace(old_string, new_string)
                } else if (occurrence === 'last') {
                    const lastIndex = currentContent.lastIndexOf(old_string)
                    newContent = currentContent.substring(0, lastIndex) +
                        new_string +
                        currentContent.substring(lastIndex + old_string.length)
                } else {
                    newContent = currentContent.replaceAll(old_string, new_string)
                }

                return { success: true, newContent }
            }

            case 'insert_at_line': {
                const { line_number, content, position } = args

                // Allow insertion at the very end even if empty or at line length + 1
                if (line_number < 1 || line_number > lines.length + 1) {
                    return {
                        success: false,
                        error: `Invalid line number: ${line_number}. Document has ${lines.length} lines.`
                    }
                }

                const insertIndex = position === 'before' ? line_number - 1 : line_number
                const newLines = [
                    ...lines.slice(0, insertIndex),
                    content,
                    ...lines.slice(insertIndex)
                ]

                return { success: true, newContent: newLines.join('\n') }
            }

            case 'delete_lines': {
                const { start_line, end_line } = args

                if (start_line < 1 || end_line > lines.length || start_line > end_line) {
                    return {
                        success: false,
                        error: `Invalid line range: ${start_line}-${end_line}. Document has ${lines.length} lines.`
                    }
                }

                const newLines = [
                    ...lines.slice(0, start_line - 1),
                    ...lines.slice(end_line)
                ]

                return { success: true, newContent: newLines.join('\n') }
            }

            case 'append_to_document': {
                return { success: true, newContent: currentContent + (currentContent.endsWith('\n') ? '' : '\n') + args.content }
            }

            default:
                return { success: false, error: `Unknown function: ${functionName}` }
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
