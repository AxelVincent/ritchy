import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const combinedRef = useCombinedRefs(ref, inputRef)

    // Detect iOS
    const isIOS = React.useMemo(() => {
      if (typeof window === 'undefined') return false
      return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        'standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone: boolean }).standalone
      )
    }, [])

    React.useEffect(() => {
      // For iOS PWA, remove focus outline and trigger click on focus
      if (isIOS && inputRef.current) {
        inputRef.current.style.outline = 'none'

        const input = inputRef.current
        const handleFocus = () => {
          // Simulate a click after a short delay
          setTimeout(() => {
            input.click()
          }, 100)
        }

        input.addEventListener('focus', handleFocus)
        return () => input.removeEventListener('focus', handleFocus)
      }
    }, [isIOS])

    return (
      <input
        type={type}
        enterKeyHint="enter"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        // Only apply autofocus={false} for iOS PWA
        {...(isIOS ? { autoFocus: false } : {})}
        style={{
          fontSize: '16px',
          // Remove focus outline for iOS PWA
          ...(isIOS ? { outline: 'none' } : {}),
        }}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={combinedRef}
        {...props}
      />
    )
  },
)

// Utility to combine refs
function useCombinedRefs<T>(...refs: Array<React.Ref<T>>) {
  const targetRef = React.useRef<T>(null)

  React.useEffect(() => {
    for (const ref of refs) {
      if (!ref) continue

      if (typeof ref === 'function') {
        ref(targetRef.current)
      } else {
        ;(ref as React.MutableRefObject<T | null>).current = targetRef.current
      }
    }
  }, [refs])

  return targetRef
}

Input.displayName = 'Input'

export { Input }
