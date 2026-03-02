'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getVersionContent, type DocumentVersion } from '@/lib/versions'
import { computeDiff, type DiffLine, type DiffResult } from '@/lib/diff'

interface DiffModalProps {
    versionIdA: string // versi LAMA
    versionIdB: string // versi BARU
    onClose: () => void
}

type ViewMode = 'split' | 'unified'

export function DiffModal({ versionIdA, versionIdB, onClose }: DiffModalProps) {
    const [versionA, setVersionA] = useState<DocumentVersion | null>(null)
    const [versionB, setVersionB] = useState<DocumentVersion | null>(null)
    const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<ViewMode>('unified')
    const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
    const changeRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    useEffect(() => {
        async function load() {
            try {
                setIsLoading(true)
                const [a, b] = await Promise.all([
                    getVersionContent(versionIdA),
                    getVersionContent(versionIdB),
                ])

                // Pastikan A adalah yang lebih lama
                const [older, newer] =
                    a.version_number < b.version_number ? [a, b] : [b, a]

                setVersionA(older)
                setVersionB(newer)
                setDiffResult(computeDiff(older.content, newer.content))
            } catch (err) {
                console.error('Failed to load diff:', err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [versionIdA, versionIdB])

    // Indeks baris yang merupakan perubahan
    const changeLineIndices =
        diffResult?.lines
            .map((line, i) => (line.type !== 'unchanged' ? i : -1))
            .filter((i) => i !== -1) ?? []

    const scrollToChange = useCallback(
        (index: number) => {
            const lineIndex = changeLineIndices[index]
            if (lineIndex === undefined) return
            const el = changeRefs.current.get(lineIndex)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        },
        [changeLineIndices]
    )

    function goToNextChange() {
        const next = Math.min(currentChangeIndex + 1, changeLineIndices.length - 1)
        setCurrentChangeIndex(next)
        scrollToChange(next)
    }

    function goToPrevChange() {
        const prev = Math.max(currentChangeIndex - 1, 0)
        setCurrentChangeIndex(prev)
        scrollToChange(prev)
    }

    // Close on Escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    function getLineBg(type: DiffLine['type']) {
        switch (type) {
            case 'added':
                return 'bg-emerald-50 dark:bg-emerald-500/10 border-l-2 border-emerald-500'
            case 'removed':
                return 'bg-red-50 dark:bg-red-500/10 border-l-2 border-red-500'
            default:
                return 'border-l-2 border-transparent'
        }
    }

    function getLineTextColor(type: DiffLine['type']) {
        switch (type) {
            case 'added':
                return 'text-emerald-800 dark:text-emerald-300'
            case 'removed':
                return 'text-red-800 dark:text-red-300 line-through opacity-75'
            default:
                return 'text-gray-700 dark:text-gray-400'
        }
    }

    function getLinePrefix(type: DiffLine['type']) {
        switch (type) {
            case 'added':
                return '+'
            case 'removed':
                return '−'
            default:
                return ' '
        }
    }

    function setChangeRef(index: number, el: HTMLDivElement | null) {
        if (el) {
            changeRefs.current.set(index, el)
        } else {
            changeRefs.current.delete(index)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#0f0f10] rounded-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="font-bold text-sm text-gray-800 dark:text-white">
                            {versionA && versionB
                                ? `v${versionA.version_number} → v${versionB.version_number}`
                                : 'Memuat diff...'}
                        </h2>

                        {diffResult && (
                            <div className="flex items-center gap-2.5 text-[11px] font-medium">
                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    +{diffResult.stats.added} ditambah
                                </span>
                                <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">
                                    −{diffResult.stats.removed} dihapus
                                </span>
                                <span className="text-gray-400 dark:text-gray-500">
                                    {diffResult.stats.unchanged} tidak berubah
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Nav changes */}
                        {changeLineIndices.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                <button
                                    onClick={goToPrevChange}
                                    disabled={currentChangeIndex === 0}
                                    className="px-2 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md disabled:opacity-30 transition-all font-bold"
                                >
                                    ↑
                                </button>
                                <span className="font-medium min-w-[3rem] text-center">
                                    {currentChangeIndex + 1} / {changeLineIndices.length}
                                </span>
                                <button
                                    onClick={goToNextChange}
                                    disabled={
                                        currentChangeIndex === changeLineIndices.length - 1
                                    }
                                    className="px-2 py-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md disabled:opacity-30 transition-all font-bold"
                                >
                                    ↓
                                </button>
                            </div>
                        )}

                        {/* View mode toggle */}
                        <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden text-[11px] font-semibold border border-gray-200 dark:border-white/10">
                            <button
                                onClick={() => setViewMode('unified')}
                                className={`px-3 py-1.5 transition-all ${viewMode === 'unified'
                                        ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Unified
                            </button>
                            <button
                                onClick={() => setViewMode('split')}
                                className={`px-3 py-1.5 transition-all ${viewMode === 'split'
                                        ? 'bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Split
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-400">Menghitung perbedaan...</span>
                        </div>
                    ) : !diffResult ? (
                        <div className="flex items-center justify-center h-full text-red-400 text-sm">
                            Gagal memuat diff
                        </div>
                    ) : diffResult.stats.added === 0 && diffResult.stats.removed === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <svg className="w-12 h-12 text-green-300 dark:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-gray-500">Kedua versi identik — tidak ada perubahan.</p>
                        </div>
                    ) : viewMode === 'unified' ? (
                        /* ── UNIFIED VIEW ─── */
                        <div className="font-mono text-[13px]">
                            {/* Column headers */}
                            <div className="sticky top-0 z-10 grid grid-cols-[3.5rem_3.5rem_1fr] bg-gray-100 dark:bg-white/5 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider px-1 py-1.5 border-b border-gray-200 dark:border-white/10">
                                <span className="text-right pr-2">Lama</span>
                                <span className="text-right pr-2">Baru</span>
                                <span className="pl-6">Konten</span>
                            </div>

                            {diffResult.lines.map((line, i) => (
                                <div
                                    key={i}
                                    ref={(el) => {
                                        if (line.type !== 'unchanged') setChangeRef(i, el)
                                    }}
                                    className={`grid grid-cols-[3.5rem_3.5rem_1fr] ${getLineBg(line.type)} hover:brightness-95 dark:hover:brightness-110`}
                                >
                                    <span className="text-gray-300 dark:text-gray-600 text-[11px] pr-2 py-0.5 select-none text-right font-medium">
                                        {line.lineNumberOld ?? ''}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600 text-[11px] pr-2 py-0.5 select-none text-right font-medium">
                                        {line.lineNumberNew ?? ''}
                                    </span>
                                    <span
                                        className={`pl-2 pr-4 py-0.5 whitespace-pre-wrap break-all ${getLineTextColor(line.type)}`}
                                    >
                                        <span className="select-none mr-2 opacity-50 font-bold inline-block w-3">
                                            {getLinePrefix(line.type)}
                                        </span>
                                        {line.content || '\u00A0'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* ── SPLIT VIEW ─── */
                        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-white/10 h-full font-mono text-[13px]">
                            {/* Left panel: OLD version */}
                            <div className="overflow-auto">
                                <div className="sticky top-0 z-10 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-[11px] font-bold border-b border-gray-200 dark:border-white/10">
                                    <span className="text-red-600 dark:text-red-400">
                                        v{versionA?.version_number}
                                    </span>
                                    {versionA?.label && (
                                        <span className="text-gray-500 ml-2 font-normal">
                                            — {versionA.label}
                                        </span>
                                    )}
                                    {versionA && (
                                        <span className="text-gray-400 ml-2 font-normal">
                                            {new Date(versionA.created_at).toLocaleString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    )}
                                </div>
                                {diffResult.lines
                                    .filter((l) => l.type !== 'added')
                                    .map((line, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${getLineBg(line.type)}`}
                                        >
                                            <span className="text-gray-300 dark:text-gray-600 text-[11px] px-2 py-0.5 select-none w-12 text-right shrink-0 font-medium">
                                                {line.lineNumberOld}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 whitespace-pre-wrap break-all flex-1 ${getLineTextColor(line.type)}`}
                                            >
                                                {line.content || '\u00A0'}
                                            </span>
                                        </div>
                                    ))}
                            </div>

                            {/* Right panel: NEW version */}
                            <div className="overflow-auto">
                                <div className="sticky top-0 z-10 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-[11px] font-bold border-b border-gray-200 dark:border-white/10">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        v{versionB?.version_number}
                                    </span>
                                    {versionB?.label && (
                                        <span className="text-gray-500 ml-2 font-normal">
                                            — {versionB.label}
                                        </span>
                                    )}
                                    {versionB && (
                                        <span className="text-gray-400 ml-2 font-normal">
                                            {new Date(versionB.created_at).toLocaleString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    )}
                                </div>
                                {diffResult.lines
                                    .filter((l) => l.type !== 'removed')
                                    .map((line, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${getLineBg(line.type)}`}
                                        >
                                            <span className="text-gray-300 dark:text-gray-600 text-[11px] px-2 py-0.5 select-none w-12 text-right shrink-0 font-medium">
                                                {line.lineNumberNew}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 whitespace-pre-wrap break-all flex-1 ${getLineTextColor(line.type)}`}
                                            >
                                                {line.content || '\u00A0'}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
