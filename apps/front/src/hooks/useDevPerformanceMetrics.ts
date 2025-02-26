import { useEffect, useRef } from 'react'

interface RenderMetrics {
  componentName: string
  totalRenders: number
  rowRenders: Map<string, number>
  lastUpdateDuration: number
  lastUpdateTimestamp: number
}

export const useDevPerformanceMetrics = (componentName: string) => {
  const metrics = useRef<RenderMetrics>({
    componentName,
    totalRenders: 0,
    rowRenders: new Map(),
    lastUpdateDuration: 0,
    lastUpdateTimestamp: Date.now(),
  })

  // Only run in development
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      // Log metrics on component unmount
      return () => {
        console.group(`${componentName} Performance Metrics`)
        console.table({
          'Total Renders': metrics.current.totalRenders,
          'Average Row Renders':
            Array.from(metrics.current.rowRenders.values()).reduce(
              (a, b) => a + b,
              0,
            ) / metrics.current.rowRenders.size || 0,
          'Max Row Renders': Math.max(
            ...Array.from(metrics.current.rowRenders.values()),
            0,
          ),
          'Last Update Duration (ms)': metrics.current.lastUpdateDuration,
        })
        console.groupEnd()
      }
    }, [componentName])
  }

  const trackRowRender = (rowId: string) => {
    if (process.env.NODE_ENV === 'development') {
      metrics.current.rowRenders.set(
        rowId,
        (metrics.current.rowRenders.get(rowId) || 0) + 1,
      )
    }
  }

  const trackUpdate = (duration: number) => {
    if (process.env.NODE_ENV === 'development') {
      metrics.current.totalRenders += 1
      metrics.current.lastUpdateDuration = duration
      metrics.current.lastUpdateTimestamp = Date.now()
    }
  }

  return process.env.NODE_ENV === 'development'
    ? { trackRowRender, trackUpdate }
    : { trackRowRender: () => {}, trackUpdate: () => {} }
}
