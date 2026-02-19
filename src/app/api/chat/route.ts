import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { functionTools } from '@/lib/function-tools'
import { executeFunctionCall } from '@/lib/execute-function'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

function formatDocumentForAI(content: string): string {
    const lines = content.split('\n')
    return lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
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
        const contentParts: any[] = []

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

        const modelName = 'gemini-2.5-flash' // Updated to experimental flash model

        // Prepare history
        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }))

        const contents = [
            ...history,
            {
                role: 'user',
                parts: contentParts
            }
        ]

        // First call with function tools
        const response: any = await genAI.models.generateContent({
            model: modelName,
            contents: contents as any,
            config: {
                systemInstruction: systemPrompt,
                tools: [
                    {
                        functionDeclarations: functionTools.map((t: any) => t.function_declaration)
                    }
                ] as any
            }
        })

        // In @google/genai SDK, functionCalls and text are properties on the response
        const functionCalls = response.functionCalls || []

        if (functionCalls.length > 0) {
            const call = functionCalls[0]

            const executionResult = executeFunctionCall(
                call.name as string,
                call.args,
                documentContent as string
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

            const finalResponse: any = await genAI.models.generateContent({
                model: modelName,
                contents: [
                    ...contents,
                    { role: 'model', parts: [{ functionCall: call }] },
                    {
                        role: 'user',
                        parts: [{
                            functionResponse: {
                                name: call.name,
                                response: executionResult
                            }
                        }]
                    }
                ] as any,
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
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to process request',
                message: error.message,
                details: error
            },
            { status: 500 }
        )
    }
}
