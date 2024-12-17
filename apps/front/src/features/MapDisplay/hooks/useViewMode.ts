import { useState } from 'react'
import { VIEW_SIZES } from '../constants'
import type { ViewMode, ViewStyle } from '../types'

export const useViewMode = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('equal')
  const [viewStyle, setViewStyle] = useState<ViewStyle>({
    mapStyle: { flex: VIEW_SIZES.equal.mapSize },
    dataStyle: { flex: VIEW_SIZES.equal.dataSize },
  })

  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    const sizes = VIEW_SIZES[mode]
    setViewStyle({
      mapStyle: { flex: sizes.mapSize },
      dataStyle: { flex: sizes.dataSize },
    })
  }

  return { viewMode, viewStyle, toggleViewMode }
}
