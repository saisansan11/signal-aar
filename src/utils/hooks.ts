import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Debounce a rapidly-changing value.
 * The returned value only updates after `delay` ms of silence.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Debounce a callback so it only fires after `delay` ms of silence.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T, delay: number,
): (...args: Parameters<T>) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

/**
 * Persist + restore a value from localStorage.
 * Falls back to initialValue on SSR or parse errors.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initialValue
    } catch {
      return initialValue
    }
  })
  function setValue(value: T) {
    setStored(value)
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota exceeded */ }
  }
  return [stored, setValue]
}

/**
 * Track previous value of any state.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => { ref.current = value })
  return ref.current
}
