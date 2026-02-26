'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAutoSave(documentId: string | null, content: string) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
    const savedContentRef = useRef(content)
    const timeoutRef = useRef<NodeJS.Timeout>(null)

    useEffect(() => {
        if (!documentId) return

        // Skip if content hasn't changed
        if (content === savedContentRef.current) return

        setSaveStatus('saving')

        // Debounce save
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('documents')
                    .update({ content, updated_at: new Date().toISOString() })
                    .eq('id', documentId)

                if (error) throw error

                savedContentRef.current = content
                setSaveStatus('saved')
            } catch (err) {
                console.error('Auto-save failed:', err)
                setSaveStatus('error')
            }
        }, 2000)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [documentId, content])

    return { saveStatus }
}
