import { Button } from '@/components/ui/button'
import { Copy, MapPinned } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

interface FloatingActionsProps {
  id: string
  rect: DOMRect | null
  onPin: () => void
  onCopy: () => void
}

export const FloatingActions = React.memo(function FloatingActions({
  rect,
  onPin,
  onCopy,
}: FloatingActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseEnter = (e: MouseEvent) => {
      e.stopPropagation()
    }

    container.addEventListener('mouseenter', handleMouseEnter)
    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [])

  if (!rect) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex items-center gap-0.5 bg-background rounded-md p-0.5 border border-border shadow-lg"
      style={{
        top: `${rect.top}px`,
        left: `${rect.right - 40}px`, // 4px offset from cell
      }}
    >
      <Button
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onCopy()
        }}
        className="h-5 w-5 p-2 rounded-sm"
        size="icon"
      >
        <Copy className="text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onPin()
        }}
        className="h-5 w-5 p-2 rounded-sm"
        size="icon"
      >
        <MapPinned className="text-muted-foreground" />
      </Button>
    </div>
  )
})
