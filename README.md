# AI Document Editor with Gemini & Supabase

A premium, intelligent document editor powered by Gemini 2.0 Flash and Supabase. This project features real-time synchronization, AI-powered document manipulation via Function Calling, and multimodal analysis.

## 🚀 Features

### Core
- **Two-Panel Layout**: Responsive design with `react-resizable-panels`.
- **Line-Aware Editor**: Custom editor with synchronized line numbers for precise AI manipulation.
- **AI Assistant**: Intelligent chat powered by Gemini 2.0 Flash with document state awareness.
- **Function Calling**: 5 specialized tools for document editing:
  - `update_doc_by_line`: Edit specific line ranges.
  - `insert_at_line`: Add content at specific positions.
  - `update_doc_by_replace`: Global or specific text replacement.
  - `delete_lines`: Remove specific line ranges.
  - `append_to_document`: Add content to the end of the doc.
- **Multimodal Support**: Upload images, PDFs, or code files for the AI to analyze and incorporate into your document.
- **Supabase Integration**: Secure Authentication and Real-time data sync.

### Bonus Features
- **Undo/Redo (Ctrl+Z / Ctrl+Y)**: Full history management for document edits.
- **Syntax Highlighting**: PrismJS integration for Markdown and Code blocks.
- **Local Search**: Real-time text search within the editor.
- **Export/Download**: Save your work as a `.md` file instantly.
- **Cyber-Neon Design**: Premium UI with translucent panels and ambient glows.

## 🛠️ Setup Instructions

### 1. Clone & Install
```bash
# Clone the repository (if provided) or enter project dir
cd my-first-nextjs
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
# Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 3. Supabase Schema
Run the following SQL in your Supabase SQL Editor:
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "Users can manage their own documents" 
ON documents FOR ALL 
USING (auth.uid() = user_id);
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## 🧪 Testing Guide

### Function Calling
1. Open the Chat panel.
2. Type: `"Tambah judul 'Laporan PKL' di baris pertama"`
3. Observe the editor automatically update line 1.

### Multimodal
1. Click **"Attach File"** and upload a screenshot of code or a document.
2. Type: `"Rangkum isi file ini dan masukkan ke dokumen"`
3. AI will analyze the image and use tools to update your document.

## 🎓 Learning Reflection

- **Technical Challenge**: Handling turn-taking and property naming in the `@google/genai` SDK was challenging. Unlike the older SDK, properties like `functionCalls` and `inlineData` must follow specific camelCase patterns within the `contents` array.
- **AI Behavior**: The AI uses the system prompt's instructions about line numbers to decide whether to use `update_doc_by_line` (for precise edits) or `update_doc_by_replace` (for broad changes).
- **Real-time Sync**: Implemented using Supabase Realtime with a debounced `useAutoSave` hook to prevent API spam while maintaining data integrity.
- **Production Readiness**: For production, I would add per-user rate limiting for Gemini API and more robust conflict resolution for collaborative editing.
- **Future Improvements**: Planning to add collaborative cursors and a "Suggest Mode" where users can approve AI edits before they are applied.

---
Built by **Akbar Maulana** - 2026
