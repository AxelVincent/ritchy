/**
 * Creates a debounced version of a function that delays its execution until after
 * a specified wait time has elapsed since the last time it was called.
 *
 * @example
 * // Basic usage with event handler
 * const handleSearch = (query: string) => api.search(query);
 * const debouncedSearch = debounce(handleSearch, 300);
 *
 * // Usage in React component
 * const SearchInput = () => {
 *   const debouncedSearch = useMemo(
 *     () => debounce((value: string) => {
 *       // Perform search
 *     }, 300),
 *     []
 *   );
 *
 *   return <input onChange={(e) => debouncedSearch(e.target.value)} />;
 * }
 *
 * // Cancel debounced function if needed
 * debouncedSearch.cancel();
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function with a cancel method
 */
export function debounce<T extends unknown[], R>(
  func: (...args: T) => R | Promise<R>,
  wait: number,
) {
  let timeout: NodeJS.Timeout | null = null

  const debounced = (...args: T): Promise<R> => {
    return new Promise((resolve) => {
      if (timeout) clearTimeout(timeout)

      timeout = setTimeout(async () => {
        const result = await func(...args)
        resolve(result)
      }, wait)
    })
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}
