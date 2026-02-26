'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism.css' // Base light theme, we override in CSS
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-css'

interface Props {
  content: string
  onChange: (content: string) => void
}

export default function DocumentEditor({ content, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLElement>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [history, setHistory] = useState<string[]>([content])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Sync scroll
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current && codeRef.current?.parentElement) {
      const top = textareaRef.current.scrollTop
      lineNumbersRef.current.scrollTop = top
      codeRef.current.parentElement.scrollTop = top
    }
  }

  // History / Undo / Redo
  useEffect(() => {
    setHistory(prevHistory => {
      const lastHistory = prevHistory[historyIndex]
      if (content !== lastHistory) {
        const newHistory = prevHistory.slice(0, historyIndex + 1)
        newHistory.push(content)
        if (newHistory.length > 50) newHistory.shift()
        setHistoryIndex(newHistory.length - 1)
        return newHistory
      }
      return prevHistory
    })
    // Note: We use an updater function to avoid strict dependencies, 
    // but we cautiously include `historyIndex` down the line if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      onChange(prev)
    }
  }, [history, historyIndex, onChange])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      onChange(next)
    }
  }, [history, historyIndex, onChange])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current)
    }
  }, [content])

  const downloadDocument = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const lines = content.split('\n')
  const lineNumbers = lines.map((_, i) => i + 1).join('\n')

  const sharedStyles: React.CSSProperties = {
    lineHeight: '1.6rem',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '0.875rem',
    padding: '1rem',
    paddingTop: '1rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    border: 'none',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    boxSizing: 'border-box',
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0b] transition-colors">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-white/5 rounded-md disabled:opacity-20 transition-all font-bold"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-white/5 rounded-md disabled:opacity-20 transition-all font-bold"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-5 5m5-5l-5-5" /></svg>
          </button>
          <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1"></div>
          <div className="relative flex items-center group">
            <svg className="w-3.5 h-3.5 absolute left-2.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-32 md:w-48 placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={downloadDocument}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 active:scale-95 shrink-0"
        >
          <svg className="w-3.5 h-3.5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export Doc
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={lineNumbersRef}
          className="w-12 bg-gray-50 dark:bg-black/20 text-gray-400 dark:text-gray-600 text-right pr-3 text-xs select-none overflow-hidden border-r border-gray-100 dark:border-white/5 font-mono shrink-0"
          style={{ lineHeight: '1.6rem', paddingTop: '1rem', paddingBottom: '1rem' }}
        >
          <pre className="whitespace-pre m-0 p-0 font-bold opacity-40" style={{ lineHeight: '1.6rem', fontSize: '0.875rem' }}>{lineNumbers}</pre>
        </div>

        <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#0a0a0b]">
          <pre
            className="language-markdown"
            style={{ ...sharedStyles, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', background: 'transparent' }}
            aria-hidden="true"
          >
            <code ref={codeRef} className="language-markdown block dark:text-gray-300">
              {content + (content.endsWith('\n') ? ' ' : '')}
            </code>
          </pre>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            className="bg-transparent caret-blue-600 dark:caret-blue-400 focus:outline-none z-10 selection:bg-blue-200/50 dark:selection:bg-blue-500/20"
            style={{
              ...sharedStyles,
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              resize: 'none',
              overflowY: 'auto'
            }}
            placeholder="Start typing your document here..."
          />
        </div>
      </div>
    </div>
  )
}
