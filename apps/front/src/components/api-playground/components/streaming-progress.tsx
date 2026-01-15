import { useEffect, useRef } from 'react'

export interface StreamStep {
  step: string
  progress: number
  timestamp: number
}

export interface StreamingProgressProps {
  isStreaming: boolean
  steps: StreamStep[]
  error?: string
  elapsedTime: number
}

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export const StreamingProgress = ({
  isStreaming,
  steps,
  error,
  elapsedTime,
}: StreamingProgressProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [steps.length])

  const lastStep = steps[steps.length - 1]
  const progress = lastStep?.progress ?? 0

  return (
    <div className="rounded-lg border bg-card text-card-foreground font-mono text-sm">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
        <span className="text-muted-foreground">
          {error
            ? 'Failed'
            : isStreaming
              ? `Processing... ${progress}%`
              : 'Complete'}
        </span>
        <span className="text-muted-foreground">{formatTime(elapsedTime)}</span>
      </div>

      {/* Steps log */}
      <div ref={containerRef} className="p-4 max-h-64 overflow-y-auto">
        {steps.length > 0 && (
          <div className="space-y-0.5 text-muted-foreground">
            {steps.map((s, i) => {
              const isLast = i === steps.length - 1
              const prefix = isLast && isStreaming ? '>' : '✓'
              return (
                <div
                  key={s.timestamp}
                  className={isLast && isStreaming ? 'text-foreground' : ''}
                >
                  {prefix} {s.step}
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {error && <div className="text-destructive mt-2">✗ Error: {error}</div>}
      </div>
    </div>
  )
}
