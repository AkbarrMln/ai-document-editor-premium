-- ====================================================================
-- Assignment #4: Document Versions Table (Version History)
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ====================================================================

-- ────────────────────────────────────────────────────────────────────
-- STEP 1: Buat tabel document_versions
-- Tabel ini APPEND-ONLY: hanya INSERT, jangan pernah UPDATE/DELETE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    label TEXT,                          -- nama opsional, contoh: "Sebelum revisi besar"
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Pastikan version_number unik per dokumen
    UNIQUE(document_id, version_number)
);

-- ────────────────────────────────────────────────────────────────────
-- STEP 2: Index untuk performa query
-- Index ini mempercepat query "ambil versi terbaru dari dokumen X"
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
    ON public.document_versions(document_id, version_number DESC);

-- ────────────────────────────────────────────────────────────────────
-- STEP 3: Aktifkan Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────
-- STEP 4: RLS Policies
-- ────────────────────────────────────────────────────────────────────

-- Policy 1: Pemilik dokumen bisa lihat semua versi
CREATE POLICY "Owner can view versions"
    ON public.document_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_versions.document_id
              AND documents.user_id = auth.uid()
        )
    );

-- Policy 2: User dengan shared edit juga bisa lihat versi
CREATE POLICY "Shared edit users can view versions"
    ON public.document_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.document_shares
            WHERE document_shares.document_id = document_versions.document_id
              AND document_shares.permission = 'edit'
              AND (document_shares.expires_at IS NULL OR document_shares.expires_at > now())
        )
    );

-- Policy 3: Pemilik ATAU user shared-edit bisa insert versi baru
CREATE POLICY "Owner or shared-edit can insert versions"
    ON public.document_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_versions.document_id
              AND documents.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.document_shares
            WHERE document_shares.document_id = document_versions.document_id
              AND document_shares.permission = 'edit'
              AND (document_shares.expires_at IS NULL OR document_shares.expires_at > now())
        )
    );
