'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    createShareLink,
    getDocumentShares,
    revokeShareLink,
    type Permission,
    type ShareRecord
} from '@/lib/sharing'

interface ShareDialogProps {
    documentId: string
    ownerId: string
    onClose: () => void
}

export function ShareDialog({ documentId, ownerId, onClose }: ShareDialogProps) {
    const [shares, setShares] = useState<ShareRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [permission, setPermission] = useState<Permission>('view')
    const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
    const [isCreating, setIsCreating] = useState(false)
    const [copiedToken, setCopiedToken] = useState<string | null>(null)

    const loadShares = useCallback(async () => {
        try {
            const data = await getDocumentShares(documentId)
            setShares(data)
        } catch {
            // error handled silently
        } finally {
            setIsLoading(false)
        }
    }, [documentId])

    useEffect(() => {
        loadShares()
    }, [loadShares])

    async function handleCreate() {
        setIsCreating(true)
        try {
            const url = await createShareLink(documentId, ownerId, permission, expiresInDays)
            await navigator.clipboard.writeText(url)
            await loadShares()
            setCopiedToken('new')
            setTimeout(() => setCopiedToken(null), 2000)
        } catch {
            alert('Gagal membuat link')
        } finally {
            setIsCreating(false)
        }
    }

    async function handleCopy(token: string) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        const url = `${baseUrl}/shared/${token}`
        await navigator.clipboard.writeText(url)
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), 2000)
    }

    async function handleRevoke(shareId: string) {
        if (!confirm('Hapus link ini? Siapapun yang punya link ini tidak bisa akses lagi.')) return
        try {
            await revokeShareLink(shareId)
            setShares(prev => prev.filter(s => s.id !== shareId))
        } catch {
            alert('Gagal menghapus link')
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white">Share Dokumen</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Buat link untuk berbagi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Create new link form */}
                <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Permission</label>
                        <select
                            value={permission}
                            onChange={e => setPermission(e.target.value as Permission)}
                            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value="view">👁 View Only — hanya bisa baca</option>
                            <option value="edit">✏️ Edit — bisa ubah dokumen</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Kedaluwarsa</label>
                        <select
                            value={expiresInDays ?? ''}
                            onChange={e => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value="">Tidak kedaluwarsa</option>
                            <option value="1">1 hari</option>
                            <option value="7">7 hari</option>
                            <option value="30">30 hari</option>
                        </select>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                    >
                        {isCreating ? 'Membuat link...' : copiedToken === 'new' ? '✓ Link disalin ke clipboard!' : 'Buat & Salin Link'}
                    </button>
                </div>

                {/* Active links list */}
                <div>
                    <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Link Aktif</h3>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-2 text-xs text-gray-400">Memuat...</span>
                        </div>
                    ) : shares.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Belum ada link yang dibuat.</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {shares.map(share => (
                                <div key={share.id} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-gray-100 dark:border-white/5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${share.permission === 'edit'
                                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {share.permission === 'edit' ? '✏️ Edit' : '👁 View'}
                                            </span>
                                            {share.expires_at && (
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                    Exp: {new Date(share.expires_at).toLocaleDateString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(share.share_token)}
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-all"
                                    >
                                        {copiedToken === share.share_token ? '✓ Disalin' : 'Salin'}
                                    </button>
                                    <button
                                        onClick={() => handleRevoke(share.id)}
                                        className="text-[10px] font-bold text-red-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
