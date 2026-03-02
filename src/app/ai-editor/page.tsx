'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import DocumentEditor from '@/components/DocumentEditor'
import AIChat from '@/components/AIChat'
import { DocsSidebar } from '@/components/DocsSidebar'
import { useAuth } from '@/components/AuthProvider'
import { PresenceIndicator } from '@/components/PresenceIndicator'
import { VersionTimeline } from '@/components/VersionTimeline'
import { DiffModal } from '@/components/DiffModal'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getDocument, type DocumentSummary } from '@/lib/documents'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useAutoSnapshot } from '@/hooks/useAutoSnapshot'
import { useCollaboration } from '@/hooks/useCollaboration'
import { useThrottle } from '@/hooks/useThrottle'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'

export default function EditorPage() {
    const [documentContent, setDocumentContent] = useState('')
    const [activeDocument, setActiveDocument] = useState<DocumentSummary | null>(null)
    const { user } = useAuth()
    const router = useRouter()
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark'
        }
        return false
    })
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [compareVersions, setCompareVersions] = useState<{ a: string; b: string } | null>(null)

    // Flag to prevent infinite loop: don't broadcast remote changes back
    const isReceivingRemoteChange = useRef(false)

    const { saveStatus } = useAutoSave(activeDocument?.id ?? null, documentContent)

    // Auto-snapshot every 30 seconds
    const { saveNamedVersion } = useAutoSnapshot({
        documentId: activeDocument?.id ?? '',
        content: documentContent,
        userId: user?.id ?? '',
    })

    // Collaboration hook
    const {
        collaborators,
        typingUsers,
        isConnected,
        broadcastContentChange,
        updateCursor,
    } = useCollaboration({
        documentId: activeDocument?.id ?? '',
        userId: user?.id ?? '',
        displayName: user?.email?.split('@')[0] ?? 'Anonymous',
        onContentChange: (newContent) => {
            isReceivingRemoteChange.current = true
            setDocumentContent(newContent)
            setTimeout(() => { isReceivingRemoteChange.current = false }, 0)
        },
    })

    // Throttle cursor updates (max 10x/sec)
    const throttledUpdateCursor = useThrottle(updateCursor, 100)

    // Debounce content broadcast (300ms after last keystroke)
    const debouncedBroadcast = useDebouncedCallback(
        (content: string) => broadcastContentChange(content),
        300
    )

    // Handle local content changes — broadcast only our own edits
    const handleContentChange = useCallback((newContent: string) => {
        setDocumentContent(newContent)
        if (!isReceivingRemoteChange.current) {
            debouncedBroadcast(newContent)
        }
    }, [debouncedBroadcast])

    // Sync dark mode class with DOM
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDarkMode])

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

    // Auth check
    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => {
                if (!user) router.push('/login')
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [user, router])

    // Derive isChecking from user state — no effect needed
    const isChecking = user === undefined

    // Realtime updates for active document (postgres changes)
    useEffect(() => {
        if (!activeDocument) return

        const channel = supabase
            .channel(`document:${activeDocument.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'documents',
                    filter: `id=eq.${activeDocument.id}`
                },
                (payload) => {
                    const newRecord = payload.new as { content: string }
                    if (newRecord.content && newRecord.content !== documentContent) {
                        setDocumentContent(newRecord.content)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeDocument?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle document selection
    const handleDocumentSelect = useCallback(async (doc: DocumentSummary) => {
        try {
            const fullDoc = await getDocument(doc.id)
            setActiveDocument(doc)
            setDocumentContent(fullDoc.content)
        } catch {
            alert('Gagal membuka dokumen')
        }
    }, [])

    // Handle document deletion
    const handleDocumentDelete = useCallback((deletedId: string) => {
        if (activeDocument?.id === deletedId) {
            setActiveDocument(null)
            setDocumentContent('')
        }
    }, [activeDocument?.id])

    if (isChecking) {
        return (
            <div className="h-screen bg-white dark:bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="h-screen bg-white dark:bg-[#0a0a0b] transition-colors flex">
            {/* Sidebar */}
            <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} transition-all duration-300 flex-shrink-0 border-r border-gray-100 dark:border-white/5 overflow-hidden`}>
                <DocsSidebar
                    userId={user.id}
                    activeDocumentId={activeDocument?.id ?? null}
                    onDocumentSelect={handleDocumentSelect}
                    onDocumentDelete={handleDocumentDelete}
                    onDocumentRename={(id, title) => {
                        if (activeDocument?.id === id) {
                            setActiveDocument({ ...activeDocument, title })
                        }
                    }}
                />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top header bar */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-all"
                            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate max-w-[200px]">
                            {activeDocument?.title ?? 'No document selected'}
                        </span>

                        <div className="h-4 w-px bg-gray-200 dark:bg-white/10"></div>

                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate max-w-[150px]">{user.email}</span>

                        {/* Save status */}
                        <div className="flex items-center gap-1.5">
                            {saveStatus === 'saving' && (
                                <span className="text-[10px] text-blue-500 animate-pulse italic font-medium">Menyimpan...</span>
                            )}
                            {saveStatus === 'saved' && activeDocument && (
                                <span className="text-[10px] text-green-500 font-medium">✓ Tersimpan</span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="text-[10px] text-red-500 font-medium">⚠ Gagal menyimpan</span>
                            )}
                        </div>

                        {/* Presence Indicator */}
                        {activeDocument && (
                            <>
                                <div className="h-4 w-px bg-gray-200 dark:bg-white/10"></div>
                                <PresenceIndicator
                                    collaborators={collaborators}
                                    typingUsers={typingUsers}
                                    isConnected={isConnected}
                                />
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Save Version button */}
                        {activeDocument && (
                            <button
                                onClick={async () => {
                                    const label = prompt('Nama versi ini (opsional):')
                                    if (label === null) return
                                    try {
                                        await saveNamedVersion(label)
                                        alert('Versi tersimpan!')
                                    } catch {
                                        alert('Gagal menyimpan versi')
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all uppercase tracking-wider"
                                title="Simpan versi manual"
                            >
                                💾 Save Version
                            </button>
                        )}

                        {/* History button */}
                        {activeDocument && (
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider ${showHistory
                                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                                        : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                                title="Histori versi"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                History
                            </button>
                        )}

                        {/* Share button */}
                        {activeDocument && (
                            <button
                                onClick={() => setIsShareDialogOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all uppercase tracking-wider"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share
                            </button>
                        )}

                        <button
                            onClick={toggleTheme}
                            className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
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

                {/* Editor + Chat + History area */}
                {activeDocument ? (
                    <div className="flex-1 overflow-hidden flex">
                        <div className="flex-1 overflow-hidden">
                            <Group orientation="horizontal">
                                <Panel defaultSize={60} minSize={30}>
                                    <div className="h-full overflow-hidden">
                                        <DocumentEditor
                                            key={activeDocument.id}
                                            content={documentContent}
                                            onChange={handleContentChange}
                                            collaborators={collaborators}
                                            onCursorMove={throttledUpdateCursor}
                                        />
                                    </div>
                                </Panel>

                                <Separator className="w-1 px-[1px] transition-all bg-gray-100 dark:bg-white/5 hover:bg-blue-500 border-x border-gray-200 dark:border-white/5 cursor-col-resize group flex items-center justify-center">
                                    <div className="h-10 w-[1px] bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-300"></div>
                                </Separator>

                                <Panel defaultSize={40} minSize={25}>
                                    <div className="h-full">
                                        <AIChat
                                            key={activeDocument.id}
                                            documentContent={documentContent}
                                            onDocumentUpdate={handleContentChange}
                                        />
                                    </div>
                                </Panel>
                            </Group>
                        </div>

                        {/* Version History Sidebar */}
                        {showHistory && (
                            <div className="w-72 shrink-0 h-full overflow-hidden">
                                <VersionTimeline
                                    documentId={activeDocument.id}
                                    userId={user.id}
                                    onCompare={(a, b) => {
                                        setCompareVersions({ a, b })
                                    }}
                                    onContentRestore={(newContent) => {
                                        setDocumentContent(newContent)
                                    }}
                                    onClose={() => setShowHistory(false)}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Pilih dokumen dari sidebar</p>
                            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">atau buat dokumen baru</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Share Dialog (lazy loaded) */}
            {isShareDialogOpen && activeDocument && (
                <ShareDialogWrapper
                    documentId={activeDocument.id}
                    ownerId={user.id}
                    onClose={() => setIsShareDialogOpen(false)}
                />
            )}

            {/* Diff Modal */}
            {compareVersions && (
                <DiffModal
                    versionIdA={compareVersions.a}
                    versionIdB={compareVersions.b}
                    onClose={() => setCompareVersions(null)}
                />
            )}
        </div>
    )
}

// Lazy-load ShareDialog to avoid loading sharing code until needed
function ShareDialogWrapper({ documentId, ownerId, onClose }: { documentId: string; ownerId: string; onClose: () => void }) {
    const [ShareDialog, setShareDialog] = useState<React.ComponentType<{ documentId: string; ownerId: string; onClose: () => void }> | null>(null)

    useEffect(() => {
        import('@/components/ShareDialog').then(mod => {
            setShareDialog(() => mod.ShareDialog)
        })
    }, [])

    if (!ShareDialog) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return <ShareDialog documentId={documentId} ownerId={ownerId} onClose={onClose} />
}
