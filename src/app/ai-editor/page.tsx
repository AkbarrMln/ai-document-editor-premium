'use client'

import { useState, useEffect } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import DocumentEditor from '@/components/DocumentEditor'
import AIChat from '@/components/AIChat'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function EditorPage() {
    const [documentContent, setDocumentContent] = useState('')
    const [docId, setDocId] = useState<string | null>(null)
    const { user } = useAuth()
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Initial Load & Subscription
    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => {
                if (!user) router.push('/login')
                setIsChecking(false)
            }, 1000)
            return () => clearTimeout(timer)
        }

        const fetchDocument = async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                setDocId(data.id)
                setDocumentContent(data.content)
            } else {
                // Create a default doc if none exists
                const { data: newDoc, error: createError } = await supabase
                    .from('documents')
                    .insert([{ user_id: user.id, content: '# Welcome to your AI Editor\n\nType here or ask AI for help!' }])
                    .select()
                    .single()

                if (newDoc) {
                    setDocId(newDoc.id)
                    setDocumentContent(newDoc.content)
                }
            }
            setIsChecking(false)
        }

        fetchDocument()

        // Realtime Subscription
        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'documents' },
                (payload) => {
                    if (payload.new.id === docId && payload.new.content !== documentContent) {
                        setDocumentContent(payload.new.content)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, router, docId])

    // Auto-save logic
    useEffect(() => {
        if (!docId || !user) return

        const saveTimeout = setTimeout(async () => {
            setIsSaving(true)
            await supabase
                .from('documents')
                .update({ content: documentContent })
                .eq('id', docId)
            setIsSaving(false)
        }, 2000) // 2 second debounce

        return () => clearTimeout(saveTimeout)
    }, [documentContent, docId, user])

    if (isChecking) {
        return (
            <div className="h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="h-screen bg-white">
            <Group orientation="horizontal">
                <Panel defaultSize="60%" minSize="30%">
                    <div className="h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Editor</span>
                                <div className="h-4 w-px bg-gray-200"></div>
                                <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{user?.email}</span>
                                {isSaving && (
                                    <span className="text-[10px] text-blue-500 animate-pulse ml-2 italic">saving...</span>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleLogout}
                                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                                >
                                    Log Out
                                </button>
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DocumentEditor
                                content={documentContent}
                                onChange={setDocumentContent}
                            />
                        </div>
                    </div>
                </Panel>

                <Separator className="w-1.5 transition-all bg-gray-100 hover:bg-blue-500 border-x border-gray-200 cursor-col-resize group flex items-center justify-center">
                    <div className="h-10 w-px bg-gray-300 group-hover:bg-blue-300"></div>
                </Separator>

                <Panel defaultSize="40%" minSize="25%">
                    <div className="h-full">
                        <AIChat
                            documentContent={documentContent}
                            onDocumentUpdate={setDocumentContent}
                        />
                    </div>
                </Panel>
            </Group>
        </div>
    )
}
