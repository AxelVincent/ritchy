import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)

    const onChange = () => {
      setIsMobile(mql.matches)
    }

    // Initial check
    onChange()

    // Add listener
    mql.addEventListener('change', onChange)

    // Clean up
    return () => mql.removeEventListener('change', onChange)
  }, [breakpoint])

  return isMobile === undefined ? false : isMobile
}
