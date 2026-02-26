'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    searchDocuments,
    createDocument,
    renameDocument,
    deleteDocument,
    getDocumentsPaginated,
    type DocumentSummary,
    type SortOption
} from '@/lib/documents'
import { useDebounce } from '@/hooks/useDebounce'

interface DocsSidebarProps {
    userId: string
    activeDocumentId: string | null
    onDocumentSelect: (doc: DocumentSummary) => void
    onDocumentDelete: (deletedId: string) => void
    onDocumentRename: (documentId: string, newTitle: string) => void
}

export function DocsSidebar({
    userId,
    activeDocumentId,
    onDocumentSelect,
    onDocumentDelete,
    onDocumentRename
}: DocsSidebarProps) {
    const [documents, setDocuments] = useState<DocumentSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Search
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedQuery = useDebounce(searchQuery, 300)

    // Sort & Pagination
    const [sortOption, setSortOption] = useState<SortOption>('updated_desc')
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 10

    // Rename inline
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // ── Load documents ──────────────────────────────────────────────────────
    const loadDocuments = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            if (debouncedQuery.trim()) {
                // Search mode
                const results = await searchDocuments(userId, debouncedQuery)
                setDocuments(results)
                setTotalPages(1)
                setCurrentPage(0)
            } else {
                // Paginated mode with sort
                const result = await getDocumentsPaginated(userId, sortOption, currentPage, pageSize)
                setDocuments(result.documents)
                setTotalPages(result.totalPages)
            }
        } catch {
            setError('Gagal memuat dokumen. Coba refresh halaman.')
        } finally {
            setIsLoading(false)
        }
    }, [userId, debouncedQuery, sortOption, currentPage, pageSize])

    useEffect(() => {
        loadDocuments()
    }, [loadDocuments])

    // Reset page when sort or search changes
    useEffect(() => {
        setCurrentPage(0)
    }, [sortOption, debouncedQuery])

    // ── Create new document ─────────────────────────────────────────────────
    async function handleCreate() {
        try {
            const newDoc = await createDocument(userId, 'Untitled')
            setDocuments(prev => [newDoc, ...prev])
            onDocumentSelect(newDoc)
            setRenamingId(newDoc.id)
            setRenameValue('Untitled')
        } catch {
            alert('Gagal membuat dokumen baru')
        }
    }

    // ── Rename inline ───────────────────────────────────────────────────────
    function startRename(doc: DocumentSummary) {
        setRenamingId(doc.id)
        setRenameValue(doc.title)
    }

    async function submitRename(documentId: string) {
        try {
            await renameDocument(documentId, renameValue)
            const newTitle = renameValue.trim()
            setDocuments(prev =>
                prev.map(d => d.id === documentId ? { ...d, title: newTitle } : d)
            )
            onDocumentRename(documentId, newTitle)
        } catch {
            alert('Gagal mengganti nama')
        } finally {
            setRenamingId(null)
        }
    }

    // ── Delete document ─────────────────────────────────────────────────────
    async function handleDelete(documentId: string) {
        try {
            await deleteDocument(documentId)
            setDocuments(prev => prev.filter(d => d.id !== documentId))
            setDeletingId(null)
            if (documentId === activeDocumentId) {
                onDocumentDelete(documentId)
            }
        } catch {
            alert('Gagal menghapus dokumen')
        }
    }

    // ── Format date ─────────────────────────────────────────────────────────
    function formatDate(dateStr: string): string {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Baru saja'
        if (diffMins < 60) return `${diffMins} menit lalu`
        if (diffHours < 24) return `${diffHours} jam lalu`
        if (diffDays < 7) return `${diffDays} hari lalu`
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0b]">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">Dokumen</h2>
                    <button
                        onClick={handleCreate}
                        className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        + Baru
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-2">
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Cari dokumen..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
                    />
                </div>

                {/* Sort dropdown */}
                {!searchQuery && (
                    <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value as SortOption)}
                        className="w-full text-[10px] font-medium bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                        <option value="updated_desc">Terbaru diubah</option>
                        <option value="updated_asc">Terlama diubah</option>
                        <option value="title_asc">Judul A-Z</option>
                        <option value="title_desc">Judul Z-A</option>
                    </select>
                )}
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2 text-xs text-gray-400">Memuat...</span>
                    </div>
                ) : error ? (
                    <div className="p-4">
                        <p className="text-red-400 text-xs mb-2">{error}</p>
                        <button onClick={loadDocuments} className="text-blue-400 text-xs underline hover:text-blue-300">
                            Coba lagi
                        </button>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-6 text-center">
                        {searchQuery ? (
                            <>
                                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Tidak ada dokumen dengan kata &quot;{searchQuery}&quot;</p>
                            </>
                        ) : (
                            <>
                                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">Belum ada dokumen</p>
                                <button
                                    onClick={handleCreate}
                                    className="text-blue-400 text-xs underline hover:text-blue-300"
                                >
                                    Buat dokumen pertama
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    documents.map(doc => (
                        <div
                            key={doc.id}
                            className={`group flex items-center px-3 py-2.5 cursor-pointer transition-all border-l-2 ${doc.id === activeDocumentId
                                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            onClick={() => renamingId !== doc.id && onDocumentSelect(doc)}
                        >
                            {renamingId === doc.id ? (
                                <input
                                    type="text"
                                    value={renameValue}
                                    autoFocus
                                    onChange={e => setRenameValue(e.target.value)}
                                    onBlur={() => submitRename(doc.id)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') submitRename(doc.id)
                                        if (e.key === 'Escape') setRenamingId(null)
                                    }}
                                    className="flex-1 bg-white dark:bg-white/10 text-gray-900 dark:text-white text-sm px-2 py-1 rounded-lg outline-none ring-2 ring-blue-500/50"
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(doc.updated_at)}</p>
                                    </div>
                                    <div className="hidden group-hover:flex gap-0.5 ml-2 shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); startRename(doc) }}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-all"
                                            title="Ganti nama"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); setDeletingId(doc.id) }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                                            title="Hapus"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {!searchQuery && totalPages > 1 && (
                <div className="p-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 uppercase tracking-wider transition-colors"
                    >
                        ← Prev
                    </button>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {currentPage + 1} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 uppercase tracking-wider transition-colors"
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Delete confirmation dialog */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-100 dark:border-white/10">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-center mb-2">Hapus Dokumen?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                            Dokumen ini akan dihapus permanen dan tidak bisa dipulihkan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
