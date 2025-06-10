import { debounce } from '@/lib/debounce'
import { useEffect, useMemo, useState } from 'react'

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  const debouncedSetValue = useMemo(
    () => debounce((newValue: T) => setDebouncedValue(newValue), delay),
    [delay],
  )

  useEffect(() => {
    debouncedSetValue(value)
    return () => debouncedSetValue.cancel()
  }, [value, debouncedSetValue])

  return debouncedValue
}
