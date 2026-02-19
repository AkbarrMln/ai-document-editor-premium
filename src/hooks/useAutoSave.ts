'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useAutoSave(documentId: string, content: string) {
    const savedContentRef = useRef(content)
    const timeoutRef = useRef<NodeJS.Timeout>(null)

    useEffect(() => {
        // Skip if content hasn't changed
        if (content === savedContentRef.current) return

        // Debounce save
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(async () => {
            await supabase
                .from('documents')
                .update({ content, updated_at: new Date().toISOString() })
                .eq('id', documentId)

            savedContentRef.current = content
        }, 2000)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [documentId, content])
}
