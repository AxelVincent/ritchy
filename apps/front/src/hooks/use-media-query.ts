import { useEffect, useMemo, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  // Memoize the media query to prevent recreating it on every render
  const mediaQuery = useMemo(() => window.matchMedia(query), [query])

  const [matches, setMatches] = useState(mediaQuery.matches)

  useEffect(() => {
    // Set initial value
    setMatches(mediaQuery.matches)

    const listener = () => setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', listener)

    return () => mediaQuery.removeEventListener('change', listener)
  }, [mediaQuery])

  return matches
}
