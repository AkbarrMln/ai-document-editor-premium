'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useRealtimeDocument(
    documentId: string,
    onUpdate: (content: string) => void
) {
    useEffect(() => {
        const channel = supabase
            .channel(`document:${documentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'documents',
                    filter: `id=eq.${documentId}`
                },
                (payload: any) => {
                    onUpdate(payload.new.content)
                }
            )
            .subscribe()

        // Proper cleanup
        return () => {
            supabase.removeChannel(channel)
        }
    }, [documentId, onUpdate])
}
