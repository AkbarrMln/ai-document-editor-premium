'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createSnapshot } from '@/lib/versions'

interface UseAutoSnapshotOptions {
    documentId: string
    content: string
    userId: string
    intervalMs?: number // default 30 detik
}

export function useAutoSnapshot({
    documentId,
    content,
    userId,
    intervalMs = 30_000,
}: UseAutoSnapshotOptions) {
    const contentRef = useRef(content)
    contentRef.current = content

    // Simpan versi manual dengan label
    const saveNamedVersion = useCallback(
        async (label: string) => {
            if (!documentId || !userId) return
            await createSnapshot(documentId, contentRef.current, userId, label || undefined)
        },
        [documentId, userId]
    )

    // Auto-snapshot setiap intervalMs
    useEffect(() => {
        if (!documentId || !userId) return

        const timer = setInterval(async () => {
            try {
                await createSnapshot(documentId, contentRef.current, userId)
            } catch (err) {
                console.error('Auto-snapshot failed:', err)
                // Jangan crash app hanya karena snapshot gagal
            }
        }, intervalMs)

        return () => clearInterval(timer)
    }, [documentId, userId, intervalMs])

    return { saveNamedVersion }
}
