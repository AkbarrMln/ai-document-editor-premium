import { useRef, useCallback, useEffect } from 'react'

export function useDebouncedCallback<T extends unknown[]>(
    fn: (...args: T) => void,
    delayMs: number
): (...args: T) => void {
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const fnRef = useRef(fn)

    useEffect(() => {
        fnRef.current = fn
    }, [fn])

    return useCallback((...args: T) => {
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => fnRef.current(...args), delayMs)
    }, [delayMs])
}
