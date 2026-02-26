'use client'

import { useMemo } from 'react'
import type { CollaboratorPresence } from '@/hooks/useCollaboration'

interface CursorOverlayProps {
    collaborators: CollaboratorPresence[]
    content: string
}

interface CursorPixelPosition {
    x: number
    y: number
    collaborator: CollaboratorPresence
}

export function CursorOverlay({ collaborators, content }: CursorOverlayProps) {
    // Compute pixel positions from line/col using useMemo (derived state, no effect needed)
    const cursorPositions = useMemo<CursorPixelPosition[]>(() => {
        // We'll compute based on known monospace metrics since accessing ref in memo
        // would cause lint issues. Use the shared style constants from DocumentEditor.
        const lineHeight = 25.6 // 1.6rem
        const paddingTop = 16 // 1rem
        const paddingLeft = 16 // 1rem
        const charWidth = 8.4 // approximate monospace M width at 14px

        const positions: CursorPixelPosition[] = []
        const lines = content.split('\n')

        for (const collaborator of collaborators) {
            if (!collaborator.cursor) continue
            const { line, col } = collaborator.cursor
            if (line < 1 || line > lines.length + 1) continue

            positions.push({
                x: paddingLeft + col * charWidth,
                y: paddingTop + (line - 1) * lineHeight,
                collaborator,
            })
        }

        return positions
    }, [collaborators, content])

    return (
        <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 10 }}
        >
            {cursorPositions.map(({ x, y, collaborator }) => (
                <div
                    key={collaborator.userId}
                    className="absolute flex flex-col items-start transition-all duration-150 ease-out"
                    style={{ left: x, top: y }}
                >
                    {/* Cursor line */}
                    <div
                        className="w-0.5 rounded-full animate-pulse"
                        style={{
                            height: '1.6rem',
                            backgroundColor: collaborator.color,
                        }}
                    />
                    {/* Name label */}
                    <div
                        className="text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap -mt-6 ml-1 shadow-md"
                        style={{
                            backgroundColor: collaborator.color,
                            fontSize: '9px',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {collaborator.displayName}
                    </div>
                </div>
            ))}
        </div>
    )
}
