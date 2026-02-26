'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Use dynamic import with no SSR to ensure it only loads on the client
// and only after the main content is ready.
const ChatWidget = dynamic(() => import('./ChatWidget').then(mod => mod.default), {
    ssr: false,
});

export default function LazyChatWidget() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        // Delay loading the chat widget by a small amount to prioritize LCP content
        // RequestIdleCallback is ideal, with fallback to setTimeout
        const win = window as unknown as {
            requestIdleCallback?: (cb: () => void) => number;
            cancelIdleCallback?: (id: number) => void
        };

        if (win.requestIdleCallback && win.cancelIdleCallback) {
            const handle = win.requestIdleCallback(() => {
                setShouldLoad(true);
            });
            return () => win.cancelIdleCallback!(handle);
        } else {
            const timer = setTimeout(() => {
                setShouldLoad(true);
            }, 2000); // 2 second delay to ensure main thread is clear
            return () => clearTimeout(timer);
        }
    }, []);

    if (!shouldLoad) return null;

    return <ChatWidget />;
}
