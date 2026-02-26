'use client'

import type { CollaboratorPresence } from '@/hooks/useCollaboration'

interface PresenceIndicatorProps {
    collaborators: CollaboratorPresence[]
    typingUsers: string[]
    isConnected: boolean
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function PresenceIndicator({ collaborators, typingUsers, isConnected }: PresenceIndicatorProps) {
    if (!isConnected) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                <span>Connecting...</span>
            </div>
        )
    }

    // Find display names for typing users
    const typingNames = typingUsers
        .map((uid) => collaborators.find((c) => c.userId === uid)?.displayName ?? 'Someone')

    return (
        <div className="flex items-center gap-2">
            {/* Avatar stack */}
            {collaborators.length > 0 && (
                <div className="flex -space-x-2">
                    {collaborators.map((user) => (
                        <div
                            key={user.userId}
                            title={user.displayName}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-[#0a0a0b] cursor-default transition-transform hover:scale-110 hover:z-10 shadow-sm"
                            style={{ backgroundColor: user.color }}
                        >
                            {getInitials(user.displayName)}
                        </div>
                    ))}
                </div>
            )}

            {/* Count label */}
            {collaborators.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {collaborators.length === 1
                        ? '1 orang lagi di sini'
                        : `${collaborators.length} orang lagi di sini`}
                </span>
            )}

            {/* Typing indicator */}
            {typingNames.length > 0 && (
                <span className="text-[10px] text-blue-500 dark:text-blue-400 italic animate-pulse">
                    {typingNames.join(', ')} mengetik...
                </span>
            )}

            {/* Live badge */}
            <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Live</span>
            </div>
        </div>
    )
}
