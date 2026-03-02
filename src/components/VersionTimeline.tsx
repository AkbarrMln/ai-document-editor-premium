'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    getVersionList,
    restoreVersion,
    getVersionContent,
    type DocumentVersionSummary,
} from '@/lib/versions'

interface VersionTimelineProps {
    documentId: string
    userId: string
    onCompare: (versionIdA: string, versionIdB: string) => void
    onContentRestore: (newContent: string) => void
    onClose: () => void
}

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)

    if (minutes < 1) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    return `${days} hari lalu`
}

export function VersionTimeline({
    documentId,
    userId,
    onCompare,
    onContentRestore,
    onClose,
}: VersionTimelineProps) {
    const [versions, setVersions] = useState<DocumentVersionSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [page, setPage] = useState(0)

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isRestoring, setIsRestoring] = useState<string | null>(null)

    const loadVersions = useCallback(
        async (pageNum: number, append = false) => {
            try {
                setIsLoading(true)
                const result = await getVersionList(documentId, pageNum)
                setVersions((prev) =>
                    append ? [...prev, ...result.versions] : result.versions
                )
                setHasMore(result.hasMore)
            } catch (err) {
                console.error('Failed to load versions:', err)
            } finally {
                setIsLoading(false)
            }
        },
        [documentId]
    )

    useEffect(() => {
        loadVersions(0)
    }, [loadVersions])

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id)
            if (prev.length >= 2) return [prev[1], id]
            return [...prev, id]
        })
    }

    async function handleRestore(version: DocumentVersionSummary) {
        if (
            !confirm(
                `Restore ke v${version.version_number}? Versi saat ini akan tersimpan otomatis sebelum restore.`
            )
        )
            return

        try {
            setIsRestoring(version.id)
            const restoredContent = await restoreVersion(
                documentId,
                version.id,
                userId
            )
            await loadVersions(0)
            onContentRestore(restoredContent)
        } catch (err) {
            alert('Gagal restore versi')
            console.error(err)
        } finally {
            setIsRestoring(null)
        }
    }

    async function handlePreview(version: DocumentVersionSummary) {
        try {
            const full = await getVersionContent(version.id)
            onContentRestore(full.content)
        } catch (err) {
            console.error('Failed to preview version:', err)
        }
    }

    function handleLoadMore() {
        const nextPage = page + 1
        setPage(nextPage)
        loadVersions(nextPage, true)
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0b] border-l border-gray-200 dark:border-white/5">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Histori Versi
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Quick compare */}
                {versions.length >= 2 && (
                    <button
                        onClick={() => onCompare(versions[1].id, versions[0].id)}
                        className="w-full text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg transition-all mb-2"
                    >
                        ⚡ Quick Compare: v{versions[1].version_number} → v{versions[0].version_number}
                    </button>
                )}

                {/* Arbitrary compare */}
                {selectedIds.length === 2 && (
                    <button
                        onClick={() => onCompare(selectedIds[0], selectedIds[1])}
                        className="w-full text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg transition-all"
                    >
                        🔍 Compare 2 versi dipilih
                    </button>
                )}
                {selectedIds.length === 1 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
                        Pilih 1 versi lagi untuk compare
                    </p>
                )}
                {selectedIds.length === 0 && versions.length >= 2 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
                        Centang 2 versi untuk compare bebas
                    </p>
                )}
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && versions.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Memuat histori...</p>
                    </div>
                ) : versions.length === 0 ? (
                    <div className="p-6 text-center">
                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Belum ada histori versi.
                        </p>
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                            Edit dokumen dan tunggu auto-save, atau klik &quot;Save Version&quot;.
                        </p>
                    </div>
                ) : (
                    <>
                        {versions.map((version, index) => {
                            const isSelected = selectedIds.includes(version.id)
                            const isLatest = index === 0

                            return (
                                <div
                                    key={version.id}
                                    className={`group border-b border-gray-100 dark:border-white/5 px-3 py-2.5 transition-colors ${isSelected
                                            ? 'bg-indigo-50 dark:bg-indigo-500/10'
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(version.id)}
                                            className="mt-0.5 accent-indigo-500 cursor-pointer"
                                        />

                                        <div className="flex-1 min-w-0">
                                            {/* Version number + label */}
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    v{version.version_number}
                                                </span>
                                                {isLatest && (
                                                    <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Latest
                                                    </span>
                                                )}
                                                {version.label && (
                                                    <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                                                        — {version.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Timestamp */}
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                {formatRelativeTime(version.created_at)}
                                                {' · '}
                                                {new Date(version.created_at).toLocaleString(
                                                    'id-ID',
                                                    {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    }
                                                )}
                                            </p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handlePreview(version)}
                                                className="text-[10px] font-medium text-blue-500 hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                                            >
                                                Preview
                                            </button>
                                            {!isLatest && (
                                                <button
                                                    onClick={() => handleRestore(version)}
                                                    disabled={isRestoring === version.id}
                                                    className="text-[10px] font-medium text-amber-500 hover:text-amber-400 px-1.5 py-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all disabled:opacity-50"
                                                >
                                                    {isRestoring === version.id
                                                        ? 'Restoring...'
                                                        : 'Restore'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Load more */}
                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                className="w-full py-3 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                            >
                                {isLoading ? 'Memuat...' : '↓ Muat lebih banyak'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
