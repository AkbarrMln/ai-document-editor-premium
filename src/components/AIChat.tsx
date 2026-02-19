'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
    role: 'user' | 'assistant'
    content: string
    functionCall?: { name: string; args: any }
}

interface Props {
    documentContent: string
    onDocumentUpdate: (newContent: string) => void
}

export default function AIChat({ documentContent, onDocumentUpdate }: Props) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<{ data: string; type: string } | null>(null)

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 20 * 1024 * 1024) { // Increased to 20MB
            alert('File must be less than 20MB')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            setSelectedFile({
                data: reader.result as string,
                type: file.type || 'application/octet-stream' // Fallback mime type
            })
        }
        reader.readAsDataURL(file)
    }

    async function sendMessage() {
        if (!input.trim() || isLoading) return

        setIsLoading(true)
        const userMessage: Message = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        const currentInput = input
        setInput('')

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    documentContent,
                    file: selectedFile
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Chat API failed');
            }

            const data = await response.json()

            if (data.newDocumentContent) {
                onDocumentUpdate(data.newDocumentContent)
            }

            setMessages(prev => [...prev, data.message])
            setSelectedFile(null)
        } catch (error: any) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${error.message}. Please try again.`
            }])
            setInput(currentInput) // Restore input on error
        } finally {
            setIsLoading(false)
        }
    }

    const clearChat = () => {
        if (confirm('Clear chat history?')) {
            setMessages([])
        }
    }

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">AI Editor Assistant</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Active session</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                    title="Clear Chat"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-[200px] mx-auto">
                        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-gray-900 font-semibold text-sm">How can I help?</p>
                            <p className="text-xs text-gray-500 mt-1">Ask me to edit, summarize, or analyze files for you.</p>
                        </div>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                        <div className={`max-w-[92%] p-4 rounded-2xl ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-200'
                            : 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'
                            }`}>
                            <div className="prose prose-sm dark:prose-invert break-words leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                            {msg.functionCall && (
                                <div className={`mt-3 pt-3 border-t text-[10px] font-mono flex items-center gap-2 ${msg.role === 'user' ? 'border-blue-400 text-blue-100' : 'border-gray-200 text-gray-400'
                                    }`}>
                                    <span className="px-1.5 py-0.5 bg-black/10 rounded font-bold">TOOL</span>
                                    {msg.functionCall.name}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100 flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">AI is thinking</span>
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:800ms]"></div>
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:200ms]"></div>
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:400ms]"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* File Preview */}
            {selectedFile && (
                <div className="px-5 py-3 bg-blue-50/50 border-t border-blue-100 flex items-center justify-between mx-4 mb-2 rounded-xl">
                    <div className="flex items-center gap-3 text-blue-700">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-[10px] uppercase tracking-wider">Attached File</p>
                            <p className="text-[10px] opacity-70 truncate max-w-[180px]">{selectedFile.type}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedFile(null)}
                        className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-100 rounded-full transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="p-5 border-t border-gray-100 bg-white">
                <div className="flex gap-2 mb-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-gray-200 transition-all text-[10px] font-bold text-gray-600 uppercase tracking-widest group">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attach File
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*,video/*,audio/*,application/pdf,text/*,.json,.md"
                        />
                    </label>
                </div>

                <div className="flex gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:bg-white focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
                    <textarea
                        className="flex-1 p-3 bg-transparent text-sm font-medium resize-none focus:outline-none min-h-[48px] max-h-40 text-gray-900 placeholder:text-gray-400"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        placeholder="Ask AI to edit document..."
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="self-end p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p className="mt-3 text-[10px] text-gray-400 text-center font-medium">Gemini 2.0 Flash may produce inaccurate info.</p>
            </div>
        </div>
    )
}
