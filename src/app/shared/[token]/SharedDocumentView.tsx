'use client'

import { useState, useEffect } from 'react'
import { getDocumentByToken, type SharedDocumentResult } from '@/lib/sharing'
import DocumentEditor from '@/components/DocumentEditor'
import AIChat from '@/components/AIChat'
import { supabase } from '@/lib/supabase/client'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'

interface SharedDocumentViewProps {
    token: string
}

export default function SharedDocumentView({ token }: SharedDocumentViewProps) {
    const [result, setResult] = useState<SharedDocumentResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isInvalid, setIsInvalid] = useState(false)
    const [content, setContent] = useState('')

    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        async function load() {
            try {
                const data = await getDocumentByToken(token)
                if (!data) {
                    setIsInvalid(true)
                } else {
                    setResult(data)
                    setContent(data.document.content)
                }
            } catch {
                setIsInvalid(true)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [token])

    // Save changes for edit mode
    async function handleSave(newContent: string) {
        if (!result || result.permission !== 'edit' || !user) return
        setContent(newContent)

        try {
            await supabase
                .from('documents')
                .update({ content: newContent, updated_at: new Date().toISOString() })
                .eq('id', result.document.id)
        } catch (err) {
            console.error('Save failed:', err)
        }
    }

    if (isLoading) {
        return (
            <div className="h-screen bg-white dark:bg-[#0a0a0b] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm">Memuat dokumen...</p>
                </div>
            </div>
        )
    }

    const isEditable = result?.permission === 'edit'

    // Enforce login for edit mode
    if (isEditable && !user) {
        router.push(`/login?redirect=/shared/${token}`)
        return (
            <div className="h-screen bg-white dark:bg-[#0a0a0b] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm">Mengarahkan ke halaman login...</p>
                </div>
            </div>
        )
    }

    if (isInvalid || !result) {
        return (
            <div className="h-screen bg-white dark:bg-[#0a0a0b] flex items-center justify-center">
                <div className="text-center max-w-sm p-8">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Link Tidak Valid</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Link ini tidak valid, sudah dihapus, atau telah kedaluwarsa.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen bg-white dark:bg-[#0a0a0b] flex flex-col">
            {/* Banner */}
            <div className={`py-2.5 px-4 text-xs font-semibold text-center border-b ${isEditable
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
                }`}>
                {isEditable ? '✏️ Mode Edit — Anda bisa mengubah dokumen ini' : '👁 Mode View Only — hanya bisa membaca'}
                <span className="mx-3 opacity-30">|</span>
                <span className="font-bold">{result.document.title}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {isEditable ? (
                    <Group orientation="horizontal">
                        <Panel defaultSize={60} minSize={30}>
                            <DocumentEditor
                                content={content}
                                onChange={handleSave}
                            />
                        </Panel>
                        <Separator className="w-1 px-[1px] transition-all bg-gray-100 dark:bg-white/5 hover:bg-blue-500 border-x border-gray-200 dark:border-white/5 cursor-col-resize group flex items-center justify-center">
                            <div className="h-10 w-[1px] bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-300"></div>
                        </Separator>
                        <Panel defaultSize={40} minSize={25}>
                            <AIChat
                                documentContent={content}
                                onDocumentUpdate={handleSave}
                            />
                        </Panel>
                    </Group>
                ) : (
                    <Group orientation="horizontal">
                        <Panel defaultSize={60} minSize={30}>
                            <ReadOnlyContent content={content} />
                        </Panel>
                        <Separator className="w-1 px-[1px] transition-all bg-gray-100 dark:bg-white/5 hover:bg-blue-500 border-x border-gray-200 dark:border-white/5 cursor-col-resize group flex items-center justify-center">
                            <div className="h-10 w-[1px] bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-300"></div>
                        </Separator>
                        <Panel defaultSize={40} minSize={25}>
                            <AIChat
                                documentContent={content}
                                onDocumentUpdate={() => { }}
                                readOnly
                            />
                        </Panel>
                    </Group>
                )}
            </div>
        </div>
    )
}

// ── Read-only view ──────────────────────────────────────────────────────────

function ReadOnlyContent({ content }: { content: string }) {
    const lines = content.split('\n')

    return (
        <div className="h-full flex overflow-auto bg-white dark:bg-[#0a0a0b] font-mono text-sm">
            {/* Line numbers */}
            <div className="py-4 px-3 text-right text-gray-300 dark:text-gray-700 select-none shrink-0 border-r border-gray-100 dark:border-white/5">
                {lines.map((_, i) => (
                    <div key={i} className="leading-6 text-[11px]">{i + 1}</div>
                ))}
            </div>
            {/* Content */}
            <div className="py-4 px-6 flex-1 min-w-0">
                {lines.map((line, i) => (
                    <div key={i} className="leading-6 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-300">
                        {line || '\u00A0'}
                    </div>
                ))}
            </div>
        </div>
    )
}
