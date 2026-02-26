import { nanoid } from 'nanoid'
import { supabase } from './supabase/client'
import type { Document } from './documents'

export type Permission = 'view' | 'edit'

export interface ShareRecord {
    id: string
    document_id: string
    share_token: string
    permission: Permission
    expires_at: string | null
    created_at: string
}

// ─── Create share link ──────────────────────────────────────────────────────

export async function createShareLink(
    documentId: string,
    ownerId: string,
    permission: Permission,
    expiresInDays?: number
): Promise<string> {
    const token = nanoid(21)

    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null

    const { error } = await supabase
        .from('document_shares')
        .insert({
            document_id: documentId,
            owner_id: ownerId,
            share_token: token,
            permission,
            expires_at: expiresAt,
        })

    if (error) {
        console.error('createShareLink error:', error)
        throw new Error('Gagal membuat share link')
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    return `${baseUrl}/shared/${token}`
}

// ─── Get document shares ────────────────────────────────────────────────────

export async function getDocumentShares(documentId: string): Promise<ShareRecord[]> {
    const { data, error } = await supabase
        .from('document_shares')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getDocumentShares error:', error)
        throw new Error('Gagal mengambil daftar share')
    }

    return data
}

// ─── Revoke share link ──────────────────────────────────────────────────────

export async function revokeShareLink(shareId: string): Promise<void> {
    const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('id', shareId)

    if (error) {
        console.error('revokeShareLink error:', error)
        throw new Error('Gagal menghapus share link')
    }
}

// ─── Get document by token (for /shared/[token] page) ───────────────────────

export interface SharedDocumentResult {
    document: Document
    permission: Permission
}

export async function getDocumentByToken(
    token: string
): Promise<SharedDocumentResult | null> {
    const { data: share, error: shareError } = await supabase
        .from('document_shares')
        .select('document_id, permission, expires_at')
        .eq('share_token', token)
        .maybeSingle()

    if (shareError || !share) return null

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return null
    }

    const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', share.document_id)
        .single()

    if (docError || !document) return null

    return {
        document,
        permission: share.permission as Permission,
    }
}
