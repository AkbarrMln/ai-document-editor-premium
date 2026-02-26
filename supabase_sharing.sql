-- ====================================================================
-- Assignment #2: Document Shares Table + Updated RLS Policies
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ====================================================================

-- 1. Create the document_shares table
CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own share links
CREATE POLICY "Owner manages own shares"
    ON public.document_shares FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Anyone can read share records (needed for /shared/[token] page)
CREATE POLICY "Anyone can read share tokens"
    ON public.document_shares FOR SELECT
    USING (true);

-- 2. Update documents RLS to support sharing
DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Read: owner OR shared (non-expired)
CREATE POLICY "Read own or shared documents"
    ON public.documents FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.document_shares
            WHERE document_shares.document_id = documents.id
              AND (document_shares.expires_at IS NULL OR document_shares.expires_at > now())
        )
    );

-- Insert: owner only
CREATE POLICY "Insert own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update: owner OR edit-shared (non-expired)
CREATE POLICY "Update own or edit-shared documents"
    ON public.documents FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.document_shares
            WHERE document_shares.document_id = documents.id
              AND document_shares.permission = 'edit'
              AND (document_shares.expires_at IS NULL OR document_shares.expires_at > now())
        )
    );

-- Delete: owner only
CREATE POLICY "Delete own documents"
    ON public.documents FOR DELETE
    USING (auth.uid() = user_id);
