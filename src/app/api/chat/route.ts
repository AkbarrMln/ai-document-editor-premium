import { GoogleGenAI } from '@google/genai'
import type { Content, Part } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { functionDeclarations } from '@/lib/function-tools'
import { executeFunctionCall } from '@/lib/execute-function'

function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
    return new GoogleGenAI({ apiKey })
}

function formatDocumentForAI(content: string): string {
    const lines = content.split('\n')
    return lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
}

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

interface ChatRequestBody {
    messages: ChatMessage[]
    documentContent: string
    file?: { data: string; type: string } | null
}

export async function POST(request: NextRequest) {
    try {
        const genAI = getGenAI()
        const body = (await request.json()) as ChatRequestBody
        const { messages, documentContent, file } = body

        const documentWithLines = formatDocumentForAI(documentContent)

        const systemPrompt = `You are a professional AI document editor assistant.
Your goal is to help users manage and edit their documents with high precision.

**CRITICAL INSTRUCTION:**
Whenever a user asks to modify, add, delete, or change the document, YOU MUST use the appropriate tool. 
DO NOT simply describe the change in text. Invoke the tool first, and then confirm in the follow-up.
Always refer to the document relative to the line numbers provided.

**CURRENT DOCUMENT (${documentWithLines.split('\n').length} lines):**
\n\`\`\`\n${documentWithLines}\n\`\`\`\n

**LINE NUMBERS:**
The document above is provided with line numbers (e.g., "1. text"). 
When editing, use the integer line number. For example, if you want to change line 5, use start_line: 5, end_line: 5.

**TOOLS:**
- \`update_doc_by_line\`: For replacing specific lines or ranges.
- \`update_doc_by_replace\`: For global or specific string replacement.
- \`insert_at_line\`: For adding new content without overwriting.
- \`delete_lines\`: For removing content.
- \`append_to_document\`: For adding content to the very end.

If the user request is ambiguous or references non-existent lines, ask for clarification.
If you are analyzing a file (image/pdf/etc), use its context to help the user edit the document.`

        const userMessage = messages[messages.length - 1]
        const contentParts: Part[] = []

        if (file) {
            const base64Data = file.data.split(',')[1]
            const mimeType = file.type

            contentParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            })
        }

        contentParts.push({ text: userMessage.content })

        const modelName = 'gemini-2.5-flash'

        // Prepare history
        const history: Content[] = messages.slice(0, -1).map((m: ChatMessage) => ({
            role: m.role === 'user' ? 'user' as const : 'model' as const,
            parts: [{ text: m.content }]
        }))

        const contents: Content[] = [
            ...history,
            {
                role: 'user',
                parts: contentParts
            }
        ]

        // First call with function tools
        const response = await genAI.models.generateContent({
            model: modelName,
            contents,
            config: {
                systemInstruction: systemPrompt,
                tools: [
                    {
                        functionDeclarations
                    }
                ]
            }
        })

        // In @google/genai SDK, functionCalls and text are properties on the response
        const functionCallsList = response.functionCalls || []

        if (functionCallsList.length > 0) {
            const call = functionCallsList[0]

            const executionResult = executeFunctionCall(
                call.name as string,
                (call.args ?? {}) as Record<string, unknown>,
                documentContent
            )

            if (!executionResult.success) {
                return NextResponse.json({
                    message: {
                        role: 'assistant',
                        content: `❌ Error: ${executionResult.error}. Please clarify which lines you'd like me to edit.`,
                        functionCall: {
                            name: call.name,
                            args: call.args,
                            result: executionResult
                        }
                    }
                })
            }

            const newDocumentWithLines = formatDocumentForAI(executionResult.newContent || '')
            const finalSystemPrompt = `You are a professional AI document editor assistant.

**UPDATED DOCUMENT:**
\n\`\`\`\n${newDocumentWithLines}\n\`\`\`\n

The document has been updated successfully using the ${call.name} tool. Briefly confirm the change to the user and ask if they need anything else.`

            const finalContents: Content[] = [
                ...contents,
                { role: 'model', parts: [{ functionCall: { name: call.name!, args: call.args } }] },
                {
                    role: 'user',
                    parts: [{
                        functionResponse: {
                            name: call.name!,
                            response: executionResult as Record<string, unknown>
                        }
                    }]
                }
            ]

            const finalResponse = await genAI.models.generateContent({
                model: modelName,
                contents: finalContents,
                config: {
                    systemInstruction: finalSystemPrompt
                }
            })

            const assistantText = finalResponse.text || '✅ Document updated!'

            return NextResponse.json({
                message: {
                    role: 'assistant',
                    content: assistantText,
                    functionCall: {
                        name: call.name,
                        args: call.args,
                        result: executionResult
                    }
                },
                newDocumentContent: executionResult.newContent
            })
        }

        const plainAssistantText = response.text || 'I am ready to help you with your document.'

        return NextResponse.json({
            message: {
                role: 'assistant',
                content: plainAssistantText
            }
        })
    } catch (error: unknown) {
        console.error('API Error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            {
                error: 'Failed to process request',
                message,
            },
            { status: 500 }
        )
    }
}
