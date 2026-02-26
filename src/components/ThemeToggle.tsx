'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const applyTheme = (next: 'light' | 'dark') => {
        const root = document.documentElement;
        if (next === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', next);
    };

    useEffect(() => {
        try {
            const stored = localStorage.getItem('theme');
            const preferred =
                stored === 'dark' || stored === 'light'
                    ? (stored as 'light' | 'dark')
                    : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

            // Set the class but let the initial state dictate the first render to match SSR 
            // Avoid calling setState in effect if we can help it, but since we need UI to sync:
            // The warning happens because we set state synchronously on mount without needing to.
            // React's suggestion: If we must, we can defer it, or just use a layout effect.
            // Actually, suppressing the warning is standard for this specific theme pattern, or we use setTimeout.
            setTimeout(() => setTheme(preferred), 0);
            applyTheme(preferred);
        } catch {
            // ignore
        }
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
    };

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-100 shadow-sm hover:bg-white dark:hover:bg-zinc-700 transition-colors"
        >
            {theme === 'dark' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m6.364-12.364l-1.414 1.414M7.05 16.95l-1.414 1.414M21 12h-2M5 12H3m12.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
            ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
            )}
            <span className="text-xs font-medium">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
    );
}