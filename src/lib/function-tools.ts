export const functionTools = [
    {
        function_declaration: {
            name: 'update_doc_by_line',
            description: 'Replace content of specific line(s) in the document. Use this when user asks to change specific lines.',
            parameters: {
                type: 'object',
                properties: {
                    start_line: {
                        type: 'integer',
                        description: 'Starting line number (1-indexed)'
                    },
                    end_line: {
                        type: 'integer',
                        description: 'Ending line number (inclusive)'
                    },
                    new_content: {
                        type: 'string',
                        description: 'New content to replace the specified lines'
                    }
                },
                required: ['start_line', 'end_line', 'new_content']
            }
        }
    },
    {
        function_declaration: {
            name: 'update_doc_by_replace',
            description: 'Find and replace text in the document. Use when user wants to replace specific words/phrases.',
            parameters: {
                type: 'object',
                properties: {
                    old_string: {
                        type: 'string',
                        description: 'Exact text to find (case-sensitive)'
                    },
                    new_string: {
                        type: 'string',
                        description: 'Text to replace with'
                    },
                    occurrence: {
                        type: 'string',
                        enum: ['first', 'last', 'all'],
                        description: 'Which occurrence to replace'
                    }
                },
                required: ['old_string', 'new_string', 'occurrence']
            }
        }
    },
    {
        function_declaration: {
            name: 'insert_at_line',
            description: 'Insert new content at a specific line without replacing existing content',
            parameters: {
                type: 'object',
                properties: {
                    line_number: {
                        type: 'integer',
                        description: 'Line number where to insert'
                    },
                    content: {
                        type: 'string',
                        description: 'Content to insert'
                    },
                    position: {
                        type: 'string',
                        enum: ['before', 'after'],
                        description: 'Insert before or after the specified line'
                    }
                },
                required: ['line_number', 'content', 'position']
            }
        }
    },
    {
        function_declaration: {
            name: 'delete_lines',
            description: 'Delete specific lines from the document',
            parameters: {
                type: 'object',
                properties: {
                    start_line: {
                        type: 'integer',
                        description: 'First line to delete (1-indexed)'
                    },
                    end_line: {
                        type: 'integer',
                        description: 'Last line to delete (inclusive)'
                    }
                },
                required: ['start_line', 'end_line']
            }
        }
    },
    {
        function_declaration: {
            name: 'append_to_document',
            description: 'Add content to the end of the document',
            parameters: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'Content to append'
                    }
                },
                required: ['content']
            }
        }
    }
]
