import { supabase } from './supabase/client'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Document {
    id: string
    title: string
    content: string
    user_id: string
    updated_at: string
    created_at: string
}

export type DocumentSummary = Pick<Document, 'id' | 'title' | 'updated_at'>

export type SortOption = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'

export interface PaginatedDocuments {
    documents: DocumentSummary[]
    total: number
    page: number
    totalPages: number
}

// ─── Get all user documents ─────────────────────────────────────────────────

export async function getUserDocuments(userId: string): Promise<DocumentSummary[]> {
    const { data, error } = await supabase
        .from('documents')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('getUserDocuments error:', error)
        throw new Error('Gagal mengambil daftar dokumen')
    }

    return data
}

// ─── Get single document ────────────────────────────────────────────────────

export async function getDocument(documentId: string): Promise<Document> {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

    if (error) {
        console.error('getDocument error:', error)
        throw new Error('Dokumen tidak ditemukan')
    }

    return data
}

// ─── Create new document ────────────────────────────────────────────────────

export async function createDocument(
    userId: string,
    title: string = 'Untitled'
): Promise<Document> {
    const { data, error } = await supabase
        .from('documents')
        .insert({
            user_id: userId,
            title,
            content: '',
        })
        .select()
        .single()

    if (error) {
        console.error('createDocument error:', error)
        throw new Error('Gagal membuat dokumen baru')
    }

    return data
}

// ─── Rename document ────────────────────────────────────────────────────────

export async function renameDocument(
    documentId: string,
    newTitle: string
): Promise<void> {
    const trimmed = newTitle.trim()
    if (!trimmed) throw new Error('Judul tidak boleh kosong')

    const { error } = await supabase
        .from('documents')
        .update({ title: trimmed })
        .eq('id', documentId)

    if (error) {
        console.error('renameDocument error:', error)
        throw new Error('Gagal mengganti nama dokumen')
    }
}

// ─── Delete document ────────────────────────────────────────────────────────

export async function deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

    if (error) {
        console.error('deleteDocument error:', error)
        throw new Error('Gagal menghapus dokumen')
    }
}

// ─── Search documents ───────────────────────────────────────────────────────

export async function searchDocuments(
    userId: string,
    query: string
): Promise<DocumentSummary[]> {
    if (!query.trim()) {
        return getUserDocuments(userId)
    }

    const { data, error } = await supabase
        .from('documents')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('searchDocuments error:', error)
        throw new Error('Pencarian gagal')
    }

    return data
}

// ─── Paginated documents with sort ──────────────────────────────────────────

export async function getDocumentsPaginated(
    userId: string,
    sort: SortOption = 'updated_desc',
    page: number = 0,
    pageSize: number = 10
): Promise<PaginatedDocuments> {
    const sortMap: Record<SortOption, { column: string; ascending: boolean }> = {
        updated_desc: { column: 'updated_at', ascending: false },
        updated_asc: { column: 'updated_at', ascending: true },
        title_asc: { column: 'title', ascending: true },
        title_desc: { column: 'title', ascending: false },
    }
    const { column, ascending } = sortMap[sort]

    const { data, error, count } = await supabase
        .from('documents')
        .select('id, title, updated_at', { count: 'exact' })
        .eq('user_id', userId)
        .order(column, { ascending })
        .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
        console.error('getDocumentsPaginated error:', error)
        throw new Error('Gagal mengambil dokumen')
    }

    const total = count ?? 0
    return {
        documents: data,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
    }
}
