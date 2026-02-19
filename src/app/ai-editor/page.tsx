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
    const [isDarkMode, setIsDarkMode] = useState(false)

    // Sync isDarkMode with localStorage and document class
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === 'dark') {
            setIsDarkMode(true)
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleTheme = () => {
        const newTheme = !isDarkMode ? 'dark' : 'light'
        setIsDarkMode(!isDarkMode)
        localStorage.setItem('theme', newTheme)
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

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
            const { data } = await supabase
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
                const { data: newDoc } = await supabase
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
        }, 2000)

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
        <div className="h-screen bg-white dark:bg-[#0a0a0b] transition-colors">
            <Group orientation="horizontal">
                <Panel defaultSize="60%" minSize="30%">
                    <div className="h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Editor</span>
                                <div className="h-4 w-px bg-gray-200 dark:bg-white/10"></div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate max-w-[150px]">{user?.email}</span>
                                {isSaving && (
                                    <span className="text-[10px] text-blue-500 animate-pulse ml-2 italic">saving...</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleTheme}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                >
                                    {isDarkMode ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1m-16 0H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                    )}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest px-2"
                                >
                                    Log Out
                                </button>
                                <div className="flex gap-1.5 ml-1">
                                    <div className="w-2 h-2 rounded-full bg-red-400/60"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-400/60"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-400/60"></div>
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

                <Separator className="w-1 px-[1px] transition-all bg-gray-100 dark:bg-white/5 hover:bg-blue-500 border-x border-gray-200 dark:border-white/5 cursor-col-resize group flex items-center justify-center">
                    <div className="h-10 w-[1px] bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-300"></div>
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
