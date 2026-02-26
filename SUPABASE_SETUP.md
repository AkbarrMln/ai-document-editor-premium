# 📦 Panduan Setup Supabase — AI Document Editor

## Langkah 1: Buat Project Supabase

1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi:
   - **Project Name**: `ai-document-editor` (atau sesuai keinginan)
   - **Database Password**: buat password yang kuat (simpan baik-baik!)
   - **Region**: pilih yang paling dekat (contoh: Southeast Asia - Singapore)
4. Klik **"Create New Project"** — tunggu sampai selesai setup (~2 menit)

---

## Langkah 2: Ambil API Keys

1. Di dashboard project, klik **Settings** (ikon ⚙️ di sidebar kiri)
2. Pilih **API** di submenu
3. Salin 2 nilai ini ke file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"     ← Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."             ← anon / public key
```

---

## Langkah 3: Buat Tabel `documents`

1. Di dashboard, klik **SQL Editor** di sidebar kiri
2. Klik **"New Query"**
3. Paste SQL berikut, lalu klik **"Run"**:

```sql
-- ====================================================================
-- Tabel documents (untuk menyimpan dokumen user)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Untitled Document',
    content TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Trigger untuk auto-update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

4. Pastikan output: **"Success. No rows returned"**

---

## Langkah 4: Buat Tabel `document_shares` + RLS Policies

1. Masih di **SQL Editor**, klik **"New Query"** lagi
2. Paste SQL berikut, lalu klik **"Run"**:

```sql
-- ====================================================================
-- Tabel document_shares (untuk fitur sharing dokumen)
-- ====================================================================

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

-- Owner bisa kelola share link mereka sendiri
CREATE POLICY "Owner manages own shares"
    ON public.document_shares FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Siapapun bisa baca share token (untuk halaman /shared/[token])
CREATE POLICY "Anyone can read share tokens"
    ON public.document_shares FOR SELECT
    USING (true);

-- ====================================================================
-- Update RLS Policies untuk tabel documents (support sharing)
-- ====================================================================

-- Hapus policy lama (jika ada)
DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- SELECT: owner ATAU yang punya share link aktif
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

-- INSERT: hanya owner
CREATE POLICY "Insert own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: owner ATAU yang punya share link dengan permission 'edit'
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

-- DELETE: hanya owner
CREATE POLICY "Delete own documents"
    ON public.documents FOR DELETE
    USING (auth.uid() = user_id);
```

4. Pastikan output: **"Success. No rows returned"**

---

## Langkah 5: Aktifkan Authentication

1. Di sidebar kiri, klik **Authentication**
2. Klik **Providers** di submenu
3. Pastikan **Email** sudah enabled (biasanya default on)
4. (Opsional) Matikan **"Confirm email"** jika ingin test tanpa verifikasi email:
   - Klik **Email** provider
   - Uncheck **"Confirm email"**
   - Klik **Save**

---

## Langkah 6: Verifikasi Setup

### Cek tabel sudah dibuat:
1. Klik **Table Editor** di sidebar kiri
2. Pastikan ada 2 tabel:
   - ✅ `documents` — dengan kolom: id, user_id, title, content, updated_at, created_at
   - ✅ `document_shares` — dengan kolom: id, document_id, owner_id, share_token, permission, expires_at, created_at

### Cek RLS policies:
1. Klik tabel `documents` → klik tab **"RLS Policies"** (atau **Authentication > Policies**)
2. Pastikan ada 4 policy:
   - ✅ Read own or shared documents (SELECT)
   - ✅ Insert own documents (INSERT)
   - ✅ Update own or edit-shared documents (UPDATE)
   - ✅ Delete own documents (DELETE)

3. Klik tabel `document_shares` → cek ada 2 policy:
   - ✅ Owner manages own shares (ALL)
   - ✅ Anyone can read share tokens (SELECT)

---

## Langkah 7: Jalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000/ai-editor` di browser.

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---|---|
| **"relation documents does not exist"** | Jalankan ulang SQL di Langkah 3 |
| **"new row violates RLS policy"** | Pastikan user sudah login sebelum membuat dokumen |
| **Share link "Link Tidak Valid"** | Jalankan SQL di Langkah 4 untuk membuat tabel `document_shares` |
| **Tidak bisa login** | Cek apakah Email provider sudah enabled di Langkah 5 |
| **API key error** | Cek `.env.local` sudah diisi dengan URL dan Anon Key dari Langkah 2 |
