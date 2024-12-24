import { useCallback, useRef } from 'react'

type DebouncedFunction<T> = {
  (arg: T): void
  cancel: () => void
}

export const useDebounce = <T>(
  callback: (arg: T) => void,
  delay: number,
): DebouncedFunction<T> => {
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  const debouncedFn = useCallback(
    (arg: T) => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
      }
      timeoutId.current = setTimeout(() => callback(arg), delay)
    },
    [callback, delay],
  ) as DebouncedFunction<T>

  debouncedFn.cancel = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }
  }

  return debouncedFn
}
